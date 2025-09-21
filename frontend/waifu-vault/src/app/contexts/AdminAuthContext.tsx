"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface AdminAuthContextType {
    isAuthenticated: boolean | null;
    setIsAuthenticated: (auth: boolean | null) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    return (
        <AdminAuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuthContext() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within AdminAuthProvider");
    }
    return context;
}
