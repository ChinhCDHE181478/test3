import { apiFetch } from "../apiClient";

function normalizeCityKey(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalFlightQuery(query: string) {
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

export const flightService = {
  searchListDestination(query: string, languagecode = "vi") {
    // BE: /api/v1/flight/search-list-destination?query=...&languagecode=vi
    const qs = new URLSearchParams({ query: canonicalFlightQuery(query), languagecode });
    return apiFetch<any>(`/flight/search-list-destination?${qs.toString()}`, { method: "GET" });
  },

  search(params: Record<string, string | number | boolean>) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    return apiFetch<any>(`/flight/search2?${qs.toString()}`, { method: "GET" });
  },
};
