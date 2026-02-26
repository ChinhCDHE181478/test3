"use client";

import { useEffect, useMemo, useState } from "react";

const DOMESTIC_TABS = [
  { label: "Thành phố Hồ Chí Minh", value: "Ho Chi Minh City" },
  { label: "Vũng Tàu", value: "Vũng Tàu" },
  { label: "Hà Nội", value: "Hà Nội" },
  { label: "Đà Nẵng", value: "Đà Nẵng" },
  { label: "Đà Lạt", value: "Đà Lạt" },
];

type DomesticHotelItem = {
  id: string;
  name: string;
  distanceText?: string;
  rating?: number;
  reviews?: number;
  priceText?: string;
  image: string;
};

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

function renderStars(score?: number) {
  const stars = Math.round(score || 0);
  return (
    <div className="flex text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < stars ? "text-rose-500" : "text-slate-200"}>
          ★
        </span>
      ))}
    </div>
  );
}

function getRatingText(score?: number) {
  if (!score) return "";
  if (score >= 4.5) return "Tuyệt hảo";
  if (score >= 4.0) return "Rất tốt";
  if (score >= 3.0) return "Tốt";
  return "Hài lòng";
}

function getBookingUrl(hotelName: string, destination: string) {
  const query = encodeURIComponent(`${hotelName} ${destination}`);
  return `https://www.booking.com/searchresults.vi.html?ss=${query}&lang=vi&selected_currency=VND`;
}

async function fetchHotelsForDestination(
  destination: string,
  arrivalDate: string,
  departureDate: string
): Promise<DomesticHotelItem[]> {
  const params = new URLSearchParams({ destination, arrivalDate, departureDate });
  const res = await fetch(`/api/hotels/domestic?${params.toString()}`);
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.message || "Không tải được khách sạn");
  }

  return Array.isArray(payload?.items) ? payload.items.slice(0, 6) : [];
}

export default function DomesticSection({
  selectedDestination,
  onSelectDestination,
}: {
  selectedDestination: string;
  onSelectDestination: (destination: string) => void;
}) {
  const [items, setItems] = useState<DomesticHotelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 3;

  const { arrivalDate, departureDate } = useMemo(() => {
    const now = new Date();
    return { arrivalDate: toLocalDate(addDays(now, 1)), departureDate: toLocalDate(addDays(now, 2)) };
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedDestination]);

  useEffect(() => {
    const destination = selectedDestination?.trim();
    if (!destination) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchHotelsForDestination(destination, arrivalDate, departureDate)
      .then((finalItems) => {
        if (cancelled) return;
        setItems(finalItems);
        if (finalItems.length === 0) setError("Không có dữ liệu khách sạn cho địa điểm này.");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Không tải được khách sạn");
        setItems([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDestination, arrivalDate, departureDate]);

  useEffect(() => {
    const preloadOtherDestinations = async () => {
      for (const tab of DOMESTIC_TABS) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await fetchHotelsForDestination(tab.value, arrivalDate, departureDate).catch(() => {});
      }
    };

    const timeoutId = setTimeout(preloadOtherDestinations, 3000);
    return () => clearTimeout(timeoutId);
  }, [arrivalDate, departureDate]);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const handlePrev = () => setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  const handleNext = () => setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  const activeTabLabel = DOMESTIC_TABS.find((tab) => tab.value === selectedDestination)?.label || selectedDestination;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Khách sạn trong nước</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {DOMESTIC_TABS.map((tab) => {
            const active = tab.value === selectedDestination;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onSelectDestination(tab.value)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#0a1128] text-white border-[#0a1128]"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-h-[350px]">
          {loading && <div className="text-slate-500 py-10">Đang tải danh sách khách sạn...</div>}
          {!loading && error && <div className="text-rose-600 py-10">{error}</div>}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="grid gap-5 md:grid-cols-3 transition-opacity duration-500 ease-in-out">
                {currentItems.map((h) => (
                  <a
                    key={h.id}
                    href={getBookingUrl(h.name, selectedDestination)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={h.image}
                        alt={h.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {h.name}
                        </h3>
                        <div className="shrink-0 pt-1">{renderStars(h.rating)}</div>
                      </div>

                      <p className="text-sm text-slate-500 mb-3 line-clamp-1">
                        {h.distanceText || `Trung tâm thành phố ${activeTabLabel}`}
                      </p>

                      <div className="flex items-center gap-1.5 text-sm mb-4">
                        <span className="font-bold text-slate-900">{h.rating ? `${h.rating.toFixed(1)}/5` : ""}</span>
                        <span className="font-medium text-slate-900">{getRatingText(h.rating)}</span>
                        {typeof h.reviews === "number" && (
                          <span className="text-slate-500 text-xs ml-1">{h.reviews.toLocaleString("vi-VN")} đánh giá</span>
                        )}
                      </div>

                      <div className="mt-auto flex flex-col items-end pt-3 border-t border-slate-100">
                        <div className="text-lg font-bold text-slate-900">{h.priceText}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Một đêm</div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={handlePrev}
                    aria-label="Trang trước"
                    className="group p-2 rounded-full text-slate-500 ring-1 ring-slate-200 bg-white transition-all duration-200 hover:text-cyan-700 hover:bg-cyan-50 hover:ring-cyan-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === currentPage
                            ? "w-2 bg-slate-700"
                            : "w-2 bg-slate-300 hover:w-3 hover:bg-cyan-500"
                        }`}
                        aria-label={`Đi tới trang ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    aria-label="Trang sau"
                    className="group p-2 rounded-full text-slate-500 ring-1 ring-slate-200 bg-white transition-all duration-200 hover:text-cyan-700 hover:bg-cyan-50 hover:ring-cyan-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
