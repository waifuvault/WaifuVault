import { Default, Description, Name, Optional, Pattern, Property } from "@tsed/schema";

export class FileUploadQueryParameters {
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
    @Name("hide_filename")
    @Default(false)
    public hideFilename?: boolean;

    @Description("If this is true, then the file will be deleted as soon as it is accessed")
    @Optional()
    @Property()
    @Default(false)
    public oneTimeDownload?: boolean;
}
