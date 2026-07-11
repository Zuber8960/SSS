import { useState, useMemo, useRef } from "react";
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
import { fetchDocketByDocketNo } from "../../utils/docket";
import { AddIcon, DeleteIcon, EditIcon, SaveIcon, NoteAddIcon, ResetIcon } from "../../components/common/icons";
import { IconButton, Tooltip } from "@mui/material";
import {
  createManifest,
  fetchManifestByNo,
  updateManifest,
} from "../../utils/manifest";

// ✅ Header Fields
const manifestFields = [
  { label: "Manifest No", name: "manifest_no" },
  { label: "Manifest Date", name: "manifest_date", type: "date" },
  { label: "From Location", name: "from_loc" },
  { label: "To Location", name: "to_loc" },

  { label: "Vehicle No", name: "vehicle_no" },
  { label: "Driver Name", name: "driver_name" },

  { label: "Total Weight", name: "total_wt", type: "number", disabled: true },
  { label: "Total Packages", name: "total_pkgs", type: "number", disabled: true },

  { label: "Remarks", name: "remarks", type: "textarea" },
];

// ✅ Detail Table Columns (Dockets inside Manifest)
const detailColumns = [
  { key: "docket_no", label: "Docket No" },
  { key: "from_loc", label: "From" },
  { key: "to_loc", label: "To" },
  { key: "packages", label: "Packages" },
  { key: "weight", label: "Weight" },
];

const emptyForm = {
  manifest_no: "",
  manifest_date: "",
  from_loc: "",
  to_loc: "",
  vehicle_no: "",
  driver_name: "",
  consignor: "",
  consignee: "",
  total_wt: "",
  total_pkgs: "",
  remarks: "",
};

