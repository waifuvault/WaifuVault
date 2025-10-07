import { useCallback } from "react";
import { useToast } from "@/app/components/Toast";

interface ErrorHandlerOptions {
    defaultMessage?: string;
    showToast?: boolean;
    rethrow?: boolean;
}

export function useErrorHandler() {
    const { showToast } = useToast();

    const handleError = useCallback(
        (error: unknown, options: ErrorHandlerOptions = {}) => {
            const {
                defaultMessage = "An unexpected error occurred",
                showToast: shouldShowToast = true,
                rethrow = true,
            } = options;

            let errorMessage = defaultMessage;

            if (error instanceof Error) {
                errorMessage = error.message ?? defaultMessage;
            } else if (typeof error === "string") {
                errorMessage = error;
            } else if (error && typeof error === "object" && "message" in error) {
                errorMessage = String(error.message) ?? defaultMessage;
            }

            if (shouldShowToast && showToast) {
                showToast("error", errorMessage);
            }

            console.error("Error handled:", error);

            if (rethrow) {
                throw error;
            }

            return errorMessage;
        },
        [showToast],
    );

    const handleAsyncError = useCallback(
        async (asyncFn: () => Promise<unknown>, options: ErrorHandlerOptions = {}) => {
            try {
                return await asyncFn();
            } catch (error) {
                return handleError(error, options);
            }
        },
        [handleError],
    );

    return {
        handleError,
        handleAsyncError,
    };
}
