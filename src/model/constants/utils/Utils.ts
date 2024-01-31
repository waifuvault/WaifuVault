export class ObjectUtils {

    public static getEnumAsObject(obj: Record<string, unknown>): Record<string, unknown> {
        const retObj: Record<string, unknown> = {};
        for (const [propertyKey, propertyValue] of Object.entries(obj)) {
            if (!Number.isNaN(Number(propertyKey))) {
                continue;
            }
            // @ts-ignore
            retObj[propertyValue] = propertyKey;
        }
        return retObj;
    }

    public static removeObjectFromArray<T>(arr: T[], predicate: (itm: T) => boolean): void {
        let arrLen = arr.length;
        while (arrLen--) {
            const currentItem = arr[arrLen];
            if (predicate(currentItem)) {
                arr.splice(arrLen, 1);
            }
        }
    }
}
