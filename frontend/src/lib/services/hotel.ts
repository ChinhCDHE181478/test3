import { apiFetch } from "../apiClient";

/**
 * Standard API envelope used by backend
 * Example:
 * {
 *   status: "SUCCESS",
 *   message: "...",
 *   result: { ... }
 * }
 */
export type BaseJsonResponse<T = any> = {
  status: string | number;
  message?: string;
  result?: T;
};

function isSuccess(status: any) {
  const s = String(status).toUpperCase();
  return s === "SUCCESS" || s === "1";
}

function unwrap<T>(res: any, fallbackMsg: string): T {
  // If apiFetch returns the BaseJsonResponse envelope
  if (res && typeof res === "object" && "status" in res) {
    if (!isSuccess(res.status)) {
      throw new Error(res.message || fallbackMsg);
    }
    return (res.result ?? res) as T;
  }
  // If apiFetch already unwraps
  return res as T;
}

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    sp.set(k, s);
  });
  return sp.toString();
}

function normalizeVietnamese(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
}

function normalizeCityKey(input: string) {
  return normalizeVietnamese(input)
    .toLowerCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalHotelQuery(query: string) {
  const trimmed = String(query || "").trim();
  const key = normalizeCityKey(trimmed);
  const isHoChiMinh =
    key === "ho chi minh city" ||
    key === "ho chi minh" ||
    key === "thanh pho ho chi minh" ||
    key === "tp hcm" ||
    key === "tphcm" ||
    key === "sai gon" ||
    key === "saigon";

  return isHoChiMinh ? "Ho Chi Minh City" : trimmed;
}

function toNormKey(input: any) {
  return normalizeCityKey(String(input || ""));
}

function typeWeight(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "city") return 6;
  if (t === "region") return 5;
  if (t === "district") return 4;
  if (t === "landmark") return 3;
  if (t === "airport") return 2;
  if (t === "hotel") return 1;
  return 0;
}

function humanType(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "city") return "Thành phố";
  if (t === "airport") return "Sân bay";
  if (t === "region") return "Khu vực";
  if (t === "landmark") return "Điểm đến";
  if (t === "hotel") return "Khách sạn";
  return "Địa điểm";
}

