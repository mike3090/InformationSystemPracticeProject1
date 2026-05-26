"use client";

import { registerAccount, type RegisterState } from "@/app/[locale]/auth/actions";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

const initialRegisterState: RegisterState = {
  status: "idle",
};

export default function SignInForm({
  locale,
  callbackUrl,
  accountIntent,
}: {
  locale: string;
  callbackUrl: string;
  accountIntent: "volunteer" | "requester";
}) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerAccountType, setRegisterAccountType] =
    useState<"volunteer" | "requester">(accountIntent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginPending, startLoginTransition] = useTransition();
  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerAccount,
    initialRegisterState
  );
  const headerAccountType =
    mode === "register" ? registerAccountType : accountIntent;

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");

    startLoginTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setLoginError(t("emailPasswordIncorrect"));
        return;
      }

      window.location.href = `/${locale}/profile/setup?intent=${accountIntent}&next=${encodeURIComponent(callbackUrl)}`;
    });
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {headerAccountType === "requester"
            ? t("requesterSignInTitle")
            : t("volunteerSignInTitle")}
        </h1>
        <p className="text-stone-500 text-sm">
          {headerAccountType === "requester"
            ? t("requesterSignInIntro")
            : t("volunteerSignInIntro")}
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-lg border border-stone-200 bg-stone-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 transition ${
            mode === "login" ? "bg-white text-green-700 shadow-sm" : "text-stone-500"
          }`}
        >
          {t("loginTab")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 transition ${
            mode === "register" ? "bg-white text-green-700 shadow-sm" : "text-stone-500"
          }`}
        >
          {t("registerTab")}
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            {t("emailLabel")}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <label className="block text-sm font-medium text-stone-700">
            {t("passwordLabel")}
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {loginError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoginPending}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400 transition"
          >
            {isLoginPending ? t("signingIn") : t("signInWithPassword")}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="accountType" value={registerAccountType} />
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-stone-700">
              {t("accountTypeLabel")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <AccountTypeOption
                value="volunteer"
                title={t("volunteerAccountType")}
                description={t("volunteerAccountTypeDescription")}
                selected={registerAccountType === "volunteer"}
                onSelect={() => setRegisterAccountType("volunteer")}
              />
              <AccountTypeOption
                value="requester"
                title={t("requesterAccountType")}
                description={t("requesterAccountTypeDescription")}
                selected={registerAccountType === "requester"}
                onSelect={() => setRegisterAccountType("requester")}
              />
            </div>
          </fieldset>
          <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-800">
            {registerAccountType === "requester"
              ? t("requesterRegisterNote")
              : t("volunteerRegisterNote")}
          </p>
          <label className="block text-sm font-medium text-stone-700">
            {t("nameLabel")}
          </label>
          <input
            name="name"
            required
            placeholder={t("namePlaceholder")}
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <label className="block text-sm font-medium text-stone-700">
            {t("emailLabel")}
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <label className="block text-sm font-medium text-stone-700">
            {t("passwordLabel")}
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder={t("passwordPlaceholder")}
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {registerState.message && (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                registerState.status === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {registerState.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isRegisterPending}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400 transition"
          >
            {isRegisterPending
              ? t("creatingAccount")
              : registerAccountType === "requester"
                ? t("createRequesterAccount")
                : t("createVolunteerAccount")}
          </button>
        </form>
      )}

      <button
        onClick={() =>
          signIn("google", {
            callbackUrl: `/${locale}/profile/setup?intent=${
              mode === "register" ? registerAccountType : accountIntent
            }&next=${encodeURIComponent(callbackUrl)}`,
          })
        }
        className="w-full flex items-center justify-center gap-3 border border-stone-300 rounded-lg px-4 py-3 text-sm font-medium hover:bg-stone-50 transition"
      >
        <GoogleIcon />
        {t("continueWithGoogle")}
      </button>
    </div>
  );
}

function AccountTypeOption({
  value,
  title,
  description,
  selected,
  onSelect,
}: {
  value: "volunteer" | "requester";
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
        selected
          ? "border-green-700 bg-green-50 text-green-950"
          : "border-stone-200 bg-white text-stone-700 hover:border-green-300"
      }`}
    >
      <input
        type="radio"
        name="accountTypeChoice"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-stone-600">
        {description}
      </span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
