import { Metadata } from "next";
import PublicAlbumClient from "./PublicAlbumClient";
import { getPublicAlbum } from "@/app/utils/api/albumApi";
import type { PublicAlbumData } from "@/app/utils";

interface PageProps {
    params: Promise<{
        publicToken: string;
    }>;
}

async function fetchAlbumData(publicToken: string): Promise<PublicAlbumData | null> {
    try {
        const backendRestBaseUrl = process.env.NEXT_PUBLIC_WAIFUVAULT_BACKEND;
        if (!backendRestBaseUrl) {
            throw new Error("Backend URL not configured");
        }

        return await getPublicAlbum(`${backendRestBaseUrl}/rest`, publicToken);
    } catch (error) {
        console.error("Failed to fetch album data:", error);
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { publicToken } = await params;
    const albumData = await fetchAlbumData(publicToken);

    const baseUrl = process.env.NEXT_PUBLIC_WAIFUVAULT_BACKEND;
    const defaultImage = `${baseUrl}/assets/custom/images/vic_vault.webp`;

    if (!albumData) {
        return {
            title: "Album Not Found | WaifuVault",
            description: "The album you're looking for doesn't exist or has been made private.",
            openGraph: {
                title: "Album Not Found | WaifuVault",
                description: "The album you're looking for doesn't exist or has been made private.",
                url: `${baseUrl}/album/${publicToken}`,
                siteName: "WaifuVault",
                images: [{ url: defaultImage }],
            },
            twitter: {
                card: "summary_large_image",
                title: "Album Not Found | WaifuVault",
                description: "The album you're looking for doesn't exist or has been made private.",
                images: [defaultImage],
            },
        };
    }

    const title = `Album | ${albumData.name}`;
    const description = "An album shared through WaifuVault.moe";
    const image = albumData.albumThumb ?? defaultImage;
    const url = `${baseUrl}/album/${publicToken}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            siteName: "WaifuVault",
            images: [{ url: image }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
    };
}

export default async function PublicAlbumPage({ params }: PageProps) {
    const { publicToken } = await params;
    const albumData = await fetchAlbumData(publicToken);

    return <PublicAlbumClient albumData={albumData} publicToken={publicToken} />;
}
