import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Next, Req, Res } from "@tsed/common";
import type { Request, Response } from "express";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel.js";

@Middleware()
export class UserOnlyMiddleware implements MiddlewareMethods {
    public use(@Req() req: Request, @Res() res: Response, @Next() next: Next): unknown {
        const user = req.user as CustomUserInfoModel | undefined;
        if (user?.email) {
            return next();
        }
        return new Promise((resolve, reject) => {
            req.logout(err => {
                if (err) {
                    reject(err);
                }
                res.redirect("/login");
                resolve(null);
            });
        });
    }
}
