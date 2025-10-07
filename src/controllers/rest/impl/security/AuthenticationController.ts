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
import { GlobalEnv } from "../../../../model/constants/GlobalEnv.js";
import { SettingsService } from "../../../../services/SettingsService.js";

@Controller("/auth")
@Scope(ProviderScope.SINGLETON)
@Hidden()
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class AuthenticationController extends BaseRestController {
    private readonly frontEndUrl: string | null;

    public constructor(
        @Inject() private usersService: UserService,
        @Inject() private bucketSessionService: BucketSessionService,
        @Inject() private userService: UserService,
        @Inject() settingsService: SettingsService,
    ) {
        super();
        this.frontEndUrl = settingsService.getSetting(GlobalEnv.FRONT_END_URL);
    }

    @Post("/authenticate_bucket")
    @UseBefore(CaptchaMiddleWare)
    @UseBefore(AuthenticateBucket)
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    @Returns(StatusCodes.UNAUTHORIZED)
    public authenticateBucket(@Res() res: Response): void {
        let bucketUrl = "/admin/bucket";
        if (this.frontEndUrl) {
            bucketUrl = this.frontEndUrl + "/admin/bucket";
        }
        res.redirect(bucketUrl);
    }

    @Post("/authenticate_bucket_frontend")
    @UseBefore(CaptchaMiddleWare)
    @UseBefore(AuthenticateBucket)
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.UNAUTHORIZED)
    public authenticateBucketFrontend(@Res() res: PlatformResponse): PlatformResponse {
        return this.doSuccess(res, "Authentication successful");
    }

    @Post("/login")
    @UseBefore(CaptchaMiddleWare)
    @Authenticate("loginAuthProvider", { failWithError: true })
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    @Returns(StatusCodes.UNAUTHORIZED)
    public login(@Res() res: Response): void {
        let loginUrl = "/admin";
        if (this.frontEndUrl) {
            loginUrl = this.frontEndUrl + "/admin";
        }
        res.redirect(loginUrl);
    }

    @Get("/bucket_status")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.UNAUTHORIZED)
    public bucketStatus(@Res() res: PlatformResponse): PlatformResponse {
        if (!this.bucketSessionService.hasActiveSession()) {
            return this.doError(res, "Not authenticated", StatusCodes.UNAUTHORIZED);
        }
        return this.doSuccess(res, "Authenticated");
    }

    @Get("/login_status")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.UNAUTHORIZED)
    public isLoggedIn(@Res() res: PlatformResponse): PlatformResponse {
        if (!this.userService.isLoggedIn()) {
            return this.doError(res, "Not authenticated", StatusCodes.UNAUTHORIZED);
        }
        return this.doSuccess(res, "Authenticated");
    }

    @Get("/close_bucket")
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    public closeBucket(@Res() res: Response): void {
        if (this.bucketSessionService.hasActiveSession()) {
            this.bucketSessionService.destroySession();
        }
        res.redirect(this.frontEndUrl ?? "/bucketAccess");
    }

    @Get("/logout")
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    public logout(@Req() request: Request, @Res() res: Response): Promise<void> {
        return new Promise((resolve, reject) => {
            request.logout(err => {
                if (err) {
                    reject(err);
                }
                res.redirect(this.frontEndUrl ?? "/");
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
