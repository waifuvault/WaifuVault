"use client";

import { useCallback, useState } from "react";
import type { ContextMenuItem } from "@/app/components";

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
}

export function useContextMenu() {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        items: [],
    });

    const showContextMenu = useCallback((event: MouseEvent, items: ContextMenuItem[]) => {
        event.preventDefault();
        event.stopPropagation();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const mouseX = event.pageX ?? event.clientX;
        const mouseY = event.pageY ?? event.clientY;

        const menuWidth = 180;
        const menuHeight = Math.min(items.length * 40 + 20, 400);

        let x = mouseX;
        let y = mouseY;

        if (x + menuWidth > viewportWidth) {
            x = mouseX - menuWidth;
        }
        if (y + menuHeight > viewportHeight) {
            y = mouseY - menuHeight;
        }

        x = Math.max(10, x);
        y = Math.max(10, y);

        setContextMenu({
            visible: true,
            x,
            y,
            items,
        });
    }, []);

    const hideContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    return {
        contextMenu,
        showContextMenu,
        hideContextMenu,
    };
}
