import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

type CheapFlightItem = {
  from: string;
  to: string;
  price: number;
  date: string;
  img: string;
  bookingUrl?: string;
  searchUrl?: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const HOTEL_CITY_IMAGES = {
  hanoi: "https://cdn.getyourguide.com/img/location/58c9219a7a849.jpeg/88.jpg",
  danang:
    "https://images.pexels.com/photos/34373624/pexels-photo-34373624.jpeg?_gl=1*1wlnebk*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDEyOTgkajU5JGwwJGgw",
  phuquoc: "https://rootytrip.com/wp-content/uploads/2024/07/phu-quoc.jpg",
};

const CHEAP_FLIGHT_ROUTES = [
  { fromQuery: "Hà Nội", toQuery: "Đà Nẵng", fromLabel: "Hà Nội", toLabel: "Đà Nẵng", img: HOTEL_CITY_IMAGES.danang, dayOffset: 7 },
  { fromQuery: "Ho Chi Minh City", toQuery: "Hà Nội", fromLabel: "TP.HCM", toLabel: "Hà Nội", img: HOTEL_CITY_IMAGES.hanoi, dayOffset: 10 },
  {
    fromQuery: "Tan Son Nhat International Airport",
    toQuery: "Phu Quoc International Airport",
    fromLabel: "TP.HCM",
    toLabel: "Phú Quốc",
    img: HOTEL_CITY_IMAGES.phuquoc,
    dayOffset: 14,
  },
];

function toIsoDate(dayKey: string, daysFromBase: number) {
  const base = new Date(`${dayKey}T00:00:00`);
  base.setDate(base.getDate() + daysFromBase);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toIsoFromDisplayDate(displayDate: string) {
  const [d, m, y] = displayDate.split("/");
  if (!d || !m || !y) return new Date().toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

function buildFallbackSearchUrl(from: string, to: string, displayDate: string) {
  const departDate = toIsoFromDisplayDate(displayDate);
  const qs = new URLSearchParams({
    from,
    to,
    fromId: from,
    toId: to,
    departDate,
    page: "1",
    adults: "1",
    currency_code: "VND",
  });
  return `/pages/flights-result?${qs.toString()}`;
}

function buildDefaultCheapFlights(dayKey: string): CheapFlightItem[] {
  const fallbackPrices = [690000, 990000, 850000];
  return CHEAP_FLIGHT_ROUTES.map((route, idx) => {
    const iso = toIsoDate(dayKey, route.dayOffset);
    const display = toDisplayDate(iso);
    return {
      from: route.fromLabel,
      to: route.toLabel,
      price: fallbackPrices[idx] ?? 1000000,
      date: display,
      img: route.img,
      searchUrl: buildFallbackSearchUrl(route.fromLabel, route.toLabel, display),
    };
  });
}

function normalizeList(raw: any) {
  const source = Array.isArray(raw) ? raw : raw?.result ?? raw?.items ?? raw?.data ?? [];
  if (!Array.isArray(source)) return [] as Array<{ id: string; label: string }>;
  return source
    .map((item: any) => {
      const id = String(item?.id || item?.locationId || item?.destId || item?.code || "").trim();
      const label = String(item?.label || item?.displayName || item?.name || item?.cityName || item?.city || "").trim();
      if (!id || !label) return null;
      return { id, label };
    })
    .filter(Boolean) as Array<{ id: string; label: string }>;
}

async function backendGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Upstream ${res.status}`);
  }
  const data = await res.json();
  if (data && typeof data === "object" && "status" in data) {
    const s = String((data as any).status).toUpperCase();
    if (s !== "SUCCESS" && s !== "1") {
      throw new Error(String((data as any).message || "Flight API error"));
    }
    return (data as any).result ?? data;
  }
  return data;
}

async function buildCheapFlights(dayKey: string) {
  const results = await Promise.all(
    CHEAP_FLIGHT_ROUTES.map(async (route) => {
      try {
        const [fromRaw, toRaw] = await Promise.all([
          backendGet(`/flight/search-list-destination?${new URLSearchParams({ query: route.fromQuery, languagecode: "vi" }).toString()}`),
          backendGet(`/flight/search-list-destination?${new URLSearchParams({ query: route.toQuery, languagecode: "vi" }).toString()}`),
        ]);

        const from = normalizeList(fromRaw)[0];
        const to = normalizeList(toRaw)[0];
        const fromId = from?.id;
        const toId = to?.id;
        if (!fromId || !toId) return null;

        const departDate = toIsoDate(dayKey, route.dayOffset);
        const searchData = await backendGet(
          `/flight/search2?${new URLSearchParams({
            fromId,
            toId,
            departDate,
            page: "1",
            adults: "1",
            currency_code: "VND",
          }).toString()}`
        );

        const offers = searchData?.result?.flightOffers || searchData?.flightOffers || [];
        if (!Array.isArray(offers) || offers.length === 0) return null;

        let bestPrice = Infinity;
        let bestLink = "";
        offers.forEach((offer: any) => {
          const price = Number(offer?.priceBreakdown?.totalRounded?.units || Infinity);
          if (Number.isFinite(price) && price < bestPrice) {
            bestPrice = price;
            bestLink = String(offer?.linkFFFlight || "");
          }
        });

        if (!Number.isFinite(bestPrice) || bestPrice === Infinity) return null;

        const qs = new URLSearchParams({
          from: route.fromLabel,
          to: route.toLabel,
          fromId,
          toId,
          departDate,
          page: "1",
          adults: "1",
          currency_code: "VND",
        });

        return {
          from: route.fromLabel,
          to: route.toLabel,
          price: bestPrice,
          date: toDisplayDate(departDate),
          img: route.img,
          bookingUrl: bestLink || undefined,
          searchUrl: `/pages/flights-result?${qs.toString()}`,
        } as CheapFlightItem;
      } catch {
        return null;
      }
    })
  );

  const liveItems = results.filter(Boolean) as CheapFlightItem[];
  const merged = [...liveItems];
  const defaults = buildDefaultCheapFlights(dayKey);
  if (merged.length < defaults.length) {
    for (const item of defaults) {
      if (merged.length >= defaults.length) break;
      const exists = merged.some((x) => x.from === item.from && x.to === item.to);
      if (!exists) merged.push(item);
    }
  }
  return merged;
}

const getCachedCheapFlights = unstable_cache(
  async (dayKey: string) => buildCheapFlights(dayKey),
  ["cheap-flights-shared-cache-v1"],
  { revalidate: 60 * 60 * 6 }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dayKey = searchParams.get("day")?.trim() || new Date().toISOString().slice(0, 10);
    const items = await getCachedCheapFlights(dayKey);
    return NextResponse.json({ dayKey, items });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Cannot fetch cheap flights" }, { status: 500 });
  }
}
