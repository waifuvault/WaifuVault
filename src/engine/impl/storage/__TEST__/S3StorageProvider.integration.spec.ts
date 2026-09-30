import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CreateBucketCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";
import type { Logger } from "@tsed/logger";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { GlobalEnv } from "../../../../model/constants/GlobalEnv.js";
import { StorageNotFoundError } from "../../../../model/exceptions/StorageNotFoundError.js";
import type { SettingsService } from "../../../../services/SettingsService.js";
import { S3StorageProvider } from "../S3StorageProvider.js";

const endpoint = process.env.S3_INTEGRATION_ENDPOINT;
const accessKeyId = process.env.S3_INTEGRATION_ACCESS_KEY_ID ?? "any";
const secretAccessKey = process.env.S3_INTEGRATION_SECRET_ACCESS_KEY ?? "any";
const region = process.env.S3_INTEGRATION_REGION ?? "us-east-1";
const existingBucket = process.env.S3_INTEGRATION_BUCKET;
const bucket = existingBucket ?? `waifuvault-it-${crypto.randomUUID()}`;
const forcePathStyle = (process.env.S3_INTEGRATION_FORCE_PATH_STYLE ?? "true") === "true";
const prefix = `integration-test-${crypto.randomUUID()}/files`;

const logger = {
    error: (): undefined => undefined,
} as unknown as Logger;

function createProvider(softDeleteLocation: string | null): S3StorageProvider {
    const settings: Partial<Record<GlobalEnv, string | null>> = {
        [GlobalEnv.S3_ENDPOINT]: endpoint ?? null,
        [GlobalEnv.S3_REGION]: region,
        [GlobalEnv.S3_BUCKET]: bucket,
        [GlobalEnv.S3_ACCESS_KEY_ID]: accessKeyId,
        [GlobalEnv.S3_SECRET_ACCESS_KEY]: secretAccessKey,
        [GlobalEnv.S3_PREFIX]: prefix,
        [GlobalEnv.S3_FORCE_PATH_STYLE]: String(forcePathStyle),
        [GlobalEnv.SOFT_DELETE_LOCATION]: softDeleteLocation,
    };
    const settingsService = {
        getSetting: (key: GlobalEnv): string | null => settings[key] ?? null,
    } as unknown as SettingsService;
    return new S3StorageProvider(settingsService, logger);
}

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
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

describe.skipIf(!endpoint)("S3StorageProvider against a real S3 server", () => {
    let rawClient: S3Client;
    let provider: S3StorageProvider;
    let softDeletingProvider: S3StorageProvider;
    let workDir: string;

    beforeAll(async () => {
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

        provider = createProvider(null);
        softDeletingProvider = createProvider("softDelete");
        workDir = await fs.mkdtemp(path.join(os.tmpdir(), "wv-s3-it-"));
    });

    afterAll(async () => {
        if (rawClient) {
            const testRoot = prefix.split("/")[0];
            const leftovers = await rawClient.send(
                new ListObjectsV2Command({ Bucket: bucket, Prefix: `${testRoot}/` }),
            );
            const keys = (leftovers.Contents ?? []).map(o => ({ Key: o.Key! }));
            if (keys.length > 0) {
                await rawClient.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
            }
            rawClient.destroy();
        }
        if (workDir) {
            await fs.rm(workDir, { recursive: true, force: true });
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
        await expect(provider.get("missing.txt")).rejects.toBeInstanceOf(StorageNotFoundError);
        await expect(provider.getBuffer("missing.txt")).rejects.toBeInstanceOf(StorageNotFoundError);
        expect(await provider.head("missing.txt")).toBeNull();
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
