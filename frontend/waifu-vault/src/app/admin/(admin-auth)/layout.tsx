import { AdminAuthProvider } from "@/app/contexts";
import React from "react";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
    return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
