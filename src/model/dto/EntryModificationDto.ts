import { Description, Optional, Property } from "@tsed/schema";
import { BadRequest } from "@tsed/exceptions";
import { BeforeDeserialize } from "@tsed/json-mapper";

@BeforeDeserialize((data: Record<keyof EntryModificationDto, unknown>) => {
    if (data.customExpiry) {
        const checkExpires = /[mhd]/;
        if (typeof data.customExpiry !== "string") {
            throw new BadRequest("bad expire string format");
        }
        data.customExpiry = data.customExpiry.toLowerCase().replace(/ /g, "");
        if (!checkExpires.test(data.customExpiry as string)) {
            throw new BadRequest("bad expire string format");
        }
    }
    return data;
})
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
    public customExpiry?: string;

    @Property()
    @Optional()
    @Description(
        "if set to true, then your filename will not appear in the URL. if false, then it will appear in the URL. defaults to false",
    )
    public hideFilename?: boolean;
}
