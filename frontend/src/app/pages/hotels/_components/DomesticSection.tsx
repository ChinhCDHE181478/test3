"use client";

import { useEffect, useMemo, useState } from "react";
import { hotelService } from "@/lib/services/hotel";

// 1. Cấu hình Tabs: Tách biệt label (hiển thị) và value (gọi API)
const DOMESTIC_TABS = [
  { label: "Thành phố Hồ Chí Minh", value: "Ho Chi Minh City" },
  { label: "Phú Quốc", value: "Phú Quốc" },
  { label: "Hà Nội", value: "Hà Nội" },
  { label: "Đà Nẵng", value: "Đà Nẵng" },
  { label: "Đà Lạt", value: "Đà Lạt" },
];

const DESTINATION_ALIASES: Record<string, string[]> = {
  "ho chi minh city": ["Ho Chi Minh City", "Hồ Chí Minh", "Thành phố Hồ Chí Minh", "HCM", "Saigon"],
  "ha noi": ["Hà Nội", "Ha Noi", "Hanoi"],
  "da nang": ["Đà Nẵng", "Da Nang", "Danang"],
  "da lat": ["Đà Lạt", "Da Lat", "Dalat"],
  "phu quoc": ["Phú Quốc", "Phu Quoc"],
};

type DomesticHotelItem = {
  id: string;
  name: string;
  distanceText?: string;
  rating?: number;
  reviews?: number;
  priceText?: string;
  image: string;
};

// --- CÁC HÀM TIỆN ÍCH (HELPERS) ---

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

function todayCacheKey() {
  return toLocalDate(new Date());
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function extractList(data: any): any[] {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray((data as any)?.result) && (data as any).result) ||
    (Array.isArray((data as any)?.result?.result) && (data as any).result.result) ||
    []
  );
}

function getDestinationCandidates(destination: string) {
  const key = normalizeKey(destination);
  const aliases = DESTINATION_ALIASES[key] || [destination];
  return Array.from(new Set([destination, ...aliases]));
}

function mapHotel(x: any): DomesticHotelItem | null {
  const id = String(x?.hotel_id ?? x?.hotelId ?? x?.id ?? "").trim();
  const name = String(x?.hotel_name_trans ?? x?.hotel_name ?? x?.name ?? "").trim();
  if (!id || !name) return null;

  const priceValue =
    x?.composite_price_breakdown?.gross_amount_per_night?.value ??
    x?.composite_price_breakdown?.gross_amount?.value ??
    x?.min_total_price ??
    x?.priceValue ??
    x?.price;

  // Cải thiện chất lượng ảnh
  let highResImage = x?.main_photo_url || x?.image || x?.thumbnail;
  if (typeof highResImage === "string") {
    highResImage = highResImage.replace(/(square\d+|max\d+)/i, "max500");
  }

  const image =
    highResImage ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";

  const priceText =
    priceValue != null && Number.isFinite(Number(priceValue))
      ? `${new Intl.NumberFormat("vi-VN").format(Number(priceValue))} ₫`
      : "Liên hệ";

  const ratingRaw = typeof x?.review_score === "number" ? x.review_score : Number(x?.review_score || x?.rating10 || 0);
  const finalRating = ratingRaw > 5 ? ratingRaw / 2 : ratingRaw;

  return {
    id,
    name,
    distanceText: x?.distance_to_cc ?? x?.distance ?? "",
    rating: Number.isFinite(finalRating) && finalRating > 0 ? finalRating : undefined,
    reviews: Number.isFinite(Number(x?.review_nr)) ? Number(x.review_nr) : undefined,
    priceText,
    image,
  };
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

// Hàm Fetch API độc lập để tái sử dụng cho Preload
async function fetchHotelsForDestination(destination: string, arrivalDate: string, departureDate: string): Promise<DomesticHotelItem[]> {
  const dailyKey = todayCacheKey();
  const cacheKey = `domestic_hotels:${normalizeKey(destination)}:${dailyKey}`;

  const fromCache = localStorage.getItem(cacheKey);
  if (fromCache) {
    const parsed = JSON.parse(fromCache);
    if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
      return parsed.items.slice(0, 6);
    }
  }

  const merged = new Map<string, DomesticHotelItem>();
  const pushMapped = (list: any[]) => {
    list.forEach((raw) => {
      const mapped = mapHotel(raw);
      if (!mapped || merged.has(mapped.id)) return;
      merged.set(mapped.id, mapped);
    });
  };

  const suggestions = await hotelService.searchListDestinationSmart(destination);
  const firstWithCoord = suggestions.find(
    (s: any) => Number.isFinite(Number(s?.latitude)) && Number.isFinite(Number(s?.longitude))
  );

  if (firstWithCoord) {
    const byCoord = await hotelService.searchByCoordinate({
      latitude: String(firstWithCoord.latitude),
      longitude: String(firstWithCoord.longitude),
      arrivalDate, departureDate, adults: "2", roomQty: "1", pageNumber: "1", languagecode: "vi", currencyCode: "VND", radius: "20",
    });
    pushMapped(extractList(byCoord));
  }

  const candidates = getDestinationCandidates(destination);
  for (const q of candidates) {
    if (merged.size >= 6) break;

    const dataPage1 = await hotelService.search({
      destination: q, arrivalDate, departureDate, adults: "2", roomQty: "1", pageNumber: "1", languagecode: "vi", currencyCode: "VND",
    });
    pushMapped(extractList(dataPage1));

    if (merged.size < 6) {
      const dataPage2 = await hotelService.search({
        destination: q, arrivalDate, departureDate, adults: "2", roomQty: "1", pageNumber: "2", languagecode: "vi", currencyCode: "VND",
      });
      pushMapped(extractList(dataPage2));
    }
  }

  const finalItems = Array.from(merged.values()).slice(0, 6);
  localStorage.setItem(cacheKey, JSON.stringify({ items: finalItems }));
  return finalItems;
}

// --- COMPONENT CHÍNH ---

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

  // Reset trang về 0 khi đổi địa điểm
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedDestination]);

  // Logic gọi API cho tab hiện tại
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
        if (!cancelled) {
          setItems(finalItems);
          if (finalItems.length === 0) setError("Không có dữ liệu khách sạn cho địa điểm này.");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Không tải được khách sạn");
          setItems([]);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedDestination, arrivalDate, departureDate]);

  // Logic Preload (Tải ngầm dữ liệu các tab khác)
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

  // Logic Slider
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handlePrev = () => setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  const handleNext = () => setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));

  // Lấy tên Tiếng Việt của tab đang chọn để hiển thị
  const activeTabLabel = DOMESTIC_TABS.find((tab) => tab.value === selectedDestination)?.label || selectedDestination;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Khách sạn trong nước
          </h2>
        </div>

        {/* Tabs */}
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

        {/* Cấu trúc Grid Cards & Slider */}
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

              {/* Khối điều hướng Slider */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <button onClick={handlePrev} className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">
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
                          idx === currentPage ? "w-2 bg-slate-600" : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                        aria-label={`Đi tới trang ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button onClick={handleNext} className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">
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
