"use client";
import Accordion from "./Accordion";

export default function Faq() {
  return (
    <section className="container mx-auto px-4 my-10">
      <Accordion
        items={[
          {
            title: "VivuPlan xếp hạng khách sạn như thế nào?",
            content:
              "VivuPlan tổng hợp dữ liệu từ các đối tác uy tín và đánh giá thực tế từ người dùng. Hệ thống sau đó phân tích và hiển thị kết quả dựa trên mức độ phù hợp với bộ lọc, nhu cầu và hành vi tìm kiếm của bạn.",
          },
          {
            title: "Tôi có thể đặt phòng trực tiếp trên VivuPlan không?",
            content:
              "Hiện tại, VivuPlan chưa trực tiếp xử lý giao dịch đặt phòng. Sau khi bạn lựa chọn khách sạn phù hợp, hệ thống sẽ chuyển hướng đến nền tảng đối tác (ví dụ: Booking.com...) để bạn hoàn tất đặt phòng một cách an toàn và thuận tiện.",
          },
          {
            title: "Làm thế nào để nhận được mức giá tốt nhất?",
            content:
              "Để tối ưu chi phí, bạn nên đặt phòng sớm, linh hoạt về ngày nhận/trả phòng và theo dõi các chương trình ưu đãi theo mùa. VivuPlan cũng hỗ trợ bạn so sánh và lựa chọn phương án phù hợp nhất với ngân sách.",
          },
        ]}
      />
    </section>
  );
}
