"use client";

import { useEffect } from "react";
import { useAdminAuthContext } from "@/app/contexts";
import { useAdminAuth } from "@/app/hooks";

export default function AdminPage() {
    const { isAuthenticated } = useAdminAuthContext();
    const { checkAuth, logout } = useAdminAuth();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <p>Admin Auth Status: {isAuthenticated ? "Logged in" : "Not logged in"}</p>
            {isAuthenticated && <button onClick={logout}>Logout</button>}
        </div>
    );
}
