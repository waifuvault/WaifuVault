import {Property} from "@tsed/schema";
import {FileUploadModel} from "../db/FileUpload.model";

export class FileUploadModelResponse {

    @Property()
    public token: string;
    @Property()
    public url: string;

    public constructor(fileUploadModel: FileUploadModel, baseUrl: string) {
        this.url = `${baseUrl}/f/${fileUploadModel.fileName}`;
        this.token = fileUploadModel.token;
    }
}
