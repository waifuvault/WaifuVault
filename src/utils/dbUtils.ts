import { ValueTransformer } from "typeorm/decorator/options/ValueTransformer.js";
import { $log } from "@tsed/logger";
import { AbstractModel } from "../model/db/AbstractModel.js";

export class ColumnNumericTransformer<T extends AbstractModel> implements ValueTransformer {
    private readonly columnName: string;

    public constructor(columnName: keyof T) {
        this.columnName = columnName as string;
    }

    public to(data: number | null): number | null {
        return data;
    }

    public from(data: string | number | null): number | null {
        if (data === null) {
            return null;
        }
        if (typeof data === "number") {
            return data;
        }
        const number = Number.parseInt(data, 10);
        if (Number.isNaN(number)) {
            $log.error(`Invalid number in column ${this.columnName}: ${data}`);
            return 0;
        }
        return number;
    }
}
