"use client";

import { useState } from "react";
import { useEnvironment } from "./useEnvironment";
import { UploadFile } from "../types/upload";
import * as uploadApi from "../utils/api/uploadApi";

interface UseFileUploadOptions {
    bucketToken?: string;
    albumToken?: string;
    onUploadComplete?: (files: UploadFile[]) => void;
    onAlbumAssociation?: (albumToken: string, fileTokens: string[]) => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
    const { backendRestBaseUrl } = useEnvironment();
    const [isAssociatingToAlbum, setIsAssociatingToAlbum] = useState(false);

    const addFilesToAlbum = async (albumToken: string, fileTokens: string[]) => {
        if (fileTokens.length === 0) {
            return;
        }

        setIsAssociatingToAlbum(true);
        try {
            await uploadApi.associateFilesToAlbum(backendRestBaseUrl, albumToken, fileTokens);
            options.onAlbumAssociation?.(albumToken, fileTokens);
        } catch (error) {
            console.error("Failed to associate files to album:", error);
            throw error;
        } finally {
            setIsAssociatingToAlbum(false);
        }
    };

    const handleUploadComplete = async (files: UploadFile[]) => {
        const completedFiles = files.filter(f => f.status === "completed" && f.response?.token);

        if (options.albumToken && completedFiles.length > 0) {
            try {
                const fileTokens = completedFiles.map(f => f.response?.token).filter(Boolean) as string[];
                await addFilesToAlbum(options.albumToken, fileTokens);
            } catch (error) {
                console.error("Failed to add files to album:", error);
            }
        }

        options.onUploadComplete?.(files);
    };

    return {
        isAssociatingToAlbum,
        handleUploadComplete,
        addFilesToAlbum,
    };
};
