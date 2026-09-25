import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Card,
  CardContent,
  Stack,
  Divider,
  Button,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const newsImages = [
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80",
];

export function NewsSection({ newsUpdates, onPortalClick }) {
  return (
    <Box id="updates" sx={{ py: { xs: 8, md: 10 }, bgcolor: "#f8fafc" }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 5, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Chip
              label="LATEST PERSPECTIVES"
              sx={{ bgcolor: "#e2e8f0", color: "#1e293b", fontWeight: 700, mb: 1.5, fontSize: "11px" }}
            />
            <Typography variant="h3" sx={{ fontWeight: 700, color: "#0a2540", fontSize: { xs: "1.8rem", md: "2.3rem" }, letterSpacing: "-0.6px" }}>
              Corporate News & Industry Updates
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          {newsUpdates.map((news, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Card
                sx={{
                  borderRadius: 3.5,
                  border: "1px solid #e2e8f0",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "transform .35s ease, box-shadow .35s ease, border-color .35s ease",
                  "&:hover": { transform: "translateY(-6px)", boxShadow: "0 18px 35px rgba(15,23,42,.1)", borderColor: "#c4b5fd", "& img": { transform: "scale(1.06)" } },
                }}
              >
                <Box component="img" src={newsImages[idx]} alt={news.title} loading="lazy" sx={{ width: "100%", height: 175, objectFit: "cover", display: "block", transition: "transform .45s ease" }} />
                <CardContent sx={{ p: 3.5, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <Chip label={news.tag} size="small" sx={{ fontWeight: 700, bgcolor: "#ffede0", color: "#ea580c", fontSize: 10 }} />
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      {news.date}
                    </Typography>
                  </Stack>

                  <Typography variant="h6" sx={{ fontWeight: 650, color: "#0a2540", mb: 1.5, fontSize: "1.06rem" }}>
                    {news.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6, flex: 1 }}>
                    {news.summary}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={onPortalClick}
                    sx={{ color: "#0a2540", fontWeight: 700, textTransform: "none", p: 0, justifyContent: "flex-start" }}
                  >
                    Read company update
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
