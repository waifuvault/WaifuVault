import { Get, Hidden, Required, View } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Req, Res } from "@tsed/platform-http";
import { PathParams } from "@tsed/platform-params";
import CaptchaServices from "../../model/constants/CaptchaServices.js";
import { CaptchaManager } from "../../manager/CaptchaManager.js";
import type { Request, Response } from "express";
import { BucketSessionService } from "../../services/BucketSessionService.js";
import { AlbumService } from "../../services/AlbumService.js";
import { NotFound } from "@tsed/exceptions";
import { SettingsService } from "../../services/SettingsService.js";
import { BaseViewController } from "./BaseViewController.js";

@Controller("/")
@Hidden()
export class HomeView extends BaseViewController {
    public constructor(
        @Inject() private captchaManager: CaptchaManager,
        @Inject() private bucketSessionService: BucketSessionService,
        @Inject() private albumService: AlbumService,
        @Inject() settingsService: SettingsService,
    ) {
        super(settingsService);
    }

    @Get()
    @View("index.ejs")
    public showRoot(): unknown {
        return super.mergeWithEnvs();
    }

    @Get("/bucketAccess")
    @View("bucketAccess.ejs")
    public showBucketLoginPage(@Res() res: Response): unknown {
        if (this.bucketSessionService.hasActiveSession()) {
            res.redirect("/admin/bucket");
        }
        const captchaType = this.activeCaptchaService;
        return super.mergeWithEnvs({
            captchaType,
        });
    }

    @Get("/login")
    @View("login.ejs")
    public showLogin(@Req() req: Request, @Res() res: Response): unknown {
        if (req.user) {
            res.redirect("/admin/stats");
        }
        const captchaType = this.activeCaptchaService;
        return super.mergeWithEnvs({
            captchaType,
        });
    }

    @Get("/album/:publicToken")
    @View("album.ejs")
    public async showAlbum(@PathParams("publicToken") @Required() publicToken: string): Promise<unknown> {
        const albumExists = await this.albumService.albumExists(publicToken);
        if (!albumExists) {
            throw new NotFound("Album does not exist");
        }
        const { albumThumb, albumTooBigToDownload, albumName } =
            await this.albumService.getPublicAlbumMetadata(publicToken);
        return super.mergeWithEnvs({
            publicToken,
            albumThumb,
            albumName,
            albumTooBigToDownload,
        });
    }

    private get activeCaptchaService(): CaptchaServices | null {
        return this.captchaManager.engine?.type ?? null;
    }
}
