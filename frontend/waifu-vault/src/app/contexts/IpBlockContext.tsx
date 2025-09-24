"use client";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEnvironment } from "@/app/hooks/useEnvironment";

interface IpBlockContextType {
    checkIpStatus: () => Promise<void>;
    isBlocked: boolean;
}

const IpBlockContext = createContext<IpBlockContextType | undefined>(undefined);

export function IpBlockProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isBlocked, setIsBlocked] = useState(false);
    const { backendRestBaseUrl } = useEnvironment();

    const checkIpStatus = useCallback(async () => {
        if (pathname === "/blocked") {
            return;
        }

        try {
            const response = await fetch(`${backendRestBaseUrl}/health/ping`, {
                method: "GET",
                cache: "no-cache",
            });

            if (response.status === 403) {
                setIsBlocked(true);
                router.push("/blocked");
            } else {
                setIsBlocked(false);
            }
        } catch (error) {
            console.warn("IP check failed:", error);
        }
    }, [pathname, backendRestBaseUrl, router]);

    useEffect(() => {
        if (pathname !== "/blocked") {
            checkIpStatus();

            const interval = setInterval(() => {
                checkIpStatus();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [pathname, backendRestBaseUrl, checkIpStatus]);

    return <IpBlockContext.Provider value={{ checkIpStatus, isBlocked }}>{children}</IpBlockContext.Provider>;
}

export function useIpBlock() {
    const context = useContext(IpBlockContext);
    if (!context) {
        throw new Error("useIpBlock must be used within an IpBlockProvider");
    }
    return context;
}
