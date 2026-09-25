import { Box, Container, Grid, Typography, Chip, Button, Stack } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import ShieldIcon from "@mui/icons-material/Shield";
import { HeroStatsCard } from "./HeroStatsCard";

export function HeroBanner({
  slides,
  activeSlide,
  setActiveSlide,
  onExploreClick,
  onQuoteClick,
}) {
  const current = slides[activeSlide];

  return (
    <Box
      sx={{
        position: "relative",
        background: current.gradient,
        color: "#ffffff",
        pt: { xs: 8, md: 11 },
        pb: { xs: 10, md: 14 },
        overflow: "hidden",
        transition: "background 0.8s ease",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${current.bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.28,
          mixBlendMode: "luminosity",
          transform: "scale(1.03)",
          animation: "none",
          transition: "background-image .8s ease, opacity .8s ease",
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2 }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Box sx={{ mb: 2.5 }}>
              <Chip
                icon={<ElectricBoltIcon style={{ color: current.tagColor, fontSize: 16 }} />}
                label={current.tag}
                sx={{
                  bgcolor: current.tagBg,
                  color: current.tagColor,
                  fontWeight: 800,
                  letterSpacing: "1.1px",
                  fontSize: "11px",
                  border: `1px solid ${current.tagColor}44`,
                }}
              />
            </Box>

            <Typography
              variant="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "2.25rem", sm: "3.05rem", md: "3.75rem" },
                lineHeight: 1.14,
                letterSpacing: "-1.1px",
                mb: 1.5,
              }}
            >
              {current.headline}
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "1.65rem", sm: "2.15rem", md: "2.7rem" },
                lineHeight: 1.22,
                letterSpacing: "-0.7px",
                background: "linear-gradient(90deg, #ff9f43 0%, #ffd166 50%, #38ef7d 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2.5,
              }}
            >
              {current.highlight}
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "#d5deea", fontSize: { xs: "1rem", md: "1.12rem" }, lineHeight: 1.7, maxWidth: 640, mb: 4.5, fontWeight: 400 }}
            >
              {current.description}
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4.5 }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={onQuoteClick}
                sx={{
                  bgcolor: "#ff6b00",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "15px",
                  px: 3.5,
                  py: 1.6,
                  borderRadius: 2,
                  boxShadow: "0 12px 30px rgba(255,107,0,0.45)",
                  "&:hover": { bgcolor: "#ea580c" },
                }}
              >
                Request Commercial Rate Card
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={onExploreClick}
                sx={{
                  borderColor: "rgba(255,255,255,0.4)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "15px",
                  px: 3,
                  py: 1.6,
                  borderRadius: 2,
                  "&:hover": { borderColor: "#ffffff", bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                Explore Specialized Fleets
              </Button>
            </Stack>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <ShieldIcon sx={{ color: "#38ef7d", fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>
                {current.badge}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <HeroStatsCard current={current} />
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", gap: 1.5, mt: { xs: 4, md: 6 } }}>
          {slides.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => setActiveSlide(idx)}
              sx={{
                width: activeSlide === idx ? 46 : 14,
                height: 6,
                borderRadius: 4,
                bgcolor: activeSlide === idx ? "#ff6b00" : "rgba(255,255,255,0.25)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
