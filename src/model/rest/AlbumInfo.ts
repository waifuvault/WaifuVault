import { Description, Nullable, Property } from "@tsed/schema";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";

export class AlbumInfo {
    @Property()
    @Description("The album that this file belongs to")
    public token: string;

    @Property()
    @Description("The public token of the album that this file belongs to")
    @Nullable(String)
    public publicToken: string | null;

    @Property()
    @Description("The name of the album")
    public name: string;

    @Property()
    @Description("The bucket this album belongs to")
    public bucket: string;

    @Property()
    @Description("When the album was created")
    public dateCreated: number;

    public static fromModel(model: AlbumModel): AlbumInfo {
        return Builder(AlbumInfo)
            .token(model.albumToken)
            .publicToken(model.publicToken)
            .name(model.name)
            .bucket(model.bucketToken)
            .dateCreated(model.createdAt.getTime())
            .build();
    }
}
