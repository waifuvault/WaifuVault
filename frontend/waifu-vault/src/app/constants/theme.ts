export enum ThemeType {
    ANIME = "anime",
    CYBERPUNK = "cyberpunk",
    GREEN_PHOSPHOR = "terminal",
    ORANGE_PHOSPHOR = "orangeterminal",
    STEAMPUNK = "steampunk",
    MINIMAL = "minimal",
    DEFAULT = ANIME,
}

export function isTerminal(theme: ThemeType): boolean {
    return theme === ThemeType.ORANGE_PHOSPHOR || theme === ThemeType.GREEN_PHOSPHOR;
}
