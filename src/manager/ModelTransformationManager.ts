import { Inject, Injectable } from "@tsed/di";
import { TransformationFactory } from "../factory/TransformationFactory.js";

@Injectable()
export class ModelTransformationManager {
    public constructor(@Inject() private modelTransformationDtoFactory: TransformationFactory) {}

    /**
     * Transform an input to an output, if there is no transformer, or the input can't be transformed, null is returned
     * @param {T} input
     * @returns {Promise<R | null>}
     */
    public transform<T, R>(input: T): Promise<R | null> {
        const transformer = this.modelTransformationDtoFactory.getTransformer<T, R>(input);
        if (transformer) {
            if (input instanceof Promise) {
                return input.then(i => transformer.transform(i));
            }
            return transformer.transform(input);
        }
        return Promise.resolve(null);
    }
}
