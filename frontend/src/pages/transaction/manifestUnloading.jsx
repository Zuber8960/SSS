import { useState, useEffect, useMemo, useCallback } from "react";
import MainLayout from "../../layouts/MainLayout";
import { PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import StatusGrid from "../../components/common/StatusGrid";
import "../../styles/MasterPage.css";

// ----------------------------------------------------------------
// Manifest Unloading Page
// Matches the design from mnf_unload.html
// ----------------------------------------------------------------

const emptyHeader = {
  manifest_no: "MF260700001",
  manifest_date: "",
  origin_branch: "DELHI",
  dest_branch: "MUMBAI",
  vehicle_no: "MH12AB4589",
  vehicle_type: "20 FT",
  driver_name: "Ramesh Kumar",
  driver_mobile: "9876543210",
  arrival_date: "",
  arrival_time: "",
  seal_no: "SL458965",
  dock_no: "DOCK-04",
  total_dockets: 100,
  total_packages: 850,
  total_weight: 16250,
  manifest_status: "Open",
  arrival_remarks: "",
};

const staticConsignors = [
  "ABC Industries", "Tata Steel", "Reliance Industries", "Asian Paints",
  "ITC Ltd", "HUL", "JSW Steel", "ACC Cement", "UltraTech Cement",
  "Pidilite", "Adani Wilmar", "Dabur", "Parle", "Amul", "Nestle India", "Britannia",
];

const staticConsignees = [
  "XYZ Traders", "Metro Cash & Carry", "D-Mart", "Reliance Retail",
  "Vijay Sales", "Big Bazaar", "More Retail", "Spencer",
  "Local Distributor", "Wholesale Dealer", "Regional Warehouse", "C&F Agent",
];

const staticDestinations = [
  "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad",
  "Surat", "Ahmedabad", "Indore", "Bhopal", "Jaipur",
];

function generateSampleDockets(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const booked = Math.floor(Math.random() * 20) + 1;
    let received = booked;
    let shortQty = 0;
    let excessQty = 0;
    let damageQty = 0;
    let leakQty = 0;
    let status = "OK";
    let remarks = "";

    const r = Math.random();
    if (r < 0.07) {
      status = "Short";
      shortQty = 1;
      received = booked - 1;
      remarks = "Package Short";
    } else if (r < 0.10) {
      status = "Damage";
      damageQty = 1;
      remarks = "Package Damaged";
    } else if (r < 0.12) {
      status = "Leakage";
      leakQty = 1;
      remarks = "Leakage Found";
    } else if (r < 0.14) {
      status = "Missing";
      received = 0;
      remarks = "Not Received";
    } else if (r < 0.16) {
      status = "Excess";
      excessQty = 1;
      received = booked + 1;
      remarks = "Extra Package";
    }

    rows.push({
      id: i,
      sr: i,
      docket_no: `DKT2607${String(i).padStart(5, "0")}`,
      booking_date: "17-Jul-2026",
      consignor: staticConsignors[Math.floor(Math.random() * staticConsignors.length)],
      consignee: staticConsignees[Math.floor(Math.random() * staticConsignees.length)],
      destination: staticDestinations[Math.floor(Math.random() * staticDestinations.length)],
      booked_pkgs: booked,
      received_pkgs: received,
      short_qty: shortQty,
      excess_qty: excessQty,
      damage_qty: damageQty,
      leak_qty: leakQty,
      weight: booked * 42,
      status,
      remarks,
      updated_by: "ADMIN",
      updated_time: "--",
      selected: false,
    });
  }
  return rows;
}


const statusOptions = ["OK", "Short", "Excess", "Damage", "Leakage", "Missing", "Returned", "Hold"];

const ROW_COLORS = {
  OK: "#c8e6c9",
  Short: "#fff9c4",
  Damage: "#ffcdd2",
  Leakage: "#ffe0b2",
  Missing: "#f8bbd0",
  Excess: "#d1c4e9",
};

