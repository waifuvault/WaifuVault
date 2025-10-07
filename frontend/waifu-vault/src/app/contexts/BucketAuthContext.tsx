"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface BucketAuthContextType {
    isAuthenticated: boolean | null;
    setIsAuthenticated: (auth: boolean | null) => void;
}

const BucketAuthContext = createContext<BucketAuthContextType | null>(null);

export function BucketAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    return (
        <BucketAuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
            {children}
        </BucketAuthContext.Provider>
    );
}

export function useBucketAuthContext() {
    const context = useContext(BucketAuthContext);
    if (!context) {
        throw new Error("useBucketAuth must be used within BucketAuthProvider");
    }
    return context;
}
