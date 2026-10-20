import { useState, useEffect, useMemo, useRef } from "react";
import MainLayout from "../../layouts/MainLayout";
import { FormField, PageBody, DataTable } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, PrintIcon, AddIcon, DeleteIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllDockets, fetchCharges, fetchChargesBulk, fetchChargeMaster, fetchDocketByDocketNo } from "../../utils/docket";
import { fetchDeliveryNotes, fetchDeliveryNoteByDocketNo } from "../../utils/deliveryNote";
import { fetchAllLocations } from "../../utils/locationMaster";
import { saveInvoice, updateInvoice, deleteInvoice, fetchBilledDocketNos } from "../../utils/customerBill";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { printInvoice } from "../../components/common/InvoicePrint";
import { Autocomplete, Button, Chip, IconButton, TextField, Tooltip } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import moment from "moment";
import { getDateFormat } from "../../utils/tenantService";

const billingColumns = [
  { key: "docket_no", label: "Docket", minWidth: 100 },
  { key: "docket_date", label: "Date", minWidth: 70 },
  { key: "origin", label: "Origin", minWidth: 110 },
  { key: "destination", label: "Dest", minWidth: 110 },
  { key: "consignee", label: "Consignee", minWidth: 150 },
  { key: "actual_wt", label: "Act Wt", minWidth: 60 },
  { key: "charge_wt", label: "Chg Wt", minWidth: 60 },
  { key: "freight", label: "Freight", minWidth: 64 },
  { key: "loading", label: "Handling", minWidth: 68 },
  { key: "unloading", label: "Fuel Surcharge", minWidth: 88 },
  { key: "detention", label: "Factory Charge", minWidth: 88 },
  { key: "add_toll", label: "ODA Charge", minWidth: 78 },
  { key: "green_tax", label: "FOV", minWidth: 52 },
  { key: "other_charges", label: "Stationery", minWidth: 76 },
  { key: "taxable", label: "Taxable", minWidth: 62 },
  { key: "cgst", label: "CGST", minWidth: 50 },
  { key: "sgst", label: "SGST", minWidth: 50 },
  { key: "igst", label: "IGST", minWidth: 50 },
  { key: "amount", label: "Amount", minWidth: 66 },
  {
    key: "pod",
    label: "POD",
    minWidth: 56,
    render: (row) => (
      <span style={{ ...statusBadgeStyle, ...(row.pod === "YES" ? yesBadge : noBadge) }}>
        {row.pod}
      </span>
    ),
  },
];

const invoiceFields = [
  { label: "Invoice No", name: "invoice_no", disabled: true },
  { label: "Invoice Date", name: "invoice_date", type: "date" },
  { label: "Billing Type", name: "billing_type", type: "select", options: ["Regular", "Debit Note"], required: true },
  { label: "Billing Branch", name: "billing_branch", type: "select", options: ["Select Branch"], required: true },
  { label: "Customer", name: "customer", type: "select", options: ["Select Customer"] },
];

const emptyForm = {
  customer: "",
  invoice_no: "AUTO",
  invoice_date: "",
  billing_branch: "Select Branch",
  billing_type: "Regular",
  invoice_remarks: "",
};

const customerFieldSx = {
  "& .MuiInputBase-input": { fontSize: 11, fontWeight: 700 },
  "& .MuiInputLabel-root": { fontSize: 11, fontWeight: 700 },
};

const billPageFontCss = `
.customer-bill-page .MuiInputBase-input,
.customer-bill-page .MuiInputLabel-root,
.customer-bill-page .MuiSelect-select,
.customer-bill-page .MuiDataGrid-cell,
.customer-bill-page .MuiDataGrid-cell *,
.customer-bill-page .MuiDataGrid-columnHeaderTitle,
.customer-bill-page .MuiTablePagination-root,
.customer-bill-page .MuiTablePagination-selectLabel,
.customer-bill-page .MuiTablePagination-displayedRows {
  font-size: 11px !important;
  font-weight: 700 !important;
}
.customer-bill-page .MuiDataGrid-cell {
  padding: 2px 4px !important;
}
.customer-bill-page .MuiDataGrid-columnHeader {
  padding: 0 4px !important;
}
`;

// Map ssm_charge_master.charge_desc onto billing columns (order: specific names first).
const MASTER_DESC_RULES = [
  { key: "green_tax", tests: ["FREIGHT ON VALUE", "FOV"] },
  { key: "unloading", tests: ["FUEL SURCHARGE", "FSC"] },
  { key: "detention", tests: ["FACTORY CHARGE", "FACTORY"] },
  { key: "loading", tests: ["HANDLING CHARGE", "HANDLING"] },
  { key: "add_toll", tests: ["ODA CHARGE", "ODA"] },
  { key: "other_charges", tests: ["STATIONERY", "STATIONARY"] },
  { key: "freight", tests: ["FREIGHT", "FRT"] },
];

