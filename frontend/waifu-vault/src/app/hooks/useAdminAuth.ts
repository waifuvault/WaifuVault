import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEnvironment } from "./useEnvironment";
import { useAdminAuthContext } from "@/app/contexts/AdminAuthContext";
import type { UserInfo } from "@/app/utils/api/adminApi";
import * as adminApi from "@/app/utils/api/adminApi";

export function useAdminAuth() {
    const { isAuthenticated, setIsAuthenticated } = useAdminAuthContext();
    const { backendRestBaseUrl, waifuVaultBackend } = useEnvironment();
    const router = useRouter();
    const pathname = usePathname();

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch(`${backendRestBaseUrl}/auth/login_status`, {
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
            console.debug("Admin auth check failed:", error);
            setIsAuthenticated(false);
            return false;
        }
    }, [backendRestBaseUrl, setIsAuthenticated]);

    const redirectToLogin = useCallback(() => {
        router.push("/login?error=unauthorized");
    }, [router]);

    useEffect(() => {
        if (isAuthenticated === false && pathname !== "/login" && pathname.startsWith("/admin")) {
            redirectToLogin();
        }
    }, [isAuthenticated, pathname, redirectToLogin]);

    const logout = () => {
        window.location.href = `${backendRestBaseUrl}/auth/logout`;
    };

    useEffect(() => {
        // Only check admin auth when on admin pages or login page
        if (isAuthenticated === null && (pathname.startsWith("/admin") || pathname === "/login")) {
            checkAuth();
        }
    }, [checkAuth, isAuthenticated, pathname]);

    const changeDetails = useCallback(
        async (email: string, password: string): Promise<void> => {
            return adminApi.changeDetails(waifuVaultBackend, email, password);
        },
        [waifuVaultBackend],
    );

    const getCurrentUser = useCallback(async (): Promise<UserInfo> => {
        return adminApi.getCurrentUser(waifuVaultBackend);
    }, [waifuVaultBackend]);

    return {
        isAuthenticated,
        logout,
        checkAuth,
        redirectToLogin,
        changeDetails,
        getCurrentUser,
    };
}
