"use client";

import { useMemo } from "react";

export function useEnvironment() {
    const nextAppUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8280";
    const waifuVaultBackend = process.env.NEXT_PUBLIC_WAIFUVAULT_BACKEND ?? "http://127.0.0.1:8081";
    const uploadUrl = process.env.NEXT_PUBLIC_UPLOADER_URL?.trim() ?? "http://localhost:3000";
    const backendRestBaseUrl = `${waifuVaultBackend}/rest`;

    return useMemo(
        () => ({
            uploadUrl,
            nextAppUrl,
            waifuVaultBackend,
            backendRestBaseUrl,
            apiUrl: `${waifuVaultBackend}/api`,
            bucketAccessUrl: `${nextAppUrl}/bucketAccess`,
            apiDocsUrl: `${waifuVaultBackend}/api-docs`,
        }),
        [nextAppUrl, waifuVaultBackend, uploadUrl, backendRestBaseUrl],
    );
}
