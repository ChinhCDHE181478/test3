"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Calendar } from "lucide-react"; // Đã thêm import lucide-react

const HOTEL_CITY_IMAGES = {
  hcm: "https://images.pexels.com/photos/9768830/pexels-photo-9768830.jpeg?_gl=1*d5fz2k*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDA5MzIkajM2JGwwJGgw",
  hanoi: "https://cdn.getyourguide.com/img/location/58c9219a7a849.jpeg/88.jpg",
  danang: "https://images.pexels.com/photos/34373624/pexels-photo-34373624.jpeg?_gl=1*1wlnebk*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDEyOTgkajU5JGwwJGgw",
  dalat: "https://dalatopentours.com/images/attraction/dalat.jpg",
  phuquoc: "https://rootytrip.com/wp-content/uploads/2024/07/phu-quoc.jpg",
};

const domesticDestinations = [
  { city: "Hà Nội", searchValue: "Hà Nội", country: "Việt Nam", price: "từ 890.000 VND", img: HOTEL_CITY_IMAGES.hanoi },
  { city: "Đà Nẵng", searchValue: "Đà Nẵng", country: "Việt Nam", price: "từ 690.000 VND", img: HOTEL_CITY_IMAGES.danang },
  { city: "Phú Quốc", searchValue: "Phú Quốc", country: "Việt Nam", price: "từ 820.000 VND", img: HOTEL_CITY_IMAGES.phuquoc },
  { city: "Đà Lạt", searchValue: "Đà Lạt", country: "Việt Nam", price: "từ 750.000 VND", img: HOTEL_CITY_IMAGES.dalat },
  { city: "TP. Hồ Chí Minh", searchValue: "Ho Chi Minh City", country: "Việt Nam", price: "từ 990.000 VND", img: HOTEL_CITY_IMAGES.hcm },
];

