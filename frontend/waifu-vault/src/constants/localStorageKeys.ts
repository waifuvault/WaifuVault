export const THEME_KEY = "waifuvault-theme";
export const PARTICLES_ENABLED_KEY = "waifuvault-particles-enabled";
export const ALBUM_SIDEBAR_COLLAPSED_KEY = "waifuvault-albumsidebar-collapsed";
export const SELECTED_ALBUM_KEY = "waifuvault-selected-album";
export const ALBUM_SORT_BY_KEY = "waifuvault-album-sort-by";
export const ALBUM_SORT_DIR_KEY = "waifuvault-album-sort-dir";
export const PAGINATION_PAGE_PREFIX = "waifuvault-pagination-page";
export const PAGINATION_SIZE_PREFIX = "waifuvault-pagination-size";
export const VIEW_MODE_PREFIX = "waifuvault-view-mode";
export const SORT_FIELD_PREFIX = "waifuvault-sort-field";
export const SORT_ORDER_PREFIX = "waifuvault-sort-order";
export const PINNED_ALBUMS_KEY = "waifuvault-pinned-albums";

type LocalStorageKey =
    | typeof THEME_KEY
    | typeof PARTICLES_ENABLED_KEY
    | typeof ALBUM_SIDEBAR_COLLAPSED_KEY
    | typeof SELECTED_ALBUM_KEY
    | typeof ALBUM_SORT_BY_KEY
    | typeof ALBUM_SORT_DIR_KEY
    | typeof PAGINATION_PAGE_PREFIX
    | typeof PAGINATION_SIZE_PREFIX
    | typeof VIEW_MODE_PREFIX
    | typeof SORT_FIELD_PREFIX
    | typeof SORT_ORDER_PREFIX
    | typeof PINNED_ALBUMS_KEY;

export const LocalStorage = {
    getBoolean: (key: LocalStorageKey, defaultValue: boolean = false): boolean => {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    setBoolean: (key: LocalStorageKey, value: boolean): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    },

    getString: (key: LocalStorageKey, defaultValue: string = ""): string => {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch {
            return defaultValue;
        }
    },

    getNumber: (key: LocalStorageKey, defaultValue: number = 0): number => {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? Number.parseInt(value, 10) || defaultValue : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    setNumber: (key: LocalStorageKey, value: number): void => {
        try {
            localStorage.setItem(key, value.toString());
        } catch {}
    },

    setString: (key: LocalStorageKey, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch {}
    },

    remove: (key: LocalStorageKey): void => {
        try {
            localStorage.removeItem(key);
        } catch {}
    },

    getNumberDynamic: (key: string, defaultValue: number = 0): number => {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? Number.parseInt(value, 10) || defaultValue : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    setNumberDynamic: (key: string, value: number): void => {
        try {
            localStorage.setItem(key, value.toString());
        } catch {}
    },

    getStringDynamic: (key: string, defaultValue: string = ""): string => {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch {
            return defaultValue;
        }
    },

    setStringDynamic: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch {}
    },

    getJson: <T>(key: LocalStorageKey, defaultValue: T): T => {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    setJson: <T>(key: LocalStorageKey, value: T): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    },
};

export const getPaginationKey = (albumToken: string | null | undefined): string => {
    return `${PAGINATION_PAGE_PREFIX}-${albumToken || "all"}`;
};

export const getPaginationSizeKey = (albumToken: string | null | undefined): string => {
    return `${PAGINATION_SIZE_PREFIX}-${albumToken || "all"}`;
};

export const getViewModeKey = (albumToken: string | null | undefined): string => {
    return `${VIEW_MODE_PREFIX}-${albumToken || "all"}`;
};

export const getSortFieldKey = (albumToken: string | null | undefined): string => {
    return `${SORT_FIELD_PREFIX}-${albumToken || "all"}`;
};

export const getSortOrderKey = (albumToken: string | null | undefined): string => {
    return `${SORT_ORDER_PREFIX}-${albumToken || "all"}`;
};
