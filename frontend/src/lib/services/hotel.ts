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
    if (!fallbackQuery || fallbackQuery === canonical) {
      return primaryItems;
    }

    if (primaryItems.length >= 3) {
      return primaryItems;
    }

    const fallback = await this.searchListDestination(fallbackQuery);
    const fallbackItems: any[] = Array.isArray(fallback) ? fallback : fallback?.items || [];

    const seen = new Set<string>();
    const merged: any[] = [];

    const normalizeName = (item: any) =>
      String(item?.name || item?.city || "")
        .trim()
        .toLowerCase();

    const pushUnique = (item: any) => {
      const display = normalizeName(item);
      if (!display) return;
      const key = String(item?.id || `${display}|${String(item?.type || "").toLowerCase()}`);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    };

    primaryItems.forEach(pushUnique);
    fallbackItems.forEach(pushUnique);

    return merged;
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
