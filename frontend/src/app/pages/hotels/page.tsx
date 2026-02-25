"use client";

import { useState } from "react";
import HotelBanner from "./_components/HotelBanner";
import BenefitsStrip from "./_components/BenefitsStrip";
import CityBreakSection from "./_components/CityBreakSection";
import DomesticSection from "./_components/DomesticSection";
import Faq from "./_components/Faq";

export default function HotelsPage() {
  const [searchDestination, setSearchDestination] = useState("");
  const [domesticDestination, setDomesticDestination] = useState("Ho Chi Minh City");

  const handleSelectTrendingDestination = (destination: string) => {
    setSearchDestination(destination);
    setDomesticDestination(destination);
  };

  return (
    <main className="min-h-screen">
      <HotelBanner
        presetDestination={searchDestination}
        onDestinationChange={handleSelectTrendingDestination}
      />
      {/* <BrandRow /> */}
      <CityBreakSection onSelectDestination={handleSelectTrendingDestination} />
      <DomesticSection
        selectedDestination={domesticDestination}
        onSelectDestination={setDomesticDestination}
      />
      <BenefitsStrip />
      <Faq />
    </main>
  );
}
