import { Controller, Inject, ProviderScope, Scope } from "@tsed/di";
import { Authenticate, Authorize } from "@tsed/passport";
import { Get, Hidden, Post, Returns, Security } from "@tsed/schema";
import { PlatformResponse, Req, Res } from "@tsed/platform-http";
import { UseBefore } from "@tsed/platform-middlewares";
import { StatusCodes } from "http-status-codes";
import { BodyParams } from "@tsed/platform-params";
import { UserModel } from "../../../../model/db/User.model.js";
import { BaseRestController } from "../../BaseRestController.js";
import { CustomUserInfoModel } from "../../../../model/auth/CustomUserInfoModel.js";
import { UserService } from "../../../../services/UserService.js";
import { CaptchaMiddleWare } from "../../../../middleware/endpoint/CaptchaMiddleWare.js";
import { DefaultRenderException } from "../../../../model/rest/DefaultRenderException.js";
import type { Request, Response } from "express";
import { AuthenticateBucket } from "../../../../middleware/endpoint/AuthenticateBucket.js";
import { BucketSessionService } from "../../../../services/BucketSessionService.js";
import { SuccessModel } from "../../../../model/rest/SuccessModel.js";

@Controller("/auth")
@Scope(ProviderScope.SINGLETON)
@Hidden()
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class AuthenticationController extends BaseRestController {
    public constructor(
        @Inject() private usersService: UserService,
        @Inject() private bucketSessionService: BucketSessionService,
    ) {
        super();
    }

    @Post("/authenticate_bucket")
    @UseBefore(CaptchaMiddleWare)
    @UseBefore(AuthenticateBucket)
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    @Returns(StatusCodes.UNAUTHORIZED)
    public authenticateBucket(@Res() res: Response): void {
        res.redirect("/admin/bucket");
    }

    @Post("/login")
    @UseBefore(CaptchaMiddleWare)
    @Authenticate("loginAuthProvider", { failWithError: true })
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    @Returns(StatusCodes.UNAUTHORIZED)
    public login(@Res() res: Response): void {
        res.redirect("/admin");
    }

    @Get("/close_bucket")
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    public closeBucket(@Res() res: Response): void {
        if (this.bucketSessionService.hasActiveSession()) {
            this.bucketSessionService.destroySession();
        }
        res.redirect("/bucketAccess");
    }

    @Get("/logout")
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    public logout(@Req() request: Request, @Res() res: Response): Promise<void> {
        return new Promise((resolve, reject) => {
            request.logout(err => {
                if (err) {
                    reject(err);
                }
                res.redirect("/");
                resolve();
            });
        });
    }

    @Post("/changeDetails")
    @Authorize("loginAuthProvider")
    @Security("loginAuthProvider")
    @Returns(StatusCodes.OK, SuccessModel)
    public async changeDetails(
        @Res() res: PlatformResponse,
        @Req() req: Request,
        @BodyParams() userDetails: UserModel,
    ): Promise<PlatformResponse> {
        const loggedInUser = req.user as CustomUserInfoModel;
        await this.usersService.changeDetails(userDetails, loggedInUser);
        return this.doSuccess(res, "User details changed");
    }
}
