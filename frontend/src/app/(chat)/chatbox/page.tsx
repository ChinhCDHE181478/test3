"use client";

import React, { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Utensils,
  Calendar,
  Send,
  ArrowLeft,
  X,
  Star,
  Maximize2,
  Sun,
  Sunset,
  Moon,
  MapPin,
  Menu,
  Wallet,
  History,
  MessageSquare,
  PlusCircle,
  Hotel,
  Map as MapIcon,
  Sparkles,
  Loader2,
  ChevronRight,
  FilePenLine,
  Sparkle,
  Lock,
  LogIn,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  Info,
  ExternalLink,
} from "lucide-react";
import SegmentedToggle from "@/components/SegmentedToggle";
import PlacesMapPane, { UiPlace } from "./PlacesMapPane";
import { useAuth } from "../../AuthProvider";
import {
  LONG_TERM_SUBSCRIPTION_PLANS,
  SHORT_TERM_SUBSCRIPTION_PLANS,
  getSubscriptionDisplayName,
  type PaidSubscriptionPlan,
} from "@/lib/subscriptions";

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API!;
const SPRING_BOOT_API = process.env.NEXT_PUBLIC_API_URL!;
const PROMPT_TUTORIAL_STORAGE_KEY = "vivuplan_prompt_tutorial_done";
const CHAT_HISTORY_ACTIVITY_KEY = "vivuplan_chat_history_activity";

const SHORT_TERM_SUB_PACKAGES_DATA = SHORT_TERM_SUBSCRIPTION_PLANS.map((plan, index) => ({
  id: index + 1,
  packageCode: plan.packageCode,
  name: plan.name,
  durationLabel: plan.durationLabel,
  price: plan.price,
  periodLabel: plan.periodLabel,
  badge: plan.badge,
  highlight: Boolean(plan.highlight),
  description: plan.description,
  ctaLabel: plan.ctaLabel,
}));

const LONG_TERM_SUB_PACKAGES_DATA = LONG_TERM_SUBSCRIPTION_PLANS.map((plan, index) => ({
  id: index + 1,
  packageCode: plan.packageCode,
  name: plan.name,
  durationLabel: plan.durationLabel,
  price: plan.price,
  periodLabel: plan.periodLabel,
  badge: plan.badge,
  highlight: Boolean(plan.highlight),
  description: plan.description,
  ctaLabel: plan.ctaLabel,
}));

function getStoredHistoryActivity() {
  if (typeof window === "undefined") return {} as Record<string, number>;
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markConversationActivity(sessionId: string, timestamp = Date.now()) {
  if (typeof window === "undefined" || !sessionId) return;
  const next = { ...getStoredHistoryActivity(), [sessionId]: timestamp };
  localStorage.setItem(CHAT_HISTORY_ACTIVITY_KEY, JSON.stringify(next));
}

function getConversationTimestamp(item: any, activityMap: Record<string, number>) {
  const sid = String(item?.session_id ?? item?.sessionId ?? "");
  const localActivity = sid ? Number(activityMap[sid] ?? 0) : 0;
  const serverTime = [
    item?.last_message_at,
    item?.lastMessageAt,
    item?.updated_at,
    item?.updatedAt,
    item?.create_at,
    item?.created_at,
    item?.createdAt,
  ]
    .map((value) => new Date(value ?? "").getTime())
    .find((value) => Number.isFinite(value) && value > 0) ?? 0;

  return Math.max(localActivity, serverTime);
}

function sortConversationHistory(items: any[]) {
  const activityMap = getStoredHistoryActivity();
  return [...items].sort((a, b) => {
    const timeDiff = getConversationTimestamp(b, activityMap) - getConversationTimestamp(a, activityMap);
    if (timeDiff !== 0) return timeDiff;
    return String(b?.session_id ?? "").localeCompare(String(a?.session_id ?? ""));
  });
}

type SubStatus = {
  active: boolean;
  packageCode?: string | null;
  remainingDays?: number;
  expiredAt?: string | null;
  raw?: any;
};

type SubscriptionCheckResult = {
  active: boolean;
  packageCode: string | null;
  remainingDays: number;
  expiredAt: string | null;
  error?: boolean;
};

type PromptTutorialStep = {
  id: string;
  title: string;
  description: string;
  targetRef: React.RefObject<HTMLElement | null>;
};

function formatVND(n: number) {
  try {
    return n.toLocaleString("vi-VN") + "Đ";
  } catch {
    return `${n}Đ`;
  }
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function hasSubscriptionAdvanced(previous: SubscriptionCheckResult, next: SubscriptionCheckResult) {
  if (!previous.active && next.active) return true;
  if (next.remainingDays > previous.remainingDays) return true;
  return toTimestamp(next.expiredAt) > toTimestamp(previous.expiredAt);
}

function formatSubscriptionExpiry(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN");
}

function getTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") || localStorage.getItem("token");
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizePositiveId(value: any): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return String(Math.trunc(n));
  return null;
}

function extractUserIdFromPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = payload.user_id ?? payload.userId ?? payload.id ?? payload.uid ?? payload.sub ?? null;
  const nested = payload.user?.id ?? payload.user?.userId ?? payload.user?.user_id ?? null;
  return normalizePositiveId(direct) ?? normalizePositiveId(nested);
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("vivuplan_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (
      normalizePositiveId(parsed?.id) ??
      normalizePositiveId(parsed?.userId) ??
      normalizePositiveId(parsed?.user_id)
    );
  } catch {
    return null;
  }
}

function resolveClientUserId(fallback?: string | number | null): string | null {
  const normalizedFallback = normalizePositiveId(fallback);
  const storedUserId = getStoredUserId();
  if (storedUserId) return storedUserId;

  const token = getTokenFromStorage();
  if (token) {
    const payload = decodeJwtPayload(token);
    const tokenUserId = extractUserIdFromPayload(payload);
    if (tokenUserId) return tokenUserId;
  }

  return normalizedFallback;
}

async function fetchJsonSafe(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

const openGoogleMaps = (query: string) => {
  if (!query) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, "_blank");
};

function VivuplanPremiumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [itineraryData, setItineraryData] = useState<any>(null);
  const [hotelData, setHotelData] = useState<any>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isPromptPopoverOpen, setIsPromptPopoverOpen] = useState(false);

  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "itinerary" | "hotel">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const quickPromptBtnRef = useRef<HTMLButtonElement>(null);
  const promptTabsRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const sendPromptBtnRef = useRef<HTMLButtonElement>(null);
  const [isPromptTutorialOpen, setIsPromptTutorialOpen] = useState(false);
  const [promptTutorialStep, setPromptTutorialStep] = useState(0);
  const [promptTutorialRect, setPromptTutorialRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const promptTutorialAutoOpenedForKey = useRef<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);

  // ... (existing code)



  // ... (later in file)



  const hasProcessedInitialPrompt = useRef(false);

  // prompt mẫu
  const [quickMode, setQuickMode] = useState<"itinerary" | "hotel">("itinerary");

  const [itineraryForm, setItineraryForm] = useState({
    departure: "",
    destination: "",
    startDate: "",
    endDate: "",
    companions: "",
    budgetFrom: "",
    budgetTo: "",
  });

  const [hotelForm, setHotelForm] = useState({
    destination: "",
    checkIn: "",
    checkOut: "",
    adults: "",
    children: "",
    rooms: "",
  });

  const [showLoginGate, setShowLoginGate] = useState(false);
  const [allowGuestDemo, setAllowGuestDemo] = useState(false);
  const [subStatus, setSubStatus] = useState<SubStatus>({ active: false, packageCode: null, remainingDays: 0, expiredAt: null });
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPaymentSyncing, setIsPaymentSyncing] = useState(false);
  const [selectedShortPackage, setSelectedShortPackage] = useState<string>("month");
  const [selectedLongPackage, setSelectedLongPackage] = useState<string>("year");
  const [isAccessCheckLoading, setIsAccessCheckLoading] = useState(true);
  const [isSubStatusResolved, setIsSubStatusResolved] = useState(false);
  const [subStatusError, setSubStatusError] = useState<string | null>(null);
  const paymentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTutorialStorageKey = useMemo(
    () => `${PROMPT_TUTORIAL_STORAGE_KEY}:${user?.id ? String(user.id) : "guest"}`,
    [user?.id]
  );
  const promptTutorialSteps: PromptTutorialStep[] = useMemo(
    () => [
      {
        id: "quick-prompt",
        title: "B\u01b0\u1edbc 1: M\u1edf form t\u1ea1o nhanh",
        description:
          "B\u1ea5m n\u00fat h\u00ecnh c\u00e2y b\u00fat \u0111\u1ec3 m\u1edf form t\u1ea1o nhanh. \u1ede b\u01b0\u1edbc n\u00e0y b\u1ea1n ch\u1ec9 c\u1ea7n bi\u1ebft v\u1ecb tr\u00ed c\u1ee7a n\u00fat n\u00e0y.",
        targetRef: quickPromptBtnRef,
      },
      {
        id: "prompt-tabs",
        title: "B\u01b0\u1edbc 2: Ch\u1ecdn tab L\u1ecbch tr\u00ecnh ho\u1eb7c Kh\u00e1ch s\u1ea1n",
        description:
          "Sau khi m\u1edf form, h\u00e3y ch\u1ecdn \u0111\u00fang tab theo nhu c\u1ea7u: L\u1ecbch tr\u00ecnh cho k\u1ebf ho\u1ea1ch \u0111i ch\u01a1i, Kh\u00e1ch s\u1ea1n \u0111\u1ec3 t\u00ecm n\u01a1i l\u01b0u tr\u00fa.",
        targetRef: promptTabsRef,
      },
      {
        id: "prompt-input",
        title: "B\u01b0\u1edbc 3: Nh\u1eadp prompt",
        description:
          "B\u1ea1n c\u00f3 th\u1ec3 nh\u1eadp prompt tr\u1ef1c ti\u1ebfp t\u1ea1i \u00f4 n\u00e0y. V\u00ed d\u1ee5: \"L\u1eadp l\u1ecbch tr\u00ecnh \u0110\u00e0 L\u1ea1t 3 ng\u00e0y 2 \u0111\u00eam cho 2 ng\u01b0\u1eddi, ng\u00e2n s\u00e1ch 5 tri\u1ec7u\".",
        targetRef: promptInputRef,
      },
      {
        id: "send",
        title: "B\u01b0\u1edbc 4: G\u1eedi prompt",
        description:
          "Nh\u1ea5n n\u00fat m\u0169i t\u00ean \u0111\u1ec3 g\u1eedi y\u00eau c\u1ea7u. B\u1ea1n c\u0169ng c\u00f3 th\u1ec3 nh\u1ea5n Enter \u0111\u1ec3 g\u1eedi nhanh.",
        targetRef: sendPromptBtnRef,
      },
    ],
    []
  );

  const openPromptTutorial = (step = 0) => {
    setPromptTutorialRect(null);
    setPromptTutorialStep(step);
    setIsPromptPopoverOpen(step > 0);
    setIsPromptTutorialOpen(true);
  };

  const closePromptTutorial = () => {
    setIsPromptTutorialOpen(false);
    setPromptTutorialRect(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(promptTutorialStorageKey, "1");
    }
  };

  const goToPromptTutorialStep = (nextStep: number) => {
    if (nextStep < 0) return;
    if (nextStep >= promptTutorialSteps.length) {
      closePromptTutorial();
      return;
    }
    setPromptTutorialStep(nextStep);
  };

  const newSessionId = () => {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
    } catch { }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  // Get user ID from AuthProvider
  const getUserId = () => {
    if (user?.id) return String(user.id);
    if (allowGuestDemo) return "1";
    return null;
  };

  const getBannerPhoto = (name: string) => {
    if (itineraryData?.destination_image_url) return itineraryData.destination_image_url;
    return undefined;
  };

  const totalCost = useMemo(() => {
    if (!itineraryData?.itinerary) return 0;
    return itineraryData.itinerary.reduce(
      (sum: number, day: any) => sum + (day.estimated_cost?.max || 0),
      0
    );
  }, [itineraryData]);

  const activeShortPackage =
    SHORT_TERM_SUBSCRIPTION_PLANS.find((plan) => plan.packageCode === selectedShortPackage) ??
    SHORT_TERM_SUBSCRIPTION_PLANS[0];
  const activeLongPackage =
    LONG_TERM_SUBSCRIPTION_PLANS.find((plan) => plan.packageCode === selectedLongPackage) ??
    LONG_TERM_SUBSCRIPTION_PLANS[0];

  const clearPaymentSyncTimer = () => {
    if (paymentSyncTimerRef.current !== null) {
      clearTimeout(paymentSyncTimerRef.current);
      paymentSyncTimerRef.current = null;
    }
  };

  // VÁ LỖI HIỂN THỊ "NỘI DUNG BỊ KHÓA"
  const shouldLockContent = useMemo(() => {
    if (isAccessCheckLoading) return false;

    // Fix chớp màn hình: Check trực tiếp URL param thay vì chờ useEffect set state allowGuestDemo
    const isDemoGuest = allowGuestDemo || Boolean(searchParams?.get("prompt"));

    if (isAuthenticated && !isDemoGuest) {
      if (!isSubStatusResolved) return false;
      if (subStatusError) return true;
      return !subStatus.active;
    }

    if (!isAuthenticated && !isDemoGuest) return true;
    return false;
  }, [
    isAccessCheckLoading,
    isAuthenticated,
    allowGuestDemo,
    isSubStatusResolved,
    subStatusError,
    subStatus.active,
    searchParams
  ]);

  const loadHistory = async () => {
    try {
      if (!isAuthenticated || !user?.id) { setChatHistory([]); return; }
      const uid = getUserId();
      if (!uid) { setChatHistory([]); return; }
      const { res, json } = await fetchJsonSafe(`${API_BASE}/conversation/history/${uid}?page=1&page_size=30`);
      if (!res.ok) { setChatHistory([]); return; }
      const dataH = json ?? {};
      if (dataH?.data) {
        setChatHistory(sortConversationHistory(dataH.data));
      } else { setChatHistory([]); }
    } catch { setChatHistory([]); }
  };

  const handleSelectChat = async (sid: string) => {
    try {
      setIsLoading(true); setSelectedDayIdx(null); setActiveId(sid); setViewMode("chat");
      const { res, json } = await fetchJsonSafe(`${API_BASE}/conversation/${sid}`);
      if (!res.ok) return;
      const dataD = json ?? {};
      setMessages((dataD?.messages || []).map((m: any) => ({ role: m.role === "user" ? "user" : "ai", content: m.parts?.[0]?.text || "" })));
      setItineraryData(dataD?.itinerary || null);
      setHotelData(dataD?.hotel_recommendation || null);
      setIsSidebarOpen(false);
    } finally { setIsLoading(false); }
  };

  const handleNewChat = () => {
    setActiveId(newSessionId()); setMessages([]); setItineraryData(null); setHotelData(null);
    setInputText(""); setSelectedDayIdx(null); setViewMode("chat"); setIsSidebarOpen(false);
  };

  const fetchSubscriptionStatus = async (): Promise<SubscriptionCheckResult> => {
    const uid = resolveClientUserId(user?.id);
    if (!uid) {
      setSubStatus({ active: false, packageCode: null, remainingDays: 0, expiredAt: null });
      setSubStatusError(null);
      setIsSubStatusResolved(true);
      return { active: false, packageCode: null, remainingDays: 0, expiredAt: null };
    }

    setSubStatusError(null);
    try {
      const { res, json } = await fetchJsonSafe(`${SPRING_BOOT_API}/subscriptions/status?userId=${encodeURIComponent(String(uid))}`);
      console.log("🔍 Subscription check for userId:", uid, "Response:", { ok: res.ok, json });
      if (!res.ok) {
        setSubStatusError(`HTTP_${res.status}`);
        setIsSubStatusResolved(true);
        return { active: false, packageCode: null, remainingDays: 0, expiredAt: null, error: true };
      }
      const data = json ?? {};
      const result = data?.result ?? data;
      const active = Boolean(result?.active) || Boolean(result?.isActive) || String(result?.status || "").toLowerCase() === "active" || Boolean(result?.valid);
      const packageCode = result?.packageCode ?? result?.package_code ?? result?.plan ?? null;
      const remainingDaysRaw = Number(result?.remainingDays ?? result?.remaining_days ?? 0);
      const remainingDays = Number.isFinite(remainingDaysRaw) ? remainingDaysRaw : 0;
      const expiredAt = typeof result?.expiredAt === "string"
        ? result.expiredAt
        : typeof result?.expired_at === "string"
          ? result.expired_at
          : null;
      console.log("✅ Subscription status:", { active, packageCode, remainingDays, expiredAt, result });
      setSubStatus({ active, packageCode, remainingDays, expiredAt, raw: data });
      setSubStatusError(null);
      setIsSubStatusResolved(true);
      return { active, packageCode, remainingDays, expiredAt };
    } catch (err) {
      console.error("❌ Subscription error:", err);
      setSubStatusError("NETWORK_ERROR");
      setIsSubStatusResolved(true);
      return { active: false, packageCode: null, remainingDays: 0, expiredAt: null, error: true };
    }
  };

  const handleCheckPaymentStatus = async () => {
    const next = await fetchSubscriptionStatus();
    if (next.active) setShowPaywall(false);
  };

  const scheduleSubscriptionSync = (baseline: SubscriptionCheckResult, attempt = 0) => {
    clearPaymentSyncTimer();

    if (attempt >= 18) {
      setIsPaymentSyncing(false);
      return;
    }

    setIsPaymentSyncing(true);
    paymentSyncTimerRef.current = setTimeout(async () => {
      const next = await fetchSubscriptionStatus();
      if (!next.error && hasSubscriptionAdvanced(baseline, next)) {
        setShowPaywall(false);
        setIsPaymentSyncing(false);
        clearPaymentSyncTimer();
        return;
      }

      scheduleSubscriptionSync(baseline, attempt + 1);
    }, attempt === 0 ? 2500 : 5000);
  };

  const purchaseSubscription = async (packageCode: string) => {
    const uid = resolveClientUserId(user?.id);
    if (!uid) { setShowLoginGate(true); return; }
    setIsPurchasing(true);
    try {
      const { res, json } = await fetchJsonSafe(`${SPRING_BOOT_API}/subscriptions/purchase`, {
        method: "POST", headers: { "Content-Type": "application/json", accept: "*/*" },
        body: JSON.stringify({ userId: uid, packageCode }),
      });
      if (!res.ok) { alert("Lỗi tạo giao dịch. Vui lòng thử lại."); return; }
      if (json?.status !== "success" || !json?.result?.checkoutUrl) { alert(json?.message || "Không lấy được link thanh toán."); return; }
      const baseline: SubscriptionCheckResult = {
        active: Boolean(subStatus.active),
        packageCode: subStatus.packageCode ?? null,
        remainingDays: Number(subStatus.remainingDays ?? 0),
        expiredAt: subStatus.expiredAt ?? null,
      };
      window.open(json.result.checkoutUrl, "_blank");
      scheduleSubscriptionSync(baseline);
    } catch { alert("Lỗi kết nối."); } finally { setIsPurchasing(false); }
  };

  const handleBooking = async (hotel: any) => {
    try {
      const hotelId = hotel.place_id || hotel.details?.id || "11814601";
      const queryParams = new URLSearchParams({ hotelId: hotelId, arrivalDate: "2026-03-03", departureDate: "2026-03-05", adults: "2", childrenAge: "", languagecode: "vi", currencyCode: "VND" });
      const { res, json } = await fetchJsonSafe(`${SPRING_BOOT_API}/hotel/link?${queryParams.toString()}`);
      if (res.ok && json.result) window.open(json.result, "_blank");
      else alert("Không lấy được link đặt phòng.");
    } catch { alert("Lỗi kết nối."); }
  };

  // Helper for stable pseudo-random numbers
  const getStableOffset = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const random = Math.abs(hash) / 2147483648;
    return (random - 0.5) * 0.04; // Spread within ~4km
  };

  const normalizeVietnamese = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();

  const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    "ha noi": { lat: 21.0285, lng: 105.8542 },
    "hcm": { lat: 10.8231, lng: 106.6297 },
    "ho chi minh": { lat: 10.8231, lng: 106.6297 },
    "da nang": { lat: 16.0544, lng: 108.2022 },
    "da lat": { lat: 11.9404, lng: 108.4583 },
    "nha trang": { lat: 12.2388, lng: 109.1967 },
    "phu quoc": { lat: 10.2899, lng: 103.984 },
    "hue": { lat: 16.4637, lng: 107.5909 },
    "hoi an": { lat: 15.8801, lng: 108.338 },
    "sapa": { lat: 22.3364, lng: 103.8438 },
    "ha long": { lat: 20.9501, lng: 107.0734 },
    "vung tau": { lat: 10.346, lng: 107.0843 },
    "can tho": { lat: 10.0452, lng: 105.7469 },
    "quy nhon": { lat: 13.783, lng: 109.2197 },
  };

  const places: UiPlace[] = useMemo(() => {
    if (isStreaming) return []; // Only show places when streaming is finished
    if (!itineraryData?.itinerary) return [];

    const out: UiPlace[] = [];

    itineraryData.itinerary.forEach((day: any, dayIndex: number) => {
      const locationKey = normalizeVietnamese(day.location || "");
      const cityMatch = Object.keys(CITY_COORDS).find((k) => locationKey.includes(k));
      const baseCoords = cityMatch ? CITY_COORDS[cityMatch] : { lat: 21.0285, lng: 105.8542 };

      const pushPlaces = (items: any[], kind: UiPlace["kind"], section: string) => {
        items.forEach((item: any, itemIndex: number) => {
          let shortName = item.name || item.reason?.split(/[.\-:]/)[0] || "Địa điểm";
          shortName = shortName
            .split(/ mang | là | giúp | lý | có | được | để /)[0]
            .trim();
          if (!shortName) shortName = "Địa điểm";

          const seed = String(item.place_id || item.name || shortName);
          const placeId = String(item.place_id || `${day.date_ || dayIndex}-${section}-${itemIndex}-${seed}`);

          out.push({
            id: placeId,
            place_id: placeId,
            name: shortName,
            kind,
            day: day.date_,
            lat: baseCoords.lat + getStableOffset(`${placeId}-lat`),
            lng: baseCoords.lng + getStableOffset(`${placeId}-lng`),
            reason: item.reason,
          });
        });
      };

      pushPlaces(day.attraction_recommendations || [], "attraction", "attr");
      pushPlaces(day.restaurant_recommendations || [], "restaurant", "rest");

      if (day.meals && Array.isArray(day.meals)) {
        day.meals.forEach((meal: string, i: number) => {
          if (!meal) return;
          const seed = `meal-${day.date_}-${i}`;
          out.push({
            id: seed,
            place_id: seed,
            name: meal,
            kind: "restaurant",
            day: day.date_,
            lat: baseCoords.lat + getStableOffset(seed + "lat"),
            lng: baseCoords.lng + getStableOffset(seed + "lng"),
            reason: "Gợi ý bữa ăn",
          });
        });
      }
    });

    return out;
  }, [itineraryData, isStreaming]);

  const executeSend = async (text: string) => {
    if (!text || isLoading) return;
    if (isAuthLoading || isAccessCheckLoading) return;
    if (!isAuthenticated && !allowGuestDemo) { setShowLoginGate(true); return; }
    if (isAuthenticated && !allowGuestDemo) {
      const latestStatus = await fetchSubscriptionStatus();
      if (latestStatus.error || !latestStatus.active) {
        setShowPaywall(true);
        return;
      }
    }
    if (shouldLockContent) { setShowPaywall(true); return; }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputText("");
    setIsLoading(true);
    setIsStreaming(true);

    const sid = activeId || newSessionId();
    if (!activeId) setActiveId(sid);
    markConversationActivity(sid);
    setChatHistory((prev) => {
      const existing = prev.find((item) => String(item?.session_id ?? item?.sessionId ?? "") === sid);
      if (existing) return sortConversationHistory(prev);
      return sortConversationHistory([
        {
          session_id: sid,
          title: text.slice(0, 80),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    try {
      const uid = getUserId();
      if (!uid) { setShowLoginGate(true); setIsLoading(false); setIsStreaming(false); return; }

      const response = await fetch(`${API_BASE}/conversation/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, user_id: uid, content: text }),
      });

      if (!response.ok) {
        setMessages((prev) => [...prev, { role: "ai", content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";
      let hasStartedStreaming = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // SSE format: events are separated by double newlines
          const events = buffer.split("\n\n");
          // Keep the last incomplete event in the buffer
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.trim()) continue;

            // SSE lines start with "data: "
            const lines = event.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              const dataStr = line.substring(6); // Remove "data: "

              // Check for termination
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);

                // Handle text-delta events
                if (data.type === "text-delta" && data.delta) {
                  accumulatedText += data.delta;

                  // On first chunk, hide loading and add AI message
                  if (!hasStartedStreaming) {
                    hasStartedStreaming = true;
                    setIsLoading(false);
                    setMessages((prev) => [...prev, { role: "ai", content: accumulatedText }]);
                  } else {
                    // Update the last message (AI message)
                    setMessages((prev) => {
                      const newMsgs = [...prev];
                      const lastIdx = newMsgs.length - 1;
                      if (lastIdx >= 0 && newMsgs[lastIdx].role === "ai") {
                        newMsgs[lastIdx] = { role: "ai", content: accumulatedText };
                      }
                      return newMsgs;
                    });
                  }
                }
                // Handle data events
                else if (data.type === "data-itinerary" && data.data) {
                  setItineraryData(data.data);
                }
                else if (data.type === "data-hotel" && data.data) {
                  console.log("🏨 Hotel data received:", JSON.stringify(data.data, null, 2));
                  setHotelData(data.data);
                }
              } catch (e) {
                console.warn("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }

      await loadHistory();

    } catch (err) {
      console.error("Stream error:", err);
      setMessages((prev) => [...prev, { role: "ai", content: "Lỗi kết nối." }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSend = () => executeSend(inputText.trim());

  const handlePromptSubmit = () => {
    if (quickMode === "itinerary") {
      const parts = [];
      if (itineraryForm.departure) parts.push(`Đi từ ${itineraryForm.departure}`);
      if (itineraryForm.destination) parts.push(`đến ${itineraryForm.destination}`);
      if (itineraryForm.startDate && itineraryForm.endDate) parts.push(`từ ${itineraryForm.startDate} đến ${itineraryForm.endDate}`);
      if (itineraryForm.companions) parts.push(`cho ${itineraryForm.companions} người`);
      if (itineraryForm.budgetFrom && itineraryForm.budgetTo) parts.push(`ngân sách khoảng ${itineraryForm.budgetFrom} - ${itineraryForm.budgetTo}`);

      const finalPrompt = `Lập lịch trình: ${parts.join(". ")}`;
      if (finalPrompt.length > 20) { executeSend(finalPrompt); setIsPromptPopoverOpen(false); }
    } else {
      const parts = [];
      if (hotelForm.destination) parts.push(`Tìm khách sạn tại ${hotelForm.destination}`);
      if (hotelForm.checkIn && hotelForm.checkOut) parts.push(`Check-in: ${hotelForm.checkIn}, Check-out: ${hotelForm.checkOut}`);
      if (hotelForm.adults) parts.push(`Người lớn: ${hotelForm.adults}`);
      if (hotelForm.children) parts.push(`Trẻ em: ${hotelForm.children}`);
      if (hotelForm.rooms) parts.push(`Số phòng: ${hotelForm.rooms}`);

      const finalPrompt = parts.join(". ");
      if (finalPrompt.length > 20) { executeSend(finalPrompt); setIsPromptPopoverOpen(false); }
    }
  };



  useEffect(() => setMounted(true), []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isLoading]);
  useEffect(() => {
    if (!mounted || isAuthLoading) return;
    if (!isAuthenticated) {
      const promptFromUrl = searchParams.get("prompt");
      if (promptFromUrl) { setAllowGuestDemo(true); setShowLoginGate(false); } else { /* setShowLoginGate(true); */ }
    }
    setActiveId(newSessionId());
  }, [mounted, isAuthLoading, isAuthenticated, searchParams]);

  useEffect(() => {
    if (!mounted || isAuthLoading) return;
    if (isAuthenticated && !user?.id) return;

    let cancelled = false;
    const bootstrapAccess = async () => {
      setIsAccessCheckLoading(true);
      setIsSubStatusResolved(false);
      setSubStatusError(null);
      if (isAuthenticated && user?.id) {
        await Promise.all([loadHistory(), fetchSubscriptionStatus()]);
      } else {
        setChatHistory([]);
        setSubStatus({ active: false, packageCode: null, remainingDays: 0, expiredAt: null });
        setIsSubStatusResolved(true);
      }
      if (!cancelled) setIsAccessCheckLoading(false);
    };

    bootstrapAccess();
    return () => { cancelled = true; };
  }, [mounted, isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!mounted || isAuthLoading || isAccessCheckLoading) return;
    const promptFromUrl = searchParams.get("prompt");
    if (promptFromUrl && !hasProcessedInitialPrompt.current) {
      hasProcessedInitialPrompt.current = true;
      setTimeout(() => { executeSend(promptFromUrl); window.history.replaceState({}, '', window.location.pathname); }, 500);
    }
  }, [mounted, isAuthLoading, isAccessCheckLoading, searchParams]);

  useEffect(() => {
    if (subStatus.active) {
      setShowPaywall(false);
    }
  }, [subStatus.active]);

  useEffect(() => {
    if (!mounted || isAuthLoading || !isAuthenticated || !user?.id) return;

    const refreshSubscriptionStatus = () => {
      void fetchSubscriptionStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSubscriptionStatus();
      }
    };

    window.addEventListener("focus", refreshSubscriptionStatus);
    window.addEventListener("pageshow", refreshSubscriptionStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshSubscriptionStatus);
      window.removeEventListener("pageshow", refreshSubscriptionStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted, isAuthLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    return () => {
      clearPaymentSyncTimer();
    };
  }, []);

  useEffect(() => {
    if (!mounted || isAuthLoading || isAccessCheckLoading) return;
    if (typeof window === "undefined") return;
    if (promptTutorialAutoOpenedForKey.current === promptTutorialStorageKey) return;
    promptTutorialAutoOpenedForKey.current = promptTutorialStorageKey;

    const hasSeenTutorial = localStorage.getItem(promptTutorialStorageKey) === "1";
    if (hasSeenTutorial) return;

    const raf = window.requestAnimationFrame(() => openPromptTutorial(0));
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, isAuthLoading, isAccessCheckLoading, promptTutorialStorageKey]);

  useEffect(() => {
    if (!isPromptTutorialOpen) return;
    if (promptTutorialStep <= 0) {
      setIsPromptPopoverOpen(false);
    } else {
      setIsPromptPopoverOpen(true);
    }
  }, [isPromptTutorialOpen, promptTutorialStep]);

  useEffect(() => {
    if (!isPromptTutorialOpen) return;
    const currentStep = promptTutorialSteps[promptTutorialStep];
    const targetElement = currentStep?.targetRef.current;
    if (!targetElement) return;
    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [isPromptTutorialOpen, promptTutorialStep, isPromptPopoverOpen, promptTutorialSteps]);

  useEffect(() => {
    if (!isPromptTutorialOpen) return;
    const updateRect = () => {
      const currentStep = promptTutorialSteps[promptTutorialStep];
      const targetElement = currentStep?.targetRef.current;
      if (!targetElement) {
        setPromptTutorialRect(null);
        return;
      }
      const rect = targetElement.getBoundingClientRect();
      setPromptTutorialRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    const raf = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isPromptTutorialOpen, promptTutorialStep, isPromptPopoverOpen, inputText, promptTutorialSteps]);

  const LoginGateModal = () => (
    <div className="fixed inset-0 z-[20000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0056D2] flex items-center justify-center"><ShieldAlert size={20} /></div><div><p className="font-bold text-slate-800">Cần đăng nhập</p><p className="text-xs text-slate-500">Để lưu lịch trình & mua gói</p></div></div>
          <button onClick={() => setShowLoginGate(false)} className="rounded-full p-1 hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-400" /></button>
        </div>
        <button onClick={() => router.push("/pages/login?next=/")} className="w-full py-3 bg-[#0056D2] text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-700 transition-all"><LogIn size={18} /> Đăng nhập ngay</button>
      </div>
    </div>
  );

  const renderPaywallModal = () => {
    if (!showPaywall || isAccessCheckLoading || subStatus.active) return null;
    return (
      <div className="fixed inset-0 z-[21000] flex items-stretch justify-center px-0 pb-0 pt-[68px] md:items-center md:p-4">
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" onClick={() => setShowPaywall(false)} />
        <div className="relative flex h-[calc(100dvh-68px)] w-full flex-col overflow-y-auto bg-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 md:h-auto md:max-h-[92dvh] md:max-w-[1360px] md:overflow-hidden md:rounded-[2rem] md:bg-white md:flex-row">
          <div className="px-4 pb-3 pt-5 md:hidden">
            <div className="rounded-[1.75rem] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0056D2]">Premium</p>
                  <p className="mt-1 text-[15px] font-black tracking-tight text-slate-900">Mở khóa VivuPlan AI</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    Chọn gói phù hợp để dùng AI lập lịch trình trọn vẹn hơn.
                  </p>
                </div>
                <button
                  onClick={() => setShowPaywall(false)}
                  aria-label="Đóng paywall"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-[1.75rem] border border-white/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:m-0 md:w-[340px] md:shrink-0 md:rounded-none md:border-b-0 md:border-r md:border-white/0 md:bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] md:p-7 xl:w-[380px] xl:p-9">
            <div className="hidden md:block md:mb-10">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-200 md:mb-5 md:h-14 md:w-14">
                <Lock size={22} className="md:hidden" />
                <Lock size={26} className="hidden md:block" />
              </div>
              <h3 className="text-[15px] font-black leading-[1.2] tracking-tight text-slate-900 md:text-[22px]">Mở khóa toàn bộ VivuPlan</h3>
                <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-slate-500 md:mt-3 md:text-[13px]">
                  {subStatus.active
                    ? `Đang kích hoạt: ${getSubscriptionDisplayName(subStatus.packageCode, "Premium")}${subStatus.remainingDays ? `. Còn ${subStatus.remainingDays} ngày` : ""}${formatSubscriptionExpiry(subStatus.expiredAt) ? `, đến ${formatSubscriptionExpiry(subStatus.expiredAt)}` : ""}.`
                    : "Bạn đang dùng bản miễn phí giới hạn."}
                </p>
            </div>

            <div className="grid gap-2 md:gap-3">
              {[
                "Lịch trình AI chi tiết",
                "Bản đồ thông minh",
                "Gợi ý khách sạn và vé máy bay",
                "Không giới hạn câu hỏi",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-[11px] text-slate-700 shadow-sm md:px-4 md:text-[13px]">
                  <CheckCircle2 size={15} className="shrink-0 text-green-500 md:h-[18px] md:w-[18px]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 text-white shadow-lg md:mt-8 md:px-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Gợi ý</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-200 md:text-[13px]">
                Chọn gói ngắn hạn nếu bạn chỉ cần AI cho một chuyến đi. Chọn gói dài hạn nếu bạn dùng thường xuyên.
              </p>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col px-4 pb-6 pt-1 md:p-8 xl:p-9">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 md:sticky md:top-0 md:z-10 md:-mx-4 md:mb-5 md:border-slate-100 md:bg-white/95 md:px-4 md:pt-1 md:backdrop-blur">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:text-[13px] md:tracking-[0.22em]">Chọn gói dịch vụ</h4>
              <button onClick={() => setShowPaywall(false)} className="hidden rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 md:inline-flex"><X size={20} /></button>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 overflow-visible md:gap-5 md:overflow-y-auto md:pr-1 xl:grid-cols-[minmax(220px,0.88fr)_minmax(280px,1.02fr)_minmax(320px,1.14fr)]">
              <div className="flex min-h-[234px] flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] md:min-h-[400px] md:rounded-[1.75rem] md:bg-slate-50 md:p-5 md:shadow-none">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Gói miễn phí</p>
                <h5 className="mt-2 text-[16px] font-black tracking-tight text-slate-900 md:mt-3 md:text-[20px]">Thành viên</h5>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 md:mt-3 md:text-[13px]">Dùng khi bạn chỉ cần tìm vé, khách sạn và thanh toán cơ bản.</p>
                <div className="mt-5 border-t border-slate-200 pt-5 md:mt-6 md:pt-6">
                  <p className="text-[32px] font-black tracking-tighter text-slate-900 md:text-[52px]">Miễn phí</p>
                </div>
                <div className="mt-auto pt-5 text-[11px] font-semibold text-slate-500 md:pt-6 md:text-[12px]">Không bao gồm AI planner.</div>
              </div>

              <div className="flex min-h-[280px] flex-col rounded-[1.5rem] border border-cyan-200 bg-cyan-50/50 p-4 shadow-[0_16px_40px_rgba(34,211,238,0.12)] md:min-h-[400px] md:rounded-[1.75rem] md:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-600">Gói trải nghiệm</p>
                <h5 className="mt-2 text-[16px] font-black tracking-tight text-slate-900 md:mt-3 md:text-[20px]">Ngắn hạn</h5>
                <SegmentedToggle
                  options={SHORT_TERM_SUB_PACKAGES_DATA.map((plan) => ({
                    value: plan.packageCode,
                    label: plan.durationLabel ?? plan.name,
                  }))}
                  value={selectedShortPackage}
                  onChange={setSelectedShortPackage}
                  groupId="paywall-short"
                  tone="brand"
                  layout="fill"
                  size="sm"
                  className="mt-4 w-full md:mt-5"
                />
                <div className="mt-5 md:mt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-black tracking-tight text-slate-900 md:text-[18px]">{activeShortPackage.name}</p>
                    {activeShortPackage.badge && (
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-700">
                        {activeShortPackage.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 md:mt-3 md:text-[13px]">{activeShortPackage.description}</p>
                </div>
                <div className="mt-5 border-t border-cyan-100 pt-5 md:mt-6 md:pt-6">
                  <div className="flex items-end gap-2"><p className="text-[32px] font-black tracking-tighter text-[#0056D2] md:text-[46px]">{activeShortPackage.price.toLocaleString("vi-VN")}đ</p><p className="mb-1 text-[10px] font-bold text-slate-400 md:text-[12px]">{activeShortPackage.periodLabel}</p></div>
                </div>
                <button disabled={!isAuthenticated || isPurchasing} onClick={() => purchaseSubscription(activeShortPackage.packageCode)} className={`mt-auto whitespace-nowrap rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition-all transform active:scale-95 shadow-md md:px-5 md:py-3 md:text-[11px] md:tracking-[0.12em] ${(!isAuthenticated || isPurchasing) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "cursor-pointer bg-[#0056D2] text-white hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200"}`}>{activeShortPackage.ctaLabel}</button>
              </div>

              <div className="flex min-h-[280px] flex-col rounded-[1.5rem] border border-blue-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 text-slate-900 shadow-[0_20px_50px_rgba(59,130,246,0.14)] md:min-h-[400px] md:rounded-[1.75rem] md:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">Gói cam kết</p>
                <h5 className="mt-2 text-[16px] font-black tracking-tight text-slate-900 md:mt-3 md:text-[20px]">Dài hạn</h5>
                <SegmentedToggle
                  options={LONG_TERM_SUB_PACKAGES_DATA.map((plan) => ({
                    value: plan.packageCode,
                    label: plan.durationLabel ?? plan.name,
                  }))}
                  value={selectedLongPackage}
                  onChange={setSelectedLongPackage}
                  groupId="paywall-long"
                  tone="brand"
                  layout="fill"
                  size="sm"
                  className="mt-4 w-full md:mt-5"
                />
                <div className="mt-5 md:mt-6">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-black tracking-tight text-slate-900 md:text-[18px]">{activeLongPackage.name}</p>{activeLongPackage.badge && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">{activeLongPackage.badge}</span>}</div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-600 md:mt-3 md:text-[13px]">{activeLongPackage.description}</p>
                </div>
                <div className="mt-5 border-t border-blue-100 pt-5 md:mt-6 md:pt-6">
                  <div className="flex items-end gap-2"><p className="text-[32px] font-black tracking-tighter text-slate-900 md:text-[46px]">{activeLongPackage.price.toLocaleString("vi-VN")}đ</p><p className="mb-1 text-[10px] font-bold text-slate-500 md:text-[12px]">{activeLongPackage.periodLabel}</p></div>
                </div>
                <button disabled={!isAuthenticated || isPurchasing} onClick={() => purchaseSubscription(activeLongPackage.packageCode)} className={`mt-auto whitespace-nowrap rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition-all transform active:scale-95 shadow-md md:px-5 md:py-3 md:text-[11px] md:tracking-[0.12em] ${(!isAuthenticated || isPurchasing) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "cursor-pointer bg-[#0056D2] text-white hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200"}`}>{activeLongPackage.ctaLabel}</button>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4 md:mt-7 md:pt-7">
              {!isAuthenticated && <div className="flex items-center justify-between gap-2 mb-3 bg-amber-50 p-2 rounded-lg text-amber-700 text-xs font-bold border border-amber-100"><span>⚠️ Cần đăng nhập để mua</span><button onClick={() => router.push("/pages/login")} className="underline uppercase text-[10px] hover:text-amber-900 transition-colors">Đăng nhập</button></div>}
              {isPurchasing ? <button disabled className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed"><Loader2 size={16} className="animate-spin" /> Đang xử lý...</button> : <button onClick={handleCheckPaymentStatus} disabled={!isAuthenticated || isPaymentSyncing} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wide hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed md:text-[13px]">{isPaymentSyncing ? <><Loader2 size={14} className="animate-spin" /> Đang đồng bộ thanh toán...</> : <><CreditCard size={14} /> Kiểm tra thanh toán</>}</button>}
              <p className="mt-3 text-center text-[10px] font-medium text-slate-400 md:text-[11px]">* Thanh toán an toàn qua cổng PayOS / VNPay.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VÁ LỖI HIỂN THỊ FADE IN ĐỂ CHỐNG CLICK NHẦM
  const BlurLockLayer = () => (
    <div className="absolute inset-0 z-[150] bg-white/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300 fill-mode-both">
      <div className="bg-white p-6 rounded-3xl shadow-xl text-center border border-slate-100 max-w-sm">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock size={20} />
        </div>
        <h3 className="font-bold text-slate-900">Nội dung bị khóa</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Vui lòng mở khóa Premium để xem chi tiết.</p>
        <button
          onClick={() => setShowPaywall(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-blue-700 transition-all active:scale-95"
        >
          Mở khóa ngay
        </button>
      </div>
    </div>
  );

  const PromptTutorialLayer = () => {
    if (!isPromptTutorialOpen) return null;
    const currentStep = promptTutorialSteps[promptTutorialStep];
    const rect = promptTutorialRect;

    const CARD_WIDTH = 360;
    const CARD_HEIGHT = 232;
    const SAFE_PADDING = 16;
    const ANCHOR_GAP = 14;

    let cardTop = 96;
    let cardLeft = 16;
    if (rect && typeof window !== "undefined") {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const rectBottom = rect.top + rect.height;
      const rectRight = rect.left + rect.width;
      const spaceBelow = viewportHeight - rectBottom;
      const spaceAbove = rect.top;

      if (spaceBelow >= CARD_HEIGHT + ANCHOR_GAP) {
        cardTop = rectBottom + ANCHOR_GAP;
      } else if (spaceAbove >= CARD_HEIGHT + ANCHOR_GAP) {
        cardTop = rect.top - CARD_HEIGHT - ANCHOR_GAP;
      } else {
        cardTop = (viewportHeight - CARD_HEIGHT) / 2;
      }

      const preferLeft = rect.left;
      const preferRight = rectRight - CARD_WIDTH;
      const centered = rect.left + rect.width / 2 - CARD_WIDTH / 2;

      if (preferLeft + CARD_WIDTH <= viewportWidth - SAFE_PADDING) {
        cardLeft = preferLeft;
      } else if (preferRight >= SAFE_PADDING) {
        cardLeft = preferRight;
      } else {
        cardLeft = centered;
      }

      cardTop = Math.min(
        Math.max(cardTop, SAFE_PADDING + 56),
        viewportHeight - CARD_HEIGHT - SAFE_PADDING
      );
      cardLeft = Math.min(
        Math.max(cardLeft, SAFE_PADDING),
        viewportWidth - CARD_WIDTH - SAFE_PADDING
      );
    }

    return (
      <div className="fixed inset-0 z-[35000] bg-slate-950/45 backdrop-blur-[1.5px]">
        {rect && (
          <div
            className="fixed rounded-2xl border-2 border-cyan-300/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] pointer-events-none"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
        )}

        <div
          className="fixed w-[360px] max-w-[calc(100vw-24px)] rounded-2xl bg-white p-4 shadow-2xl border border-slate-200"
          style={{ top: cardTop, left: cardLeft }}
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-[#0056D2]">
            Hướng dẫn sử dụng prompt
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">{currentStep?.title}</h4>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">{currentStep?.description}</p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={closePromptTutorial}
              className="px-3 py-2 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Bỏ qua
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPromptTutorialStep(promptTutorialStep - 1)}
                disabled={promptTutorialStep === 0}
                className="px-3 py-2 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => goToPromptTutorialStep(promptTutorialStep + 1)}
                className="px-3 py-2 text-[11px] font-bold rounded-lg bg-[#0056D2] text-white hover:bg-blue-700 transition-colors"
              >
                {promptTutorialStep === promptTutorialSteps.length - 1 ? "Bắt đầu dùng" : "Tiếp theo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!mounted || isAuthLoading || isAccessCheckLoading) {
    return (
      <div suppressHydrationWarning className="fixed inset-0 top-[68px] w-screen h-[calc(100dvh-68px)] bg-white flex items-center justify-center">
        <div suppressHydrationWarning className="flex items-center gap-3 text-slate-500 text-sm font-semibold">
          <Loader2 size={18} className="animate-spin text-[#0056D2]" />
          <span>Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  };

  return (
    <div suppressHydrationWarning className="fixed inset-0 top-[68px] w-screen h-[calc(100dvh-68px)] bg-white text-slate-900 font-sans flex overflow-hidden text-sm shadow-inner [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      {showLoginGate && <LoginGateModal />}
      {renderPaywallModal()}
      <PromptTutorialLayer />

      {/* SIDEBAR */}
      <aside className={`absolute md:relative inset-y-0 left-0 z-[3000] w-[280px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-5 h-[60px] md:h-[70px] border-b flex items-center shrink-0 justify-between"><img src="/brand/logo.png" className="h-6 w-auto" alt="Vivuplan" /><button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button></div>
        <div className="p-4"><button onClick={handleNewChat} className="w-full py-3 bg-[#0056D2] text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"><PlusCircle size={16} /> Chuyến đi mới</button></div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5 custom-scrollbar"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-2 mt-2"><History size={12} /> Lịch sử gần đây</p>{chatHistory.length > 0 ? (chatHistory.map((chat) => (<button key={chat.session_id} onClick={() => handleSelectChat(chat.session_id)} className={`w-full text-left p-3 rounded-lg text-[11px] flex items-center gap-3 transition-all ${activeId === chat.session_id ? "bg-blue-50 text-[#0056D2] font-bold border border-blue-100" : "hover:bg-slate-50 text-slate-600 border border-transparent"}`}><MessageSquare size={14} className={`shrink-0 ${activeId === chat.session_id ? "opacity-100 text-[#0056D2]" : "opacity-40"}`} /><span className="truncate flex-1">{chat.title || `Trip ${chat.session_id.substring(0, 8)}`}</span></button>))) : (<div className="p-4 text-center text-[10px] text-slate-300 italic"> {isAuthenticated ? "Chưa có lịch sử" : "Đăng nhập để xem lịch sử"} </div>)}</div>
      </aside>
      {isSidebarOpen && <div className="absolute inset-0 bg-black/40 z-[2999] backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative bg-[#FDFDFD] min-w-0 overflow-hidden">
        <header className="md:hidden h-[60px] border-b bg-white flex items-center justify-between px-4 shrink-0 z-[40] relative"><div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#0056D2] hover:bg-blue-50 rounded-lg"><Menu size={22} /></button><div className="flex flex-col"><h1 className="text-xs font-black uppercase tracking-widest text-[#0056D2]">Vivuplan AI</h1></div></div></header>

        <div className="relative flex-1 overflow-hidden flex flex-col">
          {shouldLockContent && <BlurLockLayer />}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar ${shouldLockContent ? "pointer-events-none" : ""}`}>
              {messages.length === 0 && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-10"><div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center text-[#0056D2] animate-bounce shadow-lg shadow-blue-50"><Sparkles size={32} /></div><h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-2 text-[#0056D2]">Xin chào!</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full px-4">{["Đà Lạt 3N2Đ", "Huế ăn gì?", "Resort Nha Trang"].map((t, i) => (<button key={i} onClick={() => setInputText(t)} className="p-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-blue-50 hover:text-[#0056D2] hover:border-blue-100 transition-all text-left">{t}</button>))}</div></div>
              ) : (
                <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
                  {messages.map((m, i) => (<div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}><div className={`max-w-[90%] md:max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-line break-words ${m.role === "user" ? "bg-[#0056D2] text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium"}`}>{m.content}</div></div>))}
                  {isLoading && (<div className="flex justify-start"><div className="bg-white border border-blue-50 p-4 rounded-2xl rounded-tl-none shadow-md flex items-center gap-3"><Loader2 size={16} className="animate-spin text-[#0056D2]" /><p className="text-[10px] font-black uppercase tracking-widest text-[#0056D2]">Đang xử lý...</p></div></div>)}
                </div>
              )}
            </div>

            {/* Footer Input */}
            <div className="bg-white border-t border-slate-50 shrink-0 relative z-20 flex flex-col">
              {(itineraryData || hotelData) && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar justify-center border-b border-slate-50 bg-slate-50/50">
                  {itineraryData && <button onClick={() => setViewMode("itinerary")} className="flex items-center gap-2 px-5 py-2 bg-[#0056D2] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 transition-all duration-200 whitespace-nowrap"><Calendar size={14} /> Xem Lịch Trình</button>}
                  {hotelData && <button onClick={() => setViewMode("hotel")} className="flex items-center gap-2 px-5 py-2 bg-cyan-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-cyan-600 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 transition-all duration-200 whitespace-nowrap"><Hotel size={14} /> Xem Khách sạn</button>}
                </div>
              )}
              <div className="p-3 md:p-6 relative">
                {isPromptPopoverOpen && (
                  <div className="fixed inset-x-3 top-[132px] bottom-[92px] z-[120] animate-in slide-in-from-bottom-4 md:absolute md:bottom-full md:left-0 md:right-auto md:top-auto md:inset-x-auto md:w-full md:px-6 md:pb-2">
                    <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl md:h-auto">
                      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
                        <h3 className="flex items-center gap-2 text-sm font-black italic uppercase text-[#0056D2]"><Sparkle size={14} /> Tạo nhanh</h3>
                        <button onClick={() => setIsPromptPopoverOpen(false)} className="rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-100 hover:text-red-500"><X size={16} /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 md:p-6">

                      {/* Tabs */}
                      <div ref={promptTabsRef} className="flex bg-slate-100 p-1 rounded-xl mb-4">
                        <button onClick={() => setQuickMode("itinerary")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${quickMode === "itinerary" ? "bg-white text-[#0056D2] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Lịch trình</button>
                        <button onClick={() => setQuickMode("hotel")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${quickMode === "hotel" ? "bg-white text-[#0056D2] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Khách sạn</button>
                      </div>

                      {quickMode === "itinerary" ? (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-widest font-black text-[#0056D2] mb-1">Ngày dự kiến</p>
                            <p className="text-sm font-black text-slate-700">
                              {itineraryForm.startDate || "Chưa chọn ngày đi"} {" -> "} {itineraryForm.endDate || "Chưa chọn ngày về"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Điểm xuất phát</label>
                              <input value={itineraryForm.departure} onChange={(e) => setItineraryForm({ ...itineraryForm, departure: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="VD: Hà Nội" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Điểm đến</label>
                              <input value={itineraryForm.destination} onChange={(e) => setItineraryForm({ ...itineraryForm, destination: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="VD: Đà Lạt" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ngày đi</label>
                              <input type="date" value={itineraryForm.startDate} onChange={(e) => setItineraryForm({ ...itineraryForm, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ngày về</label>
                              <input type="date" value={itineraryForm.endDate} onChange={(e) => setItineraryForm({ ...itineraryForm, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Số người tham gia</label>
                            <input type="text" inputMode="numeric" value={itineraryForm.companions} onChange={(e) => setItineraryForm({ ...itineraryForm, companions: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="Nhập số người" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ngân sách từ</label>
                              <input type="text" inputMode="numeric" value={itineraryForm.budgetFrom} onChange={(e) => setItineraryForm({ ...itineraryForm, budgetFrom: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="VND" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Đến</label>
                              <input type="text" inputMode="numeric" value={itineraryForm.budgetTo} onChange={(e) => setItineraryForm({ ...itineraryForm, budgetTo: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="VND" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Thành phố / Khu vực</label>
                            <input value={hotelForm.destination} onChange={(e) => setHotelForm({ ...hotelForm, destination: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="VD: Đà Lạt" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Check-in</label>
                              <input type="date" value={hotelForm.checkIn} onChange={(e) => setHotelForm({ ...hotelForm, checkIn: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Check-out</label>
                              <input type="date" value={hotelForm.checkOut} onChange={(e) => setHotelForm({ ...hotelForm, checkOut: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Người lớn</label>
                              <input type="text" inputMode="numeric" value={hotelForm.adults} onChange={(e) => setHotelForm({ ...hotelForm, adults: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Trẻ em</label>
                              <input type="text" inputMode="numeric" value={hotelForm.children} onChange={(e) => setHotelForm({ ...hotelForm, children: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Số phòng</label>
                            <input type="text" inputMode="numeric" value={hotelForm.rooms} onChange={(e) => setHotelForm({ ...hotelForm, rooms: e.target.value.replace(/[^0-9]/g, "") })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold" placeholder="Nhập số phòng" />
                          </div>
                        </div>
                      )}

                      <button onClick={handlePromptSubmit} className="w-full mt-4 bg-[#0056D2] text-white py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all">
                        {quickMode === "itinerary" ? "Tạo lịch trình" : "Tìm khách sạn"}
                      </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="max-w-3xl mx-auto flex items-end gap-2"><button ref={quickPromptBtnRef} onClick={() => setIsPromptPopoverOpen(!isPromptPopoverOpen)} className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center border ${isPromptPopoverOpen ? "bg-blue-50 border-blue-200 text-[#0056D2]" : "bg-slate-50 border-transparent text-slate-400 hover:text-[#0056D2]"}`}><FilePenLine size={18} /></button><div className="relative flex-1"><textarea ref={promptInputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 text-[13px] h-12 md:h-14 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-blue-200 transition-all font-medium shadow-inner" placeholder="Nhập yêu cầu..." /><button ref={sendPromptBtnRef} onClick={handleSend} disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-[#0056D2] text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"><Send size={16} /></button></div></div>
                {!isAccessCheckLoading && isSubStatusResolved && !subStatusError && !subStatus.active && (<div className="max-w-3xl mx-auto mt-2 text-[10px] text-slate-400 flex items-center justify-between"><span>Chưa kích hoạt gói — tạo xong sẽ yêu cầu mua gói.</span><button onClick={() => setShowPaywall(true)} className="text-[#0056D2] font-black hover:underline">Xem gói</button></div>)}
                <div className="max-w-3xl mx-auto mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      openPromptTutorial(0);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-[#0056D2] hover:underline"
                  >
                    Xem hướng dẫn
                  </button>
                </div>
              </div>
            </div>

            {/* OVERLAY: ITINERARY VIEW */}
            {(viewMode === "itinerary" || viewMode === "hotel") && (
              <div className="absolute inset-0 z-[200] bg-[#F8FAFB] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
                <div className="h-[60px] md:h-[70px] bg-white border-b flex items-center justify-between px-4 shrink-0 shadow-sm z-[210]">
                  <button onClick={() => setViewMode("chat")} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-600 hover:bg-[#0056D2] hover:text-white transition-all"><ArrowLeft size={14} /> Quay lại</button>
                  <div className="flex items-center gap-2"><span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.2em] text-[#0056D2] opacity-60">{viewMode === "itinerary" ? "LỊCH TRÌNH CHI TIẾT" : "KHÁCH SẠN ĐỀ XUẤT"}</span></div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                  {viewMode === "itinerary" && itineraryData && (
                    <div className="space-y-8 max-w-5xl mx-auto">
                      {/* Banner Image */}
                      <section className="relative h-[200px] md:h-[300px] rounded-[2rem] overflow-hidden shadow-xl">
                        <img src={getBannerPhoto(itineraryData?.trip_summary?.destinations?.[0])} className="w-full h-full object-cover" alt="banner" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <h1 className="absolute bottom-6 left-6 text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">{itineraryData?.trip_summary?.destinations?.[0]}</h1>
                      </section>

                      {/* Map & Total Cost */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="md:col-span-2 bg-white p-2 rounded-[2rem] shadow-lg border border-slate-100 h-[350px] relative overflow-hidden group">
                          {/* --- SỬA CONTAINER CHA CỦA MAP TẠI ĐÂY --- */}
                          <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative">
                            <PlacesMapPane places={places} />
                            {isStreaming && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                <Loader2 className="animate-spin text-[#0056D2] mb-2" size={32} />
                                <p className="text-xs font-bold text-[#0056D2] uppercase tracking-widest animate-pulse">Đang định vị...</p>
                              </div>
                            )}
                          </div>
                          <button onClick={() => setIsMapModalOpen(true)} className="absolute bottom-4 right-4 px-5 py-2.5 bg-white text-[#0056D2] rounded-full text-[9px] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest hover:bg-[#0056D2] hover:text-white transition-all z-20 italic border border-slate-100"><Maximize2 size={12} /> Mở rộng bản đồ</button>
                        </div>
                        <div className="bg-[#0056D2] p-6 rounded-[2rem] shadow-xl text-white flex flex-col justify-center relative overflow-hidden"><div className="absolute -right-6 -top-6 opacity-10"><Wallet size={150} /></div><p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 italic">Tổng ngân sách</p><h2 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-4">{formatVND(totalCost)}</h2><p className="text-[11px] font-medium italic opacity-80 leading-relaxed">Chi phí ước tính bao gồm ăn uống, vé tham quan và di chuyển.</p></div>
                      </div>

                      {/* Day List */}
                      <div className="space-y-4">
                        <h2 className="text-base font-black italic tracking-widest text-[#0056D2] uppercase px-2 flex items-center gap-3"><div className="w-6 h-[3px] bg-[#0056D2]" /> CHI TIẾT LỘ TRÌNH</h2>
                        <div className="grid grid-cols-1 gap-4">
                          {itineraryData?.itinerary && Array.isArray(itineraryData.itinerary) && itineraryData.itinerary.map((day: any, idx: number) => (
                            <div key={idx} onClick={() => setSelectedDayIdx(idx)} className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4 md:gap-8 cursor-pointer hover:shadow-xl hover:border-blue-100 transition-all group">
                              <div className="w-full md:w-32 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-[#0056D2] transition-all"><p className="text-[11px] font-black text-slate-400 group-hover:text-white uppercase italic">NGÀY {idx + 1}</p></div>
                              <div className="flex-1 text-center md:text-left"><span className="text-[9px] font-black text-[#0056D2] block mb-1 uppercase tracking-widest">{day.date_}</span><h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight group-hover:text-[#0056D2] transition-colors">{day.location}</h3></div>
                              <ChevronRight className="text-slate-300 group-hover:text-[#0056D2] transition-all hidden md:block" size={20} />
                            </div>
                          ))}
                          {/* Show skeleton for expected but not yet loaded days */}
                          {(!itineraryData?.itinerary || !Array.isArray(itineraryData.itinerary) || itineraryData.itinerary.length === 0) && (
                            // If no data at all, show 3 skeleton placeholders
                            [1, 2, 3].map((i) => (
                              <div key={`skeleton-${i}`} className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4 md:gap-8 animate-pulse">
                                <div className="w-full md:w-32 h-16 bg-slate-200 rounded-2xl"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-slate-200 rounded w-20 mx-auto md:mx-0"></div>
                                  <div className="h-6 bg-slate-200 rounded w-40 mx-auto md:mx-0"></div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* NOTES SECTION */}
                      {itineraryData.notes && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 to-cyan-50/50 border border-blue-100 p-6 rounded-2xl shadow-sm mt-8 group hover:shadow-md hover:border-blue-200 transition-all duration-300">

                          {/* Background Icon (Tinh tế hơn) */}
                          <div className="absolute -top-4 -right-4 text-[#0056D2] opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-500 pointer-events-none">
                            <Info size={140} strokeWidth={1.5} />
                          </div>

                          {/* Header */}
                          <h3 className="text-sm font-bold text-[#0056D2] uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                            <div className="p-1 bg-blue-100/50 rounded-md">
                              <Info size={16} strokeWidth={2.5} />
                            </div>
                            Lưu ý quan trọng
                          </h3>

                          {/* Content List */}
                          <ul className="space-y-3 relative z-10">
                            {itineraryData.notes.split("•").map((note: string, index: number) => {
                              const trimmedNote = note.trim();
                              if (!trimmedNote) return null;

                              return (
                                <li key={index} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                                  {/* Custom Bullet Point (Fix lỗi lệch align khi text nhiều dòng) */}
                                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#0056D2] mt-2 ring-4 ring-blue-100/50"></span>
                                  <span>{trimmedNote}</span>
                                </li>
                              );
                            })}
                          </ul>

                          {/* Left Border Highlight */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0056D2] to-cyan-400 rounded-l-2xl"></div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === "hotel" && hotelData && (
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                      {hotelData?.recommended_hotels && Array.isArray(hotelData.recommended_hotels) && hotelData.recommended_hotels.map((h: any, i: number) => (
                        <div key={i} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all flex flex-col">
                          <div className="h-48 bg-slate-100 rounded-[2rem] mb-5 overflow-hidden relative">{h.details?.photos?.[0] ? (<img src={h.details.photos[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="hotel" />) : (<div className="w-full h-full flex items-center justify-center text-slate-300"><MapPin size={32} /></div>)}<div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-sm flex items-center gap-1"><Star className="fill-yellow-400 text-yellow-400" size={12} /><span className="text-[10px] font-black">4.8</span></div></div>
                          <h4 className="text-lg font-black mb-2 group-hover:text-[#0056D2] transition-colors uppercase italic tracking-tight">{h.details?.name || "Khách sạn cao cấp"}</h4>
                          <p className="text-[12px] text-slate-500 italic line-clamp-3 mb-6 leading-relaxed normal-case font-medium">{h.reasoning}</p>
                          <div className="mt-auto flex justify-between items-center pt-5 border-t border-slate-50"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Giá từ</p><p className="text-xl font-black text-[#0056D2] tracking-tighter">{h.details?.price_per_night?.toLocaleString() || "---"}đ</p></div><button onClick={() => handleBooking(h)} className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-[9px] font-black hover:bg-[#0056D2] transition-all uppercase italic shadow-lg">Đặt phòng</button></div>
                        </div>
                      ))}
                      {/* Show skeleton only if no data */}
                      {(!hotelData?.recommended_hotels || !Array.isArray(hotelData.recommended_hotels) || hotelData.recommended_hotels.length === 0) && (
                        // Loading skeleton
                        [1, 2].map((i) => (
                          <div key={`skeleton-${i}`} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 animate-pulse">
                            <div className="h-48 bg-slate-200 rounded-[2rem] mb-5"></div>
                            <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-slate-200 rounded w-full mb-1"></div>
                            <div className="h-4 bg-slate-200 rounded w-2/3 mb-6"></div>
                            <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                              <div className="h-8 bg-slate-200 rounded w-24"></div>
                              <div className="h-10 bg-slate-200 rounded-full w-28"></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DETAIL MODAL (NGÀY) */}
            {selectedDayIdx !== null && itineraryData?.itinerary?.[selectedDayIdx] && (
              <div className="absolute inset-0 z-[250] bg-[#F8FAFB] flex flex-col md:flex-row animate-in slide-in-from-bottom duration-300">
                <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                  <button onClick={() => setSelectedDayIdx(null)} className="mb-8 flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 text-[#0056D2] text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm hover:shadow-md"><ArrowLeft size={14} /> Quay lại danh sách</button>
                  <h2 className="text-4xl md:text-6xl font-black text-[#0056D2] italic tracking-tighter uppercase leading-none mb-2">NGÀY {selectedDayIdx + 1}</h2>
                  <p className="text-lg font-black uppercase tracking-[0.3em] text-slate-300 italic mb-10">{itineraryData.itinerary[selectedDayIdx].location}</p>

                  <div className="space-y-6 max-w-2xl">
                    {["morning", "afternoon", "evening"].map((session, sIdx) => {
                      const sessionName = sIdx === 0 ? "BUỔI SÁNG" : sIdx === 1 ? "BUỔI CHIỀU" : "BUỔI TỐI";
                      return (
                        <div key={sIdx} className="flex gap-6 p-6 bg-white rounded-[2.5rem] border border-slate-50 shadow-sm transition-all group">
                          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0056D2] shrink-0 group-hover:bg-[#0056D2] group-hover:text-white transition-colors">{sIdx === 0 ? <Sun size={24} /> : sIdx === 1 ? <Sunset size={24} /> : <Moon size={24} />}</div>
                          <div><p className="text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-[0.2em]">{sessionName}</p><p className="text-sm md:text-base font-bold italic text-slate-700 leading-relaxed normal-case">"{itineraryData.itinerary[selectedDayIdx][session]}"</p></div>
                        </div>
                      );
                    })}

                    {/* GIAO DIỆN BỮA ĂN */}
                    <div className="bg-[#0A0F1A] p-8 rounded-[3rem] shadow-xl mt-8 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 text-white"><Utensils size={150} /></div>
                      <h4 className="text-[10px] font-black text-[#4ECDC4] uppercase tracking-[0.3em] mb-6 italic flex items-center gap-3 relative z-10">
                        <Utensils size={16} /> Ẩm thực địa phương
                      </h4>
                      <div className="space-y-3 relative z-10">
                        {itineraryData.itinerary[selectedDayIdx].meals?.map((meal: string, i: number) => (
                          <div
                            key={i}
                            onClick={() => openGoogleMaps(meal)}
                            className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:pl-6 hover:shadow-[0_0_15px_rgba(78,205,196,0.3)] hover:border-[#4ECDC4]/50 group/meal"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#4ECDC4]/20 text-[#4ECDC4] flex items-center justify-center shrink-0 font-black text-xs group-hover/meal:scale-110 transition-transform">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-200 leading-relaxed group-hover/meal:text-white transition-colors">{meal}</p>
                            </div>
                            <ExternalLink size={14} className="text-slate-500 opacity-0 group-hover/meal:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ĐIỂM THAM QUAN NỔI BẬT */}
                    {itineraryData.itinerary[selectedDayIdx].attraction_recommendations && itineraryData.itinerary[selectedDayIdx].attraction_recommendations.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-[10px] font-black text-[#0056D2] uppercase tracking-[0.3em] mb-6 italic flex items-center gap-3">
                          <MapPin size={16} /> Điểm tham quan nổi bật
                        </h4>
                        <div className="grid gap-4">
                          {itineraryData.itinerary[selectedDayIdx].attraction_recommendations.map((attr: any, i: number) => {
                            let name = attr.reason?.split(/[.\-:]/)[0] || "Địa điểm tham quan";
                            name = name.split(/ mang | là | giúp | lý | có | được | để /)[0].trim();

                            return (
                              <div
                                key={i}
                                onClick={() => openGoogleMaps(name)}
                                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group/attr"
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0056D2] flex items-center justify-center shrink-0 group-hover/attr:bg-[#0056D2] group-hover/attr:text-white transition-colors">
                                    <MapPin size={16} />
                                  </div>
                                  <h5 className="font-black text-slate-800 text-sm uppercase group-hover/attr:text-[#0056D2] transition-colors">{name}</h5>
                                  <ExternalLink size={12} className="ml-auto text-slate-300 group-hover/attr:text-[#0056D2]" />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed pl-11">{attr.reason}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="md:hidden w-full h-[300px] rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm mt-8 relative">
                      <div className="absolute inset-0 w-full h-full">
                        <PlacesMapPane places={places.filter((p) => p.day === itineraryData.itinerary[selectedDayIdx!].date_)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block w-2/5 border-l relative bg-slate-100">
                  <div className="absolute inset-0 w-full h-full">
                    <PlacesMapPane places={places.filter((p) => p.day === itineraryData.itinerary[selectedDayIdx!].date_)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main >

      {/* FULL MAP */}
      {
        isMapModalOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[68px] z-[10000] bg-white flex flex-col animate-in fade-in duration-300">
            <header className="h-[60px] md:h-[70px] bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-md relative z-[10001]"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0056D2]"><MapIcon size={20} /></div><h3 className="font-black italic uppercase tracking-widest text-[#0056D2] text-sm">Bản đồ</h3></div><button onClick={() => setIsMapModalOpen(false)} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors pointer-events-auto"><X size={20} /></button></header>
            <div className="flex-1 w-full h-full relative z-[10000]"><PlacesMapPane places={places} /></div>
          </div>
        )
      }
    </div >
  );
}

export default function VivuplanPremiumApp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Đang tải...</div>
      </div>
    }>
      <VivuplanPremiumContent />
    </Suspense>
  );
}