const columnFromMasterDesc = (desc) => {
  const d = String(desc || "").toUpperCase();
  if (!d) return null;
  for (const rule of MASTER_DESC_RULES) {
    if (rule.tests.some((t) => d.includes(t))) return rule.key;
  }
  return null;
};

const toDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format(getDateFormat()) : val;
};

const locCodeOf = (val) => String(val || "").split(" - ")[0].split(">")[0].trim().toUpperCase();

const locTownLabel = (loc, town) => {
  const l = String(loc || "").trim();
  const t = String(town || "").trim();
  if (l && t) return `${l} > ${t}`;
  return l || t || "";
};

const isDeliveredStatus = (status) => String(status || "").trim().toLowerCase() === "delivered";

export default function CustomerBill() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [form, setForm] = useState({ ...emptyForm });
  const [partners, setPartners] = useState([]);
  const [billingRows, setBillingRows] = useState([]);
  const [chargeMaster, setChargeMaster] = useState([]);
  const [deliveryNotesMap, setDeliveryNotesMap] = useState({});
  const [deliveredDocketNos, setDeliveredDocketNos] = useState(() => new Set());
  const [locations, setLocations] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedDocketNos, setSelectedDocketNos] = useState(() => new Set());
  const [loadingDockets, setLoadingDockets] = useState(false);
  const [docketsLoaded, setDocketsLoaded] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null); // { invoice_no, invoice_date, loc_code }
  // Guards against a stale customer/branch fetch resolving after a newer one
  const docketLoadToken = useRef(0);

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
    fetchAllCompanies()
      .then((data) => { if (Array.isArray(data) && data.length) setCompany(data[0]); })
      .catch((err) => console.error("Failed to load company:", err));
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
        const delivered = new Set();
        (Array.isArray(notes) ? notes : []).forEach((n) => {
          if (!n.docket_no) return;
          map[n.docket_no] = n;
          if (isDeliveredStatus(n.delivery_status)) delivered.add(String(n.docket_no));
        });
        setDeliveryNotesMap(map);
        setDeliveredDocketNos(delivered);
      })
      .catch((err) => console.error("Failed to load delivery notes:", err));
  }, []);

  const branchOptions = [
    "Select Branch",
    ...locations.map((loc) => `${loc.loc_code} - ${loc.loc_name}`).filter(Boolean),
  ];
  const branchSelected = !!(form.billing_branch && form.billing_branch !== "Select Branch");
  const isDebitNote = form.billing_type === "Debit Note";
  const selectedLocCode = useMemo(
    () => (form.billing_branch || "").split(" - ")[0].trim(),
    [form.billing_branch]
  );

  // Customers of the selected billing branch only (BP loc_code). Searchable by code and name.
  const customerOptions = useMemo(() => {
    if (!selectedLocCode) return [];
    const loc = selectedLocCode.toUpperCase();
    return partners
      .filter((p) => {
        const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return bpLoc === loc && (p.bp_name || p.bp_grp_code || p.bp_code);
      })
      .map((p) => {
        const name = String(p.bp_name || "").trim();
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        return {
          value: String(p.record_id ?? p.bp_id ?? ""),
          code,
          name,
          label: code ? `${code} - ${name}` : name,
        };
      })
      .filter((o) => o.value);
  }, [partners, selectedLocCode]);

  const handleSetForm = (updatedForm) => {
    const next = typeof updatedForm === "function" ? updatedForm(form) : updatedForm;
    if (next.billing_branch !== form.billing_branch) {
      setForm({ ...next, customer: "" });
      return;
    }
    setForm(next);
  };

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null") || {};
    } catch {
      return {};
    }
  };

  const chargeCodeToColumn = useMemo(() => {
    const map = {};
    (Array.isArray(chargeMaster) ? chargeMaster : []).forEach((m) => {
      const code = String(m.charge_code || "").toUpperCase().trim();
      if (!code) return;
      const col = columnFromMasterDesc(m.charge_desc);
      if (col) map[code] = col;
    });
    return map;
  }, [chargeMaster]);

  const mapChargeToColumn = (chargeCode, chargeDesc) => {
    const upperCode = String(chargeCode || "").toUpperCase().trim();
    if (upperCode && chargeCodeToColumn[upperCode]) return chargeCodeToColumn[upperCode];
    const master = (chargeMaster || []).find(
      (m) => String(m.charge_code || "").toUpperCase().trim() === upperCode
    );
    if (master) return columnFromMasterDesc(master.charge_desc);
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
      green_tax: 0,
      other_charges: 0,
      discount: 0,
    };

    (Array.isArray(charges) ? charges : []).forEach((c) => {
      const master = chargeMaster.find((m) => m.charge_code === c.charge_code);
      const desc = master?.charge_desc || c.charge_name || c.charge_desc || c.charge_code;
      const colKey = mapChargeToColumn(c.charge_code, desc);
      if (colKey && colKey in chargeAmounts) {
        chargeAmounts[colKey] += parseFloat(c.charge_amt) || 0;
      }
    });

    const taxable =
      chargeAmounts.freight +
      chargeAmounts.loading +
      chargeAmounts.unloading +
      chargeAmounts.detention +
      chargeAmounts.add_toll +
      chargeAmounts.green_tax +
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
      origin: locTownLabel(docket.docket_loc, docket.docket_pickup_town || docket.docket_from_town),
      destination: locTownLabel(docket.docket_to_loc, docket.docket_dly_town || docket.docket_to_town),
      consignee: docket.cnee_name || "",
      booking_branch: docket.docket_loc || "",
      delivery_branch: docket.docket_to_loc || "",
      pay_type: docket.docket_pay_type || docket.pay_type || "",
      pay_loc: docket.docket_pay_loc || docket.pay_loc || "",
      packages: docket.docket_tot_pkgs ?? docket.total_pkgs ?? "",
      actual_wt: docket.docket_act_wt ?? docket.actual_wt ?? "",
      charge_wt: docket.docket_chrg_wt ?? docket.chrg_wt ?? "",
      freight: chargeAmounts.freight.toFixed(2),
      loading: chargeAmounts.loading.toFixed(2),
      unloading: chargeAmounts.unloading.toFixed(2),
      detention: chargeAmounts.detention.toFixed(2),
      add_toll: chargeAmounts.add_toll.toFixed(2),
      green_tax: chargeAmounts.green_tax.toFixed(2),
      other_charges: chargeAmounts.other_charges.toFixed(2),
      discount: chargeAmounts.discount.toFixed(2),
      taxable: taxableRounded.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      amount: totalAmount.toFixed(2),
      pod: pod === "Received" ? "YES" : "NO",
      delivery_status: deliveryStatus,
      invoice_status: "Unbilled",
    };
  };

  // Editable charge columns - user can modify these values in the grid
  const editableChargeKeys = ["loading", "unloading", "detention", "add_toll", "green_tax", "other_charges"];

  // The customer record picked in the dropdown. The dropdown stores only the
  // BP name, so we resolve the full partner row here to get its record_id.
  // Dockets saved during this session / belonging to the invoice being edited.
  // These stay visible in the list even though they are already billed.
  const editingDocketNos = useRef(new Set());
  const isDocketOnEditingInvoice = (docketNo) => editingDocketNos.current.has(String(docketNo));

  const selectedCustomer = useMemo(
    () => partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(form.customer)) || null,
    [partners, form.customer]
  );

  // record_id of the selected business partner - this is what docket rows are
  // matched against (docket.cnor_id / docket.cnee_id)
  const selectedCustomerId = useMemo(() => {
    if (!selectedCustomer) return null;
    const id = selectedCustomer.record_id ?? selectedCustomer.bp_id ?? null;
    return id == null ? null : String(id);
  }, [selectedCustomer]);

  // A docket belongs to the customer when its cnor_id OR cnee_id equals the
  // selected business partner's record_id.
  // The name comparison is only a safety net for dockets whose cnor_id/cnee_id
  // columns came back NULL, so nothing silently disappears from the list.
  const docketBelongsToCustomer = (docket, customerId, customerName) => {
    const cnorId = docket.cnor_id == null ? "" : String(docket.cnor_id);
    const cneeId = docket.cnee_id == null ? "" : String(docket.cnee_id);
    if (cnorId || cneeId) {
      return (!!customerId && (cnorId === customerId || cneeId === customerId)) || false;
    }
    if (!customerName) return false;
    const name = customerName.trim().toLowerCase();
    return (
      (docket.cnor_name || "").trim().toLowerCase() === name ||
      (docket.cnee_name || "").trim().toLowerCase() === name
    );
  };

  // Load every docket belonging to the selected customer: resolve the partner's
  // record_id, then keep only dockets whose cnor_id or cnee_id equals it.
  // Optionally narrowed to the selected billing branch. Dockets already attached
  // to a saved invoice are flagged as Billed so the user never bills them twice.
  useEffect(() => {
    const customerName = selectedCustomer?.bp_name;
    if (!form.customer || !selectedCustomerId) {
      docketLoadToken.current++;
      setBillingRows([]);
      setSelectedDocketNos(new Set());
      setDocketsLoaded(false);
      setLoadingDockets(false);
      return;
    }

    const token = ++docketLoadToken.current;
    const customerId = selectedCustomerId;
    let cancelled = false;

    (async () => {
      try {
        setLoadingDockets(true);
        const [dockets, billedList] = await Promise.all([
          fetchAllDockets(true),
          fetchBilledDocketNos().catch(() => []),
        ]);

        const billedMap = {};
        (Array.isArray(billedList) ? billedList : []).forEach((no) => {
          if (no) billedMap[String(no).trim()] = true;
        });

        if (cancelled || token !== docketLoadToken.current) return;

        const locCode = selectedLocCode;
        const docketList = Array.isArray(dockets) ? dockets : [];

        // Dockets already attached to a saved invoice are not billable again.
        // Ones belonging to the invoice currently being edited stay visible so
        // an existing invoice can be re-opened and updated.
        const isBilled = (docketNo) =>
          !!billedMap[String(docketNo).trim()] || isDocketOnEditingInvoice(docketNo);

        const filtered = docketList.filter((d) => {
          if (!d.docket_no) return false;
          // cnor_id or cnee_id must equal the selected partner's record_id
          if (!docketBelongsToCustomer(d, customerId, selectedCustomer?.bp_name)) return false;
          // Regular: unbilled only. Debit Note: already billed only.
          if (isDebitNote) {
            if (!isBilled(d.docket_no)) return false;
          } else if (isBilled(d.docket_no) && !isDocketOnEditingInvoice(d.docket_no)) {
            return false;
          }
          // only dockets delivered in sst_dly_note (delivery note)
          if (!deliveredDocketNos.has(String(d.docket_no))) return false;
          // payment location must be the selected billing branch
          if (locCode && locCodeOf(d.docket_pay_loc || d.pay_loc) !== locCodeOf(locCode)) return false;
          return true;
        });

        const chargeRows = await fetchChargesBulk(filtered.map((d) => d.docket_no)).catch(() => []);
        const chargesByDocket = {};
        (Array.isArray(chargeRows) ? chargeRows : []).forEach((c) => {
          const no = String(c.docket_no || "").trim();
          if (!no) return;
          if (!chargesByDocket[no]) chargesByDocket[no] = [];
          chargesByDocket[no].push(c);
        });

        const rows = filtered.map((d) => ({
          ...buildBillingRow(d, chargesByDocket[String(d.docket_no).trim()] || []),
          id: d.docket_no,
          invoice_status: billedMap[String(d.docket_no).trim()] ? "Billed" : "Unbilled",
          _chargesLoaded: true,
        }));

        setBillingRows(rows);
        setSelectedDocketNos(new Set());
        setDocketsLoaded(true);

        // Helpful when a customer unexpectedly shows no dockets
        if (filtered.length === 0) {
          console.info(
            `[CustomerBill] No dockets for "${selectedCustomer?.bp_name}" (record_id=${customerId}). ` +
            `Scanned ${docketList.length} dockets; sample cnor_id/cnee_id:`,
            docketList.slice(0, 5).map((d) => ({ docket_no: d.docket_no, cnor_id: d.cnor_id, cnee_id: d.cnee_id }))
          );
        }
      } catch (err) {
        if (cancelled || token !== docketLoadToken.current) return;
        showError(err.message || "Failed to load dockets for the selected customer");
        console.error("Load customer dockets error:", err);
        setBillingRows([]);
        setDocketsLoaded(false);
      } finally {
        if (!cancelled && token === docketLoadToken.current) setLoadingDockets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, form.billing_branch, form.billing_type, selectedCustomerId, partners, chargeMaster, deliveryNotesMap, deliveredDocketNos, isDebitNote]);

  // Recalculate derived fields (taxable, GST, amount) when charge values change
  const recalculateRow = (row) => {
    const freight = parseFloat(row.freight) || 0;
    const loading = parseFloat(row.loading) || 0;
    const unloading = parseFloat(row.unloading) || 0;
    const detention = parseFloat(row.detention) || 0;
    const add_toll = parseFloat(row.add_toll) || 0;
    const green_tax = parseFloat(row.green_tax) || 0;
    const other_charges = parseFloat(row.other_charges) || 0;
    const discount = parseFloat(row.discount) || 0;

    const taxable = Math.round(
      (freight + loading + unloading + detention + add_toll + green_tax + other_charges - discount) * 100
    ) / 100;

    const fromLoc = locCodeOf(row.booking_branch || row.origin);
    const toLoc = locCodeOf(row.delivery_branch || row.destination);
    const interState = fromLoc !== toLoc;

    const gstRate = 0.18;
    const gstAmount = Math.round(taxable * gstRate * 100) / 100;
    const cgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const sgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const igst = interState ? gstAmount : 0;
    const totalAmount = Math.round((taxable + gstAmount) * 100) / 100;

    return {
      ...row,
      taxable: taxable.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      amount: totalAmount.toFixed(2),
    };
  };

  // Fold a docket's charge lines into a grid row, keeping any value the user
  // has already typed (manual entries win over the fetched charge).
  const applyChargesToRow = (row, charges) => {
    const merged = { ...row };
    ["freight", "loading", "unloading", "detention", "add_toll", "green_tax", "other_charges", "discount"].forEach((k) => {
      if (!row._edited?.[k]) merged[k] = "0.00";
    });
    (Array.isArray(charges) ? charges : []).forEach((c) => {
      const master = chargeMaster.find((m) => m.charge_code === c.charge_code);
      const desc = master?.charge_desc || c.charge_name || c.charge_desc || c.charge_code;
      const colKey = mapChargeToColumn(c.charge_code, desc);
      if (!colKey || !(colKey in merged)) return;
      if (row._edited?.[colKey]) return;
      merged[colKey] = ((parseFloat(merged[colKey]) || 0) + (parseFloat(c.charge_amt) || 0)).toFixed(2);
    });
    merged._chargesLoaded = true;
    return recalculateRow(merged);
  };

  // Whenever the user ticks dockets, pull their charge breakdown so amounts,
  // taxes and the totals row are real numbers before saving.
  const loadChargesForSelected = async (docketNos) => {
    const pending = docketNos.filter((no) => {
      const row = billingRows.find((r) => String(r.id) === String(no));
      return row && !row._chargesLoaded;
    });
    if (pending.length === 0) return;

    const pairs = await Promise.all(
      pending.map(async (no) => {
        try {
          return [no, await fetchCharges(no)];
        } catch {
          return [no, []];
        }
      })
    );
    const chargesByDocket = Object.fromEntries(pairs);

    setBillingRows((prev) =>
      prev.map((row) => {
        const key = String(row.id);
        if (!(key in chargesByDocket)) return row;
        const charges = chargesByDocket[key];
        return Array.isArray(charges) ? applyChargesToRow(row, charges) : { ...row, _chargesLoaded: true };
      })
    );
  };

  // Multi-select: ticks decide which dockets get saved on the invoice
  const handleRowSelectionModelChange = (model) => {
    const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
    const docketNos = new Set([...ids].map(String));
    setSelectedDocketNos(docketNos);
    loadChargesForSelected([...docketNos]);
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
      pay_loc: "",
      packages: "",
      actual_wt: "",
      charge_wt: "",
      freight: "",
      loading: "",
      unloading: "",
      detention: "",
      add_toll: "",
      green_tax: "",
      other_charges: "",
      discount: "",
      taxable: "",
      cgst: "",
      sgst: "",
      igst: "",
      amount: "",
      pod: "",
      delivery_status: "",
      invoice_status: "Unbilled",
      _chargesLoaded: false,
      _edited: {},
    };
    setBillingRows((prev) => [...prev, emptyRow]);
  };

  // When a docket number is entered in a row, fetch all docket data and populate the row
  const handleRowUpdate = async (newRow, oldRow) => {
    // Check if a charge field was edited - recalculate derived fields
    const changedChargeKeys = editableChargeKeys.filter((key) => newRow[key] !== oldRow[key]);
    if (changedChargeKeys.length > 0) {
      // Remember the manual override so a later charge fetch does not wipe it
      const recalculated = recalculateRow({
        ...newRow,
        _edited: { ...(newRow._edited || {}), ...Object.fromEntries(changedChargeKeys.map((k) => [k, true])) },
      });
      // Update the billingRows state so the recalculated row persists in the grid
      setBillingRows((prev) =>
        prev.map((row) => (row.id === newRow.id ? { ...recalculated, id: newRow.id } : row))
      );
      return recalculated;
    }

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

        const selectedLoc = locCodeOf(selectedBranch);
        const payLoc = locCodeOf(docketObj.docket_pay_loc || docketObj.pay_loc);
        if (selectedLoc && payLoc !== selectedLoc) {
          showError("Docket " + newRow.docket_no + " payment location is not billing branch " + selectedBranch);
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        let note = deliveryNotesMap[docketObj.docket_no] || deliveryNotesMap[newRow.docket_no];
        if (!note) {
          try {
            note = await fetchDeliveryNoteByDocketNo(docketObj.docket_no || newRow.docket_no);
          } catch {
            note = null;
          }
        }
        if (!isDeliveredStatus(note?.delivery_status)) {
          showError("Docket " + newRow.docket_no + " is not delivered");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        const billedList = await fetchBilledDocketNos().catch(() => []);
        const billedSet = new Set((Array.isArray(billedList) ? billedList : []).map((n) => String(n).trim()));
        const alreadyBilled =
          billedSet.has(String(newRow.docket_no).trim()) || isDocketOnEditingInvoice(newRow.docket_no);
        if (isDebitNote) {
          if (!alreadyBilled) {
            showError("Debit Note: docket " + newRow.docket_no + " has no bill prepared yet");
            return { ...newRow, docket_no: oldRow.docket_no };
          }
        } else if (alreadyBilled && !isDocketOnEditingInvoice(newRow.docket_no)) {
          showError("Docket " + newRow.docket_no + " already has a bill prepared");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        const charges = await fetchCharges(docketObj.docket_no || newRow.docket_no);
        const builtRow = buildBillingRow(docketObj, Array.isArray(charges) ? charges : []);
        showSuccess("Docket " + newRow.docket_no + " loaded");

        // Update the billingRows state so the populated row persists in the grid
        setBillingRows((prev) =>
          prev.map((row) => (row.id === newRow.id ? { ...builtRow, id: newRow.id } : row))
        );

        return { ...builtRow, id: newRow.id, _chargesLoaded: true, _edited: {} };
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

  // Only Docket and charge columns should be editable
  const tableColumns = billingColumns.map((col) => ({
    ...col,
    editable: col.key === "docket_no" || editableChargeKeys.includes(col.key),
  }));

  // Stable array reference - DataTable memoises its controlled model on this,
  // so a fresh array every render would keep resetting the user's ticks
  const selectionIds = useMemo(() => [...selectedDocketNos], [selectedDocketNos]);

  // The rows the user has ticked - these are the ones that get saved
  const selectedRows = useMemo(
    () => billingRows.filter((r) => selectedDocketNos.has(String(r.id)) && r.docket_no),
    [billingRows, selectedDocketNos]
  );

  const totals = selectedRows.reduce(
    (acc, row) => ({
      freight: acc.freight + (parseFloat(row.freight) || 0),
      loading: acc.loading + (parseFloat(row.loading) || 0),
      unloading: acc.unloading + (parseFloat(row.unloading) || 0),
      detention: acc.detention + (parseFloat(row.detention) || 0),
      add_toll: acc.add_toll + (parseFloat(row.add_toll) || 0),
      green_tax: acc.green_tax + (parseFloat(row.green_tax) || 0),
      other_charges: acc.other_charges + (parseFloat(row.other_charges) || 0),
      discount: acc.discount + (parseFloat(row.discount) || 0),
      taxable: acc.taxable + (parseFloat(row.taxable) || 0),
      cgst: acc.cgst + (parseFloat(row.cgst) || 0),
      sgst: acc.sgst + (parseFloat(row.sgst) || 0),
      igst: acc.igst + (parseFloat(row.igst) || 0),
      amount: acc.amount + (parseFloat(row.amount) || 0),
    }),
    { freight: 0, loading: 0, unloading: 0, detention: 0, add_toll: 0, green_tax: 0, other_charges: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 }
  );

  // Removes the ticked dockets from the working list (nothing is sent to the server)
  const handleDeleteRow = () => {
    if (selectedDocketNos.size === 0) {
      showError("Please select at least one docket row to remove");
      return;
    }
    setBillingRows((prev) => prev.filter((row) => !selectedDocketNos.has(String(row.id))));
    setSelectedDocketNos(new Set());
    showSuccess("Selected docket(s) removed");
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
      setSelectedDocketNos(new Set());
      setEditingInvoice(null);
    } catch (err) {
      showError(err.message || "Failed to delete invoice");
      console.error("Delete invoice error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    docketLoadToken.current++;
    setForm({ ...emptyForm });
    setBillingRows([]);
    setSelectedDocketNos(new Set());
    setDocketsLoaded(false);
    setLoadingDockets(false);
    setEditingInvoice(null);
  };

  const buildInvoicePayload = () => {
    const currentUser = getCurrentUser();
    const selectedBranch = form.billing_branch || "";
    const selectedLocCode = selectedBranch.split(" - ")[0].trim();
    const customer = selectedCustomer;
    const totalAmt = selectedRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const header = {
      division_code: currentUser?.division_code ?? null,
      loc_code: selectedLocCode || null,
      bp_code: customer?.bp_grp_code ?? customer?.bp_code ?? 0,
      bp_name: customer?.bp_name || null,
      invoice_type: isDebitNote ? "D" : "R",
      invoice_no: editingInvoice?.invoice_no ?? null,
      invoice_date: form.invoice_date || null,
      total_inv_amt: Math.round(totalAmt * 100) / 100,
      created_by: currentUser?.user_id ?? null,
      modified_by: currentUser?.user_id ?? null,
    };

    const details = selectedRows
      .map((row, index) => ({
        division_code: currentUser?.division_code ?? null,
        invoice_loc: selectedLocCode || null,
        invoice_date: form.invoice_date || null,
        invoice_type: isDebitNote ? "D" : "R",
        inv_sr_no: index + 1,
        docket_no: row.docket_no || null,
        docket_from_loc: locCodeOf(row.booking_branch || row.origin) || null,
        docket_to_loc: locCodeOf(row.delivery_branch || row.destination) || null,
        docket_date: row.docket_date ? moment(row.docket_date, getDateFormat()).format("YYYY-MM-DD") : null,
        docket_chrwt: parseFloat(row.charge_wt) || 0,
        freight: parseFloat(row.freight) || 0,
        loading: parseFloat(row.loading) || 0,
        unloading: parseFloat(row.unloading) || 0,
        detention: parseFloat(row.detention) || 0,
        green_tax: parseFloat(row.green_tax) || 0,
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

  const handlePrint = () => {
    if (selectedRows.length === 0) {
      showError("Please select at least one docket before printing");
      return;
    }
    if (!form.customer || !selectedCustomer) {
      showError("Please select a customer before printing");
      return;
    }
    const selectedBranch = form.billing_branch || "";
    const locCode = selectedBranch.split(" - ")[0].trim();
    const customer = selectedCustomer;
    const totalAmt = selectedRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const invoice = {
      invoice_no: form.invoice_no || "AUTO",
      invoice_date: form.invoice_date || "",
      bp_name: customer?.bp_name || "",
      bp_code: customer?.bp_grp_code || customer?.bp_code || "",
      loc_code: locCode || "",
      loc_label: selectedBranch || "",
      invoice_type: isDebitNote ? "D" : "R",
      total_inv_amt: totalAmt.toFixed(2),
    };

    printInvoice({
      invoice,
      details: selectedRows,
      company,
      locationsMap: Object.fromEntries(locations.map((l) => [l.loc_code, l])),
    });
  };

  const handleSave = async () => {
    // Validate billing branch is selected
    const selectedBranch = form.billing_branch || "";
    if (!selectedBranch || selectedBranch === "Select Branch") {
      showError("Please select a billing branch before saving");
      return;
    }
    const locCode = selectedBranch.split(" - ")[0].trim();

    // Validate customer is selected
    if (!form.customer || !selectedCustomer) {
      showError("Please select a customer before saving");
      return;
    }

    // Validate invoice date
    if (!form.invoice_date) {
      showError("Please select an invoice date before saving");
      return;
    }

    // The dockets are listed automatically, so the user must tick the ones to bill
    if (billingRows.length === 0) {
      showError("No dockets found for the selected customer");
      return;
    }

    if (selectedRows.length === 0) {
      showError("Please select at least one docket to bill");
      return;
    }

    if (!isDebitNote) {
      const alreadyBilled = selectedRows
        .filter((row) => row.invoice_status === "Billed" && !isDocketOnEditingInvoice(row.docket_no))
        .map((row) => row.docket_no);
      if (alreadyBilled.length > 0) {
        showError(
          "Cannot save. The following docket(s) are already billed on another invoice: " +
          alreadyBilled.join(", ")
        );
        return;
      }
    }

    const wrongBranchDockets = selectedRows
      .filter((row) => locCode && locCodeOf(row.pay_loc) !== locCodeOf(locCode))
      .map((row) => row.docket_no);

    if (wrongBranchDockets.length > 0) {
      showError(
        "Cannot save. The following docket(s) do not have payment location " +
        selectedBranch + ": " + wrongBranchDockets.join(", ")
      );
      return;
    }

    const notDelivered = selectedRows
      .filter((row) => !isDeliveredStatus(row.delivery_status) && !deliveredDocketNos.has(String(row.docket_no)))
      .map((row) => row.docket_no);
    if (notDelivered.length > 0) {
      showError("Cannot save. The following docket(s) are not delivered: " + notDelivered.join(", "));
      return;
    }

    const payload = buildInvoicePayload();

    if (payload.details.length === 0) {
      showError("Please select at least one docket before saving");
      return;
    }

    const savedDocketNos = payload.details.map((d) => String(d.docket_no));
    editingDocketNos.current = new Set(savedDocketNos);

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

      // The saved dockets are now billed - flag them so they cannot be billed twice
      setBillingRows((prev) =>
        prev.map((row) =>
          savedDocketNos.includes(String(row.id)) ? { ...row, invoice_status: "Billed" } : row
        )
      );
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
        <style>{billPageFontCss}</style>
        <div className="customer-bill-page">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={saveHeaderButtonStyle}>
            Save
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={printHeaderButtonStyle}>
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
                {field.name === "customer" ? (
                  <Autocomplete
                    size="small"
                    disabled={!branchSelected}
                    options={customerOptions}
                    value={customerOptions.find((o) => String(o.value) === String(form.customer)) || null}
                    getOptionLabel={(opt) => {
                      if (!opt) return "";
                      if (typeof opt === "string") return opt;
                      return opt.label || (opt.code ? `${opt.code} - ${opt.name}` : opt.name || "");
                    }}
                    isOptionEqualToValue={(a, b) => String(a?.value) === String(b?.value)}
                    filterOptions={(opts, state) => {
                      const q = String(state.inputValue || "").trim().toLowerCase();
                      if (!q) return opts;
                      return opts.filter((o) => {
                        const code = String(o.code || "").toLowerCase();
                        const name = String(o.name || "").toLowerCase();
                        const label = String(o.label || "").toLowerCase();
                        return code.includes(q) || name.includes(q) || label.includes(q);
                      });
                    }}
                    onChange={(_, v) => handleSetForm({ ...form, customer: v?.value || "" })}
                    slotProps={{
                      paper: {
                        sx: {
                          "& .MuiAutocomplete-option": { fontSize: 11, fontWeight: 700, minHeight: 28, py: 0.5 },
                        },
                      },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        size="small"
                        sx={customerFieldSx}
                        placeholder={branchSelected ? "Search code or name" : "Select billing branch first"}
                      />
                    )}
                  />
                ) : (
                  <FormField
                    {...field}
                    options={field.name === "billing_branch" ? branchOptions : field.options}
                    form={form}
                    setForm={handleSetForm}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ ...tableTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{isDebitNote ? "Available Dockets for Debit Note" : "Available Dockets for Billing"}</span>
            {selectedCustomer && !docketsLoaded && !loadingDockets && (
              <Chip
                size="small"
                label="Select billing branch, then customer, to load dockets"
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#fff8e1", color: "#b45309" }}
              />
            )}
            {selectedCustomer && loadingDockets && (
              <Chip
                size="small"
                label="Loading dockets..."
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#e3f2fd", color: "#0d6efd" }}
              />
            )}
            {billingRows.length > 0 && (
              <Chip
                size="small"
                label={billingRows.length + " docket" + (billingRows.length > 1 ? "s" : "")}
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#e8f5e9", color: "#1b5e20" }}
              />
            )}
            {selectedRows.length > 0 && (
              <Chip
                size="small"
                label={selectedRows.length + " selected"}
                sx={{ ml: 1, fontSize: 12, fontWeight: 700, bgcolor: "#0d6efd", color: "#fff" }}
              />
            )}
            <span style={{ flex: 1 }} />
            <Tooltip title="Remove Selected Rows">
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
            <Tooltip title="Add Docket Manually">
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
          {selectedCustomer && docketsLoaded && billingRows.length === 0 && (
            <div
              style={{
                padding: "16px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#6b7280",
                background: "#fff",
                border: "1px solid #dfeaf8",
                borderTop: "none",
              }}
            >
              {isDebitNote
                ? `No billed delivered dockets found for ${selectedCustomer.bp_name}`
                : `No unbilled delivered dockets found for ${selectedCustomer.bp_name}`}
              {selectedLocCode ? ` with payment location ${selectedLocCode}` : ""}.
              {isDebitNote
                ? " Debit Note lists dockets that already have a bill prepared."
                : " Regular billing lists dockets that are delivered and not yet billed."}
            </div>
          )}
          <DataTable
            columns={tableColumns}
            rows={billingRows}
            getKey={(row) => row.id || row.docket_no}
            checkboxSelection
            // autoHeight
            scroll={{ afterRows: 8 }}
            editable
            singleClick
            onRowUpdate={handleRowUpdate}
            isHeight={320}
            rowSelectionModel={selectionIds}
            onRowSelectionModelChange={handleRowSelectionModelChange}
          />
          {selectedRows.length > 0 && (
            <div style={totalRowStyle}>
              <div style={{ ...totalCellStyle, justifyContent: "flex-start", paddingLeft: 14 }}>TOTAL</div>
              <div style={totalCellStyle}>{totals.freight.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.loading.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.unloading.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.detention.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.add_toll.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.green_tax.toFixed(2)}</div>
              <div style={totalCellStyle}>{totals.other_charges.toFixed(2)}</div>
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
        </div>
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
  fontSize: 12,
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
  fontSize: 12,
  lineHeight: 1.3,
};

const totalRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(15, minmax(80px, 1fr))",
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
  minWidth: 56,
  fontSize: 11,
  fontWeight: 700,
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  height: "18px",
  borderRadius: "4px",
  fontSize: 10,
  fontWeight: 700,
  padding: "0 8px",
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