const internationalDestinations = [
  { city: "Paris", searchValue: "Paris", country: "Pháp", price: "từ 12.500.000 VND", img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80" },
  { city: "Tokyo", searchValue: "Tokyo", country: "Nhật Bản", price: "từ 9.800.000 VND", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80" },
  { city: "Bali", searchValue: "Bali", country: "Indonesia", price: "từ 5.200.000 VND", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80" },
  { city: "New York", searchValue: "New York", country: "Hoa Kỳ", price: "từ 15.000.000 VND", img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80" },
  { city: "London", searchValue: "London", country: "Vương quốc Anh", price: "từ 13.500.000 VND", img: "https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=800&q=80" },
];

type CheapFlightItem = {
  from: string;
  to: string;
  price: number;
  date: string;
  img: string;
  bookingUrl?: string;
  searchUrl?: string;
};

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

const CHEAP_FLIGHT_ROUTES = [
  { fromQuery: "Hà Nội", toQuery: "Đà Nẵng", fromLabel: "Hà Nội", toLabel: "Đà Nẵng", img: HOTEL_CITY_IMAGES.danang, dayOffset: 7 },
  { fromQuery: "Ho Chi Minh City", toQuery: "Hà Nội", fromLabel: "TP.HCM", toLabel: "Hà Nội", img: HOTEL_CITY_IMAGES.hanoi, dayOffset: 10 },
  { fromQuery: "Tan Son Nhat International Airport", toQuery: "Phu Quoc International Airport", fromLabel: "TP.HCM", toLabel: "Phú Quốc", img: HOTEL_CITY_IMAGES.phuquoc, dayOffset: 14 },
];

function toIsoDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function toDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildDefaultCheapFlights(): CheapFlightItem[] {
  const fallbackPrices = [690000, 990000, 850000];
  return CHEAP_FLIGHT_ROUTES.map((route, idx) => {
    const iso = toIsoDate(route.dayOffset);
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

export default function HomeSections({
  onPickPopularDestination,
}: {
  onPickPopularDestination?: (destination: string) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"domestic" | "international">("domestic");
  const [cheapFlights, setCheapFlights] = useState<CheapFlightItem[]>(buildDefaultCheapFlights());

  const currentDestinations = activeTab === "domestic" ? domesticDestinations : internationalDestinations;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/flights/cheap");
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        if (!cancelled && items.length > 0) setCheapFlights(items);
      } catch {
        // keep fallback
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* 1. Điểm đến phổ biến */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Điểm đến phổ biến</h2>
            <p className="mt-2 text-base text-slate-500 mb-6">Khám phá những địa điểm du lịch được yêu thích nhất</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button
                onClick={() => setActiveTab("domestic")}
                className={`cursor-pointer px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  activeTab === "domestic"
                    ? "bg-[#0a1128] text-white shadow-lg shadow-[#0a1128]/25 border border-[#0a1128] -translate-y-0.5"
                    : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                Việt Nam
              </button>
              <button
                onClick={() => setActiveTab("international")}
                className={`cursor-pointer px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  activeTab === "international"
                    ? "bg-[#0a1128] text-white shadow-lg shadow-[#0a1128]/25 border border-[#0a1128] -translate-y-0.5"
                    : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                Nước ngoài
              </button>
            </div>
          </div>

          <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            {currentDestinations.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPickPopularDestination?.(p.searchValue)}
                className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left ring-1 ring-black/10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:ring-cyan-400 hover:shadow-2xl"
              >
                <div className="relative h-64 w-full bg-slate-200">
                  <img src={p.img} alt={p.city} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:brightness-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-slate-900/75" />

                  <div className="absolute inset-x-5 bottom-5">
                    <h3 className="text-xl font-bold text-white drop-shadow-md tracking-wide">{p.city}</h3>
                    <p className="text-sm font-medium text-slate-300 drop-shadow-md">{p.country}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Vé máy bay giá rẻ (ĐÃ CẬP NHẬT UI) */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Vé máy bay giá rẻ</h2>
              <p className="mt-2 text-base text-slate-500">Tiết kiệm hơn với các chặng bay được săn đón nhất</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cheapFlights.map((d, i) => (
              <div
                key={i}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-xl relative"
              >
                {/* Phần ảnh bìa */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-200">
                  <img src={d.img} alt={`Vé máy bay đi ${d.to}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                    Khứ hồi
                  </div>
                </div>

                {/* Phần thông tin vé */}
                <div className="px-5 pt-5 pb-4 flex flex-col flex-1 relative">
                  
                  {/* Tuyến bay mô phỏng dạng vé */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Điểm đi</p>
                      <h3 className="text-lg font-bold text-slate-900 truncate">{d.from}</h3>
                    </div>
                    
                    {/* Icon máy bay ở giữa (Đã chuyển sang nằm ngang) */}
                    <div className="flex flex-col items-center justify-center px-4 relative">
                      {/* Thay đổi -rotate-45 thành rotate-45 và đổi hiệu ứng hover thành bay ngang (translate-x) */}
                      <Plane className="w-5 h-5 text-cyan-500 mb-1 rotate-45 group-hover:translate-x-2 transition-transform duration-300" />
                      <div className="w-12 h-[2px] border-t-2 border-dashed border-slate-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"></div>
                    </div>
                    
                    <div className="flex-1 text-right">
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Điểm đến</p>
                      <h3 className="text-lg font-bold text-slate-900 truncate">{d.to}</h3>
                    </div>
                  </div>

                  {/* Ngày bay */}
                  <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg mb-4">
                    <Calendar className="w-4 h-4 mr-2 text-cyan-600" />
                    Ngày đi: <span className="ml-1 text-slate-800">{d.date}</span>
                  </div>

                  {/* Đường cắt vé (Ticket dashed line) */}
                  <div className="relative flex items-center py-2 -mx-5 mb-2">
                    <div className="h-4 w-4 rounded-full bg-slate-50 border-r border-slate-200 absolute -left-2 shadow-inner"></div>
                    <div className="h-[1px] w-full border-t border-dashed border-slate-300"></div>
                    <div className="h-4 w-4 rounded-full bg-slate-50 border-l border-slate-200 absolute -right-2 shadow-inner"></div>
                  </div>

                  {/* Giá và nút đặt */}
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Giá chỉ từ</p>
                      <p className="text-xl font-black text-cyan-600 tracking-tight">{d.price.toLocaleString("vi-VN")} ₫</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (d.bookingUrl) {
                          window.open(d.bookingUrl, "_blank", "noopener,noreferrer");
                          return;
                        }
                        if (d.searchUrl) {
                          router.push(d.searchUrl);
                          return;
                        }
                        router.push("/pages/flights");
                      }}
                      className="cursor-pointer px-5 py-2.5 bg-cyan-50 text-cyan-700 font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-600 hover:text-white hover:shadow-md hover:shadow-cyan-600/20 active:translate-y-0"
                    >
                      Đặt ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Tại sao chọn VivuPlan */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Tại sao chọn VivuPlan?
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              Chúng tôi cam kết mang đến trải nghiệm đặt vé hoàn hảo nhất
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-cyan-50 text-cyan-600 transition-colors duration-300 group-hover:bg-cyan-600 group-hover:text-white ring-8 ring-cyan-50/50 group-hover:ring-cyan-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Giá tốt nhất</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                So sánh hàng trăm hãng hàng không để đảm bảo bạn luôn nhận được deal hời nhất.
              </p>
            </div>

            <div className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-cyan-50 text-cyan-600 transition-colors duration-300 group-hover:bg-cyan-600 group-hover:text-white ring-8 ring-cyan-50/50 group-hover:ring-cyan-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">An toàn & Bảo mật</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Hệ thống thanh toán mã hóa đa tầng, bảo vệ tuyệt đối dữ liệu cá nhân của bạn.
              </p>
            </div>

            <div className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 p-8 transition-all duration-300 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-cyan-50 text-cyan-600 transition-colors duration-300 group-hover:bg-cyan-600 group-hover:text-white ring-8 ring-cyan-50/50 group-hover:ring-cyan-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Hỗ trợ 24/7</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Đội ngũ chăm sóc khách hàng chuyên nghiệp luôn sẵn sàng đồng hành cùng bạn.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
