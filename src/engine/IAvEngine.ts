import { AvScanResult, Awaitable } from "../utils/typeings.js";

export interface IAvEngine {
    /**
     * Scan a file using the av service defined
     * @param {string} resource
     * @returns {Awaitable<AvScanResult>}
     */
    scan(resource: string): Awaitable<AvScanResult>;

    /**
     * Return true if this engine is enabled
     * @returns {Awaitable<boolean>}
     */
    get enabled(): Awaitable<boolean>;

    /**
     * Get the name of this engine. normally returns the name of the AV service being used
     * @returns {Awaitable<string>}
     */
    get name(): Awaitable<string>;
}
