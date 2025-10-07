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
            const response = await fetch(`${backendRestBaseUrl}/auth/bucket_status`, {
                credentials: "include",
                method: "GET",
            });

            if (response.ok) {
                setIsAuthenticated(true);
                return true;
            } else {
                setIsAuthenticated(false);
                return false;
            }
        } catch (error) {
            console.debug("Auth check failed:", error);
            setIsAuthenticated(false);
            return false;
        }
    }, [backendRestBaseUrl, setIsAuthenticated]);

    const redirectToLogin = useCallback(() => {
        router.push("/bucketAccess?error=invalid_token");
    }, [router]);

    useEffect(() => {
        if (isAuthenticated === false && pathname !== "/bucketAccess") {
            redirectToLogin();
        }
    }, [isAuthenticated, pathname, redirectToLogin]);

    const logout = () => {
        window.location.href = `${backendRestBaseUrl}/auth/close_bucket`;
    };

    useEffect(() => {
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
