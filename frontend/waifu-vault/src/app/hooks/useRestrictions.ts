"use client";

import { useEffect, useState } from "react";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { formatFileSize } from "@/app/utils/format";

interface Restriction {
    type: string;
    value: number | string;
}

interface ParsedRestrictions {
    maxFileSize: number;
    bannedMimeTypes: string[];
}

export function useRestrictions() {
    const [restrictions, setRestrictions] = useState<ParsedRestrictions>({
        maxFileSize: 1_048_576_000,
        bannedMimeTypes: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { waifuVaultBackend } = useEnvironment();

    useEffect(() => {
        const fetchRestrictions = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`${waifuVaultBackend}/rest/resources/restrictions`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch restrictions: ${response.status}`);
                }

                const restrictionsData: Restriction[] = await response.json();

                const parsed: ParsedRestrictions = {
                    maxFileSize: 1_048_576_000,
                    bannedMimeTypes: [],
                };

                for (const restriction of restrictionsData) {
                    if (restriction.type === "MAX_FILE_SIZE") {
                        parsed.maxFileSize = Number(restriction.value);
                    } else if (restriction.type === "BANNED_MIME_TYPE") {
                        parsed.bannedMimeTypes = String(restriction.value).split(",").filter(Boolean);
                    }
                }

                setRestrictions(parsed);
            } catch (error) {
                console.error("Failed to fetch restrictions:", error);
                setError(error instanceof Error ? error.message : "Unknown error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRestrictions();
    }, [waifuVaultBackend]);

    return {
        restrictions,
        isLoading,
        error,
        maxFileSizeMB: Math.round(restrictions.maxFileSize / (1024 * 1024)),
        maxFileSizeFormatted: formatFileSize(restrictions.maxFileSize),
    };
}
