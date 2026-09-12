import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Box, Stack, Typography, TextField, Button,
  Paper, CircularProgress, InputAdornment, IconButton,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import backgroundImage from "../images/tanent-img.png";
import { fetchAllTenants, tenantLogin } from "../utils/tenantService";
import { loginUser, changePassword } from "../utils/authService";
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
  const [errors, setErrors] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // ── Change password dialog state ──
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [cpUserId, setCpUserId] = useState("");
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

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
    const e = {};
    if (!tenantUserId) e.tenantUserId = true;
    if (!tenantPassword) e.tenantPassword = true;
    if (Object.keys(e).length) { setErrors(e); showError("User ID and Password are required"); return; }
    setErrors({});
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
    const e = {};
    if (!userId) e.userId = true;
    if (!password) e.password = true;
    if (!selectedDivision) e.division = true;
    if (!selectedLocation) e.location = true;
    if (Object.keys(e).length) {
      setErrors(e);
      if (!userId || !password) { showError("Username and Password are required"); return; }
      if (!selectedDivision) { showError("Please select a Division"); return; }
      showError("Please select a Location");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await loginUser(userId, password, selectedLocation, selectedDivision);
      const selectedDiv = selectedDivision || response.user?.division_code;
      const selectedLoc = selectedLocation || response.user?.location_id;
      const userToStore = { ...response.user, division_code: selectedDiv, location_id: selectedLoc };
      localStorage.setItem("current_user", JSON.stringify(userToStore));

      // Store company_code and division_code separately (used by manifests etc.)
      if (selectedLoc) {
        localStorage.setItem("loc_code", selectedLoc);
      }
      if (selectedDiv) {
        localStorage.setItem("division_code", selectedDiv);
      }

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

  const openChangePwd = () => {
    setCpUserId(userId); // prefill with the User ID typed on the sign-in form, if any
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setErrors({});
    setChangePwdOpen(true);
  };

  const closeChangePwd = () => {
    if (cpLoading) return;
    setChangePwdOpen(false);
    setErrors({});
  };

  const handleChangePassword = async () => {
    const e = {};
    if (!cpUserId) e.userId = true;
    if (!cpCurrent) e.password = true;
    if (!cpNew) e.cpNew = true;
    if (!cpConfirm) e.cpConfirm = true;
    if (Object.keys(e).length) {
      setErrors(p => ({ ...p, ...e }));
      showError("All fields are required");
      return;
    }
    if (cpNew !== cpConfirm) {
      setErrors(p => ({ ...p, cpConfirm: true }));
      showError("New password and confirm password do not match");
      return;
    }
    if (cpNew === cpCurrent) {
      setErrors(p => ({ ...p, cpNew: true }));
      showError("New password must be different from the current password");
      return;
    }
    setCpLoading(true);
    try {
      const result = await changePassword(cpUserId, cpCurrent, cpNew);
      if (result.success) {
        showSuccess("Password changed successfully. Please sign in with your new password.");
        setChangePwdOpen(false);
        setUserId(cpUserId);
        setPassword("");
      } else {
        showError(result.message || "Failed to change password");
      }
    } catch (err) {
      console.log(err);
      showError(err.message || "Failed to change password");
    } finally {
      setCpLoading(false);
    }
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
                    required
                    error={!!errors.tenantUserId}
                    value={tenantUserId}
                    onChange={e => { setTenantUserId(e.target.value); setErrors(p => ({ ...p, tenantUserId: false })); }}
                  />

                  <TextField
                    label="Password"
                    fullWidth
                    size="small"
                    required
                    error={!!errors.tenantPassword}
                    type={showTenantPwd ? "text" : "password"}
                    value={tenantPassword}
                    onChange={e => { setTenantPassword(e.target.value); setErrors(p => ({ ...p, tenantPassword: false })); }}
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
                    required
                    error={!!errors.userId}
                    value={userId}
                    onChange={e => { setUserId(e.target.value); setErrors(p => ({ ...p, userId: false })); }}
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

                  <FormControl fullWidth size="small" required error={!!errors.division}>
                    <InputLabel sx={{ fontSize: 13 }}>Division</InputLabel>
                    <Select
                      label="Division"
                      value={selectedDivision}
                      onChange={e => { setSelectedDivision(e.target.value); setErrors(p => ({ ...p, division: false })); }}
                      sx={{ fontSize: 13, textAlign: "left" }}
                      MenuProps={{
                        slotProps: {
                          paper: {
                            sx: {
                              '& .MuiMenuItem-root': { fontSize: 13, textAlign: "left" },
                            },
                          },
                        },
                      }}
                    >
                      {divisions.map(div => (
                        <MenuItem key={div.division_code} value={div.division_code}>
                          {div.division_code} - {div.division_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small" required error={!!errors.location}>
                    <InputLabel sx={{ fontSize: 13 }}>Location</InputLabel>
                    <Select
                      label="Location"
                      value={selectedLocation}
                      onChange={e => { setSelectedLocation(e.target.value); setErrors(p => ({ ...p, location: false })); }}
                      sx={{ fontSize: 13, textAlign: "left" }}
                      MenuProps={{
                        slotProps: {
                          paper: {
                            sx: {
                              '& .MuiMenuItem-root': { fontSize: 13, textAlign: "left" },
                            },
                          },
                        },
                      }}
                    >
                      {locations.map(loc => (
                        <MenuItem key={loc.loc_id} value={loc.loc_code}>
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

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={() => navigate("/")}
                      sx={{ color: primaryColor, textTransform: "none", fontSize: 13 }}
                    >
                      Back to organisation selection
                    </Button>
                    <Button
                      onClick={openChangePwd}
                      sx={{ color: buttonColor, textTransform: "none", fontSize: 13, fontWeight: 600}}
                    >
                      Change Password
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Paper>
          </Box>
        </Box>

        <Footer />
      </Box >
      {/* ── Change Password dialog ── */}
      <Dialog
        open={changePwdOpen}
        onClose={closeChangePwd}
        maxWidth="xs"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="User ID"
              size="small"
              value={cpUserId}
              onChange={(e) => { setCpUserId(e.target.value); setErrors(p => ({ ...p, userId: false })); }}
              error={errors.userId}
              disabled={cpLoading}
              fullWidth
            />
            <TextField
              label="Current Password"
              type={cpShowCurrent ? "text" : "password"}
              size="small"
              value={cpCurrent}
              onChange={(e) => { setCpCurrent(e.target.value); setErrors(p => ({ ...p, password: false })); }}
              error={errors.password}
              disabled={cpLoading}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setCpShowCurrent(!cpShowCurrent)} edge="end">
                      {cpShowCurrent ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="New Password"
              type={cpShowNew ? "text" : "password"}
              size="small"
              value={cpNew}
              onChange={(e) => { setCpNew(e.target.value); setErrors(p => ({ ...p, cpNew: false })); }}
              error={errors.cpNew}
              disabled={cpLoading}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setCpShowNew(!cpShowNew)} edge="end">
                      {cpShowNew ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              type={cpShowConfirm ? "text" : "password"}
              size="small"
              value={cpConfirm}
              onChange={(e) => { setCpConfirm(e.target.value); setErrors(p => ({ ...p, cpConfirm: false })); }}
              error={errors.cpConfirm}
              disabled={cpLoading}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setCpShowConfirm(!cpShowConfirm)} edge="end">
                      {cpShowConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeChangePwd} disabled={cpLoading} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={cpLoading}
            sx={{ background: buttonColor, "&:hover": { background: buttonColor, filter: "brightness(0.9)" }, textTransform: "none", fontWeight: 700 }}
          >
            {cpLoading ? <CircularProgress size={20} color="inherit" /> : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </>
  );
}