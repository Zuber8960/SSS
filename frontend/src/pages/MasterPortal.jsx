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
import backgroundImage from "../images/tanent-img.png";


export default function MasterPortal() {
  const navigate = useNavigate();
  const { dialog, closeAlert, showError } = useAlert();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    const e = {};
    if (!userId) e.userId = true;
    if (!password) e.password = true;
    if (Object.keys(e).length) { setErrors(e); showError("User ID and Password are required"); return; }
    setErrors({});
    setLoading(true);
    try {
      const result = await tenantLogin(userId, password);
      if (result.success) {
        // Navigate to that tenant's login page, pre-verified so the tenant step is skipped
        navigate(`/${result.tenantSlug}/login`, {
          state: { tenantVerified: true, config: result.config },
        });
      } else {
        console.log(result);
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
          minHeight: "93vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
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
              required
              error={!!errors.userId}
              value={userId}
              onChange={e => { setUserId(e.target.value); setErrors(p => ({ ...p, userId: false })); }}
              autoFocus
            />

            <TextField
              label="Password"
              fullWidth
              size="small"
              required
              error={!!errors.password}
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: false })); }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(s => !s)}>
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
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
