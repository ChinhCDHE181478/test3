import { NextResponse } from "next/server";

const DOMESTIC_DESTINATIONS = [
  "Ho Chi Minh City",
  "Vũng Tàu",
  "Hà Nội",
  "Đà Nẵng",
  "Đà Lạt",
];

function toLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;

  const auth = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret")?.trim() || "";

  return bearer === secret || headerSecret === secret || querySecret === secret;
}

async function warmOne(baseUrl: string, destination: string, arrivalDate: string, departureDate: string) {
  const params = new URLSearchParams({ destination, arrivalDate, departureDate });
  const res = await fetch(`${baseUrl}/api/hotels/domestic?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.message || `Warm failed (${res.status})`);
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams, origin } = new URL(req.url);
  const now = new Date();
  const arrivalDate = searchParams.get("arrivalDate")?.trim() || toLocalDate(addDays(now, 1));
  const departureDate = searchParams.get("departureDate")?.trim() || toLocalDate(addDays(now, 2));

  const results = await Promise.allSettled(
    DOMESTIC_DESTINATIONS.map((destination) =>
      warmOne(origin, destination, arrivalDate, departureDate).then(() => ({ destination }))
    )
  );

  const ok: string[] = [];
  const failed: Array<{ destination: string; reason: string }> = [];

  results.forEach((r, idx) => {
    const destination = DOMESTIC_DESTINATIONS[idx];
    if (r.status === "fulfilled") {
      ok.push(destination);
      return;
    }
    failed.push({ destination, reason: r.reason?.message || "Unknown error" });
  });

  const status = failed.length > 0 ? 207 : 200;
  return NextResponse.json(
    {
      warmed: ok.length,
      failed: failed.length,
      arrivalDate,
      departureDate,
      ok,
      failedItems: failed,
    },
    { status }
  );
}
