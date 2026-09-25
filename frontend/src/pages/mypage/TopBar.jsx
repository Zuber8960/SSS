import { Box, Container, Stack, Typography, Button, Chip } from "@mui/material";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import EmailIcon from "@mui/icons-material/Email";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VerifiedIcon from "@mui/icons-material/Verified";

export function TopBar({ onPortalClick }) {
  return (
    <Box sx={{ bgcolor: "#202a3a", color: "#cbd5e1", py: .8, px: { xs: 2, md: 6 }, fontSize: "12.5px" }}>
      <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: "none", sm: "flex" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <PhoneInTalkIcon sx={{ fontSize: 15, color: "#ff7a00" }} />
            <span>National Toll-Free: <strong>1800-123-4567</strong></span>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <EmailIcon sx={{ fontSize: 15, color: "#ff7a00" }} />
            <span>support@saralamadhan.in</span>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <AccessTimeIcon sx={{ fontSize: 15, color: "#ff7a00" }} />
            <span>24x7 Control Room Active</span>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: "auto" }}>
          <Chip
            size="small"
            icon={<VerifiedIcon style={{ color: "#10b981", fontSize: 14 }} />}
            label="ISO 9001:2015 Registered"
            sx={{ bgcolor: "rgba(255,255,255,.06)", color: "#dbe5f0", border: "1px solid rgba(255,255,255,.22)", fontSize: 11, height: 22 }}
          />
          <Button
            size="small"
            onClick={onPortalClick}
            sx={{
              bgcolor: "#ff7a00",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              py: 0.3,
              minHeight: 24,
              "&:hover": { bgcolor: "#e66c00" },
            }}
          >
            ERP Sign In
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
