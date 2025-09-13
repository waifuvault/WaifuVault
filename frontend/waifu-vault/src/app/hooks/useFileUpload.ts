"use client";

import { useCallback, useState } from "react";
import { useEnvironment } from "./useEnvironment";
import { useErrorHandler } from "./useErrorHandler";
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
    const { handleError } = useErrorHandler();
    const [isAssociatingToAlbum, setIsAssociatingToAlbum] = useState(false);

    const addFilesToAlbum = useCallback(
        async (albumToken: string, fileTokens: string[]) => {
            if (fileTokens.length === 0) {
                return;
            }

            setIsAssociatingToAlbum(true);
            try {
                await uploadApi.associateFilesToAlbum(backendRestBaseUrl, albumToken, fileTokens);
                options.onAlbumAssociation?.(albumToken, fileTokens);
            } catch (error) {
                handleError(error, {
                    defaultMessage: "Failed to associate files with album",
                    showToast: false,
                    rethrow: true,
                });
            } finally {
                setIsAssociatingToAlbum(false);
            }
        },
        [backendRestBaseUrl, handleError, options],
    );

    const handleUploadComplete = useCallback(
        async (files: UploadFile[]) => {
            const completedFiles = files.filter(f => f.status === "completed" && f.response?.token);

            if (options.albumToken && completedFiles.length > 0) {
                try {
                    const fileTokens = completedFiles.map(f => f.response?.token).filter(Boolean) as string[];
                    await addFilesToAlbum(options.albumToken, fileTokens);
                } catch (error) {
                    handleError(error, {
                        defaultMessage: "Failed to add files to album after upload",
                        rethrow: false,
                    });
                }
            }

            options.onUploadComplete?.(files);
        },
        [addFilesToAlbum, handleError, options],
    );

    return {
        isAssociatingToAlbum,
        handleUploadComplete,
        addFilesToAlbum,
    };
};
