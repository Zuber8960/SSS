import { useState, useMemo, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";

import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchDocketByDocketNo } from "../../utils/docket";


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


export default function ManifestPage() {
  const { dialog, closeAlert, showSuccess, showError } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [form, setForm] = useState({
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
  });

  // ✅ detail rows (docket list)
  const [details, setDetails] = useState([]);
  // ✅ Cache fetched docket data to avoid repeated API calls
  const [docketCache, setDocketCache] = useState({});

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

  // ✅ Sync computed totals into form header fields
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      total_wt: computedTotals.total_wt,
      total_pkgs: computedTotals.total_pkgs,
    }));
  }, [computedTotals]);


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


  // ✅ Delete Row
  const deleteRow = (row) => {
    setDetails((prev) => prev.filter((r) => r !== row));
  };


  // ✅ Update Row (sync) — just sets the field that was edited
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


  // ✅ Cell change handler — sync update + trigger async fetch if docket_no changed
  const handleCellChange = (rowIndex, key, value) => {
    updateRow(rowIndex, key, value);
    if (key === "docket_no") {
      fetchAndFillDocket(rowIndex, value);
    }
  };


  // ✅ Save
  const handleSave = () => {
    const payload = {
      header: form,
      details: details,
    };

    console.log("MANIFEST DATA:", payload);

    showSuccess("Manifest saved successfully");
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



        {/* ✅ Header Form */}
        <FormPanel>
          {manifestFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
            />
          ))}
        </FormPanel>

        <div style={sectionHeaderStyle}>
          {/* ✅ Detail Grid */}
          <h3>Docket Details</h3>
          {/* ✅ Toolbar */}
          <PageToolbar
            actions={[
              { label: "Add Row", onClick: addRow },
              { label: "Save", onClick: handleSave },
            ]}
          />
        </div>
        <DataTable
          columns={detailColumns}
          rows={details}
          getKey={(row, index) => index}
          actions={[
            {
              label: "Delete",
              onClick: deleteRow,
            },
          ]}
          editable
          onCellChange={handleCellChange}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Fetching docket data..." />
      </PageBody>
    </MainLayout>
  );
}