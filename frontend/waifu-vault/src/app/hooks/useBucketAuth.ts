import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEnvironment } from "./useEnvironment";
import { useBucketAuthContext } from "@/app/contexts/BucketAuthContext";

export function useBucketAuth() {
    const { isAuthenticated, setIsAuthenticated } = useBucketAuthContext();
    const { backendRestBaseUrl } = useEnvironment();
    const router = useRouter();
    const pathname = usePathname();

    const checkAuth = useCallback(async () => {
        try {
            console.log("Checking bucket authentication...");
            const response = await fetch(`${backendRestBaseUrl}/auth/bucket_status`, {
                credentials: "include",
                method: "GET",
            });

            console.log("Auth check response status:", response.status);

            if (response.ok) {
                console.log("Auth check successful");
                setIsAuthenticated(true);
                return true;
            } else {
                console.log("Auth check failed - not authenticated");
                setIsAuthenticated(false);
                return false;
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            setIsAuthenticated(false);
            return false;
        }
    }, [backendRestBaseUrl, setIsAuthenticated]);

    useEffect(() => {
        if (isAuthenticated === false && pathname !== "/bucketAccess") {
            // Redirect without error on reload - error should only be shown when explicitly set
            router.push("/bucketAccess");
        }
    }, [isAuthenticated, router, pathname]);

    const logout = () => {
        window.location.href = `${backendRestBaseUrl}/auth/close_bucket`;
    };

    const redirectToLogin = () => {
        router.push("/bucketAccess?error=no_token");
    };

    useEffect(() => {
        // Always check auth on mount, but don't redirect from bucket pages immediately
        if (isAuthenticated === null) {
            checkAuth();
        }
    }, [checkAuth, isAuthenticated]);

    return {
        isAuthenticated,
        logout,
        checkAuth,
        redirectToLogin,
    };
}
