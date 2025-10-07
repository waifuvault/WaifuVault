import { BucketAuthProvider } from "@/app/contexts";
import React from "react";

export default function BucketAccessLayout({ children }: { children: React.ReactNode }) {
    return <BucketAuthProvider>{children}</BucketAuthProvider>;
}
