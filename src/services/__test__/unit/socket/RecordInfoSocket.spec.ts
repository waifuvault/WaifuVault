import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate } from "../../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { RecordInfoSocket } from "../../../socket/RecordInfoSocket.js";
import { FileRepo } from "../../../../db/repo/FileRepo.js";
import { FileDao } from "../../../../db/dao/FileDao.js";
import { RecordInfoPayload } from "../../../../utils/typeings.js";
import { ObjectUtils } from "../../../../utils/Utils.js";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await PlatformTest.reset();
    });

    describe("emit", () => {
        it(
            "should process expired Files with success",
            PlatformTest.inject(
                [RecordInfoSocket, FileRepo, FileDao],
                async (recordInfoSocket: RecordInfoSocket, repo: FileRepo) => {
                    // given
                    const recordSizeNum = 10;
                    const payload: RecordInfoPayload = {
                        recordCount: 12,
                        recordSize: ObjectUtils.sizeToHuman(recordSizeNum),
                    };
                    vi.spyOn(repo, "getRecordCount").mockResolvedValue(payload.recordCount);
                    vi.spyOn(repo, "getTotalFileSize").mockResolvedValue(recordSizeNum);
                    const emitMock = vi.fn();

                    Reflect.set(recordInfoSocket, "nsp", {
                        emit: emitMock,
                    });

                    // when
                    await recordInfoSocket.emit();

                    // then
                    expect(emitMock).toBeCalledWith("record", payload);
                },
            ),
        );
    });
});
