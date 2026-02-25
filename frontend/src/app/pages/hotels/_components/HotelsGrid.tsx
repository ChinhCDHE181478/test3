import Link from "next/link";

type HotelItem = {
  city: string;
  name: string;
  rating: number;
  reviews: number;
  img: string;
};

export default function HotelsGrid({ items }: { items: HotelItem[] }) {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {items.map((h, i) => (
        <Link
          key={i}
          href={`/pages/hotel-results?destination=${encodeURIComponent(h.city)}`}
          className="rounded-xl overflow-hidden ring-1 ring-black/5 bg-white hover:shadow-md hover:-translate-y-0.5 transition block cursor-pointer"
        >
          <img src={h.img} alt={h.name} className="h-48 w-full object-cover" />
          <div className="p-4">
            <div className="text-lg font-semibold">{h.name}</div>
            <div className="text-sm text-slate-600">{h.city}</div>
            <div className="mt-2 text-sm">
              <span className="font-semibold">{h.rating}/5</span>{" "}
              <span className="text-slate-600">{h.reviews} đánh giá</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
