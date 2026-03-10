"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Compass, Crown, Loader2, Sparkles, X } from "lucide-react";
import SegmentedToggle from "@/components/SegmentedToggle";
import {
  LONG_TERM_SUBSCRIPTION_PLANS,
  SHORT_TERM_SUBSCRIPTION_PLANS,
  type PaidSubscriptionPlan,
} from "@/lib/subscriptions";

const SPRING_BOOT_API = process.env.NEXT_PUBLIC_API_URL!;

function getTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") || localStorage.getItem("token");
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("vivuplan_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || parsed?.userId || parsed?.user_id || null;
  } catch {
    return null;
  }
}

async function fetchJsonSafe(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { res, text, json };
  } catch {
    return { res: { ok: false } as Response, text: "", json: null };
  }
}

function buildPremiumFeatures(plan: PaidSubscriptionPlan) {
  return [
    { name: "Tất cả tính năng cơ bản", included: true },
    { name: "Lập lịch trình bằng AI", included: true },
    { name: "Bản đồ lịch trình thông minh", included: true },
    { name: "Lưu lịch sử chuyến đi", included: true },
    { name: `Thời hạn sử dụng ${plan.durationLabel}`, included: true },
  ];
}

function FeatureList({
  features,
  highlight,
}: {
  features: { name: string; included: boolean }[];
  highlight?: boolean;
}) {
  return (
    <ul className="mb-8 space-y-4">
      {features.map((feature, idx) => (
        <li key={idx} className={`flex items-start gap-3 ${!feature.included ? "opacity-50" : ""}`}>
          {feature.included ? (
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                highlight ? "bg-cyan-500 text-white shadow-sm shadow-cyan-200" : "bg-slate-200 text-slate-600"
              }`}
            >
              <Check size={12} strokeWidth={3} />
            </div>
          ) : (
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <X size={12} strokeWidth={3} />
            </div>
          )}
          <span
            className={`text-sm ${
              feature.included ? "font-semibold text-slate-700" : "text-slate-400 line-through decoration-slate-300"
            }`}
          >
            {feature.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingSection() {
  const router = useRouter();
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedShortPlan, setSelectedShortPlan] = useState<string>("month");
  const [selectedLongPlan, setSelectedLongPlan] = useState<string>("year");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLoggedIn(!!getTokenFromStorage());
    }
  }, []);

  const activeShortPlan =
    SHORT_TERM_SUBSCRIPTION_PLANS.find((plan) => plan.packageCode === selectedShortPlan) ??
    SHORT_TERM_SUBSCRIPTION_PLANS[0];
  const activeLongPlan =
    LONG_TERM_SUBSCRIPTION_PLANS.find((plan) => plan.packageCode === selectedLongPlan) ??
    LONG_TERM_SUBSCRIPTION_PLANS[0];

  const handlePurchase = async (pkgId: string, packageCode: string) => {
    if (pkgId === "basic") {
      if (!isLoggedIn) {
        router.push("/pages/login");
      }
      return;
    }

    setLoadingPkg(pkgId);

    try {
      const token = getTokenFromStorage();
      const uid = getStoredUserId();

      if (!token || !uid) {
        alert("Vui lòng đăng nhập để mua gói dịch vụ.");
        router.push("/pages/login?next=/");
        return;
      }

      const { res, json } = await fetchJsonSafe(`${SPRING_BOOT_API}/subscriptions/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "*/*" },
        body: JSON.stringify({ userId: uid, packageCode }),
      });

      if (!res.ok) {
        alert(json?.message || "Lỗi tạo giao dịch. Vui lòng thử lại.");
        return;
      }

      if (json?.status !== "success" || !json?.result?.checkoutUrl) {
        alert(json?.message || "Không lấy được link thanh toán.");
        return;
      }

      window.location.href = json.result.checkoutUrl;
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra. Vui lòng kiểm tra kết nối.");
    } finally {
      setLoadingPkg(null);
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-50 py-24" id="pricing">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      <div className="container relative z-10 mx-auto px-6 max-w-7xl">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Lựa Chọn Gói Dịch Vụ
          </h2>
          <p className="text-lg text-slate-500">
            Nâng cấp trải nghiệm du lịch của bạn với trợ lý AI. Chọn gói phù hợp nhất với nhu cầu chuyến đi.
          </p>
        </div>

        {/* Cấu trúc Grid, dùng items-center để các card có thể scale mượt mà */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:items-center">
          
          {/* Card 1: Miễn Phí (Nhấn chìm) */}
          <div className="flex h-full min-h-[500px] flex-col rounded-[2rem] border border-slate-200 bg-transparent p-8 xl:h-[95%]">
            <div className="mb-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                <Compass size={24} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Cơ bản</p>
              <h3 className="mt-1 text-2xl font-black text-slate-800">Thành viên</h3>
              <p className="mt-2 text-sm text-slate-500">
                Tuyệt vời để tìm kiếm và đặt chỗ cơ bản.
              </p>
            </div>

            <div className="mb-8 border-b border-slate-200 pb-8">
              <span className="text-4xl font-black tracking-tighter text-slate-800">0đ</span>
            </div>

            <div className="flex-1">
              <FeatureList
                features={[
                  { name: "Tìm và đặt vé máy bay", included: true },
                  { name: "Tìm và đặt khách sạn", included: true },
                  { name: "Thanh toán bảo mật", included: true },
                  { name: "Lập lịch trình bằng AI", included: false },
                  { name: "Bản đồ lịch trình thông minh", included: false },
                ]}
              />
            </div>

            <button
              onClick={() => handlePurchase("basic", "basic")}
              disabled={isLoggedIn}
              className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
                isLoggedIn
                  ? "cursor-default bg-slate-200 text-slate-500"
                  : "cursor-pointer bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {isLoggedIn ? "Đang sử dụng" : "Đăng ký miễn phí"}
            </button>
          </div>

          {/* Card 2: Ngắn hạn */}
          <div className="flex h-full min-h-[500px] flex-col rounded-[2rem] border border-cyan-200 bg-white p-8 shadow-xl shadow-slate-200/50 xl:h-[95%]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600">Linh hoạt</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Trải nghiệm</h3>
              </div>
              <Sparkles className="text-cyan-500" size={24} />
            </div>

            <div className="mb-6">
              <SegmentedToggle
                options={SHORT_TERM_SUBSCRIPTION_PLANS.map((plan) => ({
                  value: plan.packageCode,
                  label: plan.durationLabel,
                }))}
                value={activeShortPlan.packageCode}
                onChange={setSelectedShortPlan}
                groupId="pricing-short"
                tone="brand"
              />
            </div>

            <div className="mb-8 border-b border-slate-100 pb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tighter text-slate-900">
                  {activeShortPlan.price.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-sm font-semibold text-slate-400">{activeShortPlan.periodLabel}</span>
              </div>
              {activeShortPlan.badge && (
                <div className="mt-3">
                  <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                    {activeShortPlan.badge}
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500 h-10">{activeShortPlan.description}</p>
            </div>

            <div className="flex-1">
              <FeatureList features={buildPremiumFeatures(activeShortPlan)} highlight />
            </div>

            <button
              onClick={() => handlePurchase(activeShortPlan.id, activeShortPlan.packageCode)}
              disabled={loadingPkg !== null}
              className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all ${
                loadingPkg && loadingPkg !== activeShortPlan.id
                  ? "cursor-not-allowed bg-cyan-300 opacity-60"
                  : "cursor-pointer bg-cyan-600 hover:bg-cyan-700 hover:shadow-lg hover:shadow-cyan-200"
              }`}
            >
              {loadingPkg === activeShortPlan.id ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 size={18} className="animate-spin" /> Đang xử lý...
                </span>
              ) : (
                activeShortPlan.ctaLabel || "Bắt đầu ngay"
              )}
            </button>
          </div>

          {/* Card 3: Dài hạn (Hero Card - Scale lên một chút) */}
          <div className="relative flex h-full min-h-[500px] flex-col rounded-[2rem] border-2 border-blue-500 bg-gradient-to-b from-blue-50 to-white p-8 shadow-2xl shadow-blue-500/20 xl:scale-105 z-10">
            {/* Badge nổi bật */}
            <div className="absolute -top-4 left-0 right-0 mx-auto w-max rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
              Tiết kiệm nhất
            </div>

            <div className="mb-6 flex items-start justify-between gap-4 mt-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Cam kết</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Dài hạn</h3>
              </div>
              <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                <Crown size={24} />
              </div>
            </div>

            <div className="mb-6">
              <SegmentedToggle
                options={LONG_TERM_SUBSCRIPTION_PLANS.map((plan) => ({
                  value: plan.packageCode,
                  label: plan.durationLabel,
                }))}
                value={activeLongPlan.packageCode}
                onChange={setSelectedLongPlan}
                groupId="pricing-long"
                tone="brand"
              />
            </div>

            <div className="mb-8 border-b border-blue-100 pb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tighter text-blue-700">
                  {activeLongPlan.price.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-sm font-semibold text-slate-400">{activeLongPlan.periodLabel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 h-10">{activeLongPlan.description}</p>
            </div>

            <div className="flex-1">
              <FeatureList features={buildPremiumFeatures(activeLongPlan)} highlight />
            </div>

            <button
              onClick={() => handlePurchase(activeLongPlan.id, activeLongPlan.packageCode)}
              disabled={loadingPkg !== null}
              className={`mt-auto w-full rounded-xl py-4 text-sm font-bold text-white transition-all shadow-md ${
                loadingPkg && loadingPkg !== activeLongPlan.id
                  ? "cursor-not-allowed bg-blue-300 opacity-60"
                  : "cursor-pointer bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300"
              }`}
            >
              {loadingPkg === activeLongPlan.id ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 size={18} className="animate-spin" /> Đang xử lý...
                </span>
              ) : (
                activeLongPlan.ctaLabel || "Mua gói dài hạn"
              )}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
