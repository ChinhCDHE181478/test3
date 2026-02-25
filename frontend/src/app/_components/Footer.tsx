// src/app/_components/Footer.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // ⬇️ Ẩn footer mặc định trên các trang admin
  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/chatbox")) return null;

  return (
    <footer className="bg-[#0891b2]/10">
      <div className="container mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <Link href="/" className="inline-flex items-center">
            <img
              src="/brand/logo.png"
              alt="VivuPlan"
              className="h-24 w-auto object-contain"
            />
          </Link>

          <p className="mt-3 text-slate-700">
            Nền tảng du lịch giúp bạn tìm kiếm và đặt chuyến bay, khách sạn tốt nhất.
          </p>
        </div>

        <div>
          <div className="font-medium text-slate-900">Tin du lịch địa phương</div>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li>
              <a
                href="https://vnexpress.net/du-lich"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0891b2] transition-colors"
              >
                VnExpress Du lịch
              </a>
            </li>
            <li>
              <a
                href="https://tuoitre.vn/du-lich.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0891b2] transition-colors"
              >
                Tuổi Trẻ Du lịch
              </a>
            </li>
            <li>
              <a
                href="https://thanhnien.vn/du-lich.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0891b2] transition-colors"
              >
                Thanh Niên Du lịch
              </a>
            </li>
          </ul>
        </div>

        {/* Kết nối */}
        <div>
          <div className="font-medium text-slate-900">
            Kết nối với chúng tôi
          </div>
          <div className="mt-3 flex items-center gap-4">
            <a
              className="group"
              href="https://www.facebook.com/profile.php?id=61586404334099"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-slate-700 group-hover:text-[#0891b2]"
                fill="currentColor"
              >
                <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.7V12h2.7V9.8c0-2.7 1.6-4.2 4-4.2 1.2 0 2.5.2 2.5.2v2.7h-1.4c-1.4 0-1.8.9-1.8 1.8V12h3l-.5 2.9h-2.5v7A10 10 0 0022 12z" />
              </svg>
            </a>
            <a
              className="group"
              href="https://www.tiktok.com/@vivu.plan?lang=vi-VN"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-slate-700 group-hover:text-[#0891b2]"
                fill="currentColor"
              >
                <path d="M19 7.7a6.9 6.9 0 0 0 3 1V12a10.5 10.5 0 0 1-3-0.5v4.7a7.2 7.2 0 1 1-6.2-7.1v3.3a4 4 0 1 0 3 3.8V2h3.2c.2 2.3 1.4 4.4 3 5.7z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 text-center text-sm text-slate-600 py-4">
        © {new Date().getFullYear()} VivuPlan.
      </div>
    </footer>
  );
}
