import path, * as Path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs/promises";
import {exec} from "node:child_process";
import {promisify} from "node:util";

const to = `${path.dirname(fileURLToPath(import.meta.url))}/../dist`;

async function deleteBuild(directoryPath) {
    try {
        if (process.platform === "win32") {
            const execPromise = promisify(exec);
            return await execPromise(`rmdir /s /q ${Path.resolve(to)}`);
        }
        await fs.rm(to, {recursive: true, force: true});
    } catch (error) {
        console.error(`Error while deleting items in ${directoryPath}: ${error}`);
    }
}

async function copyGeolite(directoryPath) {
    const source = path.resolve(directoryPath, '../GeoLite2-Country.mmdb');
    const dest = path.resolve(directoryPath, 'Geolite2-Country.mmdb');
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(source, dest);
}

await deleteBuild(to);
await copyGeolite(to);
