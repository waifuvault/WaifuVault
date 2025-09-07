"use client";

import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import * as albumApi from "@/app/utils/api/albumApi";
import type { AlbumInfo, UrlFileMixin } from "@/types/AdminTypes";

export function useAlbums() {
    const { backendRestBaseUrl } = useEnvironment();

    const createAlbum = useCallback(
        async (bucketToken: string, name: string): Promise<AlbumInfo> => {
            return albumApi.createAlbum(backendRestBaseUrl, bucketToken, name);
        },
        [backendRestBaseUrl],
    );

    const deleteAlbum = useCallback(
        async (albumToken: string, deleteFiles: boolean = false): Promise<void> => {
            return albumApi.deleteAlbum(backendRestBaseUrl, albumToken, deleteFiles);
        },
        [backendRestBaseUrl],
    );

    const getAlbum = useCallback(
        async (albumToken: string): Promise<{ files: UrlFileMixin[]; album: AlbumInfo }> => {
            return albumApi.getAlbum(backendRestBaseUrl, albumToken);
        },
        [backendRestBaseUrl],
    );

    const assignFilesToAlbum = useCallback(
        async (albumToken: string, fileTokens: string[]): Promise<void> => {
            return albumApi.assignFilesToAlbum(backendRestBaseUrl, albumToken, fileTokens);
        },
        [backendRestBaseUrl],
    );

    const removeFilesFromAlbum = useCallback(
        async (albumToken: string, fileTokens: string[]): Promise<void> => {
            return albumApi.removeFilesFromAlbum(backendRestBaseUrl, albumToken, fileTokens);
        },
        [backendRestBaseUrl],
    );

    const reorderFiles = useCallback(
        async (albumToken: string, fileId: number, oldPosition: number, newPosition: number): Promise<void> => {
            return albumApi.reorderFiles(backendRestBaseUrl, albumToken, fileId, oldPosition, newPosition);
        },
        [backendRestBaseUrl],
    );

    const shareAlbum = useCallback(
        async (albumToken: string): Promise<string> => {
            return albumApi.shareAlbum(backendRestBaseUrl, albumToken);
        },
        [backendRestBaseUrl],
    );

    const unshareAlbum = useCallback(
        async (albumToken: string): Promise<boolean> => {
            return albumApi.unshareAlbum(backendRestBaseUrl, albumToken);
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
        shareAlbum,
        unshareAlbum,
    };
}
