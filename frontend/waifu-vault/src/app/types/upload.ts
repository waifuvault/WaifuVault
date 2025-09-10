export interface UploadFile {
    id: string;
    file: File;
    isValid: boolean;
    error?: string;
    progress?: number;
    status: "pending" | "uploading" | "completed" | "error";
    response?: { token: string; url: string; [key: string]: unknown };
    showOptions?: boolean;
}
