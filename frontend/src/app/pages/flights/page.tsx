"use client";
import BannerSection from "@/app/pages/flights/_components/BannerSection";
import CheapFlights from "@/app/pages/flights/_components/CheapFlights";
import { useState } from "react";

export default function Home() {
  const [presetTo, setPresetTo] = useState("");

  return (
    <main className="min-h-screen">
      <BannerSection presetTo={presetTo} />
      <CheapFlights
        onPickPopularDestination={(destination) => {
          setPresetTo(destination);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </main>
  );
}
