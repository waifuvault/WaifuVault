import { BucketAuthProvider } from "@/app/contexts";
import React from "react";

export default function BucketAuthLayout({ children }: { children: React.ReactNode }) {
    return <BucketAuthProvider>{children}</BucketAuthProvider>;
}
