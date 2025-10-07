export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
        return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const validateExpires = (expires: string): boolean => {
    return /^$|^\d+[mhd]$/.test(expires);
};
