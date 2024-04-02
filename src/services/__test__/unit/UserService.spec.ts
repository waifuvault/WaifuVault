import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { UserService } from "../../UserService.js";
import { UserModel } from "../../../model/db/User.model.js";
import { UserRepo } from "../../../db/repo/UserRepo.js";
import argon2 from "argon2";
import { Builder } from "builder-pattern";
import { CustomUserInfoModel } from "../../../model/auth/CustomUserInfoModel";

describe("unit tests", () => {
    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("getUser", () => {
        it(
            "should return null for a non existing user",
            PlatformTest.inject([UserRepo, UserService], async (userRepo: UserRepo, userService: UserService) => {
                // given
                vi.spyOn(userRepo, "getUser").mockResolvedValue(null);

                // when
                const userObj = await userService.getUser("test@waifuvault.moe", "password");

                // then
                expect(userObj).toBeNull();
            }),
        );

        it(
            "should return null for an existing user with wrong password",
            PlatformTest.inject([UserRepo, UserService], async (userRepo: UserRepo, userService: UserService) => {
                // given
                const user = Builder(UserModel)
                    .email("test@waifuvault.moe")
                    .password(await argon2.hash("password"))
                    .build();
                vi.spyOn(userRepo, "getUser").mockResolvedValue(user);

                // when
                const userObj = await userService.getUser("test@waifuvault.moe", "incorrect");

                // then
                expect(userObj).toBeNull();
            }),
        );

        it(
            "should return user model for an existing user",
            PlatformTest.inject([UserRepo, UserService], async (userRepo: UserRepo, userService: UserService) => {
                // given
                const user = Builder(UserModel)
                    .email("test@waifuvault.moe")
                    .password(await argon2.hash("password"))
                    .build();
                vi.spyOn(userRepo, "getUser").mockResolvedValue(user);

                // when
                const userObj = await userService.getUser("test@waifuvault.moe", "password");

                // then
                expect(userObj).toBeInstanceOf(UserModel);
                expect(userObj?.email ?? "").toEqual("test@waifuvault.moe");
            }),
        );
    });

    describe("getLoggedInUser", () => {
        it(
            "should return null for an empty context",
            PlatformTest.inject([UserService], (userService: UserService) => {
                // when
                const userObj = userService.getLoggedInUser();

                // then
                expect(userObj).toBeNull();
            }),
        );
    });

    describe("changeDetails", () => {
        it(
            "should return user model with changed email and password",
            PlatformTest.inject([UserRepo, UserService], async (userRepo: UserRepo, userService: UserService) => {
                // given
                const newUser = Builder(UserModel).email("newtest@waifuvault.moe").password("newpassword").build();
                const newUserHash = Builder(UserModel)
                    .email("newtest@waifuvault.moe")
                    .password("newpasswordhash")
                    .build();
                const user = Builder(UserModel).email("test@waifuvault.moe").password("passwordhash").build();
                const loggedIn = Builder(CustomUserInfoModel).email("test@waifuvault.moe").build();
                vi.spyOn(userRepo, "getUser").mockResolvedValue(user);
                vi.spyOn(argon2, "hash").mockResolvedValue("newpasswordhash");
                const updateSpy = vi.spyOn(userRepo, "updateUser").mockResolvedValue(newUser);

                // when
                await userService.changeDetails(newUser, loggedIn);

                // then
                expect(updateSpy).toHaveBeenCalledWith(newUserHash);
            }),
        );
    });
});
