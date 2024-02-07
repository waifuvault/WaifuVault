import path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs/promises";

const from = `${path.dirname(fileURLToPath(import.meta.url))}/../dist/src`;
const to = `${path.dirname(fileURLToPath(import.meta.url))}/../dist`;

const moveFiles = async (sourceDir, destinationDir) => {
    try {
        const files = await fs.readdir(sourceDir);
        const pArr = files.map(file => {
            const sourceFile = path.join(sourceDir, file);
            const destFile = path.join(destinationDir, file);
            return fs.rename(sourceFile, destFile);
        });
        await Promise.all(pArr);
        console.log("All files moved successfully");
    } catch (err) {
        console.error("An error occurred while moving files", err);
    }
};

await moveFiles(from, to);
await fs.rmdir(from);
