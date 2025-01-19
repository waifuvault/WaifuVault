import { Inject, Injectable } from "@tsed/di";
import { TransformationFactory } from "../factory/TransformationFactory.js";

@Injectable()
export class TransformationManager {
    public constructor(@Inject() private transformationDtoFactory: TransformationFactory) {}

    /**
     * Transform an input to an output, if there is no transformer, or the input can't be transformed, null is returned
     * @param {T} input
     * @returns {Promise<R | null>}
     */
    public transform<T, R>(input: T | T[]): Promise<R | R[] | null> {
        if (Array.isArray(input)) {
            return (Promise.all(input.map(i => this.transformItem(i))) as Promise<R[]>)
                .then(r => r.filter(i => i !== null))
                .then(r => {
                    if (r.length === 0) {
                        // no objects could be transformed, return null
                        return null;
                    }
                    if (input.length !== r.length) {
                        // some objects could be transformed, some can't, this is a mixed array, error
                        throw new Error("Unable to transform array");
                    }
                    return r;
                }) as Promise<R[] | null>;
        }
        return this.transformItem(input);
    }

    private transformItem<T, R>(input: T): Promise<R | null> {
        const transformer = this.transformationDtoFactory.getTransformer<T, R>(input);
        if (transformer) {
            if (input instanceof Promise) {
                return input.then(i => transformer.transform(i));
            }
            return transformer.transform(input);
        }
        return Promise.resolve(null);
    }
}
