import { Restriction } from "@/app/types/restrictions";

export async function getRestrictions(backendRestBaseUrl: string): Promise<Restriction[]> {
    const response = await fetch(`${backendRestBaseUrl}/resources/restrictions`);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch restrictions" }));
        throw new Error(error.message || "Failed to fetch restrictions");
    }

    return response.json();
}
