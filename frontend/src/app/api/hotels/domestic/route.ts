import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { hotelService } from "@/lib/services/hotel";

type DomesticHotelItem = {
  id: string;
  name: string;
  distanceText?: string;
  rating?: number;
  reviews?: number;
  priceText?: string;
  image: string;
};

const DESTINATION_ALIASES: Record<string, string[]> = {
  "ho chi minh city": ["Ho Chi Minh City", "Hồ Chí Minh", "Thành phố Hồ Chí Minh", "HCM", "Saigon"],
  "ha noi": ["Hà Nội", "Ha Noi", "Hanoi"],
  "da nang": ["Đà Nẵng", "Da Nang", "Danang"],
  "da lat": ["Đà Lạt", "Da Lat", "Dalat"],
  "vung tau": ["Vũng Tàu", "Vung Tau", "Ba Ria - Vung Tau", "Bà Rịa - Vũng Tàu"],
  "phu quoc": ["Phú Quốc", "Phu Quoc"],
};

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
    (Array.isArray(data?.result) && data.result) ||
    (Array.isArray(data?.result?.result) && data.result.result) ||
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

async function buildDomesticHotels(destination: string, arrivalDate: string, departureDate: string) {
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
      arrivalDate,
      departureDate,
      adults: "2",
      roomQty: "1",
      pageNumber: "1",
      languagecode: "vi",
      currencyCode: "VND",
      radius: "20",
    });
    pushMapped(extractList(byCoord));
  }

  const candidates = getDestinationCandidates(destination);
  for (const q of candidates) {
    if (merged.size >= 6) break;

    const dataPage1 = await hotelService.search({
      destination: q,
      arrivalDate,
      departureDate,
      adults: "2",
      roomQty: "1",
      pageNumber: "1",
      languagecode: "vi",
      currencyCode: "VND",
    });
    pushMapped(extractList(dataPage1));

    if (merged.size < 6) {
      const dataPage2 = await hotelService.search({
        destination: q,
        arrivalDate,
        departureDate,
        adults: "2",
        roomQty: "1",
        pageNumber: "2",
        languagecode: "vi",
        currencyCode: "VND",
      });
      pushMapped(extractList(dataPage2));
    }
  }

  return Array.from(merged.values()).slice(0, 6);
}

const getCachedDomesticHotels = unstable_cache(
  async (destination: string, arrivalDate: string, departureDate: string) => {
    return buildDomesticHotels(destination, arrivalDate, departureDate);
  },
  ["domestic-hotels-shared-cache"],
  { revalidate: 60 * 60 * 6 }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get("destination")?.trim();
    const arrivalDate = searchParams.get("arrivalDate")?.trim();
    const departureDate = searchParams.get("departureDate")?.trim();

    if (!destination || !arrivalDate || !departureDate) {
      return NextResponse.json(
        { message: "Missing destination/arrivalDate/departureDate" },
        { status: 400 }
      );
    }

    const items = await getCachedDomesticHotels(destination, arrivalDate, departureDate);
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Cannot fetch domestic hotels" },
      { status: 500 }
    );
  }
}
