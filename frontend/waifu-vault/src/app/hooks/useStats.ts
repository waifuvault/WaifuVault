"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useEnvironment } from "@/app/hooks/useEnvironment";

interface StatsData {
    recordCount: number;
    recordSize: string;
}

export function useStats(enableDynamic: boolean = true) {
    const [stats, setStats] = useState<StatsData>({ recordCount: 0, recordSize: "0kb" });
    const [isConnected, setIsConnected] = useState(false);
    const { waifuVaultBackend } = useEnvironment();

    useEffect(() => {
        if (!enableDynamic) {
            setStats({
                recordCount: 2847392,
                recordSize: "15.2TB",
            });
            return;
        }

        let socket: Socket | null = null;

        const connectSocket = () => {
            try {
                socket = io(`${waifuVaultBackend}/recordInfo`, {
                    path: "/socket.io/recordInfo",
                    autoConnect: true,
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 5,
                    timeout: 20000,
                });

                socket.on("connect", () => {
                    console.log("Connected to stats socket");
                    setIsConnected(true);
                });

                socket.on("disconnect", () => {
                    console.log("Disconnected from stats socket");
                    setIsConnected(false);
                });

                socket.on("record", (data: StatsData) => {
                    console.log("Received record update:", data);
                    setStats(data);
                });
            } catch (error) {
                console.error("Failed to connect to stats socket:", error);
                setStats({
                    recordCount: 2847392,
                    recordSize: "15.2TB",
                });
            }
        };

        connectSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [waifuVaultBackend, enableDynamic]);

    return {
        stats,
        isConnected,
        isEnabled: enableDynamic,
    };
}
