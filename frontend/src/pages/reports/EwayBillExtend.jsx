import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { extendEwayBillValidity } from "../../utils/docket";
import {
  IconButton,
  Tooltip,
  TextField,
  Button,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

const PURPLE = "#7e22ce";
const PURPLE_SOFT = "#f3e8ff";
const PURPLE_LINE = "#d8b4fe";

const filterSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE_LINE },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE },
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 10,
  display: "block",
};

const emptyForm = {
  ewbNo: "",
  fromPlace: "",
  fromPincode: "",
  fromState: "",
  remainingDistance: "",
  extnRsnCode: "",
  extnRemarks: "",
  vehicleNo: "",
  transDocNo: "",
  transDocDate: "",
  transMode: "",
  consignmentStatus: "",
  transitType: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
};

export default function EwayBillExtend() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    search: true,
    advanced: true,
  });
  const [form, setForm] = useState(emptyForm);
  const [searchText, setSearchText] = useState("");

  const handleChange = (key) => (event) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };

  const handleFilterToggle = (key) => {
    setActiveFilters((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.ewbNo || String(form.ewbNo).trim() === "") {
      showError("EWB No is required");
      return;
    }

    try {
      showLoading();

      const payload = {
        ewbNo: form.ewbNo.trim(),
        fromPlace: form.fromPlace.trim() || null,
        fromPincode: form.fromPincode ? Number(form.fromPincode) : null,
        fromState: form.fromState ? Number(form.fromState) : null,
        remainingDistance: form.remainingDistance ? Number(form.remainingDistance) : null,
        extnRsnCode: form.extnRsnCode ? Number(form.extnRsnCode) : null,
        extnRemarks: form.extnRemarks.trim() || null,
        vehicleNo: form.vehicleNo.trim() || null,
        transDocNo: form.transDocNo.trim() || null,
        transDocDate: form.transDocDate
          ? form.transDocDate.split("-").reverse().join("/")
          : null,
        transMode: form.transMode.trim() || null,
        consignmentStatus: form.consignmentStatus.trim() || null,
        transitType: form.transitType.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        addressLine3: form.addressLine3.trim() || null,
      };

      await extendEwayBillValidity(payload);
      hideLoading();
      showSuccess("E-Way Bill validity extended successfully");
      setForm((previous) => ({ ...previous, ewbNo: "" }));
    } catch (error) {
      hideLoading();
      showError(error.message || "Failed to extend E-Way Bill validity");
      console.error("Extend EWB error:", error);
    }
  };

  const handleClear = () => {
    setForm({ ...emptyForm });
    setSearchText("");
  };

  const requiredMark = <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>;

  return (
    <MainLayout>
      <PageBody title="Extend E-Way Bill Validity">
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay
          isLoading={isLoading}
          message="Extending E-Way Bill validity..."
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #7e22ce, #a855f7)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TuneIcon sx={{ color: "#fff", fontSize: 18 }} />
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Extend E-Way Bill Validity
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                Extend the validity of an existing E-Way Bill
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Tooltip title="Filter Options">
              <IconButton
                onClick={(event) => setFilterAnchor(event.currentTarget)}
                size="small"
                sx={{
                  color: PURPLE,
                  border: `1.5px solid ${PURPLE_LINE}`,
                  borderRadius: 2,
                  padding: "6px",
                  "&:hover": { background: PURPLE_SOFT },
                }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={filterAnchor}
              open={Boolean(filterAnchor)}
              onClose={() => setFilterAnchor(null)}
            >
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={activeFilters.search}
                      onChange={() => handleFilterToggle("search")}
                    />
                  }
                  label="Search"
                />
              </MenuItem>
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={activeFilters.advanced}
                      onChange={() => handleFilterToggle("advanced")}
                    />
                  }
                  label="Advanced Fields"
                />
              </MenuItem>
            </Menu>

            {activeFilters.search && (
              <TextField
                size="small"
                placeholder="Search EWB No / Vehicle / Remarks..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: PURPLE, fontSize: 17 }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: searchText ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchText("")}
                          sx={{ padding: "2px" }}
                        >
                          <ClearIcon sx={{ fontSize: 15, color: "#9ca3af" }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{ ...filterSx, minWidth: 220 }}
              />
            )}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1.5px solid ${PURPLE_LINE}`,
            padding: 20,
            boxShadow: "0 4px 12px rgba(126,34,206,0.08)",
            marginBottom: 16,
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <TextField
              sx={{ ...filterSx, gridColumn: "1 / -1" }}
              size="small"
              label={
                <span>
                  EWB No {requiredMark}
                </span>
              }
              required
              value={form.ewbNo}
              onChange={handleChange("ewbNo")}
              fullWidth
            />

            {activeFilters.advanced && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={sectionTitle}>Place / Pincode</span>
                  <TextField
                    size="small"
                    label="From Place"
                    value={form.fromPlace}
                    onChange={handleChange("fromPlace")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="From Pincode"
                    type="number"
                    inputMode="numeric"
                    value={form.fromPincode}
                    onChange={handleChange("fromPincode")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="From State (code)"
                    type="number"
                    inputMode="numeric"
                    value={form.fromState}
                    onChange={handleChange("fromState")}
                    fullWidth
                    sx={filterSx}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={sectionTitle}>Distance / Reason</span>
                  <TextField
                    size="small"
                    label="Remaining Distance (km)"
                    type="number"
                    inputMode="numeric"
                    value={form.remainingDistance}
                    onChange={handleChange("remainingDistance")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Extension Reason Code"
                    type="number"
                    inputMode="numeric"
                    value={form.extnRsnCode}
                    onChange={handleChange("extnRsnCode")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Extension Remarks"
                    value={form.extnRemarks}
                    onChange={handleChange("extnRemarks")}
                    fullWidth
                    sx={filterSx}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={sectionTitle}>Vehicle / Document</span>
                  <TextField
                    size="small"
                    label="Vehicle No"
                    value={form.vehicleNo}
                    onChange={handleChange("vehicleNo")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Transport Document No"
                    value={form.transDocNo}
                    onChange={handleChange("transDocNo")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Transport Document Date"
                    type="date"
                    value={form.transDocDate}
                    onChange={handleChange("transDocDate")}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    sx={filterSx}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={sectionTitle}>Transit Details</span>
                  <TextField
                    size="small"
                    label="Transport Mode"
                    value={form.transMode}
                    onChange={handleChange("transMode")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Consignment Status"
                    value={form.consignmentStatus}
                    onChange={handleChange("consignmentStatus")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Transit Type"
                    value={form.transitType}
                    onChange={handleChange("transitType")}
                    fullWidth
                    sx={filterSx}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    gridColumn: "1 / -1",
                  }}
                >
                  <span style={sectionTitle}>Address</span>
                  <TextField
                    size="small"
                    label="Address Line 1"
                    value={form.addressLine1}
                    onChange={handleChange("addressLine1")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Address Line 2"
                    value={form.addressLine2}
                    onChange={handleChange("addressLine2")}
                    fullWidth
                    sx={filterSx}
                  />
                  <TextField
                    size="small"
                    label="Address Line 3"
                    value={form.addressLine3}
                    onChange={handleChange("addressLine3")}
                    fullWidth
                    sx={filterSx}
                  />
                </div>
              </>
            )}

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 4,
              }}
            >
              <Button
                type="button"
                variant="outlined"
                onClick={handleClear}
                startIcon={<ClearIcon />}
                sx={{
                  color: "#64748b",
                  borderColor: "#cbd5e1",
                  textTransform: "none",
                }}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  background: PURPLE,
                  textTransform: "none",
                  "&:hover": { background: "#6b21a8" },
                }}
              >
                Extend Validity
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: "#f8fafc",
              color: "#64748b",
              fontSize: 12,
            }}
          >
            Server credentials (ip_address, client_id, client_secret, gstin) are
            injected automatically from the server configuration.
          </div>
        </div>
      </PageBody>
    </MainLayout>
  );
}
