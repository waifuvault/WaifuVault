import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { mockClient } from "aws-sdk-client-mock";
import {
    CopyObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    NoSuchKey,
    NotFound,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@smithy/util-stream";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { StorageNotFoundError } from "../../../../model/exceptions/StorageNotFoundError.js";
import { StorageOperationError } from "../../../../model/exceptions/StorageOperationError.js";
import { GlobalEnv } from "../../../../model/constants/GlobalEnv.js";
import { SettingsService } from "../../../../services/SettingsService.js";
import { S3StorageProvider } from "../S3StorageProvider.js";

const s3Mock = mockClient(S3Client);

const baseSettings: Partial<Record<GlobalEnv, string>> = {
    [GlobalEnv.S3_ENDPOINT]: "https://fsn1.your-objectstorage.com",
    [GlobalEnv.S3_REGION]: "fsn1",
    [GlobalEnv.S3_BUCKET]: "waifuvault-files",
    [GlobalEnv.S3_ACCESS_KEY_ID]: "key",
    [GlobalEnv.S3_SECRET_ACCESS_KEY]: "secret",
    [GlobalEnv.S3_PREFIX]: "files//",
    [GlobalEnv.S3_FORCE_PATH_STYLE]: "false",
};

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
    const keys: string[] = [];
    for await (const key of iterable) {
        keys.push(key);
    }

    return keys;
}

