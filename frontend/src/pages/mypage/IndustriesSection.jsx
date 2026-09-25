import { Box, Container, Grid, Typography, Chip, Paper } from "@mui/material";

export function IndustriesSection({ industries }) {
  return (
    <Box id="industries" sx={{ py: { xs: 8, md: 11 }, bgcolor: "#fffaf4", color: "#172033" }}>
      <Container maxWidth="xl">
        <Box sx={{ textAlign: "center", maxWidth: 750, mx: "auto", mb: 6 }}>
          <Chip
            label="INDUSTRY VERTICALS"
            sx={{ bgcolor: "#ffedd5", color: "#c2410c", fontWeight: 700, mb: 1.5, fontSize: "11px" }}
          />
          <Typography variant="h3" sx={{ fontWeight: 700, color: "#172033", fontSize: { xs: "1.9rem", md: "2.6rem" }, letterSpacing: "-0.7px", mb: 1.5 }}>
            Purpose-Built For India&apos;s Core Industrial Giants
          </Typography>
          <Typography variant="body1" sx={{ color: "#697386" }}>
            Every sector operates on unique handling standards. From just-in-time automotive line feeds to cold pharma vaccines, our dedicated engineering teams manage risk and compliance end-to-end.
          </Typography>
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 8 }}>
          {industries.map((ind, i) => {
            const IconComp = ind.icon;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: "#ffffff",
                    border: "1px solid #eee7df",
                    color: "#172033",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    "&:hover": {
                      bgcolor: "#ffffff",
                      borderColor: ind.color,
                      transform: "translateY(-4px)",
                      boxShadow: `0 12px 28px ${ind.color}22`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      bgcolor: `${ind.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: ind.color,
                    }}
                  >
                    <IconComp sx={{ fontSize: 26 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "13.5px" }}>
                      {ind.name}
                    </Typography>
                    <Chip
                      label={ind.tag}
                      size="small"
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#64748b",
                        height: 20,
                        mt: 0.5,
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
