import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import {
    CreateBucketCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";
import { Logger } from "@tsed/logger";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { GlobalEnv } from "../../../../model/constants/GlobalEnv.js";
import { SQLITE_DATA_SOURCE } from "../../../../model/di/tokens.js";
import { StorageNotFoundError } from "../../../../model/exceptions/StorageNotFoundError.js";
import { SettingsService } from "../../../../services/SettingsService.js";
import { S3StorageEngine } from "../S3StorageEngine.js";

vi.mock("../../../../db/DataSource.js", () => ({ dataSource: {} }));

const endpoint = process.env.S3_INTEGRATION_ENDPOINT;
const accessKeyId = process.env.S3_INTEGRATION_ACCESS_KEY_ID ?? "any";
const secretAccessKey = process.env.S3_INTEGRATION_SECRET_ACCESS_KEY ?? "any";
const region = process.env.S3_INTEGRATION_REGION ?? "us-east-1";
const existingBucket = process.env.S3_INTEGRATION_BUCKET;
const bucket = existingBucket ?? `waifuvault-it-${crypto.randomUUID()}`;
const forcePathStyle = (process.env.S3_INTEGRATION_FORCE_PATH_STYLE ?? "true") === "true";
const prefix = `integration-test-${crypto.randomUUID()}/files`;

const settings = new Map<GlobalEnv, string | null>([
    [GlobalEnv.S3_ENDPOINT, endpoint ?? null],
    [GlobalEnv.S3_REGION, region],
    [GlobalEnv.S3_BUCKET, bucket],
    [GlobalEnv.S3_ACCESS_KEY_ID, accessKeyId],
    [GlobalEnv.S3_SECRET_ACCESS_KEY, secretAccessKey],
    [GlobalEnv.S3_PREFIX, prefix],
    [GlobalEnv.S3_FORCE_PATH_STYLE, String(forcePathStyle)],
]);

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
}

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
    const keys: string[] = [];
    for await (const key of iterable) {
        keys.push(key);
    }

    return keys.sort();
}

describe.skipIf(!endpoint)("S3StorageEngine against a real S3 server", () => {
    const logger = { error: vi.fn() };
    const settingsService = {
        getSetting: vi.fn((key: GlobalEnv) => settings.get(key) ?? null),
    };
    const softDeleteSettingsService = {
        getSetting: vi.fn((key: GlobalEnv) =>
            key === GlobalEnv.SOFT_DELETE_LOCATION ? "softDelete" : (settings.get(key) ?? null),
        ),
    };
    let rawClient: S3Client;
    let provider: S3StorageEngine;
    let softDeletingProvider: S3StorageEngine;
    let workDir: string;

    beforeAll(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });

        rawClient = new S3Client({
            endpoint,
            region,
            forcePathStyle,
            credentials: { accessKeyId, secretAccessKey },
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        });

        if (!existingBucket) {
            await rawClient.send(new CreateBucketCommand({ Bucket: bucket }));
        }

        provider = await PlatformTest.invoke<S3StorageEngine>(S3StorageEngine, [
            { token: SettingsService, use: settingsService },
            { token: Logger, use: logger },
        ]);
        softDeletingProvider = await PlatformTest.invoke<S3StorageEngine>(S3StorageEngine, [
            { token: SettingsService, use: softDeleteSettingsService },
            { token: Logger, use: logger },
        ]);

        workDir = await fs.mkdtemp(path.join(os.tmpdir(), "wv-s3-it-"));
    });

    afterAll(async () => {
        try {
            if (rawClient) {
                const testRoot = prefix.split("/")[0];
                const leftovers = await rawClient.send(
                    new ListObjectsV2Command({ Bucket: bucket, Prefix: `${testRoot}/` }),
                );
                const keys = (leftovers.Contents ?? []).map(o => ({ Key: o.Key }));
                if (keys.length > 0) {
                    await rawClient.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
                }
            }
        } finally {
            rawClient?.destroy();

            if (workDir) {
                await fs.rm(workDir, { recursive: true, force: true });
            }

            await PlatformTest.reset();
        }
    });

    it("stores, streams and range-reads an object under the prefix", async () => {
        // given
        await provider.put("hello.txt", Buffer.from("hello world"));

        // when
        const whole = await readStream(await provider.get("hello.txt"));
        const ranged = await readStream(await provider.get("hello.txt", { start: 6, end: 10 }));
        const raw = await rawClient.send(new HeadObjectCommand({ Bucket: bucket, Key: `${prefix}/hello.txt` }));

        // then
        expect(whole.toString("utf8")).toBe("hello world");
        expect(ranged.toString("utf8")).toBe("world");
        expect(raw.ContentLength).toBe(11);
    });

    it("maps a missing object to StorageNotFoundError and a null head", async () => {
        // when
        const getResult = provider.get("missing.txt");
        const bufferResult = provider.getBuffer("missing.txt");
        const headResult = await provider.head("missing.txt");

        // then
        await expect(getResult).rejects.toBeInstanceOf(StorageNotFoundError);
        await expect(bufferResult).rejects.toBeInstanceOf(StorageNotFoundError);
        expect(headResult).toBeNull();
    });

    it("uploads a staged file larger than one multipart part and removes the local copy", async () => {
        // given
        const staged = path.join(workDir, "big.bin");
        const content = crypto.randomBytes(20 * 1024 * 1024);
        await fs.writeFile(staged, content);

        // when
        await provider.putFile("big.bin", staged);

        // then
        const info = await provider.head("big.bin");
        expect(info?.size).toBe(content.length);
        expect((await provider.getBuffer("big.bin")).equals(content)).toBe(true);
        await expect(fs.access(staged)).rejects.toThrow();
    });

    it("deletes idempotently and soft deletes out of the listing", async () => {
        // given
        await provider.put("drop.txt", Buffer.from("d"));
        await provider.put("soft.txt", Buffer.from("s"));

        // when
        await provider.delete(["drop.txt", "never-existed.txt"]);
        await softDeletingProvider.softDelete(["soft.txt"]);
        const listed = await collect(provider.list());
        const softDeleted = await rawClient.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/soft-deleted/` }),
        );

        // then
        expect(listed).toEqual(["big.bin", "hello.txt"]);
        expect(softDeleted.Contents?.map(o => o.Key)).toEqual([`${prefix}/soft-deleted/soft.txt`]);
    });
});
