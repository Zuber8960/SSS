import { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { FormField, PageBody, DataTable } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, PrintIcon, AddIcon, DeleteIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchCharges, fetchChargeMaster, fetchDocketByDocketNo } from "../../utils/docket";
import { fetchDeliveryNotes } from "../../utils/deliveryNote";
import { fetchAllLocations } from "../../utils/locationMaster";
import { saveInvoice, updateInvoice, deleteInvoice } from "../../utils/customerBill";
import { Button, Chip, IconButton, Tooltip } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import moment from "moment";

const billingColumns = [
  { key: "docket_no", label: "Docket", minWidth: 110 },
  { key: "docket_date", label: "Date", minWidth: 110 },
  { key: "origin", label: "Origin", minWidth: 90 },
  { key: "destination", label: "Destination", minWidth: 110 },
  { key: "consignee", label: "Consignee", minWidth: 120 },
  { key: "booking_branch", label: "Booking Branch", minWidth: 120 },
  { key: "delivery_branch", label: "Delivery Branch", minWidth: 130 },
  { key: "pay_type", label: "Payment", minWidth: 100 },
  { key: "packages", label: "Packages", minWidth: 80 },
  { key: "actual_wt", label: "Actual Wt", minWidth: 90 },
  { key: "charge_wt", label: "Charge Wt", minWidth: 90 },
  { key: "freight", label: "Freight", minWidth: 100 },
  { key: "loading", label: "Loading", minWidth: 90 },
  { key: "unloading", label: "Unloading", minWidth: 100 },
  { key: "detention", label: "Detention", minWidth: 95 },
  { key: "add_toll", label: "Add Toll", minWidth: 95 },
  { key: "other_charges", label: "Other Charges", minWidth: 120 },
  { key: "discount", label: "Discount", minWidth: 90 },
  { key: "taxable", label: "Taxable", minWidth: 100 },
  { key: "cgst", label: "CGST", minWidth: 90 },
  { key: "sgst", label: "SGST", minWidth: 90 },
  { key: "igst", label: "IGST", minWidth: 90 },
  { key: "amount", label: "Amount", minWidth: 110 },
  {
    key: "pod",
    label: "POD",
    minWidth: 90,
    render: (row) => (
      <span style={{ ...statusBadgeStyle, ...(row.pod === "YES" ? yesBadge : noBadge), minWidth: "58px", height: "22px" }}>
        {row.pod}
      </span>
    ),
  },
  {
    key: "delivery_status",
    label: "Delivery",
    minWidth: 110,
    render: (row) => (
      <span
        style={{
          ...statusBadgeStyle,
          ...(row.delivery_status === "Delivered" ? deliveredBadge : pendingBadge),
        }}
      >
        {row.delivery_status}
      </span>
    ),
  },
];

const invoiceFields = [
  { label: "Customer", name: "customer", type: "select", options: ["Select Customer"] },
  { label: "Invoice No", name: "invoice_no", disabled: true },
  { label: "Invoice Date", name: "invoice_date", type: "date" },
  { label: "Billing Branch", name: "billing_branch", type: "select", options: ["Select Branch"], required: true },
  { label: "Billing Type", name: "billing_type", type: "select", options: [" Regular", "Complimentory"] },
];

const emptyForm = {
  customer: "Select Customer",
  invoice_no: "AUTO",
  invoice_date: "",
  billing_branch: "Select Branch",
  billing_type: "Regular",
  invoice_remarks: "",
};

const CHARGE_MAP = [
  { key: "freight", keywords: ["FRT", "FREIGHT", "DK01"] },
  { key: "loading", keywords: ["LOAD", "LOADING"] },
  { key: "unloading", keywords: ["UNLOAD", "UNLOADING", "ULD"] },
  { key: "detention", keywords: ["DET", "DETENTION"] },
  { key: "add_toll", keywords: ["TOLL"] },
  { key: "other_charges", keywords: ["OTH", "OTHER"] },
  { key: "discount", keywords: ["DISC", "DISCOUNT"] },
];

const toDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format("DD-MM-YYYY") : val;
};

