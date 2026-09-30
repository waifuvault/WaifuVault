import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { StorageNotFoundError } from "../../../../model/exceptions/StorageNotFoundError.js";
import { LocalStorageProvider } from "../LocalStorageProvider.js";

const dirs = vi.hoisted(() => ({ root: "", staging: "" }));

vi.mock("../../../../utils/Utils.js", () => ({
    get filesDir(): string {
        return dirs.root;
    },
    get stagingDir(): string {
        return path.join(dirs.root, ".staging");
    },
    getSoftDeleteLocation: (): string | null => null,
}));

async function readStream(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf8");
}

describe("LocalStorageProvider", () => {
    let provider: LocalStorageProvider;

    beforeEach(async () => {
        dirs.root = await fs.mkdtemp(path.join(os.tmpdir(), "wv-files-"));
        dirs.staging = await fs.mkdtemp(path.join(os.tmpdir(), "wv-staging-"));
        provider = new LocalStorageProvider();
    });

    afterEach(async () => {
        await fs.rm(dirs.root, { recursive: true, force: true });
        await fs.rm(dirs.staging, { recursive: true, force: true });
    });

    it("streams a stored object and honours an inclusive byte range", async () => {
        // given
        await provider.put("a.txt", Buffer.from("hello world"));

        // when
        const whole = await readStream(await provider.get("a.txt"));
        const ranged = await readStream(await provider.get("a.txt", { start: 6, end: 10 }));

        // then
        expect(whole).toBe("hello world");
        expect(ranged).toBe("world");
    });

    it("rejects with StorageNotFoundError before streaming when the object is missing", async () => {
        await expect(provider.get("missing.txt")).rejects.toBeInstanceOf(StorageNotFoundError);
        await expect(provider.getBuffer("missing.txt")).rejects.toBeInstanceOf(StorageNotFoundError);
    });

    it("returns null from head for a missing object and size info for a present one", async () => {
        // given
        await provider.put("b.bin", Buffer.alloc(42));

        // when
        const missing = await provider.head("nope.bin");
        const present = await provider.head("b.bin");

        // then
        expect(missing).toBeNull();
        expect(present?.size).toBe(42);
        expect(present?.key).toBe("b.bin");
    });

    it("moves a staged file into the store on putFile", async () => {
        // given
        const staged = path.join(dirs.staging, "upload.tmp");
        await fs.writeFile(staged, "staged bytes");

        // when
        await provider.putFile("final.txt", staged);

        // then
        expect((await provider.getBuffer("final.txt")).toString("utf8")).toBe("staged bytes");
        await expect(fs.access(staged)).rejects.toThrow();
    });

    it("deletes objects idempotently and lists what remains, excluding the staging folder", async () => {
        // given
        await provider.put("keep.txt", Buffer.from("k"));
        await provider.put("drop.txt", Buffer.from("d"));
        await fs.mkdir(path.join(dirs.root, ".staging"));

        // when
        await provider.delete(["drop.txt", "never-existed.txt"]);
        const keys: string[] = [];
        for await (const key of provider.list()) {
            keys.push(key);
        }

        // then
        expect(keys).toEqual(["keep.txt"]);
    });

    it("falls back to a hard delete on softDelete when no soft delete location is configured", async () => {
        // given
        await provider.put("soft.txt", Buffer.from("s"));

        // when
        await provider.softDelete(["soft.txt"]);

        // then
        expect(await provider.head("soft.txt")).toBeNull();
    });

    it("refuses keys that escape the storage root", async () => {
        await expect(provider.getBuffer("../outside.txt")).rejects.toThrow("Invalid storage key");
        await expect(provider.delete(["sub/dir.txt"])).rejects.toThrow();
    });
});
