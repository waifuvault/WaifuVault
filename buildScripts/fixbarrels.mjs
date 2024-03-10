// Build script to fix barrelsby for ESM
import fs from "node:fs/promises";
import path from "node:path";
import config from ".././.barrelsby.json" with { "type": "json" };
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const existsPromises = config.directory
    .map(barrel => path.join(__dirname, "../", barrel + "/index.ts"))
    .map(filePath =>
    fs.access(filePath, fs.constants.F_OK)
        .then(() => fs.readFile(filePath, {encoding: "utf8"}))
        .then(data => data.replace(/";/g, ".js\";"))
        .then(result => fs.writeFile(filePath, result, "utf8"))
        .catch(err => console.error("Error:", err))
);
await Promise.all(existsPromises);
