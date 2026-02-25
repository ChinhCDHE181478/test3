export default function BenefitsStrip() {
  const items = [
    { 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ), 
      title: "Ưu đãi khách sạn hấp dẫn", 
      desc: "Chúng tôi tìm ưu đãi của những khách sạn hàng đầu thế giới, sau đó chia sẻ kết quả tìm kiếm với bạn." 
    },
    { 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ), 
      title: "Giá mới nhất", 
      desc: "Luôn hiển thị thông tin tổng quan về giá mới nhất để bạn có kỳ vọng rõ ràng." 
    },
    { 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      ), 
      title: "Tìm kiếm chính xác", 
      desc: "Linh hoạt – đúng tiêu chí bạn cần tìm kiếm cho chuyến đi của mình." 
    },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Tiêu đề: Tại sao chọn VivuPlan */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Tại sao chọn VivuPlan?
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Chúng tôi cam kết mang đến trải nghiệm tìm kiếm và đặt phòng hoàn hảo nhất
          </p>
        </div>

        {/* Cấu trúc Grid mới chia 3 thẻ tách rời */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <div 
              key={i} 
              // Đã thêm các class hiệu ứng hover nhô lên và đổ bóng
              className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 p-8 md:p-10 transition-all duration-300 flex flex-col items-center text-center"
            >
              {/* Vùng chứa Icon với hiệu ứng đảo màu khi hover */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full mb-5 bg-cyan-50 text-cyan-600 transition-colors duration-300 group-hover:bg-cyan-600 group-hover:text-white ring-8 ring-cyan-50/50 group-hover:ring-cyan-100">
                {it.icon}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {it.title}
              </h3>
              
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                {it.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}