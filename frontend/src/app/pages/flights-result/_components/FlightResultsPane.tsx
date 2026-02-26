"use client";

import { useMemo, useState } from "react";
import FlightOfferCard from "./FlightOfferCard";
import FlightPagination from "./FlightPagination";
import FlightFiltersSidebar, { FlightUiFilters } from "./FlightFiltersSidebar";

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

function getStopCount(offer: any) {
  const seg = offer?.segments?.[0];
  const legs = Array.isArray(seg?.legs) ? seg.legs : [];
  return Math.max(0, legs.length - 1);
}

function getPrice(offer: any) {
  return Number(offer?.priceBreakdown?.totalRounded?.units || 0);
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

export default function FlightResultsPane({
  offers,
  isLoading,
  error,
  currentPage,
  totalPages,
  buildHref,
}: {
  offers: any[];
  isLoading: boolean;
  error?: string | null;
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  const [filters, setFilters] = useState<FlightUiFilters>({
    stops: { direct: true, oneStop: true, twoPlus: true },
    minPrice: "",
    maxPrice: "",
    airlines: [],
  });

  const filteredOffers = useMemo(() => {
    const min = filters.minPrice ? Number(filters.minPrice) : undefined;
    const max = filters.maxPrice ? Number(filters.maxPrice) : undefined;

    return offers.filter((offer) => {
      const stopCount = getStopCount(offer);
      const passStops =
        (stopCount === 0 && filters.stops.direct) ||
        (stopCount === 1 && filters.stops.oneStop) ||
        (stopCount >= 2 && filters.stops.twoPlus);
      if (!passStops) return false;

      const price = getPrice(offer);
      if (min != null && Number.isFinite(min) && price < min) return false;
      if (max != null && Number.isFinite(max) && price > max) return false;

      if (filters.airlines.length > 0) {
        const airlines = getOfferAirlines(offer);
        const matched = filters.airlines.some((name) => airlines.includes(name));
        if (!matched) return false;
      }

      return true;
    });
  }, [offers, filters]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="h-96 bg-slate-200 animate-pulse rounded-xl hidden lg:block" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-white ring-1 ring-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-6 text-red-600 border border-red-200">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <aside className="sticky top-24 hidden lg:block">
        <FlightFiltersSidebar
          offers={offers}
          value={filters}
          onChange={setFilters}
          onReset={() =>
            setFilters({
              stops: { direct: true, oneStop: true, twoPlus: true },
              minPrice: "",
              maxPrice: "",
              airlines: [],
            })
          }
        />
      </aside>

      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Hiển thị {filteredOffers.length} / {offers.length} chuyến bay trong trang hiện tại.
        </div>
        {filteredOffers?.length > 0 ? (
          <>
            <div className="space-y-4">
              {filteredOffers.map((offer) => (
                <FlightOfferCard key={offer?.token || Math.random()} offer={offer} />
              ))}
            </div>
            <FlightPagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
          </>
        ) : (
          <div className="bg-white p-10 rounded-xl text-center border border-slate-200 text-slate-500">
            Không tìm thấy chuyến bay phù hợp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
}