const docketColumns = [
  { key: "sr",            label: "Sr",           minWidth: 40 },
  { key: "docket_no",     label: "Docket No",    minWidth: 130, type: "link" },
  { key: "booking_date",  label: "Booking Date", minWidth: 110 },
  { key: "consignor",     label: "Consignor",    minWidth: 150 },
  { key: "consignee",     label: "Consignee",    minWidth: 150 },
  { key: "destination",   label: "Destination",  minWidth: 100 },
  { key: "booked_pkgs",   label: "Booked Pkgs",  minWidth: 90,  align: "center" },
  { key: "received_pkgs", label: "Received Pkgs",minWidth: 100, type: "number", width: 70 },
  { key: "short_qty",     label: "Short",        minWidth: 70,  type: "readonly_number", width: 60 },
  { key: "excess_qty",    label: "Excess",       minWidth: 70,  type: "readonly_number", width: 60 },
  { key: "damage_qty",    label: "Damage",       minWidth: 70,  type: "readonly_number", width: 60 },
  { key: "leak_qty",      label: "Leakage",      minWidth: 70,  type: "readonly_number", width: 60 },
  { key: "weight",        label: "Weight",       minWidth: 80,  align: "right" },
  { key: "status",        label: "Status",       minWidth: 100, type: "select", options: statusOptions },
  { key: "remarks",       label: "Remarks",      minWidth: 140, type: "text", placeholder: "Remarks" },
  { key: "updated_by",    label: "Updated By",   minWidth: 100 },
  { key: "updated_time",  label: "Updated Time", minWidth: 100 },
];

// Styles matching the HTML theme
const styles = {
  headerBar: {
    background: "#0d47a1",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 25px",
    boxShadow: "0 2px 8px rgba(0,0,0,.25)",
    borderRadius: "8px 8px 0 0",
    marginBottom: 15,
  },
  headerBarTitle: {
    fontSize: 20,
    fontWeight: 600,
  },
  headerBarSubtitle: {
    fontSize: 13,
    opacity: 0.85,
  },
  headerBarRight: {
    textAlign: "right",
    fontSize: 13,
  },
  panel: {
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,.08)",
    marginBottom: 15,
    overflow: "hidden",
  },
  panelTitle: {
    background: "#1565c0",
    color: "#fff",
    padding: "10px 15px",
    fontSize: 16,
    fontWeight: 600,
  },
  panelBody: {
    padding: 15,
  },
  cardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: 12,
    marginBottom: 15,
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 15,
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,.08)",
    borderTop: "5px solid #1976d2",
  },
  cardNumber: {
    fontSize: 28,
    marginBottom: 5,
    fontWeight: "bold",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#666",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    width: 280,
    padding: "8px 10px",
    border: "1px solid #d9dfe8",
    borderRadius: 4,
    fontSize: 13,
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d9dfe8",
    borderRadius: 4,
    fontSize: 13,
  },
  btn: {
    border: "none",
    padding: "10px 18px",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: 600,
    color: "#fff",
    fontSize: 13,
  },
  btnPrimary: { background: "#1565c0" },
  btnSuccess: { background: "#2e7d32" },
  btnWarning: { background: "#ef6c00" },
  btnDanger: { background: "#c62828" },
  btnPurple: { background: "#6a1b9a" },
  btnDark: { background: "#455a64" },
  footer: {
    background: "#fff",
    padding: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 -2px 8px rgba(0,0,0,.08)",
    borderRadius: "0 0 8px 8px",
    marginTop: 15,
  },
  footerBold: { color: "#1565c0", fontWeight: "bold" },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 12,
  },
  textarea: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d9dfe8",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "inherit",
  },
};

