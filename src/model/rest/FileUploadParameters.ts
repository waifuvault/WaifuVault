import { Description, Name, Optional, Pattern, Property } from "@tsed/schema";

@Name("WaifuUploadParameters")
@Description("Upload parameters for put requests")
export class FileUploadParameters {
    @Description(
        "a string containing a number and a letter of `m` for mins, `h` for hours, `d` for days. For example: `1h` would be 1 hour and `1d` would be 1 day. leave this blank if you want the file to exist according to the retention policy",
    )
    @Pattern(/^$|^\d+[mhd]$/)
    @Optional()
    @Property()
    public expires?: string;

    @Description(
        "if set to true, then your filename will not appear in the URL. if false, then it will appear in the URL. defaults to false",
    )
    @Optional()
    @Property()
    public hide_filename?: boolean;

    @Description(
        "Set a password for this file, this will encrypt the file on the server that not even the server owner can obtain it, when fetching the file. you can fill out the `x-password` http header with your password to obtain the file via API",
    )
    @Optional()
    @Property()
    public password?: string;

    @Description("Shh, it's a secret ;)")
    @Optional()
    @Property()
    public secret_token?: string;
}
