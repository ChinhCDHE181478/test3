const TRENDING_DESTINATIONS = [
  {
    label: "Hồ Chí Minh",
    searchValue: "Ho Chi Minh City",
    image:
      "https://images.pexels.com/photos/9768830/pexels-photo-9768830.jpeg?_gl=1*d5fz2k*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDA5MzIkajM2JGwwJGgw",
  },
  {
    label: "Hà Nội",
    searchValue: "Hà Nội",
    image:
      "https://cdn.getyourguide.com/img/location/58c9219a7a849.jpeg/88.jpg",
  },
  {
    label: "Vũng Tàu",
    searchValue: "Vũng Tàu",
    image:
      "https://images.pexels.com/photos/29562858/pexels-photo-29562858.png?_gl=1*k8q0v3*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDExNjckajU5JGwwJGgw",
  },
  {
    label: "Đà Nẵng",
    searchValue: "Đà Nẵng",
    image:
      "https://images.pexels.com/photos/34373624/pexels-photo-34373624.jpeg?_gl=1*1wlnebk*_ga*ODAwNTI4ODcyLjE3NzIwNDA3MTE.*_ga_8JE65Q40S6*czE3NzIwNDA3MTAkbzEkZzEkdDE3NzIwNDEyOTgkajU5JGwwJGgw",
  },
  {
    label: "Đà Lạt",
    searchValue: "Đà Lạt",
    image:
      "https://dalatopentours.com/images/attraction/dalat.jpg",
  },
];

export default function CityBreakSection({
  onSelectDestination,
}: {
  onSelectDestination: (destination: string) => void;
}) {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
            Điểm đến đang thịnh hành
          </h2>
          <p className="mt-2 text-base text-slate-500">
            Các lựa chọn phổ biến nhất cho du khách từ Việt Nam
          </p>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
          {TRENDING_DESTINATIONS.map((item, idx) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectDestination(item.searchValue)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl text-left ring-1 ring-black/10 shadow-sm hover:-translate-y-1 hover:ring-cyan-500 hover:shadow-xl transition-all duration-300 ${
                idx < 2 ? "md:col-span-3 h-[300px]" : "md:col-span-2 h-[240px]"
              }`}
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
              
              {/* Content */}
              <div className="absolute inset-x-5 bottom-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-white font-bold tracking-wide drop-shadow-md ${
                      idx < 2 ? "text-2xl" : "text-xl"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