export default function ManifestPage() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [form, setForm] = useState({ ...emptyForm });
  const [details, setDetails] = useState([]);
  const [docketCache, setDocketCache] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);

  // Mode: "create" | "edit"
  const [mode, setMode] = useState("create");
  // When true, manifest_no field becomes enabled for typing search number
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Store original composite key for updates
  const originalKey = useRef(null);

  // ✅ Compute totals from detail rows
  const computedTotals = useMemo(() => {
    let totalWt = 0;
    let totalPkgs = 0;
    details.forEach((row) => {
      totalWt += parseFloat(row.weight) || 0;
      totalPkgs += parseFloat(row.packages) || 0;
    });
    return { total_wt: totalWt, total_pkgs: totalPkgs };
  }, [details]);


  // ✅ Add Row
  const addRow = () => {
    setDetails([
      ...details,
      {
        docket_no: "",
        from_loc: "",
        to_loc: "",
        packages: "",
        weight: "",
      },
    ]);
  };

  // ✅ Delete selected rows
  const deleteSelectedRows = () => {
    const ids = Array.from(selectedRows);
    if (!ids.length) {
      showError("Please select at least one row to delete");
      return;
    }
    showWarning(
      "Delete Rows",
      `Are you sure you want to delete ${ids.length} selected row(s)?`,
      () => {
        setDetails((prev) => prev.filter((_, idx) => !ids.includes(idx)));
        setSelectedRows([]);
      }
    );
  };

  // ✅ Update Row
  const updateRow = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);
  };

  // ✅ When docket_no changes, fetch details from API and auto-fill the row
  const fetchAndFillDocket = async (index, docketNo) => {
    if (!docketNo) return;
    try {
      showLoading();
      let docketData = docketCache[docketNo];
      if (!docketData) {
        docketData = await fetchDocketByDocketNo(docketNo);
        if (docketData) {
          setDocketCache((prev) => ({ ...prev, [docketNo]: docketData }));
        }
      }
      if (docketData) {
        setDetails((prev) => {
          const upd = [...prev];
          if (upd[index]) {
            upd[index] = {
              ...upd[index],
              from_loc: docketData.docket_loc || "",
              to_loc: docketData.docket_to_loc || "",
              packages: docketData.docket_tot_pkgs ?? "",
              weight: docketData.docket_act_wt ?? "",
              docket_date: docketData.docket_date ? docketData.docket_date.substring(0, 10) : "",
            };
          }
          return upd;
        });
      }
    } catch (err) {
      showError(err.message || "Failed to fetch docket details");
      console.error("Fetch docket error:", err);
    } finally {
      hideLoading();
    }
  };

  // ✅ Cell change handler
  const handleCellChange = (rowIndex, key, value) => {
    updateRow(rowIndex, key, value);
    if (key === "docket_no") {
      fetchAndFillDocket(rowIndex, value);
    }
  };

  // ✅ Map form fields to DB header columns
  const mapFormToHeader = () => ({
    mnf_loc: form.from_loc,
    mnf_date: form.manifest_date || null,
    mnf_to_loc: form.to_loc,
    desp_veh_no: form.vehicle_no,
    loaded_by: form.driver_name,
    mnf_actual_wt: computedTotals.total_wt,
    mnf_no_of_dwb: computedTotals.total_pkgs,
    aud_user: form.remarks || "",
    aud_loc: form.from_loc || "",
  });

  // ✅ Map detail rows to DB detail columns (skip rows with missing required fields)
  const mapDetailsToDb = () =>
    details
      .filter((row) => row.docket_no && row.docket_no.trim() !== "")
      .map((row) => ({
        dwb_no: row.docket_no,
        dwb_date: row.docket_date || null,
        dwb_loc: row.from_loc,
        dwb_to_loc: row.to_loc,
        dwb_pkgs: parseFloat(row.packages) || 0,
        dwb_actual_wt: parseFloat(row.weight) || 0,
        dwb_charged_wt: parseFloat(row.weight) || 0,
        mnf_pkgs: parseFloat(computedTotals.total_pkgs) || 0,
      }));

  // ✅ Map DB header to form fields
  const mapHeaderToForm = (hdr) => ({
    manifest_no: hdr.mnf_no || "",
    manifest_date: hdr.mnf_date ? hdr.mnf_date.substring(0, 10) : "",
    from_loc: hdr.mnf_loc || "",
    to_loc: hdr.mnf_to_loc || "",
    vehicle_no: hdr.desp_veh_no || "",
    driver_name: hdr.loaded_by || "",
    total_wt: hdr.mnf_actual_wt ?? "",
    total_pkgs: hdr.mnf_no_of_dwb ?? "",
    remarks: hdr.aud_user || "",
  });

  // ✅ Map DB detail to form detail rows
  const mapDetailToForm = (dtl) => ({
    docket_no: dtl.dwb_no || "",
    docket_date: dtl.dwb_date ? dtl.dwb_date.substring(0, 10) : "",
    from_loc: dtl.dwb_loc || "",
    to_loc: dtl.dwb_to_loc || "",
    packages: dtl.dwb_pkgs ?? "",
    weight: dtl.dwb_actual_wt ?? "",
  });

  // ✅ Fetch manifest data from DB and populate form
  const fetchAndLoadManifest = async (mnfNo) => {
    try {
      showLoading();
      const data = await fetchManifestByNo(mnfNo);

      if (!data || !data.header) {
        showError("Manifest not found");
        return false;
      }

      const hdr = data.header;
      const dtls = data.details || [];

      setForm(mapHeaderToForm(hdr));
      setDetails(dtls.map(mapDetailToForm));

      originalKey.current = {
        mnf_no: hdr.mnf_no,
        mnf_loc: hdr.mnf_loc,
        mnf_date: hdr.mnf_date,
      };

      setMode("edit");
      // setIsSearchActive(false);
      showInfo("Manifest loaded successfully");
      return true;
    } catch (err) {
      handleClear();
      showError(err.message || "Failed to fetch manifest");
      console.error("Fetch manifest error:", err);
      return false;
    } finally {
      hideLoading();
    }
  };

  // ==================== BUTTON HANDLERS ====================

  // ✅ Create New — clear form
  const handleCreateNew = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    originalKey.current = null;
    setMode("create");
    setIsSearchActive(false);
    showInfo("New manifest form ready");
  };

  // ✅ Edit/View — first click enables the field, second click (after typing) fetches data
  const handleEditView = async () => {
    const mnfNo = form.manifest_no.trim();

    if (!mnfNo && !isSearchActive) {
      // First click: enable the manifest_no field so user can type
      setIsSearchActive(true);
      showInfo("Type the Manifest No in the field and click Enter/Tab");
      return;
    }

    if (!mnfNo && isSearchActive) {
      showError("Please type a Manifest No first");
      return;
    }

    // Fetch data from DB
    await fetchAndLoadManifest(mnfNo);
  };

  // ✅ Clear — reset form and details
  const handleClear = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    originalKey.current = null;
    setMode("create");
    setIsSearchActive(false);
    showInfo("Form cleared");
  };

  // ✅ Save — create or update based on mode
  const handleSave = async () => {
    if (!form.from_loc) {
      showError("From Location is required");
      return;
    }
    if (!form.manifest_date) {
      showError("Manifest Date is required");
      return;
    }
    if (!details.length) {
      showError("Please add docket to save the manifest");
      return;
    }

    try {
      showLoading();

      const header = mapFormToHeader();
      const detailRows = mapDetailsToDb();

      if (mode === "create") {
        const response = await createManifest(header, detailRows);
        if (response.success) {
          const newMnfNo = response.data?.mnf_no;
          showSuccess(`Manifest #${newMnfNo} saved successfully`);

          setForm((prev) => ({ ...prev, manifest_no: newMnfNo }));
          originalKey.current = {
            mnf_no: newMnfNo,
            mnf_loc: header.mnf_loc,
            mnf_date: header.mnf_date,
          };
          setMode("edit");
        } else {
          showError(response.message || "Failed to save manifest");
        }
      } else if (mode === "edit") {
        if (!originalKey.current) {
          showError("No manifest key found for update");
          return;
        }
        const { mnf_no, mnf_loc, mnf_date } = originalKey.current;
        const response = await updateManifest(
          mnf_no,
          mnf_loc,
          mnf_date,
          header,
          detailRows
        );
        if (response.success) {
          showSuccess("Manifest updated successfully");
        } else {
          showError(response.message || "Failed to update manifest");
        }
      }
    } catch (err) {
      showError(err.message || "Failed to save manifest");
      console.error("Save manifest error:", err);
    } finally {
      hideLoading();
    }
  };

  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };


  return (
    <MainLayout>
      <PageBody title="Manifest Entry">
        {/* ✅ Top Toolbar */}
        <div
          style={{
            ...sectionHeaderStyle,
            marginBottom: 16,
            padding: "12px 16px",
            background: "#f6f3ff",
            borderRadius: 8,
            border: "1px solid #e9e5f0",
          }}
        >
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Tooltip title="Create New">
              <IconButton onClick={handleCreateNew} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
                <NoteAddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit / View">
              <IconButton onClick={handleEditView} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton onClick={handleClear} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
                <ResetIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save">
              <IconButton onClick={handleSave} size="small" sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
          </div>

          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: mode === "create" ? "#16a34a" : "#ca8a04",
              background: mode === "create" ? "#dcfce7" : "#fef9c3",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {isSearchActive
              ? "Type Manifest No & press Enter"
              : mode === "create"
                ? "CREATE"
                : "EDIT"}
          </span>
        </div>

        {/* ✅ Header Form */}
        <FormPanel>
          {manifestFields.map((field) => {
            // Special: when search is active, render manifest_no as plain input with Enter/Blur handlers
            if (field.name === "manifest_no" && isSearchActive) {
              return (
                <div key={field.name} className="formFieldGroup">
                  <label>Manifest No</label>
                  <input
                    type="text"
                    value={form.manifest_no}
                    onChange={(e) => setForm({ ...form, manifest_no: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const mnfNo = form.manifest_no.trim();
                        if (mnfNo) fetchAndLoadManifest(mnfNo);
                      }
                    }}
                    onBlur={() => {
                      const mnfNo = form.manifest_no.trim();
                      if (mnfNo && isSearchActive) fetchAndLoadManifest(mnfNo);
                    }}
                    placeholder="Enter Manifest No"
                    autoFocus
                  />
                </div>
              );
            }
            const displayForm = {
              ...form,
              total_wt: computedTotals.total_wt,
              total_pkgs: computedTotals.total_pkgs,
            };
            return (
              <FormField
                key={field.name}
                {...field}
                form={displayForm}
                setForm={setForm}
                disabled={
                  field.name === "manifest_no" && mode === "create" && !isSearchActive
                }
              />
            );
          })}
        </FormPanel>

        <div style={sectionHeaderStyle}>
          <h3>Docket Details</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tooltip title="Add Row">
              <IconButton
                onClick={addRow}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete selected">
              <IconButton
                onClick={deleteSelectedRows}
                size="small"
                sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
        <DataTable
          columns={detailColumns}
          rows={details}
          getKey={(row, index) => index}
          actions={[]}
          editable
          singleClick
          checkboxSelection
          onCellChange={handleCellChange}
          onRowSelectionModelChange={(model) => {
            // MUI v7: { type: 'include', ids: Set } or { type: 'exclude', ids: Set }
            // 'exclude' with empty ids means "all rows selected"
            if (model?.type === 'exclude') {
              const allIds = new Set(details.map((_, idx) => idx).filter(idx => !model.ids.has(idx)));
              setSelectedRows(allIds);
            } else {
              const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
              setSelectedRows(ids);
            }
          }}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}