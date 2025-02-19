import { InjectContext, Service } from "@tsed/di";
import type { PlatformContext } from "@tsed/common";
import { BucketModel } from "../model/db/Bucket.model.js";
import { dbType } from "../config/envs/index.js";
import type { Session } from "express-session";

@Service()
export class BucketSessionService {
    @InjectContext()
    protected $ctx?: PlatformContext;

    public destroySession(): void {
        delete this.getSession()?.bucket;
    }

    public createSession(bucket: BucketModel): void {
        const session = this.getSession();
        if (session) {
            session.bucket = bucket.bucketToken;
        }
    }

    public getSessionToken(): Promise<string | null> {
        return this.getBucketSession();
    }

    public async hasActiveSession(): Promise<boolean> {
        return (await this.getSessionToken()) !== null;
    }

    private async getBucketSession(): Promise<string | null> {
        const session = this.getSession();
        if (!session) {
            return null;
        }
        if (this.getSession()?.bucket) {
            return this.getSession()?.bucket as string;
        }

        // weird fix for postgres
        if (dbType === "postgres") {
            await new Promise(resolve => setTimeout(resolve, 300));
            await this.reloadSession();
        }
        return (this.getSession()?.bucket as string) ?? null;
    }

    private getSession(): Record<string, unknown> | null {
        return this.$ctx?.request?.session ?? null;
    }

    private reloadSession(): Promise<void> {
        return new Promise((resolve, reject) => {
            (this.getSession() as unknown as Session)?.reload(err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}
