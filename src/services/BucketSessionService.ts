import { InjectContext, Service } from "@tsed/di";
import type { PlatformContext } from "@tsed/platform-http";
import { BucketModel } from "../model/db/Bucket.model.js";

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

    public getSessionToken(): string | null {
        return this.getBucketSession();
    }

    public hasActiveSession(): boolean {
        return this.getSessionToken() !== null;
    }

    private getBucketSession(): string | null {
        return this.$ctx?.request?.session?.bucket ?? null;
    }

    private getSession(): Record<string, unknown> | null {
        return this.$ctx?.request?.session ?? null;
    }
}
