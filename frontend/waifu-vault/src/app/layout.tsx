import type { Metadata, Viewport } from "next";
import "./globals.scss";
import "./styles/themes.scss";
import React from "react";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import "bootstrap-icons/font/bootstrap-icons.css";

const opts = {
    description: "No Nonsense Temporary File Hosting",
    title: "WaifuVault",
};

export const metadata: Metadata = {
    ...opts,
    authors: [{ name: "Victoria" }],
    icons: {
        apple: "/favicon.ico",
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
    },
    keywords: [
        "file upload",
        "waifuvault",
        "temporary hosting",
        "drag and drop",
        "file sharing",
        "File",
        "Hosting",
        "Temporary",
    ],
    manifest: "/site.webmanifest",
    openGraph: {
        ...opts,
        images: [
            {
                alt: "WaifuVault Uploader",
                height: 335,
                type: "image/webp",
                url: "https://waifuvault.moe/assets/custom/images/vic_vault.webp",
                width: 300,
            },
        ],
        siteName: "WaifuVault Uploader",
        type: "website",
        url: "https://upload.waifuvault.moe",
    },
    twitter: {
        ...opts,
        card: "summary_large_image",
        images: ["https://waifuvault.moe/assets/custom/images/vic_vault.webp"],
    },
};

export const viewport: Viewport = {
    initialScale: 1,
    width: "device-width",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link href="/favicon.ico" rel="icon" type="image/x-icon" />
                <link href="/site.webmanifest" rel="manifest" />
                <meta content="#667eea" name="theme-color" />
            </head>
            <body>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
