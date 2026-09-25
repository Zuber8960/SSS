import { Box, Button, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export function ClearkayaStyleHero({ slides, activeSlide, setActiveSlide, onExploreClick, onQuoteClick }) {
  const current = slides[activeSlide];
  const startsWithWith = /^With\s+/i.test(current.highlight);
  const emphasis = current.highlight.replace(/^With\s+/i, "");

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        bgcolor: "#17212b",
        backgroundImage: current.gradient,
        minHeight: { xs: 620, md: 600 },
        display: "flex",
        alignItems: "center",
        py: { xs: 7, md: 8 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          backgroundImage:
            "radial-gradient(ellipse at 28% 48%, #8b9aa8 0 1px, transparent 1.5px)",
          backgroundSize: "9px 9px",
          maskImage: "linear-gradient(90deg, #000, transparent 65%)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: "5%",
          top: "50%",
          width: 470,
          height: 470,
          transform: "translateY(-50%)",
          border: "1px solid rgba(217,137,74,.18)",
          borderRadius: "50%",
          boxShadow: "0 0 0 55px rgba(217,137,74,.035), 0 0 0 115px rgba(217,137,74,.025)",
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1240,
          mx: "auto",
          px: { xs: 2.5, md: 5 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.08fr" },
          gap: { xs: 5, md: 7 },
          alignItems: "center",
        }}
      >
        <Box key={current.headline} sx={{ animation: "heroCopyIn .6s ease both", "@keyframes heroCopyIn": { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "none" } } }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 1.5, py: .75, mb: 3.2, border: "1px solid #a7683a", borderRadius: 99, color: "#e9a36c", bgcolor: "rgba(255,255,255,.035)" }}>
            <Box sx={{ color: "#c9793d", fontSize: 17 }}>✣</Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" }}>{current.tag}</Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              position: "relative",
              isolation: "isolate",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: { xs: "2.8rem", sm: "3.8rem", md: "4.35rem" },
              lineHeight: 1.05,
              fontWeight: 500,
              letterSpacing: "-1.8px",
              mb: 3.2,
              color: "#ffffff",
              textShadow: "0 2px 18px rgba(255,255,255,.28), 0 4px 12px rgba(0,0,0,.45)",
              background: "radial-gradient(ellipse at 28% 48%, rgba(255,255,255,.13) 0%, rgba(244,177,91,.08) 38%, rgba(255,255,255,0) 72%)",
              borderRadius: "22px",
              "& > *": { position: "relative", zIndex: 1 },
            }}
          >
            {current.headline}
            <Box component="span" sx={{ display: "block", mt: .5 }}>
              {startsWithWith && <Box component="span" sx={{ color: "#ffffff" }}>With </Box>}
              <Box
                component="span"
                sx={{
                  color: "#e9a45d",
                  fontWeight: 700,
                  backgroundImage: "linear-gradient(90deg, #f0b66f 0%, #cf783b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 1px 1px rgba(0,0,0,.12)",
                }}
              >
                {emphasis}
              </Box>
            </Box>
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button onClick={onQuoteClick} endIcon={<ArrowForwardIcon />} sx={{ bgcolor: "#b9703f", color: "#fff", px: 3.4, py: 1.35, borderRadius: 99, textTransform: "none", fontWeight: 700, boxShadow: "0 10px 24px rgba(0,0,0,.3)", "&:hover": { bgcolor: "#cd8250" } }}>Get a Quote</Button>
            <Button onClick={onExploreClick} sx={{ color: "#e8a067", px: 1, py: 1.35, textTransform: "none", fontWeight: 700, borderBottom: "1px solid #9a623e", borderRadius: 0, "&:hover": { bgcolor: "transparent", color: "#ffc08b", borderBottomColor: "#ffc08b" } }}>Learn More</Button>
          </Box>
        </Box>

        <Box sx={{ position: "relative", minHeight: { xs: 310, sm: 390, md: 375 }, p: { xs: 1.2, md: 1.8 }, border: "1px solid #b98359", borderRadius: "44px", bgcolor: "#111820", boxShadow: "inset 0 0 0 3px #5f5146, 0 28px 55px rgba(0,0,0,.3)" }}>
          <Box component="img" src={current.bgImage} alt="Saral Samadhan logistics warehouse operations" sx={{ width: "100%", height: "100%", minHeight: "inherit", objectFit: "cover", borderRadius: "36px", filter: "saturate(.86) contrast(1.04)" }} />
          <Box sx={{ position: "absolute", top: { xs: 25, md: 36 }, left: { xs: 25, md: 36 }, width: 70, height: 70, borderRadius: "50%", bgcolor: "#e4a264", color: "#2a211c", display: "grid", placeItems: "center", textAlign: "center", fontWeight: 800, fontSize: 11, lineHeight: 1.15, boxShadow: "0 8px 20px rgba(0,0,0,.25)" }}>Pan-India<br />Network</Box>
        </Box>
      </Box>

      <Box sx={{ position: "absolute", zIndex: 2, left: "50%", bottom: 18, transform: "translateX(-50%)", display: "flex", gap: .8 }}>
        {slides.map((slide, index) => <Box key={slide.headline} onClick={() => setActiveSlide(index)} aria-label={`Show slide ${index + 1}`} sx={{ width: activeSlide === index ? 34 : 9, height: 9, borderRadius: 10, cursor: "pointer", bgcolor: activeSlide === index ? "#d88b50" : "rgba(255,255,255,.32)", transition: "all .3s ease" }} />)}
      </Box>
    </Box>
  );
}