export default function ManifestUnloading() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();
  const { isLoading } = useLoading();

  const [header, setHeader] = useState({ ...emptyHeader });
  const [dockets, setDockets] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Generate sample data on mount
  useEffect(() => {
    const sample = generateSampleDockets(100);
    setDockets(sample);
  }, []);

  // ---- Derived summary counts ----
  const summary = useMemo(() => {
    let total = dockets.length;
    let ok = 0,
      short = 0,
      damage = 0,
      leak = 0,
      excess = 0,
      missing = 0,
      pending = 0;
    dockets.forEach((d) => {
      switch (d.status) {
        case "OK":
          ok++;
          break;
        case "Short":
          short++;
          break;
        case "Damage":
          damage++;
          break;
        case "Leakage":
          leak++;
          break;
        case "Excess":
          excess++;
          break;
        case "Missing":
          missing++;
          break;
        default:
          pending++;
      }
    });
    return { total, ok, short, damage, leak, excess, missing, pending };
  }, [dockets]);

  // ---- Footer totals ----
  const footerTotals = useMemo(() => {
    let totalPackages = 0;
    let totalWeight = 0;
    dockets.forEach((d) => {
      totalPackages += d.booked_pkgs || 0;
      totalWeight += d.weight || 0;
    });
    return { totalPackages, totalWeight };
  }, [dockets]);

  // ---- Filtered dockets for display ----
  const filteredDockets = useMemo(() => {
    return dockets.filter((d) => {
      const matchSearch =
        !searchText ||
        d.docket_no.toUpperCase().includes(searchText.toUpperCase());
      const matchStatus = !statusFilter || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [dockets, searchText, statusFilter]);

  // ---- Handlers ----
  const handleReceivedChange = useCallback(
    (rowId, newVal) => {
      setDockets((prev) =>
        prev.map((d) => {
          if (d.id !== rowId) return d;
          const received = parseInt(newVal) || 0;
          const booked = d.booked_pkgs || 0;
          const shortQty = Math.max(0, booked - received);
          return {
            ...d,
            received_pkgs: received,
            short_qty: shortQty,
            status: shortQty > 0 && d.status === "OK" ? "Short" : d.status,
            remarks:
              shortQty > 0
                ? shortQty + " Packages Short"
                : d.status === "Short" && shortQty === 0
                ? ""
                : d.remarks,
          };
        })
      );
    },
    []
  );

  const handleStatusChange = useCallback((rowId, newStatus) => {
    setDockets((prev) =>
      prev.map((d) => {
        if (d.id !== rowId) return d;
        let remarks = d.remarks;
        if (newStatus === "OK") remarks = "";
        else if (!remarks) remarks = newStatus + " reported during unloading";
        return { ...d, status: newStatus, remarks };
      })
    );
  }, []);

  const handleRemarksChange = useCallback((rowId, newVal) => {
    setDockets((prev) =>
      prev.map((d) => (d.id !== rowId ? d : { ...d, remarks: newVal }))
    );
  }, []);

  const handleCellChange = useCallback((rowId, key, value) => {
    if (key === "received_pkgs") handleReceivedChange(rowId, value);
    else if (key === "status")   handleStatusChange(rowId, value);
    else if (key === "remarks")  handleRemarksChange(rowId, value);
  }, [handleReceivedChange, handleStatusChange, handleRemarksChange]);


  // Mark All OK
  const markAllOK = () => {
    setDockets((prev) =>
      prev.map((d) => ({
        ...d,
        status: "OK",
        short_qty: 0,
        excess_qty: 0,
        damage_qty: 0,
        leak_qty: 0,
        remarks: "",
      }))
    );
    showInfo("All dockets marked as OK");
  };

  // Mark Selected OK
  const markSelected = () => {
    const selectedIds = new Set(
      dockets.filter((d) => d.selected).map((d) => d.id)
    );
    if (selectedIds.size === 0) {
      showError("Please select at least one docket");
      return;
    }
    setDockets((prev) =>
      prev.map((d) =>
        selectedIds.has(d.id)
          ? { ...d, status: "OK", short_qty: 0, excess_qty: 0, damage_qty: 0, leak_qty: 0, remarks: "" }
          : d
      )
    );
    showInfo("Selected dockets marked as OK");
  };

  // Validate
  const validate = () => {
    for (const d of dockets) {
      if (d.status !== "OK" && !d.remarks.trim()) {
        showError(`Remarks are mandatory for Docket ${d.docket_no} with status: ${d.status}`);
        return false;
      }
    }
    return true;
  };

  // Save
  const handleSave = () => {
    if (!validate()) return;
    showSuccess("Manifest saved successfully.");
  };

  // Finalize
  const handleFinalize = () => {
    if (!validate()) return;
    showWarning(
      "Finalize Manifest",
      "Do you want to Finalize Manifest?",
      () => {
        showSuccess("Manifest finalized successfully.");
      }
    );
  };

  const handleSelectRow = useCallback((rowId) => {
    setDockets((prev) =>
      prev.map((x) => (x.id === rowId ? { ...x, selected: !x.selected } : x))
    );
  }, []);

  const handleSelectAll = useCallback((e) => {
    const checked = e.target.checked;
    setDockets((prev) => prev.map((x) => ({ ...x, selected: checked })));
  }, []);

  // Clear filter
  const clearFilter = () => {
    setSearchText("");
    setStatusFilter("");
  };

  // Refresh
  const handleRefresh = () => {
    const sample = generateSampleDockets(100);
    setDockets(sample);
    clearFilter();
    showInfo("Data refreshed");
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Sr", "Docket No", "Booking Date", "Consignor", "Consignee",
      "Destination", "Booked Pkgs", "Received Pkgs", "Short", "Excess",
      "Damage", "Leakage", "Weight", "Status", "Remarks", "Updated By", "Updated Time",
    ];
    const csvRows = [headers.join(",")];
    dockets.forEach((d) => {
      csvRows.push(
        [
          d.sr, d.docket_no, d.booking_date, `"${d.consignor}"`, `"${d.consignee}"`,
          d.destination, d.booked_pkgs, d.received_pkgs, d.short_qty, d.excess_qty,
          d.damage_qty, d.leak_qty, d.weight, d.status, `"${d.remarks}"`, d.updated_by, d.updated_time,
        ].join(",")
      );
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Manifest_Unloading.csv";
    a.click();
    URL.revokeObjectURL(url);
    showInfo("CSV exported");
  };

  // Print Exceptions
  const printExceptions = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showError("Please allow pop-ups for printing");
      return;
    }
    const exceptions = dockets.filter((d) => d.status !== "OK");
    const rowsHtml = exceptions
      .map(
        (d) => `
      <tr>
        <td>${d.sr}</td>
        <td>${d.docket_no}</td>
        <td>${d.booking_date}</td>
        <td>${d.consignor}</td>
        <td>${d.consignee}</td>
        <td>${d.destination}</td>
        <td>${d.booked_pkgs}</td>
        <td>${d.received_pkgs}</td>
        <td>${d.short_qty}</td>
        <td>${d.excess_qty}</td>
        <td>${d.damage_qty}</td>
        <td>${d.leak_qty}</td>
        <td>${d.weight}</td>
        <td>${d.status}</td>
        <td>${d.remarks}</td>
      </tr>`
      )
      .join("");

    printWindow.document.write(`
      <html><head><title>Manifest Exceptions</title>
      <style>
        body { font-family:Segoe UI,Tahoma,sans-serif; padding:20px; }
        h2 { color:#0d47a1; }
        table { width:100%; border-collapse:collapse; margin-top:15px; }
        th,td { border:1px solid #ccc; padding:8px; font-size:12px; text-align:left; }
        th { background:#0d47a1; color:#fff; }
        @media print { body { -webkit-print-color-adjust:exact; } }
      </style></head><body>
      <h2>Manifest Unloading - Exception Report</h2>
      <p><b>Manifest No:</b> ${header.manifest_no} | <b>Vehicle:</b> ${header.vehicle_no}</p>
      <table><thead><tr>
        <th>Sr</th><th>Docket No</th><th>Date</th><th>Consignor</th><th>Consignee</th>
        <th>Destination</th><th>Booked</th><th>Received</th><th>Short</th><th>Excess</th>
        <th>Damage</th><th>Leakage</th><th>Weight</th><th>Status</th><th>Remarks</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ---- Card colors ----
  const cardColor = (type) => {
    const colors = {
      total: "#0277bd",
      ok: "#2e7d32",
      short: "#f57c00",
      damage: "#d32f2f",
      leak: "#f57c00",
      excess: "#0277bd",
      missing: "#d32f2f",
      pending: "#2e7d32",
    };
    return { borderTop: `5px solid ${colors[type] || "#1976d2"}` };
  };

  return (
    <MainLayout>
      <PageBody title="Manifest Unloading">
        {/* ---- Header Bar ---- */}
        {/* <div style={styles.headerBar}>
          <div>
            <div style={styles.headerBarTitle}>
              🚚 Logistics ERP - Manifest Unloading
            </div>
            <div style={styles.headerBarSubtitle}>
              Destination Branch Unloading Management
            </div>
          </div>
          <div style={styles.headerBarRight}>
           
            <div>
              <b>Branch :</b> MUMBAI
            </div>
            <div>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
          </div>
        </div> */}

        {/* ---- Manifest Information ---- */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Manifest Information</div>
          <div style={styles.panelBody}>
            <div style={styles.gridContainer}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Manifest No
                </label>
                <input
                  type="text"
                  value={header.manifest_no}
                  onChange={(e) => setHeader({ ...header, manifest_no: e.target.value })}
                  style={styles.searchInput}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Manifest Date
                </label>
                <input
                  type="date"
                  value={header.manifest_date}
                  onChange={(e) => setHeader({ ...header, manifest_date: e.target.value })}
                  style={styles.searchInput}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Origin Branch
                </label>
                <input type="text" value={header.origin_branch} readOnly style={styles.searchInput} />
              </div>
              {/* <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Destination Branch
                </label>
                <input type="text" value={header.dest_branch} readOnly style={styles.searchInput} />
              </div> */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Vehicle No
                </label>
                <input type="text" value={header.vehicle_no} readOnly style={styles.searchInput} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Vehicle Type
                </label>
                <select value={header.vehicle_type} style={{ ...styles.select, width: "100%" }}>
                  <option>20 FT</option>
                  <option>32 FT</option>
                  <option>Trailer</option>
                  <option>LCV</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Driver Name
                </label>
                <input type="text" value={header.driver_name} readOnly style={styles.searchInput} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Driver Mobile
                </label>
                <input type="text" value={header.driver_mobile} readOnly style={styles.searchInput} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Arrival Date
                </label>
                <input
                  type="date"
                  value={header.arrival_date}
                  onChange={(e) => setHeader({ ...header, arrival_date: e.target.value })}
                  style={styles.searchInput}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={header.arrival_time}
                  onChange={(e) => setHeader({ ...header, arrival_time: e.target.value })}
                  style={styles.searchInput}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Seal No
                </label>
                <input type="text" value={header.seal_no} readOnly style={styles.searchInput} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Dock No
                </label>
                <input type="text" value={header.dock_no} readOnly style={styles.searchInput} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Total Dockets
                </label>
                <input
                  type="number"
                  value={dockets.length}
                  readOnly
                  style={{ ...styles.searchInput, background: "#f5f5f5" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Total Packages
                </label>
                <input
                  type="number"
                  value={footerTotals.totalPackages}
                  readOnly
                  style={{ ...styles.searchInput, background: "#f5f5f5" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Total Weight (KG)
                </label>
                <input
                  type="number"
                  value={footerTotals.totalWeight}
                  readOnly
                  style={{ ...styles.searchInput, background: "#f5f5f5" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Manifest Status
                </label>
                <select value={header.manifest_status} style={{ ...styles.select, width: "100%" }}>
                  <option>Open</option>
                  <option>Finalized</option>
                  <option>Closed</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Arrival Remarks
                </label>
                <textarea
                  rows={2}
                  value={header.arrival_remarks}
                  onChange={(e) => setHeader({ ...header, arrival_remarks: e.target.value })}
                  style={styles.textarea}
                  placeholder="Vehicle arrived in good condition..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Dashboard Cards ---- */}
        {/* <div style={styles.cardsContainer}>
          <div style={{ ...styles.card, ...cardColor("total") }}>
            <div style={styles.cardNumber}>{summary.total}</div>
            <div style={styles.cardLabel}>Total Dockets</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("ok") }}>
            <div style={styles.cardNumber}>{summary.ok}</div>
            <div style={styles.cardLabel}>OK</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("short") }}>
            <div style={styles.cardNumber}>{summary.short}</div>
            <div style={styles.cardLabel}>Short</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("damage") }}>
            <div style={styles.cardNumber}>{summary.damage}</div>
            <div style={styles.cardLabel}>Damage</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("leak") }}>
            <div style={styles.cardNumber}>{summary.leak}</div>
            <div style={styles.cardLabel}>Leakage</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("excess") }}>
            <div style={styles.cardNumber}>{summary.excess}</div>
            <div style={styles.cardLabel}>Excess</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("missing") }}>
            <div style={styles.cardNumber}>{summary.missing}</div>
            <div style={styles.cardLabel}>Missing</div>
          </div>
          <div style={{ ...styles.card, ...cardColor("pending") }}>
            <div style={styles.cardNumber}>{summary.pending}</div>
            <div style={styles.cardLabel}>Pending</div>
          </div>
        </div> */}

        {/* ---- Toolbar ---- */}
        {/* <div style={styles.panel}>
          <div style={styles.panelTitle}>Search / Barcode / Actions</div>
          <div style={styles.panelBody}>
            <div style={styles.toolbar}>
              <input
                type="text"
                placeholder="Search Docket No / Scan Barcode"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                <option value="">All Status</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => {}}>
                🔍 Search
              </button>
              <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={markAllOK}>
                ✔ Mark All OK
              </button>
              <button style={{ ...styles.btn, ...styles.btnWarning }} onClick={markSelected}>
                ✔ Mark Selected
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleRefresh}>
                🔄 Refresh
              </button>
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={clearFilter}>
                ❌ Clear
              </button>
              <button style={{ ...styles.btn, ...styles.btnPurple }} onClick={printExceptions}>
                🖨 Print Exceptions
              </button>
              <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={handleSave}>
                💾 Save
              </button>
              <button style={{ ...styles.btn, ...styles.btnWarning }} onClick={handleFinalize}>
                📦 Finalize Manifest
              </button>
              <button style={{ ...styles.btn, ...styles.btnDark }} onClick={exportCSV}>
                📊 Export Excel
              </button>
            </div>
          </div>
        </div> */}

        {/* ---- Grid ---- */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Manifest Docket Details</div>
          <div style={styles.panelBody}>
            <StatusGrid
              columns={docketColumns}
              rows={filteredDockets}
              rowColors={ROW_COLORS}
              onCellChange={handleCellChange}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
              minWidth={2100}
            />
          </div>
        </div>

        {/* ---- Footer ---- */}
        <div style={styles.footer}>
          <div>
            <b style={styles.footerBold}>Total Packages :</b>{" "}
            <span>{footerTotals.totalPackages}</span>
          </div>
          <div>
            <b style={styles.footerBold}>Total Weight :</b>{" "}
            <span>{footerTotals.totalWeight}</span> KG
          </div>
          <div>
            <b style={styles.footerBold}>Updated By :</b> ADMIN
          </div>
          <div>
            <b style={styles.footerBold}>Status :</b> OPEN
          </div>
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}