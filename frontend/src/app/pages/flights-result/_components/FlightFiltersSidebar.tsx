"use client";

import { useMemo } from "react";

export type FlightUiFilters = {
  stops: { direct: boolean; oneStop: boolean; twoPlus: boolean };
  minPrice: string;
  maxPrice: string;
  airlines: string[];
};

const POPULAR_VN_AIRLINES = [
  "Vietnam Airlines",
  "VietJet Air",
  "Bamboo Airways",
  "Pacific Airlines",
  "Vietravel Airlines",
];

function normalizeAirlineName(name: string) {
  const s = String(name || "").toLowerCase().trim();
  if (!s) return "";
  if (s.includes("vietjet")) return "VietJet Air";
  if (s.includes("vietnam airlines")) return "Vietnam Airlines";
  if (s.includes("bamboo")) return "Bamboo Airways";
  if (s.includes("pacific")) return "Pacific Airlines";
  if (s.includes("vietravel")) return "Vietravel Airlines";
  return name.trim();
}

function getOfferAirlines(offer: any) {
  const names = new Set<string>();
  const segments = Array.isArray(offer?.segments) ? offer.segments : [];
  segments.forEach((seg: any) => {
    const legs = Array.isArray(seg?.legs) ? seg.legs : [];
    legs.forEach((leg: any) => {
      const carriers = Array.isArray(leg?.carriersData) ? leg.carriersData : [];
      carriers.forEach((c: any) => {
        const name = normalizeAirlineName(String(c?.name || c?.code || "").trim());
        if (name) names.add(name);
      });
    });
  });
  return Array.from(names);
}

export default function FlightFiltersSidebar({
  offers,
  value,
  onChange,
  onReset,
}: {
  offers: any[];
  value: FlightUiFilters;
  onChange: (next: FlightUiFilters) => void;
  onReset: () => void;
}) {
  const airlineOptions = useMemo(() => {
    const counter = new Map<string, number>();

    POPULAR_VN_AIRLINES.forEach((name) => counter.set(name, 0));

    offers.forEach((offer) => {
      const names = getOfferAirlines(offer);
      names.forEach((name) => {
        counter.set(name, (counter.get(name) || 0) + 1);
      });
    });

    return Array.from(counter.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "vi");
    });
  }, [offers]);

  return (
    <div className="bg-white rounded-xl p-5 space-y-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-slate-800">Bộ lọc</h3>
        <button type="button" onClick={onReset} className="text-sm text-blue-600 hover:underline font-medium">
          Xóa
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-sm text-slate-700">Số điểm dừng</h4>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.stops.direct}
            onChange={(e) => onChange({ ...value, stops: { ...value.stops, direct: e.target.checked } })}
          />
          Bay thẳng
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.stops.oneStop}
            onChange={(e) => onChange({ ...value, stops: { ...value.stops, oneStop: e.target.checked } })}
          />
          1 điểm dừng
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.stops.twoPlus}
            onChange={(e) => onChange({ ...value, stops: { ...value.stops, twoPlus: e.target.checked } })}
          />
          Từ 2 điểm dừng
        </label>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-sm text-slate-700">Giá (VND)</h4>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={value.minPrice}
            onChange={(e) => onChange({ ...value, minPrice: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={value.maxPrice}
            onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {airlineOptions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-slate-700">Hãng bay</h4>
          <div className="space-y-2 max-h-44 overflow-auto pr-1">
            {airlineOptions.map(([name, count]) => {
              const checked = value.airlines.includes(name);
              return (
                <label key={name} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...value.airlines, name]
                          : value.airlines.filter((x) => x !== name);
                        onChange({ ...value, airlines: next });
                      }}
                    />
                    {name}
                  </span>
                  <span className="text-xs text-slate-400">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
