export async function swapFileOrder(
    albumToken: string,
    fileId: number,
    oldPosition: number,
    newPosition: number,
): Promise<void> {
    const response = await fetch(`/album/${albumToken}/swapFileOrder/${fileId}/${oldPosition}/${newPosition}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to swap file order" }));
        throw new Error(error.message || "Failed to swap file order");
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error("File order swap failed");
    }
}