export default function CustomerBill() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [form, setForm] = useState({ ...emptyForm });
  const [partners, setPartners] = useState([]);
  const [billingRows, setBillingRows] = useState([]);
  const [chargeMaster, setChargeMaster] = useState([]);
  const [deliveryNotesMap, setDeliveryNotesMap] = useState({});
  const [locations, setLocations] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null); // { invoice_no, invoice_date, loc_code }

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAllBusinessPartners();
        setPartners(data);
      } catch (error) {
        showError(error.message || "Failed to load business partners");
        console.error("Load business partners error:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllLocations()
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load locations:", err));
  }, []);

  useEffect(() => {
    fetchChargeMaster()
      .then((master) => setChargeMaster(Array.isArray(master) ? master : []))
      .catch((err) => console.error("Failed to load charge master:", err));
  }, []);

  useEffect(() => {
    fetchDeliveryNotes()
      .then((notes) => {
        const map = {};
        (Array.isArray(notes) ? notes : []).forEach((n) => {
          if (n.docket_no) map[n.docket_no] = n;
        });
        setDeliveryNotesMap(map);
      })
      .catch((err) => console.error("Failed to load delivery notes:", err));
  }, []);

  const customerOptions = ["Select Customer", ...partners.map((p) => p.bp_name).filter(Boolean)];
  const branchOptions = [
    "Select Branch",
    ...locations.map((loc) => `${loc.loc_code} - ${loc.loc_name}`).filter(Boolean),
  ];
  const handleSetForm = (updatedForm) => setForm(updatedForm);

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null") || {};
    } catch {
      return {};
    }
  };

  const mapChargeToColumn = (chargeCode, chargeDesc) => {
    const upperCode = (chargeCode || "").toUpperCase();
    const upperDesc = ((chargeDesc || "") + " " + upperCode).toUpperCase();
    for (const m of CHARGE_MAP) {
      if (m.keywords.some((k) => upperDesc.includes(k.toUpperCase()))) return m.key;
    }
    return null;
  };

  const getDeliveryStatus = (docket) => {
    const note = deliveryNotesMap[docket.docket_no];
    return note?.delivery_status || docket.delivery_status || "Pending";
  };

  const getPodStatus = (docket) => {
    const note = deliveryNotesMap[docket.docket_no];
    return note?.pod_url ? "Received" : "Pending";
  };

  // Build a full billing row from a docket + its charges
  const buildBillingRow = (docket, charges = []) => {
    const chargeAmounts = {
      freight: 0,
      loading: 0,
      unloading: 0,
      detention: 0,
      add_toll: 0,
      other_charges: 0,
      discount: 0,
    };

    (Array.isArray(charges) ? charges : []).forEach((c) => {
      const master = chargeMaster.find((m) => m.charge_code === c.charge_code);
      const desc = master?.charge_desc || c.charge_desc || c.charge_code;
      const colKey = mapChargeToColumn(c.charge_code, desc);
      if (colKey && colKey in chargeAmounts) {
        chargeAmounts[colKey] = parseFloat(c.charge_amt) || 0;
      } else if (colKey === null) {
        chargeAmounts.other_charges += parseFloat(c.charge_amt) || 0;
      }
    });

    if (chargeAmounts.freight === 0) {
      const rate = parseFloat(docket.docket_rate || docket.rate) || 0;
      const chrgWt = parseFloat(docket.docket_chrg_wt || docket.chrg_wt) || 0;
      if (rate > 0) {
        const uom = (docket.docket_rate_uom || docket.rate_uom || "").toLowerCase();
        chargeAmounts.freight = uom.includes("kg") ? rate * chrgWt : rate;
      }
    }

    const taxable =
      chargeAmounts.freight +
      chargeAmounts.loading +
      chargeAmounts.unloading +
      chargeAmounts.detention +
      chargeAmounts.add_toll +
      chargeAmounts.other_charges -
      chargeAmounts.discount;
    const taxableRounded = Math.round(taxable * 100) / 100;

    const fromLoc = (docket.docket_loc || "").toLowerCase();
    const toLoc = (docket.docket_to_loc || "").toLowerCase();
    const interState = fromLoc !== toLoc;

    const gstRate = 0.18;
    const gstAmount = Math.round(taxableRounded * gstRate * 100) / 100;
    const cgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const sgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const igst = interState ? gstAmount : 0;
    const totalAmount = Math.round((taxableRounded + gstAmount) * 100) / 100;

    const deliveryStatus = getDeliveryStatus(docket);
    const pod = getPodStatus(docket);

    return {
      id: docket.docket_no + "_" + docket.docket_date,
      docket_no: docket.docket_no || "",
      docket_date: toDate(docket.docket_date),
      origin: docket.docket_loc || "",
      destination: docket.docket_to_loc || docket.docket_dly_town || "",
      consignee: docket.cnee_name || "",
      booking_branch: docket.docket_loc || "",
      delivery_branch: docket.docket_to_loc || "",
      pay_type: docket.docket_pay_type || docket.pay_type || "",
      packages: docket.docket_tot_pkgs ?? docket.total_pkgs ?? "",
      actual_wt: docket.docket_act_wt ?? docket.actual_wt ?? "",
      charge_wt: docket.docket_chrg_wt ?? docket.chrg_wt ?? "",
      freight: chargeAmounts.freight.toFixed(2),
      loading: chargeAmounts.loading.toFixed(2),
      unloading: chargeAmounts.unloading.toFixed(2),
      detention: chargeAmounts.detention.toFixed(2),
      add_toll: chargeAmounts.add_toll.toFixed(2),
      other_charges: chargeAmounts.other_charges.toFixed(2),
      discount: chargeAmounts.discount.toFixed(2),
      taxable: taxableRounded.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      amount: totalAmount.toFixed(2),
      pod: pod === "Received" ? "YES" : "NO",
      delivery_status: deliveryStatus,
    };
  };

  // Add a new empty row so the user can enter a docket number
  const handleAddRow = () => {
    const id = "new_" + Date.now() + "_" + billingRows.length;
    const emptyRow = {
      id,
      docket_no: "",
      docket_date: "",
      origin: "",
      destination: "",
      consignee: "",
      booking_branch: "",
      delivery_branch: "",
      pay_type: "",
      packages: "",
      actual_wt: "",
      charge_wt: "",
      freight: "",
      loading: "",
      unloading: "",
      detention: "",
      add_toll: "",
      other_charges: "",
      discount: "",
      taxable: "",
      cgst: "",
      sgst: "",
      igst: "",
      amount: "",
      pod: "",
      delivery_status: "",
    };
    setBillingRows((prev) => [...prev, emptyRow]);
  };

  // When a docket number is entered in a row, fetch all docket data and populate the row
  const handleRowUpdate = async (newRow, oldRow) => {
    if (newRow.docket_no && newRow.docket_no !== oldRow.docket_no) {
      // Billing branch is mandatory - must be selected before entering a docket number
      const selectedBranch = form.billing_branch || "";
      if (!selectedBranch || selectedBranch === "Select Branch") {
        showError("Please select a billing branch before entering a docket number");
        return { ...newRow, docket_no: oldRow.docket_no };
      }

      try {
        showLoading();
        const docket = await fetchDocketByDocketNo(newRow.docket_no);
        const docketObj = Array.isArray(docket) ? docket[0] : docket;
        if (!docketObj) {
          showError("Docket " + newRow.docket_no + " not found");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        // Validate that the docket's branch matches the selected billing branch
        const selectedLocCode = selectedBranch.split(" - ")[0].trim();
        const docketLoc = (docketObj.docket_loc || "").trim();
        if (selectedLocCode && docketLoc && selectedLocCode !== docketLoc) {
          showError("Docket " + newRow.docket_no + " does not belong to billing branch " + selectedBranch);
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        const charges = await fetchCharges(docketObj.docket_no || newRow.docket_no);
        const builtRow = buildBillingRow(docketObj, Array.isArray(charges) ? charges : []);
        showSuccess("Docket " + newRow.docket_no + " loaded");

        // Update the billingRows state so the populated row persists in the grid
        setBillingRows((prev) =>
          prev.map((row) => (row.id === newRow.id ? { ...builtRow, id: newRow.id } : row))
        );

        return { ...builtRow, id: newRow.id };
      } catch (err) {
        showError(err.message || "Failed to fetch docket " + newRow.docket_no);
        console.error("Load docket error:", err);
        return { ...newRow, docket_no: oldRow.docket_no };
      } finally {
        hideLoading();
      }
    }
    return newRow;
  };

  // Only the Docket column should be editable
  const tableColumns = billingColumns.map((col) => ({
    ...col,
    editable: col.key === "docket_no",
  }));

  const totals = billingRows.reduce(
    (acc, row) => ({
      freight: acc.freight + (parseFloat(row.freight) || 0),
      loading: acc.loading + (parseFloat(row.loading) || 0),
      unloading: acc.unloading + (parseFloat(row.unloading) || 0),
      detention: acc.detention + (parseFloat(row.detention) || 0),
      add_toll: acc.add_toll + (parseFloat(row.add_toll) || 0),
      other_charges: acc.other_charges + (parseFloat(row.other_charges) || 0),
      discount: acc.discount + (parseFloat(row.discount) || 0),
      taxable: acc.taxable + (parseFloat(row.taxable) || 0),
      cgst: acc.cgst + (parseFloat(row.cgst) || 0),
      sgst: acc.sgst + (parseFloat(row.sgst) || 0),
      igst: acc.igst + (parseFloat(row.igst) || 0),
      amount: acc.amount + (parseFloat(row.amount) || 0),
    }),
    { freight: 0, loading: 0, unloading: 0, detention: 0, add_toll: 0, other_charges: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 }
  );

  const handleDeleteRow = () => {
    if (!selectedRowId) {
      showError("Please select a row to delete");
      return;
    }
    setBillingRows((prev) => prev.filter((row) => row.id !== selectedRowId));
    setSelectedRowId(null);
    showSuccess("Row deleted");
  };

  const handleDeleteInvoice = async () => {
    if (!editingInvoice) {
      showError("No saved invoice to delete. Save the invoice first.");
      return;
    }
    try {
      showLoading();
      await deleteInvoice(editingInvoice.invoice_no, editingInvoice.invoice_date, editingInvoice.loc_code);
      showSuccess("Invoice deleted successfully");
      setForm({ ...emptyForm });
      setBillingRows([]);
      setSelectedRowId(null);
      setEditingInvoice(null);
    } catch (err) {
      showError(err.message || "Failed to delete invoice");
      console.error("Delete invoice error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    setForm({ ...emptyForm });
    setBillingRows([]);
    setSelectedRowId(null);
    setEditingInvoice(null);
  };

  const buildInvoicePayload = () => {
    const currentUser = getCurrentUser();
    const selectedBranch = form.billing_branch || "";
    const selectedLocCode = selectedBranch.split(" - ")[0].trim();
    const customer = partners.find((p) => p.bp_name === form.customer);
    const totalAmt = billingRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const header = {
      division_code: currentUser?.division_code ?? null,
      loc_code: selectedLocCode || null,
      bp_code: customer?.bp_code ?? 0,
      bp_name: form.customer === "Select Customer" ? null : form.customer || null,
      invoice_type: form.billing_type === "Complimentory" ? "CM" : "C",
      invoice_no: editingInvoice?.invoice_no ?? null,
      invoice_date: form.invoice_date || null,
      total_inv_amt: Math.round(totalAmt * 100) / 100,
      created_by: currentUser?.user_id ?? null,
      modified_by: currentUser?.user_id ?? null,
    };

    const details = billingRows
      .filter((row) => row.docket_no)
      .map((row, index) => ({
        division_code: currentUser?.division_code ?? null,
        invoice_loc: selectedLocCode || null,
        invoice_date: form.invoice_date || null,
        inv_sr_no: index + 1,
        docket_no: row.docket_no || null,
        docket_from_loc: row.origin || null,
        docket_to_loc: row.destination || null,
        docket_date: row.docket_date ? moment(row.docket_date, "DD-MM-YYYY").format("YYYY-MM-DD") : null,
        docket_chrwt: parseFloat(row.charge_wt) || 0,
        freight: parseFloat(row.freight) || 0,
        loading: parseFloat(row.loading) || 0,
        unloading: parseFloat(row.unloading) || 0,
        detention: parseFloat(row.detention) || 0,
        additional_toll: parseFloat(row.add_toll) || 0,
        other_charges: parseFloat(row.other_charges) || 0,
        taxable_amt: parseFloat(row.taxable) || 0,
        sgst: parseFloat(row.sgst) || 0,
        cgst: parseFloat(row.cgst) || 0,
        igst: parseFloat(row.igst) || 0,
        total_amt: parseFloat(row.amount) || 0,
        delivery_status: row.delivery_status || null,
        pod_flag: row.pod === "YES" ? "Y" : "N",
        created_by: currentUser?.user_id ?? null,
        modified_by: currentUser?.user_id ?? null,
      }));

    return { header, details };
  };

  const handleSave = async () => {
    // Validate billing branch is selected
    const selectedBranch = form.billing_branch || "";
    if (!selectedBranch || selectedBranch === "Select Branch") {
      showError("Please select a billing branch before saving");
      return;
    }
    const selectedLocCode = selectedBranch.split(" - ")[0].trim();

    // Validate customer is selected
    if (!form.customer || form.customer === "Select Customer") {
      showError("Please select a customer before saving");
      return;
    }

    // Validate invoice date
    if (!form.invoice_date) {
      showError("Please select an invoice date before saving");
      return;
    }

    // Validate there is at least one docket row
    if (billingRows.length === 0) {
      showError("Please add at least one docket before saving");
      return;
    }

    // Validate each docket exists in sst_dly_note (delivery notes) and branch matches
    const missingDockets = [];
    const wrongBranchDockets = [];

    billingRows.forEach((row) => {
      if (!row.docket_no) return; // skip empty rows
      const note = deliveryNotesMap[row.docket_no];
      if (!note) {
        missingDockets.push(row.docket_no);
        return;
      }
      const noteBranch = (note.docket_from_loc || note.docket_loc || "").trim();
      if (noteBranch && selectedLocCode && noteBranch !== selectedLocCode) {
        wrongBranchDockets.push(row.docket_no);
      }
    });

    if (missingDockets.length > 0) {
      showError(
        "Cannot save. The following docket(s) are not present in the delivery note table: " +
        missingDockets.join(", ")
      );
      return;
    }

    if (wrongBranchDockets.length > 0) {
      showError(
        "Cannot save. The following docket(s) do not belong to billing branch " +
        selectedBranch + ": " + wrongBranchDockets.join(", ")
      );
      return;
    }

    const payload = buildInvoicePayload();

    // If no docket rows have been filled yet, don't save
    if (payload.details.length === 0) {
      showError("Please enter at least one docket number before saving");
      return;
    }

    try {
      showLoading();
      let result;
      if (editingInvoice) {
        result = await updateInvoice(
          editingInvoice.invoice_no,
          editingInvoice.invoice_date,
          editingInvoice.loc_code,
          payload
        );
        showSuccess("Invoice updated successfully");
      } else {
        result = await saveInvoice(payload);
        showSuccess("Invoice saved successfully");
        if (result?.header) {
          setForm((prev) => ({
            ...prev,
            invoice_no: String(result.header.invoice_no || ""),
          }));
          setEditingInvoice({
            invoice_no: result.header.invoice_no,
            invoice_date: result.header.invoice_date,
            loc_code: result.header.loc_code,
          });
        }
      }
    } catch (err) {
      showError(err.message || "Failed to save invoice");
      console.error("Save invoice error:", err);
    } finally {
      hideLoading();
    }
  };

  return (
    <MainLayout>
      <PageBody title="Customer Invoice Generation">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={saveHeaderButtonStyle}>
            Save
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handleSave} sx={printHeaderButtonStyle}>
            Print
          </Button>
          <Button variant="contained" startIcon={<DeleteIcon />} onClick={handleDeleteInvoice} sx={deleteHeaderButtonStyle}>
            Delete
          </Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={clearHeaderButtonStyle}>
            Clear
          </Button>
        </div>

        <div style={sectionWrap}>
          <div style={sectionTitleStyle}>Invoice Information</div>
          <div style={sectionGridStyle}>
            {invoiceFields.map((field) => (
              <div key={field.name} style={fieldCellStyle}>
                <FormField
                  {...field}
                  options={field.name === "customer" ? customerOptions : field.name === "billing_branch" ? branchOptions : field.options}
                  form={form}
                  setForm={handleSetForm}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ ...tableTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Available Dockets for Billing</span>
            {billingRows.length > 0 && (
              <Chip
                size="small"
                label={billingRows.length + " docket" + (billingRows.length > 1 ? "s" : "")}
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#e8f5e9", color: "#1b5e20" }}
              />
            )}
            <span style={{ flex: 1 }} />
            <Tooltip title="Delete Selected Row">
              <IconButton
                onClick={handleDeleteRow}
                size="small"
                sx={{
                  color: "#dc2626",
                  background: "#fee2e2",
                  width: 34,
                  height: 34,
                  mr: 1,
                  "&:hover": { background: "#fecaca" },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Docket">
              <IconButton
                onClick={handleAddRow}
                size="small"
                sx={{
                  color: "#0d6efd",
                  background: "#e3f2fd",
                  width: 34,
                  height: 34,
                  "&:hover": { background: "#bbdefb" },
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </div>
          <DataTable
            columns={tableColumns}
            rows={billingRows}
            getKey={(row) => row.id || row.docket_no}
            checkboxSelection
            disableMultipleRowSelection
            // autoHeight
            scroll={{ horizontal: true, afterRows: 8 }}
            editable
            singleClick
            onRowUpdate={handleRowUpdate}
            isHeight={320}
            onRowSelectionModelChange={(ids) => setSelectedRowId(ids[0] ?? null)}
          />
          {billingRows.length > 0 && (
            <div style={totalRowStyle}>
              <div style={{ ...totalCellStyle, justifyContent: "flex-start", paddingLeft: 14 }}>TOTAL</div>
              <div style={totalCellStyle}>{totals.freight.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.loading.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.unloading.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.detention.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.add_toll.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.other_charges.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.discount.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.taxable.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.cgst.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.sgst.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.igst.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.amount.toFixed(2)}</div>
              <div style={{ ...totalCellStyle, minWidth: 120 }}></div>
            </div>
          )}
        </div>

        <div style={bottomSectionStyle}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Invoice Remarks"
              name="invoice_remarks"
              form={form}
              setForm={handleSetForm}
            />
          </div>
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading Customer Bill..." />
      </PageBody>
    </MainLayout>
  );
}

const sectionWrap = {
  border: "1px solid #dfeaf8",
  background: "#fff",
  marginBottom: 14,
  overflow: "hidden",
};

const sectionTitleStyle = {
  background: "#dfeeff",
  borderBottom: "1px solid #dfeaf8",
  padding: "10px 14px",
  fontSize: 15,
  fontWeight: 700,
  color: "#0d6efd",
  lineHeight: 1.3,
};

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
  gap: "12px 18px",
  padding: "18px 18px 8px",
};

const fieldCellStyle = {
  minWidth: 0,
};

const bottomSectionStyle = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "18px",
  padding: "18px 14px 12px",
  background: "#f9fbff",
  borderTop: "1px solid #e5edf8",
  marginTop: 12,
};

const tableTitleStyle = {
  background: "#f9fbff",
  border: "1px solid #dfeaf8",
  borderBottom: "none",
  padding: "10px 14px",
  fontWeight: 700,
  color: "#0d6efd",
  fontSize: 15,
  lineHeight: 1.3,
};

const totalRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(14, minmax(80px, 1fr))",
  background: "#f5f0d6",
  border: "1px solid #dfeaf8",
  borderTop: "none",
  fontWeight: 700,
  color: "#1f2937",
  minHeight: 36,
};

const totalCellStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRight: "1px solid #dfeaf8",
  padding: "8px 6px",
  minWidth: 90,
  fontSize: 12,
  fontWeight: 700,
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "80px",
  height: "24px",
  borderRadius: "4px",
  fontSize: 11,
  fontWeight: 700,
  padding: "0 8px",
};

const deliveredBadge = {
  background: "#e8f5e9",
  color: "#1b5e20",
  border: "1px solid #a5d6a7",
};

const pendingBadge = {
  background: "#fff8e1",
  color: "#b45309",
  border: "1px solid #f7d58c",
};

const yesBadge = {
  background: "#e8f5e9",
  color: "#1b5e20",
  border: "1px solid #a5d6a7",
};

const noBadge = {
  background: "#ffe7e7",
  color: "#b91c1c",
  border: "1px solid #f7b5b5",
};

const saveHeaderButtonStyle = {
  background: "linear-gradient(135deg, #1ca562, #119154)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "120px",
  padding: "8px 16px",
  "&:hover": { background: "linear-gradient(135deg, #169d56, #0f7c4b)" },
};

const printHeaderButtonStyle = {
  background: "linear-gradient(135deg, #1f6feb, #1d4ed8)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "120px",
  padding: "8px 16px",
  "&:hover": { background: "linear-gradient(135deg, #1d5ec9, #1e40af)" },
};

const clearHeaderButtonStyle = {
  background: "linear-gradient(135deg, #8c98ab, #6a7280)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  minWidth: "120px",
  padding: "8px 16px",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(135deg, #7d8898, #4d5666)" },
};

const deleteHeaderButtonStyle = {
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  minWidth: "120px",
  padding: "8px 16px",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(135deg, #c81e1e, #991b1b)" },
};
