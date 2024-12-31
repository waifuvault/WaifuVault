import { Inject, Injectable } from "@tsed/di";
import { TransformationFactory } from "../factory/TransformationFactory.js";

@Injectable()
export class ModelTransformationManager {
    public constructor(@Inject() private modelTransformationDtoFactory: TransformationFactory) {}

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
