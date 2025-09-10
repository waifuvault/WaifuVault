"use client";

import { useCallback, useEffect, useState } from "react";
import { useEnvironment } from "./useEnvironment";
import { formatFileSize } from "../utils/upload";
import * as restrictionsApi from "../utils/api/restrictionsApi";

interface UseRestrictionsReturn {
    maxFileSizeFormatted: string;
    bannedTypes: string[];
    restrictions: {
        maxFileSize: number;
    };
    isLoading: boolean;
    error: string | null;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB fallback
const DEFAULT_BANNED_TYPES = ["application/x-dosexec", "application/x-executable"];

export const useRestrictions = (): UseRestrictionsReturn => {
    const { backendRestBaseUrl } = useEnvironment();
    const [maxFileSize, setMaxFileSize] = useState<number>(DEFAULT_MAX_FILE_SIZE);
    const [bannedTypes, setBannedTypes] = useState<string[]>(DEFAULT_BANNED_TYPES);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRestrictions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const restrictions = await restrictionsApi.getRestrictions(backendRestBaseUrl);

            for (const restriction of restrictions) {
                if (restriction.type === "MAX_FILE_SIZE") {
                    const sizeInBytes = Number(restriction.value) * 1024 * 1024;
                    setMaxFileSize(sizeInBytes);
                } else if (restriction.type === "BANNED_MIME_TYPE") {
                    const types = String(restriction.value)
                        .split(",")
                        .map(type => type.trim());
                    setBannedTypes(types);
                }
            }
        } catch (err) {
            console.error("Failed to fetch restrictions:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [backendRestBaseUrl]);

    useEffect(() => {
        fetchRestrictions();
    }, [fetchRestrictions]);

    return {
        maxFileSizeFormatted: formatFileSize(maxFileSize),
        bannedTypes,
        restrictions: {
            maxFileSize,
        },
        isLoading,
        error,
    };
};
