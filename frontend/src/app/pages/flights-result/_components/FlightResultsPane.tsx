"use client";

import FlightOfferCard from "./FlightOfferCard";
import FlightPagination from "./FlightPagination";

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
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-white ring-1 ring-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-6 text-red-600 border border-red-200">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {offers?.length > 0 ? (
        <>
          <div className="space-y-4">
            {offers.map((offer) => (
              <FlightOfferCard key={offer?.token || Math.random()} offer={offer} />
            ))}
          </div>
          <FlightPagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      ) : (
        <div className="bg-white p-10 rounded-xl text-center border border-slate-200 text-slate-500">
          Khong tim thay chuyen bay phu hop.
        </div>
      )}
    </div>
  );
}
