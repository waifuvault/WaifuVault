import { Inject, Injectable } from "@tsed/di";
import { TRANSFORMER } from "../model/di/tokens.js";
import { ITransformer } from "../engine/ITransformer.js";

/**
 * Get a transformation engine for the given model
 */
@Injectable()
export class TransformationFactory {
    public constructor(@Inject(TRANSFORMER) private readonly processors: ITransformer<unknown, unknown>[]) {}

    public getTransformer<T, R>(input: unknown): ITransformer<T, R> | null {
        return (this.processors.find(p => p.supportsInput(input)) as ITransformer<T, R>) ?? null;
    }
}
