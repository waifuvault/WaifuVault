import {FileUploadModel} from "../../../model/db/FileUpload.model";
import {Builder} from "builder-pattern";
import {ObjectUtils} from "../../../utils/Utils";
import TIME_UNIT from "../../../model/constants/TIME_UNIT";

export const fileUploadModelMock1 = Builder(FileUploadModel)
    .fileExtension("jpg")
    .fileName("foo")
    .fileSize(3000)
    .ip("192.168.4.3")
    .token("cdbe690b-552c-4533-a7e9-5802ef4b2f1a")
    .customExpires(ObjectUtils.convertToMilli(12, TIME_UNIT.milliseconds))
    .createdAt(new Date(1707876326))
    .build();
