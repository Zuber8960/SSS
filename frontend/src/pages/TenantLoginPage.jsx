import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Box, Stack, Typography, TextField, Button,
  Paper, CircularProgress, InputAdornment, IconButton,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import backgroundImage from "../images/tanent-img.png";
import { fetchAllTenants, tenantLogin } from "../utils/tenantService";
import { loginUser } from "../utils/authService";
import { updateUser } from "../utils/userAPI";
import CommonAlertDialog from "../components/common/CommonAlertDialog";
import useAlert from "../components/common/UseAlert";
import Footer from "../layouts/Footer";

export default function TenantLoginPage() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

  // If MasterPortal already verified the tenant, skip the first step
  const [config, setConfig] = useState(routeState?.config || null);
  const [loadingConfig, setLoadingConfig] = useState(!routeState?.config);

  const [tenantUserId, setTenantUserId] = useState("");
  const [tenantPassword, setTenantPassword] = useState("");
  const [showTenantPwd, setShowTenantPwd] = useState(false);
  const [tenantVerified, setTenantVerified] = useState(routeState?.tenantVerified || false);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  useEffect(() => {
    if (!tenantVerified) return;

    const loadDivisions = async () => {
      try {
        // Use a dedicated axios instance with the tenant token
        // to avoid issues with the main Api interceptor
        const tenantToken = localStorage.getItem("tenantToken");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/divisionMaster`,
          {
            headers: tenantToken
              ? { Authorization: `Bearer ${tenantToken}` }
              : {},
          }
        );
        setDivisions(response.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch divisions:", error);
        setDivisions([]);
      }
    };

    const loadLocations = async () => {
      try {
        const tenantToken = localStorage.getItem("tenantToken");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/locationMaster`,
          {
            headers: tenantToken
              ? { Authorization: `Bearer ${tenantToken}` }
              : {},
          }
        );
        setLocations(response.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        setLocations([]);
      }
    };

    loadDivisions();
    loadLocations();
  }, [tenantVerified]);

  useEffect(() => {
    if (routeState?.config) return; // already received from MasterPortal
    fetchAllTenants()
      .then((tenants) => {
        const match = tenants.find((t) => t.config_value?.tenant_slug === tenantSlug);
        if (match) {
          setConfig(match.config_value);
        } else {
          showError("Tenant not found. Redirecting...");
          setTimeout(() => navigate("/"), 2000);
        }
      })
      .catch(() => showError("Failed to load tenant config"))
      .finally(() => setLoadingConfig(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const handleTenantLogin = async () => {
    if (!tenantUserId || !tenantPassword) { showError("User ID and Password are required"); return; }
    setLoading(true);
    try {
      const result = await tenantLogin(tenantUserId, tenantPassword);
      if (result.success) { setTenantVerified(true); setConfig(result.config); }
      else showError(result.message || "Invalid tenant credentials");
    } catch (err) {
      console.log(err);
      showError(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handleAppLogin = async () => {
    if (!userId || !password) { showError("Username and Password are required"); return; }
    setLoading(true);
    try {
      const response = await loginUser(userId, password, selectedLocation, selectedDivision);
      const selectedDiv = selectedDivision || response.user?.division_code;
      const selectedLoc = selectedLocation || response.user?.location_id;
      const userToStore = { ...response.user, division_code: selectedDiv, location_id: selectedLoc };
      localStorage.setItem("current_user", JSON.stringify(userToStore));

      // Save division_code and loc_code to the user table in the backend
      if (response.user?.rec_id) {
        const updatePayload = {};
        if (selectedDiv) updatePayload.division_code = selectedDiv;
        if (selectedLoc) updatePayload.loc_code = selectedLoc;
        if (Object.keys(updatePayload).length) {
          await updateUser(response.user.rec_id, updatePayload);
        }
      }

      showSuccess("Login successful");
      setTimeout(() => navigate(config?.dashboard_url || "/dashboard"), 1000);
    } catch (err) {
      console.log(err);
      showError(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") tenantVerified ? handleAppLogin() : handleTenantLogin();
  };

  const brand = config?.brand || {};
  const gradient = brand.gradient || "linear-gradient(180deg, #8e2de2, #c850c0, #a4508b)";
  const primaryColor = brand.primary_color || "#8e2de2";
  const buttonColor = brand.button_color || "#0052cc";
  const promoCards = config?.promo_cards || [];

  if (loadingConfig) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ minHeight: "100vh", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <Box className="loginContainer" sx={{ display: "flex", minHeight: "85vh" }}>

        {/* ── Left promo panel ── */}
        <Box
          className="loginPromoColumn"
          sx={{
            flex: "1 1 420px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: "10px 36px",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              maxWidth: 560,
              p: 4,
              borderRadius: 3,
              background: gradient,
              color: "#fff",
            }}
          >
          <Box sx={{ width: "100%" }}>
            {config?.logo_url && (
              <Box display="flex" justifyContent="center" mb={2}>
                <Box
                  component="img"
                  src={config.logo_url}
                  alt={config.tenant_name}
                  sx={{ height: 126, width: 300, objectFit: "contain" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
              </Box>
            )}

            <Typography variant="h3" fontWeight={700} textAlign="center" mb={1}>
              {config?.tenant_name || tenantSlug}
            </Typography>
            <Typography textAlign="center" sx={{ opacity: 0.9, mb: 3 }}>
              {config?.tagline || "Enterprise Resource Planning System"}
            </Typography>

            <Stack spacing={2}>
              {promoCards.map((card, i) => (
                <Paper
                  key={i}
                  elevation={0}
                  sx={{ background: "rgba(255,255,255,0.1)", p: 2, borderRadius: 2 }}
                >
                  <Typography fontWeight={700}>{card.title}</Typography>
                  <Typography sx={{ opacity: 0.9, fontSize: 14 }}>{card.body}</Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
          </Paper>
        </Box>

        {/* ── Right login panel ── */}
        <Box
          sx={{
            flex: "1 1 420px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: "10px 36px",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              maxWidth: 420,
              p: 4,
              borderRadius: 3,
              border: `2px solid ${primaryColor}44`,
            }}
          >
            {config?.logo_url && (
              <Box display="flex" justifyContent="center" mb={2}>
                <Box
                  component="img"
                  src={config.logo_url}
                  alt={config.tenant_name}
                  sx={{ width: 200, maxWidth: "65%", height: "auto" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
              </Box>
            )}

            {!tenantVerified ? (
              <Stack spacing={2} onKeyDown={handleKeyDown}>
                <Box>
                  <Typography fontWeight={700} fontSize={16} color="#203040">
                    {config?.tenant_name} — Organisation Login
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    Enter your organisation credentials to continue
                  </Typography>
                </Box>

                <TextField
                  label="User ID"
                  fullWidth
                  size="small"
                  value={tenantUserId}
                  onChange={e => setTenantUserId(e.target.value)}
                />

                <TextField
                  label="Password"
                  fullWidth
                  size="small"
                  type={showTenantPwd ? "text" : "password"}
                  value={tenantPassword}
                  onChange={e => setTenantPassword(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowTenantPwd(s => !s)}>
                            {showTenantPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleTenantLogin}
                  disabled={loading}
                  sx={{ py: 1.4, fontWeight: 700, background: buttonColor, "&:hover": { background: buttonColor, filter: "brightness(0.9)" }, textTransform: "none", fontSize: 15 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Continue"}
                </Button>

                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/")}
                  sx={{ color: primaryColor, textTransform: "none", fontSize: 13 }}
                >
                  Back to organisation selection
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2} onKeyDown={handleKeyDown}>
                <Box>
                  <Typography fontWeight={700} fontSize={16} color="#203040">
                    Sign in to {config?.tenant_name}
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    Enter your account credentials
                  </Typography>
                </Box>

                <TextField
                  label="Username"
                  fullWidth
                  size="small"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                />

                <TextField
                  label="Password"
                  fullWidth
                  size="small"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 13 }}>Division</InputLabel>
                  <Select
                    label="Division"
                    value={selectedDivision}
                    onChange={e => setSelectedDivision(e.target.value)}
                    sx={{ fontSize: 13 }}
                    MenuProps={{
                      slotProps: {
                        paper: {
                          sx: {
                            '& .MuiMenuItem-root': { fontSize: 13 },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {divisions.map(div => (
                      <MenuItem key={div.division_code} value={div.division_code}>
                        {div.division_code} - {div.division_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 13 }}>Location</InputLabel>
                  <Select
                    label="Location"
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    sx={{ fontSize: 13 }}
                    MenuProps={{
                      slotProps: {
                        paper: {
                          sx: {
                            '& .MuiMenuItem-root': { fontSize: 13 },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {locations.map(loc => (
                      <MenuItem key={loc.loc_id} value={loc.loc_id}>
                        {loc.loc_code} - {loc.loc_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleAppLogin}
                  disabled={loading}
                  sx={{ py: 1.4, fontWeight: 700, background: buttonColor, "&:hover": { background: buttonColor, filter: "brightness(0.9)" }, textTransform: "none", fontSize: 15 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Sign In"}
                </Button>

                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/")}
                  sx={{ color: primaryColor, textTransform: "none", fontSize: 13 }}
                >
                  Back to organisation selection
                </Button>
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>

      <Footer />
      </Box>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </>
  );
}