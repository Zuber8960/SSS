import { useState, useRef } from "react";
import {
  DataTable,
  FormField,
  FormPanel,
} from "./MasterPage";
import useAlert from "./UseAlert";
import CommonAlertDialog from "./CommonAlertDialog";
import useLoading from "./UseLoading";
import LoadingOverlay from "./LoadingOverlay";
import { getDocketByRecId } from "../../utils/docket";
import { fetchManifestsByDocketNo } from "../../utils/manifest";
import { fetchDeliveryNoteByDocketNo } from "../../utils/deliveryNote";
import { SearchIcon, ResetIcon } from "./icons";
import { IconButton, TextField, Tooltip } from "@mui/material";
import RouteMap from "./RouteMap";

const docketFields = [
  { label: "From Location",   name: "from_loc", span: 1 },
  { label: "From Town",       name: "from_town", span: 1 },
  { label: "To Location",     name: "to_loc", span: 1 },
  { label: "To Town",         name: "to_town", span: 1 },
  { label: "Docket No",       name: "docket_no", span: 1 },
  { label: "Docket Date",     name: "docket_date",  type: "date", span: 1 },
  { label: "Consignor",       name: "consignor", span: 2 },
  { label: "Consignee",       name: "consignee", span: 2 },
  { label: "Total Packages",  name: "total_pkgs",   type: "number", span: 1 },
  { label: "Actual Weight",   name: "actual_wt",    type: "number", span: 1 },
  { label: "Charged Weight",  name: "charged_wt",   type: "number", span: 1 },
  { label: "E-Way Bill No",   name: "eway_bill_no", span: 1 },
];

const emptyForm = {
  docket_no: "", docket_date: "", from_loc: "", from_town: "",
  to_loc: "", to_town: "", consignor: "", consignee: "",
  total_pkgs: "", actual_wt: "", charged_wt: "", eway_bill_no: "", remarks: "",
};

/* ── Current Status helpers ─────────────────────────────── */
const STATUS_META = {
  "In Transit":              { color: "#ea580c", bg: "#fff7ed", border: "#fdba74", icon: "🚛" },
  "Arrived at Destination":  { color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd", icon: "📍" },
  "Out for Delivery":        { color: "#7e22ce", bg: "#f3e8ff", border: "#d8b4fe", icon: "🛵" },
  "Delivered":               { color: "#15803d", bg: "#dcfce7", border: "#86efac", icon: "✅" },
};

function computeCurrentStatus(note, manifestList) {
  const ds = (note?.delivery_status || "").toLowerCase();
  if (ds === "delivered" || (ds && ds !== "pending" && note?.delivery_date)) return "Delivered";
  if (ds.includes("out for delivery")) return "Out for Delivery";
  const arr = Array.isArray(manifestList) ? manifestList : [];
  if (arr.length > 0 && arr.every((m) => !!m.mnf_arrival_time)) return "Arrived at Destination";
  return "In Transit";
}

function StatusChip({ status, size = "md" }) {
  const meta = STATUS_META[status] || STATUS_META["In Transit"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "lg" ? "6px 14px" : "3px 10px",
      borderRadius: 14,
      fontSize: size === "lg" ? 14 : 12,
      fontWeight: 700,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.border}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: size === "lg" ? 16 : 12 }}>{meta.icon}</span>
      {status}
    </span>
  );
}

const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(url || "");

