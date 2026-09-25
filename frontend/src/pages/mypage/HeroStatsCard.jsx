import { Box, Paper, Typography, Grid } from "@mui/material";

export function HeroStatsCard({ current }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Paper
        sx={{
          p: 3.5,
          borderRadius: 3.5,
          bgcolor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          color: "#ffffff",
        }}
      >
        <Typography variant="overline" sx={{ color: "#ff9f43", fontWeight: 800, letterSpacing: 1.5 }}>
          PRECISION GUARANTEED
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 900, mt: 0.5, mb: 0.5, color: "#ffffff" }}>
          {current.stat1}
        </Typography>
        <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
          {current.stat1Label} across key high-density Indian trading corridors.
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#38ef7d" }}>
              {current.stat2}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mt: 0.5 }}>
              {current.stat2Label}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#00d2ff" }}>
              {current.stat3}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mt: 0.5 }}>
              {current.stat3Label}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
