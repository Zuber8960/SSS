import { Box, Container, Stack, Typography, Button, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import logoFallback from "../../images/logo.png";
import logoAlt from "../../images/Cargo Yaan Logo.jpeg";

export function Navbar({ mobileMenuOpen, setMobileMenuOpen, onLoginClick, onQuoteClick }) {
  return (
    <Box
      component="header"
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
        boxShadow: "0 5px 24px rgba(15,23,42,.035)",
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      <Container maxWidth="xl" sx={{ py: 1.4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                bgcolor: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 0.5,
                boxShadow: "0 6px 16px rgba(15,23,42,0.25)",
              }}
            >
              <img
                src={logoFallback}
                alt="Saral Samadhan"
                style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                onError={(e) => { e.currentTarget.src = logoAlt; }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.05rem", md: "1.22rem" },
                  letterSpacing: "-0.5px",
                  lineHeight: 1,
                  background: "linear-gradient(90deg, #0a192f 0%, #0369a1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textTransform: "uppercase",
                }}
              >
                SARAL SAMADHAN <span style={{ color: "#ff6b00", WebkitTextFillColor: "#ff6b00" }}>LOGISTICS</span>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontSize: "10.5px",
                  letterSpacing: "1.4px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  display: "block",
                  mt: 0.2,
                }}
              >
                Next-Gen Multimodal Supply Chain
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={3.5} alignItems="center" sx={{ display: { xs: "none", lg: "flex" } }}>
            <a href="#services" style={{ textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}>Services</a>
            <a href="#industries" style={{ textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}>Industries</a>
            <a href="#network" style={{ textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}>Network</a>
            <a href="#milestones" style={{ textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}>Journey</a>
            <a href="#contact" style={{ textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}>Contact</a>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              size="medium"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
              onClick={onQuoteClick}
              sx={{
                bgcolor: "#ff6b00",
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 99,
                px: 2.4,
                py: 1,
                boxShadow: "0 6px 18px rgba(255,107,0,0.25)",
                display: { xs: "none", sm: "inline-flex" },
                "&:hover": { bgcolor: "#ea580c" },
              }}
            >
              Get a Quote
            </Button>

            <Button
              variant="outlined"
              size="medium"
              onClick={onLoginClick}
              sx={{
                borderColor: "#0f172a",
                color: "#0f172a",
                fontWeight: 700,
                borderRadius: 99,
                textTransform: "none",
                px: 2.2,
                "&:hover": { borderColor: "#ff6b00", color: "#ff6b00" },
              }}
            >
              ERP Login
            </Button>

            <IconButton
              sx={{ display: { xs: "flex", lg: "none" }, color: "#0f172a" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Stack>
        </Box>
      </Container>
      {mobileMenuOpen && (
        <Box sx={{ display: { xs: "block", lg: "none" }, bgcolor: "#fff", borderTop: "1px solid #e2e8f0", px: 3, py: 2.5, boxShadow: "0 16px 30px rgba(15,23,42,.1)" }}>
          <Stack spacing={0.5}>
            {["services", "industries", "network", "contact"].map((id) => (
              <Box key={id} component="a" href={`#${id}`} onClick={() => setMobileMenuOpen(false)} sx={{ py: 1.2, color: "#17203a", textDecoration: "none", textTransform: "capitalize", fontWeight: 800, borderBottom: "1px solid #f1f5f9" }}>
                {id === "network" ? "Our Network" : id}
              </Box>
            ))}
            <Button onClick={onLoginClick} variant="outlined" sx={{ mt: 1.5, borderColor: "#7c3aed", color: "#6d28d9", fontWeight: 800, textTransform: "none" }}>ERP Login</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
