import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Paper, Stack, Typography, TextField,
  Button, CircularProgress, InputAdornment, IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { tenantLogin } from "../utils/tenantService";
import CommonAlertDialog from "../components/common/CommonAlertDialog";
import useAlert from "../components/common/UseAlert";


export default function MasterPortal() {
  const navigate = useNavigate();
  const { dialog, closeAlert, showError } = useAlert();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId || !password) {
      showError("User ID and Password are required");
      return;
    }
    setLoading(true);
    try {
      const result = await tenantLogin(userId, password);
      if (result.success) {
        // Navigate to that tenant's login page, pre-verified so the tenant step is skipped
        navigate(`/${result.tenantSlug}/login`, {
          state: { tenantVerified: true, config: result.config },
        });
      } else {
        showError(result.message || "Invalid credentials");
      }
    } catch (err) {
      showError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
          <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,

          background: "linear-gradient(-45deg, #ff7e5f, #feb47b, #ff6a88, #ff99ac)",
          backgroundSize: "400% 400%",
          animation: "gradientMove 2s ease infinite",

          "@keyframes gradientMove": {
            "0%": { backgroundPosition: "0% 50%" },
            "50%": { backgroundPosition: "100% 50%" },
            "100%": { backgroundPosition: "0% 50%" },
          },
        }}
      >
        <Paper
          elevation={6}
          sx={{ width: "100%", maxWidth: 420, p: 4, borderRadius: 3 }}
        >
          <Stack spacing={3} onKeyDown={handleKeyDown}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={700} color="#1e1b4b">
                Welcome
              </Typography>
              <Typography fontSize={14} color="text.secondary" mt={0.5}>
                Sign in with your organisation credentials
              </Typography>
            </Box>

            <TextField
              label="User ID"
              fullWidth
              size="small"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              autoFocus
            />

            <TextField
              label="Password"
              fullWidth
              size="small"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(s => !s)}>
                      {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              sx={{
                py: 1.4, fontWeight: 700, fontSize: 15,
                textTransform: "none",
                background: "#4c1d95",
                "&:hover": { background: "#3b0764" },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Continue"}
            </Button>
          </Stack>
        </Paper>
      </Box>

      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </>
  );
}
