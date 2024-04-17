import { UserModel } from "../../../model/db/User.model.js";
import { Builder } from "builder-pattern";
import argon2 from "argon2";

export const user1Password = "1234";
export const user1 = Builder(UserModel, {
    email: "newtest@example.com",
    password: await argon2.hash(user1Password),
}).build();
