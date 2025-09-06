"use client";

import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import type { AlbumInfo, UrlFileMixin } from "@/types/AdminTypes";

export function useAlbums() {
    const { backendRestBaseUrl } = useEnvironment();

    const createAlbum = useCallback(
        async (bucketToken: string, name: string): Promise<AlbumInfo> => {
            const response = await fetch(`${backendRestBaseUrl}/album/${bucketToken}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create album");
            }

            return response.json();
        },
        [backendRestBaseUrl],
    );

    const deleteAlbum = useCallback(
        async (albumToken: string, deleteFiles: boolean = false): Promise<void> => {
            const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}?deleteFiles=${deleteFiles}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete album");
            }
        },
        [backendRestBaseUrl],
    );

    const getAlbum = useCallback(
        async (albumToken: string): Promise<{ files: UrlFileMixin[]; album: AlbumInfo }> => {
            const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}`, {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to get album");
            }

            const album = await response.json();
            return {
                album: {
                    token: album.token,
                    publicToken: album.publicToken,
                    name: album.name,
                    bucket: album.bucketToken,
                    dateCreated: album.dateCreated,
                    fileCount: album.files ? album.files.length : 0,
                },
                files: album.files || [],
            };
        },
        [backendRestBaseUrl],
    );

    const assignFilesToAlbum = useCallback(
        async (albumToken: string, fileTokens: string[]): Promise<void> => {
            const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}/associate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ fileTokens }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to assign files to album");
            }
        },
        [backendRestBaseUrl],
    );

    const removeFilesFromAlbum = useCallback(
        async (albumToken: string, fileTokens: string[]): Promise<void> => {
            const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}/disassociate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ fileTokens }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to remove files from album");
            }
        },
        [backendRestBaseUrl],
    );

    const reorderFiles = useCallback(
        async (albumToken: string, fileId: number, oldPosition: number, newPosition: number): Promise<void> => {
            const response = await fetch(
                `${backendRestBaseUrl}/album/${albumToken}/swapFileOrder/${fileId}/${oldPosition}/${newPosition}`,
                {
                    method: "POST",
                    credentials: "include",
                },
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to reorder files");
            }
        },
        [backendRestBaseUrl],
    );

    return {
        createAlbum,
        deleteAlbum,
        getAlbum,
        assignFilesToAlbum,
        removeFilesFromAlbum,
        reorderFiles,
    };
}
