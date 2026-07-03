import { Backdrop, CircularProgress, Typography } from "@mui/material";

export default function LoadingOverlay({ isLoading, message = "Loading..." }) {
  return (
    <Backdrop
      open={isLoading}
      sx={{
        zIndex: 9999,
        flexDirection: "column",
        gap: 2,
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <CircularProgress color="inherit" size={52} thickness={4} />
      <Typography variant="body1" fontWeight={600} color="inherit">
        {message}
      </Typography>
    </Backdrop>
  );
}
