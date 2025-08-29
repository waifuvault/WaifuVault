"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface LoadingContextType {
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
    withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);

    const setLoading = (loading: boolean) => {
        setIsLoading(loading);
    };

    const withLoading = async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
        setIsLoading(true);
        try {
            return await asyncFn();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LoadingContext.Provider value={{ isLoading, setLoading, withLoading }}>
            {children}
            {isLoading && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            width: "50px",
                            height: "50px",
                            border: "3px solid #f3f3f3",
                            borderTop: "3px solid #3498db",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                        }}
                    />
                    <style jsx>{`
                        @keyframes spin {
                            0% {
                                transform: rotate(0deg);
                            }
                            100% {
                                transform: rotate(360deg);
                            }
                        }
                    `}</style>
                </div>
            )}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error("useLoading must be used within a LoadingProvider");
    }
    return context;
}