function PodViewer({ podUrl }) {
  if (!podUrl) return null;
  return (
    <div style={{
      marginTop: 10, padding: 14, borderRadius: 12, background: "#f0fdf4",
      border: "1px solid #86efac",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>
        📄 Proof of Delivery (POD)
      </div>
      {isImageUrl(podUrl) ? (
        <a href={podUrl} target="_blank" rel="noreferrer">
          <img
            src={podUrl}
            alt="POD"
            style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, border: "1px solid #bbf7d0", cursor: "zoom-in" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </a>
      ) : (
        <a href={podUrl} target="_blank" rel="noreferrer"
           style={{ color: "#15803d", fontWeight: 600, fontSize: 13, textDecoration: "underline" }}>
          View POD Document
        </a>
      )}
    </div>
  );
}

const manifestBaseColumns = [
  { key: "mnf_no",         label: "Manifest No" },
  { key: "mnf_date",       label: "Manifest Date" },
  { key: "mnf_loc",        label: "From Location" },
  { key: "mnf_to_loc",     label: "To Location" },
  { key: "mnf_from_town",  label: "From Town" },
  { key: "mnf_to_town",    label: "To Town" },
  { key: "desp_veh_no",    label: "Vehicle No" },
  { key: "loaded_by",      label: "Driver Name" },
  { key: "mnf_type",       label: "Manifest Type" },
  { key: "mnf_no_of_pkgs", label: "Packages" },
  { key: "mnf_actual_wt",  label: "Weight" },
];

function makeManifestColumns(setMapRow) {
  return [
    ...manifestBaseColumns,
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
              color:      arrived ? "#15803d" : "#ea580c",
              whiteSpace: "nowrap",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: arrived ? "#16a34a" : "#ea580c",
                display: "inline-block",
              }} />
              {arrived ? "Arrived" : "In Transit"}
            </span>
            {!arrived && (row.mnf_from_town || row.mnf_to_town) && (
              <Tooltip title={`Show route: ${row.mnf_from_town || row.mnf_loc} → ${row.mnf_to_town || row.mnf_to_loc}`}>
                <IconButton
                  size="small"
                  onClick={() => setMapRow(row)}
                  sx={{ padding: "3px", color: "#1a73e8", "&:hover": { background: "#e8f0fe" } }}
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
}

/**
 * Self-contained docket search widget.
 * Props:
 *   showForm  {boolean}  Show the docket details form panel (default true)
 */
export default function DocketEnquirySearch({ showForm = true }) {
  const { dialog, closeAlert, showSuccess, showError, showInfo } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [searchDocketNo, setSearchDocketNo] = useState("");
  const [form, setForm]                     = useState({ ...emptyForm });
  const [manifests, setManifests]           = useState([]);
  const [docketFound, setDocketFound]       = useState(false);
  const [mapRow, setMapRow]                 = useState(null);
  const [deliveryNote, setDeliveryNote]     = useState(null);
  const [currentStatus, setCurrentStatus]   = useState(null);
  const [ewbValid, setEwbValid]             = useState("");

  const manifestColumns = makeManifestColumns(setMapRow);
  const searchInputRef  = useRef(null);

  const handleSearch = async () => {
    const docketNo = searchDocketNo.trim();
    if (!docketNo) { showError("Please enter a Docket Number"); return; }
    try {
      showLoading();
      const docketData = await getDocketByRecId(null, docketNo);
      if (docketData?.docket_no) {
        setForm({
          docket_no:    docketData.docket_no || "",
          docket_date:  docketData.docket_date ? docketData.docket_date.substring(0, 10) : "",
          from_loc:     docketData.docket_loc || "",
          from_town:    docketData.docket_pickup_town || docketData.from_town || "",
          to_loc:       docketData.docket_to_loc || docketData.to_loc || "",
          to_town:      docketData.docket_dly_town || docketData.to_town || "",
          consignor:    docketData.cnor_name || "",
          consignee:    docketData.cnee_name || "",
          total_pkgs:   docketData.docket_tot_pkgs ?? docketData.total_pkgs ?? "",
          actual_wt:    docketData.docket_act_wt ?? docketData.actual_wt ?? "",
          charged_wt:   docketData.docket_chrg_wt || "",
          eway_bill_no: docketData.eway_bill_no || docketData.ewb_no || "",
          remarks:      docketData.docket_remark || "",
        });
        // E-Way Bill expiry (used when docket is In Transit)
        setEwbValid(docketData.ewb_valid || "");
        setDocketFound(true);

        // Delivery note (for current status + POD) & manifests — fetch in parallel
        const [noteData, manifestData] = await Promise.all([
          fetchDeliveryNoteByDocketNo(docketNo).catch(() => null),
          fetchManifestsByDocketNo(docketNo),
        ]);
        const manifestList = Array.isArray(manifestData) ? manifestData : [];
        setDeliveryNote(noteData || null);
        setManifests(manifestList);
        setCurrentStatus(computeCurrentStatus(noteData, manifestList));
        showInfo(`Docket #${docketNo} loaded successfully`);
      } else {
        handleClear();
        showError(`Docket #${docketNo} not found`);
      }
    } catch (err) {
      handleClear();
      showError(err.message || "Failed to fetch docket details");
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    setSearchDocketNo("");
    setForm({ ...emptyForm });
    setManifests([]);
    setDocketFound(false);
    setDeliveryNote(null);
    setCurrentStatus(null);
    setEwbValid("");
    searchInputRef.current?.focus();
  };

  return (
    <>
      {/* Toolbar */}
      <div className="pageToolbar" style={{ alignItems: "center" }}>
        <Tooltip title="Search Docket">
          <IconButton onClick={handleSearch} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
            <SearchIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton onClick={handleClear} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
            <ResetIcon />
          </IconButton>
        </Tooltip>
        <TextField
          inputRef={searchInputRef}
          size="small"
          value={searchDocketNo}
          onChange={(e) => setSearchDocketNo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter Docket Number & press Enter"
          autoFocus
          sx={{
            marginLeft: 1.5, flex: 1, maxWidth: 400,
            "& .MuiInputBase-input": { fontSize: 13 },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#7e22ce", borderWidth: 2 },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#7e22ce" },
            "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#7e22ce" },
          }}
        />
        <span style={{
          marginLeft: "auto", fontSize: 13, fontWeight: 600,
          color: docketFound ? "#16a34a" : "#ca8a04",
          background: docketFound ? "#dcfce7" : "#fef9c3",
          padding: "4px 12px", borderRadius: 12,
        }}>
          {docketFound ? "DOCKET FOUND" : "SEARCH"}
        </span>
        {/* Current Status — menu (toolbar) wala */}
        {docketFound && currentStatus && <StatusChip status={currentStatus} />}
      </div>

      {/* Current Status — bahar wala (outside the form) */}
      {docketFound && currentStatus && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "10px 16px", borderRadius: 12, marginBottom: 12,
          background: "#faf5ff", border: "1px solid #e9d5ff",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#6b21a8", letterSpacing: 0.5 }}>
            CURRENT STATUS:
          </span>
          <StatusChip status={currentStatus} size="lg" />
          {currentStatus === "Delivered" && deliveryNote?.delivery_date && (
            <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
              Delivered on {deliveryNote.delivery_date.substring(0, 10)}
              {deliveryNote.received_by ? ` • Received by: ${deliveryNote.received_by}` : ""}
            </span>
          )}
          {currentStatus === "In Transit" && ewbValid && (
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#b45309",
              background: "#fef3c7", border: "1px solid #fde68a",
              padding: "4px 12px", borderRadius: 12,
            }}>
              ⏳ E-Way Bill Valid Upto: {String(ewbValid).substring(0, 10)}
            </span>
          )}
        </div>
      )}

      {/* Docket Details Form */}
      {showForm && (
        <FormPanel columns={4}>
          {docketFields.map((field) =>
            field.name === "remarks" ? (
              <div key={field.name} style={{ gridColumn: "1 / -1" }}>
                <FormField {...field} form={form} setForm={setForm} disabled />
              </div>
            ) : (
              <div key={field.name} style={field.span > 1 ? { gridColumn: `span ${field.span}` } : undefined}>
                <FormField {...field} form={form} setForm={setForm} disabled />
              </div>
            )
          )}
        </FormPanel>
      )}

      {/* POD image — only when Delivered */}
      {docketFound && currentStatus === "Delivered" && (
        <PodViewer podUrl={deliveryNote?.pod_url} />
      )}

      {/* Manifests Grid */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <h3>Associated Manifests</h3>
        {manifests.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "#7e22ce", background: "#f3e8ff", padding: "4px 12px", borderRadius: 12 }}>
            Total: {manifests.length} manifest(s)
          </span>
        )}
      </div>
      <DataTable
        columns={manifestColumns}
        rows={manifests}
        getKey={(row, i) => row.mnf_no + (row.mnf_loc || "") + i}
        actions={[]}
      />

      {mapRow && (
        <RouteMap
          fromCity={mapRow.mnf_from_town || mapRow.mnf_loc}
          toCity={mapRow.mnf_to_town || mapRow.mnf_to_loc}
          title={`In Transit — ${mapRow.mnf_from_town || mapRow.mnf_loc} → ${mapRow.mnf_to_town || mapRow.mnf_to_loc}`}
          subtitle={mapRow.desp_veh_no ? `Vehicle: ${mapRow.desp_veh_no}` : undefined}
          onClose={() => setMapRow(null)}
        />
      )}

      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      <LoadingOverlay isLoading={isLoading} message="Fetching data..." />
    </>
  );
}
