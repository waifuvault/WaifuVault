"use client";

import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import type { BucketType } from "@/app/utils/api/bucketApi";
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

    const deleteBucket = useCallback(
        async (token: string): Promise<void> => {
            return bucketApi.deleteBucket(backendRestBaseUrl, token);
        },
        [backendRestBaseUrl],
    );

    const getBucketType = useCallback(
        async (bucketToken: string): Promise<BucketType> => {
            return bucketApi.getBucketType(backendRestBaseUrl, bucketToken);
        },
        [backendRestBaseUrl],
    );

    return {
        getBucketData,
        deleteFiles,
        deleteBucket,
        getBucketType,
    };
}
