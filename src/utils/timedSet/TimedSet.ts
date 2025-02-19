import { ITimedSet } from "./ITimedSet.js";

/**
 * This set will evict items from the array after the set timeout.
 * This set can only contain unique items, items are unique when === is true
 */
export class TimedSet<T> implements ITimedSet<T> {
    private _map: Map<T, Timer>;

    /**
     * @param _timeOut - Timeout in milliseconds
     */
    public constructor(private _timeOut: number) {
        if (Number.isNaN(_timeOut)) {
            throw new Error("Please supply a number");
        }

        this._map = new Map();
    }

    public get size(): number {
        return this._map.size;
    }

    /**
     * Get the raw underlying set backing this times array.
     */
    public get rawSet(): T[] {
        return [...this._map.keys()];
    }

    public get [Symbol.toStringTag](): string {
        return "Set";
    }

    public isEmpty(): boolean {
        return this._map.size === 0;
    }

    public add(key: T, timeoutOverload?: number): this {
        const timer = new Timer(() => {
            this._map.delete(key);
        }, timeoutOverload ?? this._timeOut);
        this._map.set(key, timer);
        return this;
    }

    public has(value: T): boolean {
        return this._map.has(value);
    }

    public delete(key: T): boolean {
        if (!this._map.has(key)) {
            return false;
        }

        const timeoutFunction = this._map.get(key) as Timer;
        timeoutFunction.clearTimer();
        return this._map.delete(key);
    }

    public refresh(key: T): boolean {
        if (!this._map.has(key)) {
            return false;
        }

        const timeoutFunction = this._map.get(key) as Timer;
        timeoutFunction.clearTimer();
        this.add(key);
        return true;
    }

    public clear(): void {
        for (const [, value] of this._map) {
            value.clearTimer();
        }

        this._map = new Map();
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this._map.keys();
    }

    public entries(): IterableIterator<[T, T]> {
        const keysArray = Array.from(this._map.keys());
        return keysArray.map(key => [key, key] as [T, T])[Symbol.iterator]();
    }

    public forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: unknown): void {
        this._map.forEach((_, key) => {
            callbackfn.call(thisArg, key, key, new Set(this._map.keys()));
        });
    }

    public keys(): IterableIterator<T> {
        return this._map.keys();
    }

    public values(): IterableIterator<T> {
        return this._map.keys();
    }

    public getTimeRemaining(key: T): number {
        const item = this._map.get(key);
        if (!item) {
            return -1;
        }
        return item.timeLeft;
    }
}

class Timer {
    public id: NodeJS.Timeout;
    private _whenWillExecute: number;

    public constructor(callback: (...args: unknown[]) => void, delay: number) {
        this._whenWillExecute = Date.now() + delay;
        this.id = setTimeout(callback, delay);
    }

    public get timeLeft(): number {
        return this._whenWillExecute - Date.now();
    }

    public clearTimer(): void {
        clearTimeout(this.id);
        this._whenWillExecute = -1;
    }
}
