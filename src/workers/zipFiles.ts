import { parentPort, workerData } from "node:worker_threads";
import { filesDir } from "../utils/Utils.js";
import crypto from "node:crypto";
import fs from "node:fs";
import archiver from "archiver";

async function createZip(
    files: { fullLocationOnDisk: string; parsedFileName: string }[],
    output: fs.WriteStream,
): Promise<void> {
    const archive = archiver("zip");
    archive.on("error", err => {
        parentPort?.postMessage({ success: false, error: err.message });
    });

    archive.pipe(output);
    for (const file of files) {
        archive.file(file.fullLocationOnDisk, { name: file.parsedFileName });
    }

    await archive.finalize();
}

let output: fs.WriteStream | undefined;
const { albumName, filesToZip } = workerData;
const zipLocation = filesDir + `/${albumName}_${crypto.randomUUID()}.zip`;

try {
    output = fs.createWriteStream(zipLocation);
    await createZip(filesToZip, output);
    parentPort?.postMessage({ success: true, data: zipLocation });
} catch (err) {
    await fs.promises.rm(zipLocation, { recursive: true, force: true });
    parentPort?.postMessage({ success: false, error: err.message });
} finally {
    if (output) {
        output.close();
    }
    parentPort?.close();
}
