import { Box, Container, Grid, Typography, Button, Stack, Paper } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const cards = [
  { icon: CallIcon, title: "Call our business desk", value: "1800-123-4567", color: "#ff6b00" },
  { icon: EmailIcon, title: "Write to our experts", value: "business@saralamadhan.in", color: "#7c3aed" },
  { icon: LocationOnIcon, title: "Corporate office", value: "S.P. Road, Secunderabad", color: "#0ea5a8" },
];

export function ContactSection() {
  return (
    <Box id="contact" sx={{ py: { xs: 7, md: 10 }, bgcolor: "#f4f8f7", position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", bgcolor: "#bfe9df", filter: "blur(90px)", top: -160, right: -80, opacity: .45 }} />
      <Container maxWidth="xl" sx={{ position: "relative" }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ position: "relative", minHeight: { xs: 230, md: 330 }, borderRadius: 4, overflow: "hidden", boxShadow: "0 24px 50px rgba(109,40,217,.18)", mb: 3 }}>
              <Box component="img" src="https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1000&q=85" alt="Modern logistics warehouse operations" loading="lazy" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(15,23,42,.72), transparent 70%)" }} />
              <Box sx={{ position: "absolute", left: 24, bottom: 22, color: "#fff" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, mb: 0.5, opacity: 0.8 }}>CONNECTED OPERATIONS</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>People. Technology. Supply chain.</Typography>
              </Box>
            </Box>
            <Typography sx={{ color: "#ea580c", fontWeight: 700, letterSpacing: 1.4, fontSize: 12, mb: 1.5 }}>LET&apos;S MOVE BUSINESS FORWARD</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: "2.15rem", md: "3.35rem" }, lineHeight: 1.1, fontWeight: 700, color: "#17203a", letterSpacing: "-0.9px", mb: 2 }}>
              A smarter supply chain starts <Box component="span" sx={{ color: "#7c3aed" }}>right here.</Box>
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: 17, lineHeight: 1.7, maxWidth: 580, mb: 3.5 }}>
              Tell us what you need to move. Our solution specialists will design a practical, cost-efficient logistics plan around your business.
            </Typography>
            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={() => window.open("mailto:business@saralamadhan.in", "self")} sx={{ bgcolor: "#f97316", px: 3.5, py: 1.5, borderRadius: 99, fontWeight: 700, textTransform: "none", boxShadow: "0 14px 30px rgba(249,115,22,.24)", transition: "transform .25s ease, box-shadow .25s ease, background-color .25s ease", "&:hover": { bgcolor: "#ea580c", transform: "translateY(-2px)", boxShadow: "0 18px 36px rgba(249,115,22,.32)" } }}>
              Start a conversation
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              {cards.map(({ icon: Icon, title, value, color }) => (
                <Paper key={title} elevation={0} sx={{ p: 2.5, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, bgcolor: "#fff", border: "1px solid #ffedd5", boxShadow: "0 12px 30px rgba(124,58,237,.07)", transition: "transform .25s ease, box-shadow .25s ease", "&:hover": { transform: "translateX(5px)", boxShadow: "0 16px 34px rgba(124,58,237,.13)" } }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: `${color}15`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon /></Box>
                  <Box><Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>{title}</Typography><Typography sx={{ color: "#17203a", fontWeight: 650, fontSize: 17 }}>{value}</Typography></Box>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
