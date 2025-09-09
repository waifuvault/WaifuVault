export const THEME_KEY = "waifuvault-theme";
export const PARTICLES_ENABLED_KEY = "waifuvault-particles-enabled";
export const ALBUM_SIDEBAR_COLLAPSED_KEY = "waifuvault-albumsidebar-collapsed";
export const SELECTED_ALBUM_KEY = "waifuvault-selected-album";
export const ALBUM_SORT_BY_KEY = "waifuvault-album-sort-by";
export const ALBUM_SORT_DIR_KEY = "waifuvault-album-sort-dir";

type LocalStorageKey =
    | typeof THEME_KEY
    | typeof PARTICLES_ENABLED_KEY
    | typeof ALBUM_SIDEBAR_COLLAPSED_KEY
    | typeof SELECTED_ALBUM_KEY
    | typeof ALBUM_SORT_BY_KEY
    | typeof ALBUM_SORT_DIR_KEY;

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
};
