const MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
const MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;

export function getTimeLeftBySize(filesize: number, fileSizeLimit: number): number {
    const ttl = Math.floor((MIN_EXPIRATION - MAX_EXPIRATION) * Math.pow(filesize / fileSizeLimit - 1, 3));
    return ttl < MIN_EXPIRATION ? MIN_EXPIRATION : ttl;
}

export function timeToHuman(value: number): string {
    const seconds = value / 1000;
    const levels = [
        [Math.floor(seconds / 31536000), "years"],
        [Math.floor((seconds % 31536000) / 2592000), "months"],
        [Math.floor(((seconds % 31536000) % 2592000) / 86400), "days"],
        [Math.floor((((seconds % 31536000) % 2592000) % 86400) / 3600), "hours"],
        [Math.floor(((((seconds % 31536000) % 2592000) % 86400) % 3600) / 60), "minutes"],
        [Math.floor(((((seconds % 31536000) % 2592000) % 86400) % 3600) % 60), "seconds"],
    ];

    let returntext = "";
    for (let i = 0, max = levels.length; i < max; i++) {
        const level = levels[i];
        const value = level[0] as number;
        const unit = level[1] as string;

        if (value === 0) continue;

        returntext += " " + value + " " + (value === 1 ? unit.substr(0, unit.length - 1) : unit);
    }

    return returntext.trim() || "0 seconds";
}
