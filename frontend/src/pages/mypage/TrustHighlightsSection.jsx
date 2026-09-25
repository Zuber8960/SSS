import { Box, Container, Grid, Typography, Paper, Chip } from "@mui/material";
import AcUnitIcon from "@mui/icons-material/AcUnit";

const highlightImages = [
  "https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1578496781985-452d4a934d35?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=700&q=80",
];

export function TrustHighlightsSection({ highlights }) {
  return (
    <Box sx={{ py: { xs: 7, md: 9 }, bgcolor: "#fdf8f2" }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 5 }}>
          <Chip
            label="WHY ENTERPRISES CHOOSE SARAL SAMADHAN"
            sx={{ bgcolor: "#ffedd5", color: "#c2410c", fontWeight: 700, mb: 1.5, fontSize: "11px" }}
          />
          <Typography variant="h3" sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: "1.8rem", md: "2.3rem" }, letterSpacing: "-0.6px" }}>
            Operational Pillars Built For Absolute Dependability
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {highlights.map((h, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Paper
                elevation={1}
                sx={{
                  p: 0,
                  height: "100%",
                  overflow: "hidden",
                  borderRadius: 3.5,
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 18px 35px rgba(15,23,42,0.08)",
                    borderColor: "#ff6b00",
                  },
                }}
              >
                <Box sx={{ height: 150, position: "relative", overflow: "hidden", bgcolor: h.title.includes("Pharma") ? "linear-gradient(135deg, #0f766e, #164e63)" : "#e2e8f0" }}>
                  {h.title.includes("Pharma") ? (
                    <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,118,110,.92), rgba(22,78,99,.88))" }}>
                      <Box
                        component="img"
                        src={highlightImages[3]}
                        alt="Temperature-controlled pharmaceutical logistics warehouse"
                        loading="lazy"
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 1, filter: "saturate(.9) contrast(1.08)" }}
                      />
                      <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 35%, rgba(255,255,255,.2), transparent 45%)" }}>
                        <Box sx={{ width: 68, height: 68, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.95)", color: "#0f766e", boxShadow: "0 14px 35px rgba(0,0,0,.2)" }}>
                          <AcUnitIcon sx={{ fontSize: 40 }} />
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Box component="img" src={highlightImages[i]} alt={h.title} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .5s ease", ".MuiPaper-root:hover &": { transform: "scale(1.07)" } }} />
                      <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(15,23,42,.42))" }} />
                      <Typography aria-hidden="true" sx={{ position: "absolute", left: 22, bottom: 14, fontSize: 30 }}>{h.icon}</Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ p: 3 }}>
                  <Chip label={h.badge} size="small" sx={{ fontWeight: 700, fontSize: 10, bgcolor: "#f1f5f9", mb: 1.4 }} />
                  <Typography variant="h6" sx={{ fontWeight: 650, color: h.title.includes("Pharma") ? "#0f766e" : "#0f172a", mb: 1, fontSize: "1.05rem" }}>
                    {h.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.65, fontWeight: 400 }}>
                    {h.desc}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
