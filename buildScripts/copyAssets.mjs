import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const destination = path.join(root, "dist");

const entries = await fs.readdir(source, { recursive: true, withFileTypes: true });

let copied = 0;
for (const entry of entries) {
    if (!entry.isFile() || entry.name.endsWith(".ts")) {
        continue;
    }

    const from = path.join(entry.parentPath, entry.name);
    const relative = path.relative(source, from);
    if (relative.split(path.sep).includes("__TEST__")) {
        continue;
    }

    const to = path.join(destination, relative);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    copied++;
}

console.log(`Copied ${copied} asset file(s) into dist`);
