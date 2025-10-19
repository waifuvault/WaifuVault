import { PropsWithChildren } from "react";
import { Button, Dialog } from "@/app/components";
import { useTheme } from "@/app/contexts";
import styles from "./ConfirmDialog.module.scss";

interface ConfirmDialogProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    confirmText: string;
    cancelText: string;
    confirmIcon: string;
}

export function ConfirmDialog({
    isOpen,
    onCancel,
    onConfirm,
    title,
    children,
    confirmText,
    cancelText,
    confirmIcon,
}: PropsWithChildren<ConfirmDialogProps>) {
    const { getThemeClass } = useTheme();
    return (
        <Dialog
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            maxWidth="450px"
            className={getThemeClass() === "themeMinimal" ? styles.solidDialogLight : styles.solidDialog}
        >
            <div style={{ padding: "1rem 0" }}>
                <div style={{ marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: "1.4" }}>{children}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Button variant="danger" onClick={onConfirm}>
                        <i className={confirmIcon} style={{ marginRight: "0.5rem" }}></i>
                        {confirmText}
                    </Button>

                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
