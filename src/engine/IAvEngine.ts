import {AvScanResult} from "../utils/typeings.js";

export interface IAvEngine {
    scan(resource: string): Promise<AvScanResult> | AvScanResult;

    get enabled(): boolean;
}
