import { auth } from "@/lib/auth";
import { organizerToolForbiddenResponse, userCanUseOrganizerTools } from "@/lib/authz";

type ZipCloudResponse = {
  status: number;
  message: string | null;
  results:
    | {
        zipcode: string;
        address1: string;
        address2: string;
        address3: string;
        kana1?: string;
        kana2?: string;
        kana3?: string;
      }[]
    | null;
};

const fallbackPostalCodes: Record<string, PostalCodeResult> = {
  "6068171": {
    postalCode: "6068171",
    prefecture: "Kyoto",
    city: "Kyoto Sakyo Ward",
    town: "Ichijoji area",
    addressLine: "Ichijoji area, Sakyo Ward, Kyoto",
  },
};

type PostalCodeResult = {
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  addressLine: string;
};

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (!(await userCanUseOrganizerTools(session.user.id))) {
    return organizerToolForbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const postalCode = normalizePostalCode(searchParams.get("zipcode") ?? "");

  if (!postalCode) {
    return Response.json(
      { ok: false, error: "A 7-digit Japanese postal code is required.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const fallback = fallbackPostalCodes[postalCode];

  try {
    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as ZipCloudResponse;
    const first = data.results?.[0];

    if (!first) {
      if (fallback) return Response.json({ ok: true, data: fallback });
      return Response.json(
        { ok: false, error: "Postal code not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const result: PostalCodeResult = {
      postalCode,
      prefecture: first.address1,
      city: first.address2,
      town: first.address3,
      addressLine: [first.address3, first.address2, first.address1]
        .filter(Boolean)
        .join(", "),
    };

    return Response.json({ ok: true, data: result });
  } catch {
    if (fallback) return Response.json({ ok: true, data: fallback });
    return Response.json(
      { ok: false, error: "Postal lookup is unavailable.", code: "LOOKUP_FAILED" },
      { status: 503 },
    );
  }
}

function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 7 ? digits : "";
}
