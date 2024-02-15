import {FileUploadModel} from "../../FileUpload.model.js";
import {Builder} from "builder-pattern";
import {ObjectUtils} from "../../../../utils/Utils.js";
import TIME_UNIT from "../../../constants/TIME_UNIT.js";

export const fileUploadModelMock500MB = Builder(FileUploadModel)
    .fileExtension("png")
    .fileName("bar")
    .fileSize(500 * 1024 * 1024)
    .ip("192.168.4.4")
    .token("cdbe690b-552c-4533-a7e9-5802ef4b2f1b")
    .customExpires(null)
    .createdAt(new Date())
    .build();

export const fileUploadModelMockCustomExpire = Builder(FileUploadModel)
    .fileExtension("jpg")
    .fileName("foo")
    .fileSize(3000)
    .ip("192.168.4.3")
    .token("cdbe690b-552c-4533-a7e9-5802ef4b2f1c")
    .customExpires(ObjectUtils.convertToMilli(10, TIME_UNIT.days))
    .createdAt(new Date())
    .build();

export const fileUploadModelMockExpired = Builder(FileUploadModel)
    .fileExtension("jpg")
    .fileName("fooexpired")
    .fileSize(3000)
    .ip("192.168.4.3")
    .token("cdbe690b-552c-4533-a7e9-5802ef4b2f1d")
    .customExpires(ObjectUtils.convertToMilli(10, TIME_UNIT.days))
    .createdAt(new Date(319441000))
    .build();

export const fileUploadModelMockExpired2 = Builder(FileUploadModel)
    .fileExtension("jpg")
    .fileName("foo")
    .fileSize(3000)
    .ip("192.168.4.3")
    .token("cdbe690b-552c-4533-a7e9-5802ef4b2f1a")
    .customExpires(ObjectUtils.convertToMilli(12, TIME_UNIT.milliseconds))
    .createdAt(new Date(1707876326))
    .build();

export function getAllFileUploadMocks(): FileUploadModel[] {
    return [fileUploadModelMock500MB, fileUploadModelMockCustomExpire, fileUploadModelMockExpired, fileUploadModelMockExpired2];
}
