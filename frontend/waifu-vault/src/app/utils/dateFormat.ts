export function formatDate(date: Date | string | number): string {
    if (!date) {
        return "N/A";
    }

    try {
        const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

        if (isNaN(d.getTime())) {
            return "Invalid Date";
        }

        const day = String(d.getUTCDate()).padStart(2, "0");
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const year = d.getUTCFullYear();
        const hours = String(d.getUTCHours()).padStart(2, "0");
        const minutes = String(d.getUTCMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
        return "Invalid Date";
    }
}
