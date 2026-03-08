import bcrypt from "bcryptjs";
import { USER_ROLES } from "../constants";
import { env } from "../config/env";
import { UserModel } from "../modules/users/user.model";

export const seedAdmin = async (): Promise<void> => {
  if (!env.ADMIN_EMAIL) {
    console.log("ADMIN_EMAIL not set. Admin auto-seed skipped.");
    return;
  }

  if (!env.ADMIN_PASSWORD) {
    console.log("ADMIN_PASSWORD not set. Admin auto-seed skipped.");
    return;
  }

  const existing = await UserModel.findOne({ email: env.ADMIN_EMAIL }).lean();

  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_SALT_ROUNDS);

  await UserModel.create({
    fullName: "System Admin",
    email: env.ADMIN_EMAIL,
    passwordHash,
    phone: "N/A",
    address: "N/A",
    role: USER_ROLES.ADMIN,
    isActive: true
  });

  console.log("Admin seeded successfully");
};
