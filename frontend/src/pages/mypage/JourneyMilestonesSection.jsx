import { Box, Container, Grid, Typography, Chip, Paper } from "@mui/material";

export function JourneyMilestonesSection({ milestones }) {
  return (
    <Box id="milestones" sx={{ py: { xs: 8, md: 10 }, bgcolor: "#ffffff" }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: "center", maxWidth: 700, mx: "auto", mb: 6 }}>
          <Chip
            label="LEGACY OF EXCELLENCE"
            sx={{ bgcolor: "#f3e8ff", color: "#7e22ce", fontWeight: 800, mb: 1.5, fontSize: "11px" }}
          />
          <Typography variant="h3" sx={{ fontWeight: 900, color: "#0f172a", fontSize: { xs: "1.9rem", md: "2.5rem" } }}>
            Four Decades Moving India Forward
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {milestones.map((m, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  height: "100%",
                  position: "relative",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "#ffffff",
                    boxShadow: "0 14px 30px rgba(0,0,0,0.06)",
                    borderColor: "#a855f7",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontSize: "2rem",
                    color: "#7e22ce",
                    letterSpacing: "-1px",
                    mb: 1,
                  }}
                >
                  {m.year}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
                  {m.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6 }}>
                  {m.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
