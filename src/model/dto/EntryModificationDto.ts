import { Description, Name, Optional, Pattern, Property } from "@tsed/schema";

@Name("WaifuModification")
@Description("A modify request to change components of an entry")
export class EntryModificationDto {
    @Property()
    @Optional()
    @Description(
        'Set/change the password. If changing a password, then `previousPassword` must be set. leave as empty string "" to remove the password',
    )
    public password?: string;

    @Property()
    @Optional()
    @Description("The current password for this file. only needs to be set if you are changing a password")
    public previousPassword?: string;

    @Property()
    @Description(
        "a string containing a number and a letter of `m` for mins, `h` for hours, `d` for days. For example: `1h` would be 1 hour and `1d` would be 1 day. " +
            "make this an empty string to reset the expiry back to defaults. " +
            "NOTE: the file expiry will be recalculated from the moment you change this value, not the time it was uploaded (the standard retention rate limit still has effect).",
    )
    @Optional()
    @Pattern(/^$|^\d+[mhd]$/)
    public customExpiry?: string;

    @Property()
    @Optional()
    @Description(
        "if set to true, then your filename will not appear in the URL. if false, then it will appear in the URL. defaults to false",
    )
    public hideFilename?: boolean;
}
