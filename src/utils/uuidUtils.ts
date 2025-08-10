import { exec } from "node:child_process";
import { $log } from "@tsed/logger";
import crypto from "node:crypto";
import { UUID } from "crypto";
import cluster from "node:cluster";

function getRandomUUID(): Promise<string> {
    return new Promise((resolve, reject) => {
        exec("uuid", (error, stdout) => {
            if (error) {
                return reject(error);
            }
            resolve(stdout.trim());
        });
    });
}
let uuidSeed = "";
if (!cluster.isPrimary) {
    $log.info("generating UUID seeds");
    uuidSeed = await getRandomUUID();
}

/**
 * get a UUID, if running in a cluster, this will seed the UUID to ensure it's unique
 * @returns {UUID}
 */
export function uuid(): UUID {
    if (cluster.isPrimary) {
        return crypto.randomUUID();
    }
    const hash = crypto
        .createHash("sha256")
        .update(uuidSeed + crypto.randomUUID())
        .digest();
    const bytes = [...hash.subarray(0, 16)];
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.map(b => b.toString(16).padStart(2, "0")).join("");
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32),
    ].join("-") as UUID;
}
