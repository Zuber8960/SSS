import { Box, Container, Paper, Grid, Typography } from "@mui/material";

export function MetricsBar({ keyMetrics }) {
  return (
    <Box
      id="network"
      sx={{
        bgcolor: "#ffffff",
        mt: { xs: -4, md: -6 },
        position: "relative",
        zIndex: 10,
        px: 2,
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={6}
          sx={{
            borderRadius: 4,
            bgcolor: "#0a192f",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 50px rgba(10,25,47,0.3)",
            p: { xs: 3, md: 4.5 },
          }}
        >
          <Grid container spacing={3}>
            {keyMetrics.map((m, idx) => (
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }} key={idx} sx={{ textAlign: "center" }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 750,
                    color: m.accent,
                    fontSize: { xs: "1.9rem", md: "2.5rem" },
                    letterSpacing: "-1px",
                    lineHeight: 1.1,
                  }}
                >
                  {m.value}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#ffffff", mt: 0.8, fontSize: "14px" }}>
                  {m.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 0.4, fontSize: "12px" }}>
                  {m.sub}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
