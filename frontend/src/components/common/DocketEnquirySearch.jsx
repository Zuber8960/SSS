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
import { SearchIcon, ResetIcon } from "./icons";
import { IconButton, TextField, Tooltip } from "@mui/material";
import RouteMap from "./RouteMap";

const docketFields = [
  { label: "Docket No",       name: "docket_no" },
  { label: "Docket Date",     name: "docket_date",  type: "date" },
  { label: "From Location",   name: "from_loc" },
  { label: "From Town",       name: "from_town" },
  { label: "To Location",     name: "to_loc" },
  { label: "To Town",         name: "to_town" },
  { label: "Consignor",       name: "consignor" },
  { label: "Consignee",       name: "consignee" },
  { label: "Total Packages",  name: "total_pkgs",   type: "number" },
  { label: "Actual Weight",   name: "actual_wt",    type: "number" },
  { label: "Charged Weight",  name: "charged_wt",   type: "number" },
  { label: "E-Way Bill No",   name: "eway_bill_no" },
];

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

const emptyForm = {
  docket_no: "", docket_date: "", from_loc: "", from_town: "",
  to_loc: "", to_town: "", consignor: "", consignee: "",
  total_pkgs: "", actual_wt: "", charged_wt: "", eway_bill_no: "", remarks: "",
};

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
          from_town:    docketData.docket_dly_town || "",
          to_loc:       docketData.docket_to_loc || docketData.to_loc || "",
          to_town:      docketData.docket_pickup_town || "",
          consignor:    docketData.cnor_name || "",
          consignee:    docketData.cnee_name || "",
          total_pkgs:   docketData.docket_tot_pkgs ?? docketData.total_pkgs ?? "",
          actual_wt:    docketData.docket_act_wt ?? docketData.actual_wt ?? "",
          charged_wt:   docketData.docket_chrg_wt || "",
          eway_bill_no: docketData.eway_bill_no || docketData.ewb_no || "",
          remarks:      docketData.docket_remark || "",
        });
        setDocketFound(true);
        const manifestData = await fetchManifestsByDocketNo(docketNo);
        setManifests(Array.isArray(manifestData) ? manifestData : []);
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
      </div>

      {/* Docket Details Form — hidden in read-only / dev mode */}
      {showForm && (
        <FormPanel>
          {docketFields.map((field) =>
            field.name === "remarks" ? (
              <div key={field.name} style={{ gridColumn: "1 / -1" }}>
                <FormField {...field} form={form} setForm={setForm} disabled />
              </div>
            ) : (
              <FormField key={field.name} {...field} form={form} setForm={setForm} disabled />
            )
          )}
        </FormPanel>
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
