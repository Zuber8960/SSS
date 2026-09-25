import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";

import { heroSlides, keyMetrics, trustHighlights, newsUpdates } from "./mypage/data";
import { services, industries } from "./mypage/servicesData";
import { TopBar } from "./mypage/TopBar";
import { Navbar } from "./mypage/Navbar";
import { ClearkayaStyleHero } from "./mypage/ClearkayaStyleHero";
import { MetricsBar } from "./mypage/MetricsBar";
import { TrustHighlightsSection } from "./mypage/TrustHighlightsSection";
import { ServicesSection } from "./mypage/ServicesSection";
import { IndustriesSection } from "./mypage/IndustriesSection";
import { NewsSection } from "./mypage/NewsSection";
import { ContactSection } from "./mypage/ContactSection";
import { FooterSection } from "./mypage/FooterSection";

export default function MyPage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % heroSlides.length), 6500);
    return () => clearInterval(timer);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const goToContact = () => scrollTo("contact");

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        color: "#17203a",
        fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
        "& h1, & h2, & h3, & h4, & h5, & h6": {
          fontFamily: '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif',
          fontWeight: 700,
          letterSpacing: "-0.03em",
        },
        "& p": { fontWeight: 400 },
        "& .MuiTypography-body1, & .MuiTypography-body2": { fontWeight: 400, lineHeight: 1.7 },
        "& .MuiButton-root": { fontWeight: 600, letterSpacing: "0" },
        minHeight: "100vh",
        overflowX: "hidden",
        "@keyframes mypageFadeUp": {
          from: { opacity: 0, transform: "translateY(22px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "& > section": { animation: "mypageFadeUp .65s ease both" },
        "@media (prefers-reduced-motion: reduce)": {
          "& > section": { animation: "none" },
          "& *": { scrollBehavior: "auto !important", transitionDuration: "0.01ms !important" },
        },
      }}
    >
      <TopBar onPortalClick={() => navigate("/")} />
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLoginClick={() => navigate("/")}
        onQuoteClick={goToContact}
      />

      <ClearkayaStyleHero
        slides={heroSlides}
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        onExploreClick={() => scrollTo("services")}
        onQuoteClick={goToContact}
      />
      <MetricsBar keyMetrics={keyMetrics} />
      <TrustHighlightsSection highlights={trustHighlights} />
      <ServicesSection services={services} onQuoteClick={goToContact} />
      <IndustriesSection industries={industries} />
      <ContactSection onQuoteClick={goToContact} />
      <NewsSection newsUpdates={newsUpdates} onPortalClick={goToContact} />
      <FooterSection />
    </Box>
  );
}
