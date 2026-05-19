"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export type RegisterState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const initialErrorState: RegisterState = {
  status: "error",
};

export async function registerAccount(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const locale = String(formData.get("locale") ?? "ja");
  const rawAccountType = String(formData.get("accountType") ?? "volunteer");
  const accountType = rawAccountType === "requester" ? "requester" : "volunteer";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return {
      ...initialErrorState,
      message:
        locale === "en"
          ? "Please fill in your name, email, and password."
          : "名前、メールアドレス、パスワードを入力してください。",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ...initialErrorState,
      message:
        locale === "en"
          ? "This email is already registered."
          : "このメールアドレスはすでに登録されています。",
    };
  }

  const passwordHash = await hashPassword(password);
  const isRequester = accountType === "requester";

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: isRequester ? "REQUESTER" : "VOLUNTEER",
      ...(isRequester
        ? {
            organization: {
              create: {
                name,
              },
            },
          }
        : {
            profile: {
              create: {},
            },
          }),
    },
  });

  return {
    status: "success",
    message:
      locale === "en"
        ? "Account created. You can sign in now."
        : "アカウントを作成しました。ログインできます。",
  };
}
