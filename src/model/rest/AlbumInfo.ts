import { Description, Property } from "@tsed/schema";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";

export class AlbumInfo {
    @Property()
    @Description("The album that this file belongs to")
    public token: string;

    @Property()
    @Description("The public token of the album that this file belongs to")
    public publicToken: string | null;

    @Property()
    @Description("The name of the album")
    public name: string;

    @Property()
    @Description("The bucket this album belongs to")
    public bucket: string;

    public static fromModel(model: AlbumModel): AlbumInfo {
        return Builder(AlbumInfo)
            .token(model.albumToken)
            .publicToken(model.publicToken)
            .name(model.name)
            .bucket(model.bucketToken)
            .build();
    }
}
