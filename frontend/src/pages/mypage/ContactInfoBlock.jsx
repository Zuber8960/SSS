import { Box, Typography, Chip, Stack } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import EmailIcon from "@mui/icons-material/Email";

export function ContactInfoBlock() {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box>
        <Chip
          label="CONNECT WITH OUR SPECIALISTS"
          sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#ff9933", fontWeight: 600, mb: 2, fontSize: "11px" }}
        />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Ready to optimize your transport costs?
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.7, mb: 4 }}>
          Whether you require national linehaul operations, express multi-point deliveries, or managed warehousing, our logistics engineers will craft the ideal freight model.
        </Typography>

        <Stack spacing={2.5}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <LocationOnIcon sx={{ color: "#ff7a00", mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Corporate Headquarters</Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Saral Samadhan Logistics Centre, Sector-32, Institutional Area, India
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <PhoneInTalkIcon sx={{ color: "#ff7a00", mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Direct Helpdesk</Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                +91 (0) 124 2381600 / 07 (Lines open 24/7)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <EmailIcon sx={{ color: "#ff7a00", mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Commercial Enquiries</Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                enquiries@saralamadhan.in / contact@saralsamadhan.in
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
          Average response turnaround time: <strong>under 2 business hours</strong>.
        </Typography>
      </Box>
    </Box>
  );
}
