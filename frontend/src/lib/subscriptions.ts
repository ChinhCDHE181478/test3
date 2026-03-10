export type PaidSubscriptionPlan = {
  id: string;
  packageCode: string;
  segment: "short" | "long";
  name: string;
  durationDays: number;
  durationLabel: string;
  periodLabel: string;
  price: number;
  description: string;
  ctaLabel: string;
  badge?: string;
  highlight?: boolean;
};

export const PAID_SUBSCRIPTION_PLANS: PaidSubscriptionPlan[] = [
  {
    id: "day",
    packageCode: "day",
    segment: "short",
    name: "Gói 1 ngày",
    durationDays: 1,
    durationLabel: "1 ngày",
    periodLabel: "/24 giờ",
    price: 10000,
    description: "Mở khóa AI cho một chuyến đi ngắn hạn.",
    ctaLabel: "Mua gói ngày",
  },
  {
    id: "month",
    packageCode: "month",
    segment: "short",
    name: "Gói 30 ngày",
    durationDays: 30,
    durationLabel: "30 ngày",
    periodLabel: "/tháng",
    price: 49000,
    description: "Phù hợp nếu bạn cần AI hỗ trợ lập kế hoạch theo tháng.",
    ctaLabel: "Đăng ký gói tháng",
    badge: "Phổ biến nhất",
    highlight: true,
  },
  {
    id: "month3",
    packageCode: "month3",
    segment: "long",
    name: "Gói 3 tháng",
    durationDays: 90,
    durationLabel: "3 tháng",
    periodLabel: "/3 tháng",
    price: 139000,
    description: "Lựa chọn cân bằng cho nhiều chuyến đi trong quý.",
    ctaLabel: "Mua gói 3 tháng",
  },
  {
    id: "month6",
    packageCode: "month6",
    segment: "long",
    name: "Gói 6 tháng",
    durationDays: 180,
    durationLabel: "6 tháng",
    periodLabel: "/6 tháng",
    price: 279000,
    description: "Dành cho người dùng thường xuyên lên lịch trình bằng AI.",
    ctaLabel: "Mua gói 6 tháng",
  },
  {
    id: "year",
    packageCode: "year",
    segment: "long",
    name: "Gói 1 năm",
    durationDays: 365,
    durationLabel: "1 năm",
    periodLabel: "/năm",
    price: 549000,
    description: "Tiết kiệm nhất cho nhu cầu sử dụng AI dài hạn.",
    ctaLabel: "Mua gói 1 năm",
    badge: "Tiết kiệm nhất",
    highlight: true,
  },
];

export function getSubscriptionPlan(packageCode?: string | null) {
  if (!packageCode) return null;
  return PAID_SUBSCRIPTION_PLANS.find((plan) => plan.packageCode === packageCode) ?? null;
}

export const SHORT_TERM_SUBSCRIPTION_PLANS = PAID_SUBSCRIPTION_PLANS.filter(
  (plan) => plan.segment === "short"
);

export const LONG_TERM_SUBSCRIPTION_PLANS = PAID_SUBSCRIPTION_PLANS.filter(
  (plan) => plan.segment === "long"
);

export function getSubscriptionDisplayName(packageCode?: string | null, fallback = "Gói dịch vụ") {
  return getSubscriptionPlan(packageCode)?.name ?? fallback;
}
