import { useState, useRef } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getDocketByRecId } from "../../utils/docket";
import { fetchManifestsByDocketNo } from "../../utils/manifest";
import { SearchIcon, ResetIcon } from "../../components/common/icons";
import { IconButton, Tooltip } from "@mui/material";

// ✅ Docket Header Fields (read-only display)
const docketFields = [
  { label: "Docket No", name: "docket_no" },
  { label: "Docket Date", name: "docket_date", type: "date" },
  { label: "From Location", name: "from_loc" },
  { label: "From Town", name: "from_town" },
  { label: "To Location", name: "to_loc" },
  { label: "To Town", name: "to_town" },
  { label: "Consignor", name: "consignor" },
  { label: "Consignee", name: "consignee" },
  { label: "Total Packages", name: "total_pkgs", type: "number" },
  { label: "Actual Weight", name: "actual_wt", type: "number" },
  { label: "Charged Weight", name: "charged_wt", type: "number" },
  { label: "E-Way Bill No", name: "eway_bill_no" },
];

// ✅ Manifest Table Columns
const manifestColumns = [
  { key: "mnf_no", label: "Manifest No" },
  { key: "mnf_date", label: "Manifest Date" },
  { key: "mnf_loc", label: "From Location" },
  { key: "mnf_to_loc", label: "To Location" },
  { key: "mnf_from_town", label: "From Town" },
  { key: "mnf_to_town", label: "To Town" },
  { key: "desp_veh_no", label: "Vehicle No" },
  { key: "loaded_by", label: "Driver Name" },
  { key: "mnf_type", label: "Manifest Type" },
  { key: "mnf_no_of_pkgs", label: "Packages" },
  { key: "mnf_actual_wt", label: "Weight" },
  {
    key: "_status",
    label: "Status",
    minWidth: 160,
    render: (row) => {
      const arrived = !!row.mnf_arrival_time;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: arrived ? "#dcfce7" : "#fff7ed",
            color: arrived ? "#15803d" : "#ea580c",
            whiteSpace: "nowrap",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: arrived ? "#16a34a" : "#ea580c",
              display: "inline-block",
            }} />
            {arrived ? "Arrived" : "In Transit"}
          </span>
          {!arrived && row.desp_veh_no && (
            <Tooltip title={`Track vehicle ${row.desp_veh_no} on Google Maps`}>
              <IconButton
                size="small"
                onClick={() => {
                  const query = encodeURIComponent(`truck ${row.desp_veh_no} location India`);
                  window.open(`https://www.google.com/maps/search/${query}`, "_blank", "noopener");
                }}
                sx={{
                  padding: "3px",
                  color: "#1a73e8",
                  "&:hover": { background: "#e8f0fe" },
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                </svg>
              </IconButton>
            </Tooltip>
          )}
        </div>
      );
    },
  },
];

const emptyForm = {
  docket_no: "",
  docket_date: "",
  from_loc: "",
  from_town: "",
  to_loc: "",
  to_town: "",
  consignor: "",
  consignee: "",
  total_pkgs: "",
  actual_wt: "",
  charged_wt: "",
  eway_bill_no: "",
  remarks: "",
};

export default function DocketEnquiry() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [searchDocketNo, setSearchDocketNo] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [manifests, setManifests] = useState([]);
  const [docketFound, setDocketFound] = useState(false);

  const searchInputRef = useRef(null);

  // ✅ Fetch docket data and associated manifests
  const handleSearch = async () => {
    const docketNo = searchDocketNo.trim();
    if (!docketNo) {
      showError("Please enter a Docket Number");
      return;
    }

    try {
      showLoading();

      // Fetch docket details
      const docketData = await getDocketByRecId(null, docketNo);

      if (docketData && docketData.docket_no) {
        setForm({
          docket_no: docketData.docket_no || "",
          docket_date: docketData.docket_date ? docketData.docket_date.substring(0, 10) : "",
          from_loc: docketData.docket_loc || "",
          from_town: docketData.docket_dly_town || "",
          to_loc: docketData.docket_to_loc || docketData.to_loc || "",
          to_town: docketData.docket_pickup_town || "",
          consignor: docketData.cnor_name || "",
          consignee: docketData.cnee_name || "",
          total_pkgs: docketData.docket_tot_pkgs ?? docketData.total_pkgs ?? "",
          actual_wt: docketData.docket_act_wt ?? docketData.actual_wt ?? "",
          charged_wt: docketData.docket_chrg_wt || "",
          eway_bill_no: docketData.eway_bill_no || docketData.ewb_no || "",
          remarks: docketData.docket_remark || "",
        });
        setDocketFound(true);

        // Fetch manifests associated with this docket
        const manifestData = await fetchManifestsByDocketNo(docketNo);
        if (Array.isArray(manifestData)) {
          setManifests(manifestData);
        } else {
          setManifests([]);
        }

        showInfo(`Docket #${docketNo} loaded successfully`);
      } else {
        handleClear();
        showError(`Docket #${docketNo} not found`);
      }
    } catch (err) {
      handleClear();
      showError(err.message || "Failed to fetch docket details");
      console.error("Fetch docket error:", err);
    } finally {
      hideLoading();
    }
  };

  // ✅ Handle Enter key press on search field
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // ✅ Clear all data
  const handleClear = () => {
    setSearchDocketNo("");
    setForm({ ...emptyForm });
    setManifests([]);
    setDocketFound(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <MainLayout>
      <PageBody title="Docket Enquiry">
        {/* ✅ Top Toolbar */}
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <Tooltip title="Search Docket">
            <IconButton
              onClick={handleSearch}
              size="small"
              sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton
              onClick={handleClear}
              size="small"
              sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}
            >
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 400 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchDocketNo}
              onChange={(e) => setSearchDocketNo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Docket Number & press Enter"
              autoFocus
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "2px solid #7e22ce",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            />
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 13,
              fontWeight: 600,
              color: docketFound ? "#16a34a" : "#ca8a04",
              background: docketFound ? "#dcfce7" : "#fef9c3",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {docketFound ? "DOCKET FOUND" : "SEARCH"}
          </span>
        </div>

        {/* ✅ Docket Details Form */}
        <FormPanel>
          {docketFields.map((field) => {
            if (field.name === "remarks") {
              return (
                <div key={field.name} style={{ gridColumn: "1 / -1" }}>
                  <FormField
                    {...field}
                    form={form}
                    setForm={setForm}
                    disabled
                  />
                </div>
              );
            }
            return (
              <FormField
                key={field.name}
                {...field}
                form={form}
                setForm={setForm}
                disabled
              />
            );
          })}
        </FormPanel>

        {/* ✅ Manifests Grid Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <h3>Associated Manifests</h3>
          {manifests.length > 0 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#7e22ce",
                background: "#f3e8ff",
                padding: "4px 12px",
                borderRadius: 12,
              }}
            >
              Total: {manifests.length} manifest(s)
            </span>
          )}
        </div>
        <DataTable
          columns={manifestColumns}
          rows={manifests}
          getKey={(row, index) => row.mnf_no + (row.mnf_loc || "") + index}
          actions={[]}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Fetching data..." />
      </PageBody>
    </MainLayout>
  );
}