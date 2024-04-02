import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { UserService } from "../../UserService.js";
import { UserModel } from "../../../model/db/User.model.js";
import { UserRepo } from "../../../db/repo/UserRepo.js";
import argon2 from "argon2";
import { Builder } from "builder-pattern";
import { CustomUserInfoModel } from "../../../model/auth/CustomUserInfoModel";
import { user1, user1Password } from "../../../__test__/mocks/global/User.mock.js";

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
                const userObj = await userService.getUser(user1.email, user1.password);

                // then
                expect(userObj).toBeNull();
            }),
        );

        it(
            "should return null for an existing user with wrong password",
            PlatformTest.inject([UserRepo, UserService], async (userRepo: UserRepo, userService: UserService) => {
                // given
                vi.spyOn(userRepo, "getUser").mockResolvedValue(user1);

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
                vi.spyOn(userRepo, "getUser").mockResolvedValue(user1);

                // when
                const userObj = await userService.getUser(user1.email, user1Password);

                // then
                expect(userObj).toBeInstanceOf(UserModel);
                expect(userObj).toBe(user1);
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
                const newHash = "1234";
                const newUser = Builder(UserModel).email("newtest@waifuvault.moe").password(newHash).build();
                const loggedIn = Builder(CustomUserInfoModel).email(user1.email).build();
                const getUserSpy = vi.spyOn(userRepo, "getUser").mockResolvedValue({ ...user1 });
                const argonSpy = vi.spyOn(argon2, "hash").mockResolvedValue(newHash);
                const updateSpy = vi.spyOn(userRepo, "updateUser").mockResolvedValue(newUser);

                // when
                const result = await userService.changeDetails(newUser, loggedIn);

                // then
                expect(getUserSpy).toBeCalledWith(user1.email);
                expect(argonSpy).toBeCalledWith(newUser.password);
                // asert that the update has been called with the new changed user
                expect(updateSpy).toHaveBeenCalledWith(newUser);
                // asset that the result is the new user
                expect(result).toBe(newUser);
                // assert that the function did change the user from the supplied user (logged in is the same as user1)
                expect(result).not.toBe(user1);
            }),
        );
    });
});
