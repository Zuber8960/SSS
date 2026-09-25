import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export function ServicesSection({ services, onQuoteClick }) {
  return (
    <Box id="services" sx={{ py: { xs: 8, md: 11 }, bgcolor: "#ffffff" }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 6, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Chip
              label="SPECIALIZED MULTIMODAL FLEET"
              sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, mb: 1.5, fontSize: "11px" }}
            />
            <Typography variant="h3" sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: "1.9rem", md: "2.6rem" }, letterSpacing: "-0.7px" }}>
              Integrated Logistics & Supply Solutions
            </Typography>
            <Typography variant="body1" sx={{ color: "#64748b", mt: 1, maxWidth: 650 }}>
              Tailored high-capacity haulage, express cargo networks, temperature-locked chambers, and green rail corridors.
            </Typography>
          </Box>

          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={onQuoteClick}
            sx={{
              bgcolor: "#0f172a",
              color: "#ffffff",
              fontWeight: 800,
              borderRadius: 2,
              px: 3,
              py: 1.3,
              textTransform: "none",
              "&:hover": { bgcolor: "#ff6b00" },
            }}
          >
            Request Fleet Rates
          </Button>
        </Box>

        <Grid container spacing={3.5}>
          {services.map((s) => {
            const IconComp = s.icon;
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={s.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 4.5,
                    border: "1px solid #eee7df",
                    overflow: "hidden",
                    boxShadow: "0 5px 18px rgba(40,35,30,.035)",
                    transition: "all 0.35s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 20px 45px rgba(40,35,30,.10)",
                      borderColor: s.accent,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3.5, flex: 1, display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: 3,
                          background: s.gradient,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                        }}
                      >
                        <IconComp sx={{ fontSize: 28, color: s.iconColor }} />
                      </Box>
                      <Chip label={s.tag} size="small" sx={{ fontWeight: 650, fontSize: 11, bgcolor: "#f8fafc" }} />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 650, color: "#0f172a", mb: 1.2, fontSize: "1.12rem" }}>
                      {s.title}
                    </Typography>

                    <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6, mb: 2.5, flex: 1 }}>
                      {s.summary}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={0.8} sx={{ mb: 2.5 }}>
                      {s.bullets.map((b, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: "#10b981" }} />
                          <Typography variant="caption" sx={{ color: "#334155", fontWeight: 600 }}>
                            {b}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                      onClick={onQuoteClick}
                      sx={{
                        color: "#0f172a",
                        fontWeight: 800,
                        textTransform: "none",
                        p: 0,
                        justifyContent: "flex-start",
                        "&:hover": { color: "#ff6b00" },
                      }}
                    >
                      Enquire for this service
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
