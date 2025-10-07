import { Description, Name, Nullable, Property } from "@tsed/schema";

@Name("CaptchaConfig")
@Description("Captcha configuration response")
export class CaptchaConfigDto {
    @Name("captchaType")
    @Description("Type of captcha service (turnstile, reCAPTCHA, hCaptcha)")
    @Property()
    @Nullable(String)
    public captchaType: string | null;

    @Name("siteKey")
    @Description("Captcha site key for client-side integration")
    @Property()
    @Nullable(String)
    public siteKey: string | null;

    public constructor(captchaType: string | null, siteKey: string | null) {
        this.captchaType = captchaType;
        this.siteKey = siteKey;
    }
}