describe("S3StorageProvider", () => {
    const settingsService = { getSetting: vi.fn() };
    const logger = { error: vi.fn() };

    function createProvider(overrides: Partial<Record<GlobalEnv, string>> = {}): Promise<S3StorageProvider> {
        const settings: Partial<Record<GlobalEnv, string>> = { ...baseSettings, ...overrides };
        settingsService.getSetting.mockImplementation(
            (key: GlobalEnv) => settings[key] ?? (key === GlobalEnv.S3_PREFIX ? "" : null),
        );

        return PlatformTest.invoke<S3StorageProvider>(S3StorageProvider, [
            { token: SettingsService, use: settingsService },
            { token: Logger, use: logger },
        ]);
    }

    beforeEach(async () => {
        await PlatformTest.create();
        vi.resetAllMocks();
        s3Mock.reset();
    });

    afterEach(PlatformTest.reset);

    it("is only enabled when endpoint, bucket and both keys are configured", async () => {
        // given
        const configured = await createProvider();
        const missingSecret = await createProvider({ [GlobalEnv.S3_SECRET_ACCESS_KEY]: "" });
        const missingEndpoint = await createProvider({ [GlobalEnv.S3_ENDPOINT]: "" });

        // then
        expect(configured.enabled).toBe(true);
        expect(missingSecret.enabled).toBe(false);
        expect(missingEndpoint.enabled).toBe(false);
    });

    it("rejects with StorageNotFoundError before returning a stream when the object is missing", async () => {
        // given
        const provider = await createProvider();
        s3Mock.on(GetObjectCommand).rejects(new NoSuchKey({ message: "missing", $metadata: {} }));
        s3Mock.on(HeadObjectCommand).rejects(new NotFound({ message: "missing", $metadata: {} }));

        // when
        const getResult = provider.get("missing.txt");
        const bufferResult = provider.getBuffer("missing.txt");
        const headResult = await provider.head("missing.txt");

        // then
        await expect(getResult).rejects.toBeInstanceOf(StorageNotFoundError);
        await expect(bufferResult).rejects.toBeInstanceOf(StorageNotFoundError);
        expect(headResult).toBeNull();
    });

    it("rethrows errors that are not a missing object", async () => {
        // given
        const provider = await createProvider();
        s3Mock.on(GetObjectCommand).rejects(new Error("connection reset"));

        // when
        const result = provider.get("a.txt");

        // then
        await expect(result).rejects.toThrow("connection reset");
    });

    it("sends an inclusive range header and applies the normalised prefix", async () => {
        // given
        const provider = await createProvider();
        s3Mock.on(GetObjectCommand).resolves({ Body: sdkStreamMixin(Readable.from([Buffer.from("world")])) });

        // when
        await provider.get("a.txt", { start: 6, end: 10 });

        // then
        const [call] = s3Mock.commandCalls(GetObjectCommand);
        expect(call.args[0].input).toEqual({
            Bucket: "waifuvault-files",
            Key: "files/a.txt",
            Range: "bytes=6-10",
        });
    });

    it("uses the bare key when no prefix is configured", async () => {
        // given
        const provider = await createProvider({ [GlobalEnv.S3_PREFIX]: "" });
        s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 3, LastModified: new Date(1000) });

        // when
        const info = await provider.head("b.bin");

        // then
        expect(s3Mock.commandCalls(HeadObjectCommand)[0].args[0].input.Key).toBe("b.bin");
        expect(info).toEqual({ key: "b.bin", size: 3, lastModified: new Date(1000) });
    });

    it("lists keys without the prefix across pages and excludes soft deleted objects", async () => {
        // given
        const provider = await createProvider();
        s3Mock
            .on(ListObjectsV2Command)
            .resolvesOnce({
                Contents: [{ Key: "files/" }, { Key: "files/a.txt" }, { Key: "files/soft-deleted/b.txt" }],
                IsTruncated: true,
                NextContinuationToken: "next",
            })
            .resolvesOnce({
                Contents: [{ Key: "files/c.png" }],
                IsTruncated: false,
            });

        // when
        const keys = await collect(provider.list());

        // then
        expect(keys).toEqual(["a.txt", "c.png"]);
        expect(s3Mock.commandCalls(ListObjectsV2Command)[0].args[0].input.Prefix).toBe("files/");
    });

    it("deletes in chunks of 1000 and aggregates per key failures while ignoring missing keys", async () => {
        // given
        const provider = await createProvider();
        const keys = Array.from({ length: 1500 }, (_, i) => `f${i}.txt`);
        s3Mock
            .on(DeleteObjectsCommand)
            .resolvesOnce({
                Errors: [
                    { Key: "files/f1.txt", Code: "AccessDenied", Message: "denied" },
                    { Key: "files/f2.txt", Code: "NoSuchKey", Message: "gone" },
                ],
            })
            .rejectsOnce(new Error("timeout"));

        // when
        const error = await provider.delete(keys).catch((e: unknown) => e);

        // then
        expect(error).toBeInstanceOf(StorageOperationError);
        expect(error).toHaveProperty("failures", [expect.any(Error), expect.any(Error)]);

        const calls = s3Mock.commandCalls(DeleteObjectsCommand);
        expect(calls).toHaveLength(2);
        expect(calls[0].args[0].input.Delete?.Objects).toHaveLength(1000);
        expect(calls[1].args[0].input.Delete?.Objects).toHaveLength(500);
        expect(calls[0].args[0].input.Delete?.Objects?.[0].Key).toBe("files/f0.txt");
    });

    it("resolves when every failure is a missing key", async () => {
        // given
        const provider = await createProvider();
        s3Mock.on(DeleteObjectsCommand).resolves({ Errors: [{ Key: "files/x.txt", Code: "NoSuchKey" }] });

        // when
        const result = provider.delete(["x.txt"]);

        // then
        await expect(result).resolves.toBeUndefined();
    });

    it("uploads a staged file and removes it locally once stored", async () => {
        // given
        const provider = await createProvider();
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wv-s3-"));
        const staged = path.join(dir, "upload.tmp");
        await fs.writeFile(staged, "staged bytes");
        s3Mock.on(PutObjectCommand).resolves({});

        try {
            // when
            await provider.putFile("final.txt", staged);

            // then
            const [call] = s3Mock.commandCalls(PutObjectCommand);
            expect(call.args[0].input.Key).toBe("files/final.txt");
            expect(call.args[0].input.ContentLength).toBe(12);
            await expect(fs.access(staged)).rejects.toThrow();
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    });

    it("copies to the soft deleted location then deletes the original, skipping missing objects", async () => {
        // given
        const provider = await createProvider({ [GlobalEnv.SOFT_DELETE_LOCATION]: "softDelete" });
        s3Mock
            .on(HeadObjectCommand, { Key: "files/x.txt" })
            .resolves({ ContentLength: 10, LastModified: new Date() })
            .on(HeadObjectCommand, { Key: "files/gone.txt" })
            .rejects(new NotFound({ message: "missing", $metadata: {} }));
        s3Mock.on(CopyObjectCommand).resolves({});
        s3Mock.on(DeleteObjectsCommand).resolves({});

        // when
        await provider.softDelete(["x.txt", "gone.txt"]);

        // then
        const copies = s3Mock.commandCalls(CopyObjectCommand);
        expect(copies).toHaveLength(1);
        expect(copies[0].args[0].input).toEqual({
            Bucket: "waifuvault-files",
            Key: "files/soft-deleted/x.txt",
            CopySource: "waifuvault-files/files/x.txt",
        });
        expect(s3Mock.commandCalls(DeleteObjectsCommand)[0].args[0].input.Delete?.Objects).toEqual([
            { Key: "files/x.txt" },
        ]);
    });

    it("hard deletes on softDelete when no soft delete location is configured", async () => {
        // given
        const provider = await createProvider();
        s3Mock.on(DeleteObjectsCommand).resolves({});

        // when
        await provider.softDelete(["x.txt"]);

        // then
        expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(0);
        expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(1);
    });

    it("refuses keys that escape the prefix", async () => {
        // given
        const provider = await createProvider();

        // when
        const bufferResult = provider.getBuffer("../outside.txt");
        const deleteResult = provider.delete(["sub/dir.txt"]);

        // then
        await expect(bufferResult).rejects.toThrow("Invalid storage key");
        await expect(deleteResult).rejects.toThrow("Invalid storage key");
    });
});
