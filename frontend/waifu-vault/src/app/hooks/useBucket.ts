"use client";

import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import * as bucketApi from "@/app/utils/api/bucketApi";
import type { AdminBucketDto } from "@/types/AdminTypes";

export function useBucket() {
    const { backendRestBaseUrl } = useEnvironment();

    const getBucketData = useCallback(async (): Promise<AdminBucketDto> => {
        return bucketApi.getBucketData(backendRestBaseUrl);
    }, [backendRestBaseUrl]);

    const deleteFiles = useCallback(
        async (fileIds: number[]): Promise<void> => {
            return bucketApi.deleteFiles(backendRestBaseUrl, fileIds);
        },
        [backendRestBaseUrl],
    );

    return {
        getBucketData,
        deleteFiles,
    };
}
