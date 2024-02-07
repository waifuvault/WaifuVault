import path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs/promises";

const to = `${path.dirname(fileURLToPath(import.meta.url))}/../dist`;

async function deleteEverythingExceptSrc(directoryPath) {
    try {
        const items = await fs.readdir(directoryPath, { withFileTypes: true });
        for (const item of items) {
            const itemPath = path.join(directoryPath, item.name);
            if (item.name !== 'src') {
                if (item.isDirectory()) {
                    await fs.rm(itemPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(itemPath);
                }
                console.log(`${itemPath} has been removed.`);
            }
        }
    } catch (error) {
        console.error(`Error while deleting items in ${directoryPath}: ${error}`);
    }
}

await deleteEverythingExceptSrc(to);