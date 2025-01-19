/**
 * define a model transformer, where the IN type is a model and the OUT is a DTO
 */
export interface ITransformer<IN, OUT> {
    transform(input: IN): Promise<OUT>;
    supportsInput(input: unknown): boolean;
}
