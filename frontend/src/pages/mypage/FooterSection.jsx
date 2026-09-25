import { Box, Container, Grid, Typography, Stack, Divider } from "@mui/material";
import { Link } from "react-router-dom";
import VerifiedIcon from "@mui/icons-material/Verified";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";

const linkStyle = { color: "#64748b", textDecoration: "none", fontSize: 14, transition: "color .2s ease" };

export function FooterSection() {
  return (
    <Box component="footer" sx={{ bgcolor: "#fffaf5", color: "#334155", pt: { xs: 7, md: 9 }, borderTop: "1px solid #f2e4d5" }}>
      <Container maxWidth="xl">
        <Box sx={{ bgcolor: "#172033", color: "#fff", borderRadius: 4, p: { xs: 3, md: 4.5 }, mb: { xs: 7, md: 9 }, display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", flexDirection: { xs: "column", md: "row" }, gap: 3, overflow: "hidden", position: "relative" }}>
          <Box sx={{ position: "absolute", width: 230, height: 230, borderRadius: "50%", bgcolor: "#f97316", filter: "blur(75px)", opacity: .17, right: -40, top: -100 }} />
          <Box sx={{ position: "relative" }}>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, lineHeight: 1.2, fontWeight: 650, letterSpacing: "-.7px", mb: 1 }}>Let&apos;s move your business forward.</Typography>
            <Typography sx={{ color: "#aeb9c9", fontSize: 14, maxWidth: 580, lineHeight: 1.65 }}>Connect with our logistics specialists for practical, reliable and cost-efficient transport solutions.</Typography>
          </Box>
          <Box component="a" href="mailto:business@saralsamadhan.in" sx={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 1, bgcolor: "#f97316", color: "#fff", textDecoration: "none", borderRadius: 99, px: 2.5, py: 1.35, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", transition: "all .25s ease", "&:hover": { bgcolor: "#ea580c", transform: "translateY(-2px)" } }}>
            Talk to an expert <ArrowOutwardIcon sx={{ fontSize: 17 }} />
          </Box>
        </Box>

        <Grid container spacing={{ xs: 4, md: 6 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography sx={{ color: "#172033", fontWeight: 750, fontSize: 18, letterSpacing: ".2px", mb: 1.5 }}>SARAL SAMADHAN <Box component="span" sx={{ color: "#f97316" }}>LOGISTICS</Box></Typography>
            <Typography sx={{ color: "#64748b", lineHeight: 1.75, fontSize: 14, mb: 2.5 }}>One of India&apos;s leading logistics and multimodal supply chain networks, delivering dependable freight, cold-chain, warehousing and express solutions.</Typography>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, bgcolor: "#ecfdf5", color: "#047857", borderRadius: 2, px: 1.5, py: 1, fontSize: 12.5 }}><VerifiedIcon sx={{ fontSize: 17 }} /> ISO 9001:2015 operations</Box>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography sx={{ color: "#172033", fontWeight: 700, fontSize: 14, mb: 2 }}>Explore</Typography>
            <Stack spacing={1.5}>
              <a href="#services" style={linkStyle}>FTL Freight</a>
              <a href="#services" style={linkStyle}>Express Cargo</a>
              <a href="#services" style={linkStyle}>Warehousing</a>
              <a href="#services" style={linkStyle}>Cold Chain</a>
              <a href="#industries" style={linkStyle}>Industries</a>
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography sx={{ color: "#172033", fontWeight: 700, fontSize: 14, mb: 2 }}>Company</Typography>
            <Stack spacing={1.5}>
              <a href="#network" style={linkStyle}>Our Network</a>
              <a href="#updates" style={linkStyle}>News & Media</a>
              <a href="#contact" style={linkStyle}>Contact Us</a>
              <Link to="/" style={linkStyle}>ERP Sign In</Link>
              <Link to="/common/terms-conditions" style={linkStyle}>Terms of Carriage</Link>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography sx={{ color: "#172033", fontWeight: 700, fontSize: 14, mb: 2 }}>Registered office</Typography>
            <Stack spacing={1.7}>
              <Box sx={{ display: "flex", gap: 1.2, color: "#64748b", fontSize: 14, lineHeight: 1.5 }}><LocationOnOutlinedIcon sx={{ color: "#f97316", fontSize: 19, mt: ".1rem" }} /><span>Institutional Hub, S.P. Road,<br />Secunderabad / Gurgaon</span></Box>
              <Box sx={{ display: "flex", gap: 1.2, color: "#64748b", fontSize: 14 }}><EmailOutlinedIcon sx={{ color: "#f97316", fontSize: 19 }} /><span>corporate@saralsamadhan.in</span></Box>
              <Box sx={{ display: "flex", gap: 1.2, color: "#64748b", fontSize: 14 }}><PhoneOutlinedIcon sx={{ color: "#f97316", fontSize: 19 }} /><span>+91 40 27840104</span></Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: "#eadfd5", my: 4 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>© {new Date().getFullYear()} Saral Samadhan Logistics Limited. All rights reserved.</Typography>
          <Stack direction="row" spacing={2.5}><Link to="/common/terms-conditions" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 12 }}>Terms of Service</Link><a href="#contact" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 12 }}>Privacy Policy</a></Stack>
        </Box>
      </Container>
    </Box>
  );
}