function countryDisplay(codeOrName: string) {
  const raw = String(codeOrName || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();

  if (upper === "VN") return "Việt Nam";
  if (upper === "TH") return "Thái Lan";
  if (upper === "FR") return "Pháp";
  if (upper === "US") return "Hoa Kỳ";
  if (upper === "IT") return "Ý";

  if (upper.length === 2) {
    try {
      // Browser + modern Node runtimes support this.
      const display = new Intl.DisplayNames(["vi"], { type: "region" }).of(upper);
      if (display && display !== upper) return display;
    } catch {
      // Ignore and fallback below.
    }
  }

  return raw;
}

function normalizeDest(item: any) {
  const name = String(item?.name || item?.city || item?.city_name || "").trim();
  const type = String(item?.type || item?.dest_type || "").trim().toLowerCase();
  const country = String(item?.country || item?.cc1 || "").trim().toUpperCase();
  const id = String(item?.id || item?.destination_id || item?.dest_id || "").trim();
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);

  if (!name) return null;

  const city = String(item?.city || item?.city_name || "").trim() || name;
  const countryText = countryDisplay(country);
  const labelParts: string[] = [];
  if (city) labelParts.push(city);
  if (countryText) labelParts.push(countryText);
  const label = labelParts.join(", ") || humanType(type);

  return {
    ...item,
    id,
    destination_id: id || item?.destination_id,
    name,
    city,
    type,
    label,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

export const hotelService = {
  /**
   * BE: GET /hotel/search-destination?query=...
   */
  async searchDestination(query: string) {
    const res = await apiFetch<BaseJsonResponse<any>>(
      `/hotel/search-destination?${qs({ query: canonicalHotelQuery(query) })}`,
      { method: "GET" },
      { auth: false }
    );
    return unwrap<any>(res, "Get Destination Error");
  },

  /**
   * BE: GET /hotel/search-list-destination?query=...
   */
  async searchListDestination(query: string) {
    const res = await apiFetch<BaseJsonResponse<any>>(
      `/hotel/search-list-destination?${qs({ query: canonicalHotelQuery(query) })}`,
      { method: "GET" },
      { auth: false }
    );
    return unwrap<any>(res, "Get List Destination Error");
  },

  /**
   * Smart destination search for Vietnamese input:
   * - call with original query first
   * - if result is empty or too small, retry with non-diacritic query
   * - merge unique items to avoid duplicates
   */
  async searchListDestinationSmart(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const canonical = canonicalHotelQuery(trimmed);
    const primary = await this.searchListDestination(canonical);
    const primaryItems: any[] = Array.isArray(primary) ? primary : primary?.items || [];

    const fallbackQuery = normalizeVietnamese(trimmed);
    let fallbackItems: any[] = [];
    if (fallbackQuery && toNormKey(fallbackQuery) !== toNormKey(canonical)) {
      const fallback = await this.searchListDestination(fallbackQuery);
      fallbackItems = Array.isArray(fallback) ? fallback : fallback?.items || [];
    }

    const queryKey = toNormKey(trimmed);
    const mergedRaw = [...primaryItems, ...fallbackItems];
    const bestByKey = new Map<string, any>();

    const score = (item: any) => {
      const nameKey = toNormKey(item?.name || item?.city || item?.city_name || "");
      const type = String(item?.type || item?.dest_type || "").toLowerCase();
      let s = typeWeight(type) * 100;
      if (!queryKey) return s;
      if (nameKey === queryKey) s += 60;
      else if (nameKey.startsWith(queryKey)) s += 40;
      else if (nameKey.includes(queryKey)) s += 20;
      return s;
    };

    for (const raw of mergedRaw) {
      const norm = normalizeDest(raw);
      if (!norm) continue;
      const key = `${toNormKey(norm.name)}|${String(norm.country || "").toLowerCase()}`;
      const prev = bestByKey.get(key);
      if (!prev || score(norm) > score(prev)) {
        bestByKey.set(key, norm);
      }
    }

    return Array.from(bestByKey.values()).sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sb !== sa) return sb - sa;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  },

  /**
   * BE: GET /hotel/search
   * Required: destination, arrivalDate, departureDate
   * Optional: roomQty, adults, childrenAge, pageNumber, priceMin, priceMax, languagecode, currencyCode
   */
  async search(params: {
    destination: string;
    arrivalDate: string;
    departureDate: string;
    roomQty?: string;
    adults?: string;
    childrenAge?: string;
    pageNumber?: string;
    priceMin?: string;
    priceMax?: string;
    languagecode?: string;
    currencyCode?: string;
  }) {
    const nextParams = {
      ...params,
      destination: canonicalHotelQuery(params.destination),
    };

    const res = await apiFetch<BaseJsonResponse<any>>(
      `/hotel/search?${qs(nextParams)}`,
      { method: "GET" },
      { auth: false }
    );
    return unwrap<any>(res, "Get hotels error");
  },

  /**
   * BE: GET /hotel/search-by-coordinate
   * Required: latitude, longitude, arrivalDate, departureDate
   */
  async searchByCoordinate(params: {
    latitude: string;
    longitude: string;
    arrivalDate: string;
    departureDate: string;
    roomQty?: string;
    radius?: string;
    adults?: string;
    childrenAge?: string;
    priceMin?: string;
    priceMax?: string;
    pageNumber?: string;
    languagecode?: string;
    currencyCode?: string;
  }) {
    const res = await apiFetch<BaseJsonResponse<any>>(
      `/hotel/search-by-coordinate?${qs(params)}`,
      { method: "GET" },
      { auth: false }
    );
    return unwrap<any>(res, "Get hotels error");
  },

  /**
   * BE: GET /hotel/link
   * Required: hotelId, arrivalDate, departureDate
   */
  async link(params: {
    hotelId: string;
    arrivalDate: string;
    departureDate: string;
    adults?: string;
    childrenAge?: string;
    languagecode?: string;
    currencyCode?: string;
  }) {
    const res = await apiFetch<BaseJsonResponse<any>>(
      `/hotel/link?${qs(params)}`,
      { method: "GET" },
      { auth: false }
    );
    const data = unwrap<any>(res, "Get link error");

    // Backend might return either a plain string URL or an object.
    if (typeof data === "string") return { url: data };
    if (data?.url) return { url: data.url };
    if (data?.link) return { url: data.link };
    // Fallback: return as-is so the UI can inspect.
    return data;
  },
};

// Backward/forward compat: some pages import hotelApi instead of hotelService.
export const hotelApi = hotelService;
