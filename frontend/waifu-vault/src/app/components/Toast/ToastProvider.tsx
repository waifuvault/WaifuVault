"use client";

import React, { createContext, PropsWithChildren, useCallback, useContext, useState } from "react";
import { Toast, type ToastProps, type ToastType } from "./Toast";

interface ToastContextType {
    showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

interface ToastState extends Omit<ToastProps, "onClose" | "bottom"> {
    id: string;
}

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<ToastState[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, title?: string, duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const newToast: ToastState = {
            id,
            type,
            title,
            message,
            duration,
        };

        setToasts(prev => [...prev, newToast]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast, index) => (
                    <Toast key={toast.id} {...toast} bottom={16 + index * 80} onClose={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
