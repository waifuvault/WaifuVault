import {Controller, Inject, ProviderScope, Scope} from "@tsed/di";
import {Authenticate, Authorize} from "@tsed/passport";
import {Get, Hidden, Post, Returns, Security} from "@tsed/schema";
import {PlatformResponse, Req, Res} from "@tsed/common";
import {StatusCodes} from "http-status-codes";
import {BodyParams} from "@tsed/platform-params";
import {UserModel} from "../../../../model/db/User.model.js";
import {BaseRestController} from "../../BaseRestController.js";
import {CustomUserInfoModel} from "../../../../model/auth/CustomUserInfoModel.js";
import {UserService} from "../../../../services/UserService.js";

@Controller("/auth")
@Scope(ProviderScope.SINGLETON)
@Hidden()
export class PassportCtrl extends BaseRestController {

    public constructor(
        @Inject() private usersService: UserService
    ) {
        super();
    };


    @Post("/login")
    @Authenticate("login", {failWithError: true})
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    @Returns(StatusCodes.UNAUTHORIZED)
    public login(@Req() req: Req, @Res() res: Res): void {
        res.redirect("/secure");
    }

    @Get("/logout")
    @Returns(StatusCodes.MOVED_TEMPORARILY)
    public logout(@Req() request: Req, @Res() res: Res): void {
        request.session.destroy(function () {
            res.redirect('/');
        });
    }

    @Post("/changeDetails")
    @Authorize("login")
    @Security("login")
    @Returns(StatusCodes.OK)
    public async changeDetails(@Res() res: PlatformResponse, @Req() req: Req, @BodyParams() userDetails: UserModel): Promise<PlatformResponse> {
        const loggedInUser = req.user as CustomUserInfoModel;
        await this.usersService.changeDetails(userDetails, loggedInUser);
        return this.doSuccess(res, "User details changed");
    }
}
