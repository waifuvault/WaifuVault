import { ValueTransformer } from "typeorm/decorator/options/ValueTransformer.js";

export class ColumnNumericTransformer implements ValueTransformer {
    public to(data: number): number {
        return data;
    }

    public from(data: string): number {
        return parseInt(data, 10);
    }
}
