import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { RecordInfoSocket } from "../../socket/RecordInfoSocket.js";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import { FileDao } from "../../../db/dao/FileDao.js";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
        setUpDataSource();
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
                    const emitSpy = vi.spyOn(recordInfoSocket, "emit");
                    vi.spyOn(repo, "getRecordCount").mockResolvedValue(12);
                    vi.mocked(repo.getRecordCount).mockResolvedValue(12);
                    vi.mocked(repo.getTotalFileSize).mockResolvedValue(10);
                    // when
                    await recordInfoSocket.emit();

                    // then
                    expect(emitSpy).toBeCalledWith;
                },
            ),
        );
    });
});
