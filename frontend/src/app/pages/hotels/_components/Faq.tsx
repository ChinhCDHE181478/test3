import { faqs } from "./_data";

export default function Faq() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Tiêu đề thu nhỏ lại như ban đầu: text-2xl font-semibold */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Câu hỏi thường gặp
          </h2>
        </div>

        {/* Khối FAQ */}
        <div className="divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {faqs.map((f, i) => (
            <details key={i} className="group">
              
              {/* Câu hỏi: Bỏ text-lg, đưa về font-medium nguyên bản */}
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 md:p-5 font-medium text-slate-800 hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                
                {/* Icon mũi tên cũng được làm nhỏ lại (w-4 h-4) cho hợp với chữ */}
                <span className="shrink-0 rounded-full p-1 bg-slate-100 text-slate-500 group-open:-rotate-180 group-open:bg-cyan-50 group-open:text-cyan-600 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
              </summary>
              
              {/* Câu trả lời: Căn lề vừa vặn với chữ nhỏ */}
              <div className="px-4 md:px-5 pb-5 mt-1 text-slate-600">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}