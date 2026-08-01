import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  DataTable,
  PageBody,
  ToggleSwitch,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchAllDockets, fetchCharges } from "../../utils/docket";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { getTenantConfig } from "../../utils/tenantService";
import { RefreshIcon, PrintIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Chip, Box, Button } from "@mui/material";
import moment from "moment";

const docketColumns = [
  { key: "docket_no", label: "Docket No", minWidth: 120 },
  { key: "docket_date", label: "Docket Date", minWidth: 110 },
  { key: "docket_loc", label: "From Location", minWidth: 120 },
  { key: "docket_pickup_town", label: "From Town", minWidth: 120 },
  { key: "docket_to_loc", label: "To Location", minWidth: 120 },
  { key: "docket_dly_town", label: "To Town", minWidth: 120 },
  { key: "cnor_name", label: "Consignor", minWidth: 150 },
  { key: "cnee_name", label: "Consignee", minWidth: 150 },
  { key: "docket_tot_pkgs", label: "Packages", minWidth: 90 },
  { key: "docket_act_wt", label: "Actual Wt", minWidth: 90 },
  { key: "docket_chrg_wt", label: "Charged Wt", minWidth: 100 },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 100 },
  { key: "docket_load_type", label: "Load Type", minWidth: 100 },
  { key: "docket_transit_type", label: "Transit Type", minWidth: 110 },
  { key: "docket_rate", label: "Rate", minWidth: 80 },
  { key: "docket_rate_uom", label: "Rate UOM", minWidth: 90 },
  { key: "docket_tot_amt", label: "Total Amount", minWidth: 110 },
  { key: "delivery_status", label: "Delivery Status", minWidth: 130 },
  { key: "docket_remark", label: "Remarks", minWidth: 150 },
];

const toDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format("DD-MM-YYYY") : val;
};

const fmt = (val) => val || "";
const fmtAmt = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export default function DocketReport() {
  const { dialog, closeAlert, showError } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [allDockets, setAllDockets] = useState([]);
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [withCharges, setWithCharges] = useState(false);
  const [company, setCompany] = useState(null);

  // Get logged-in branch (location) from localStorage
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    const locCode = currentUser?.location_id || localStorage.getItem("loc_code") || "";
    setBranchCode(locCode);

    fetchAllLocations()
      .then((locs) => {
        const match = locs.find((l) => l.loc_code === locCode);
        if (match) setBranchName(`${match.loc_code} - ${match.loc_name}`);
      })
      .catch((err) => console.error("Failed to load locations:", err));

    fetchAllCompanies()
      .then((data) => { if (data?.length) setCompany(data[0]); })
      .catch((err) => console.error("Failed to load company:", err));
  }, []);

  // Fetch all dockets on mount
  useEffect(() => {
    loadDockets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDockets = async () => {
    try {
      showLoading();
      const data = await fetchAllDockets(true);
      setAllDockets(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err.message || "Failed to fetch dockets");
      console.error("Fetch dockets error:", err);
    } finally {
      hideLoading();
    }
  };

  // Filter dockets by logged-in branch (docket_loc === branchCode)
  const branchDockets = useMemo(() => {
    if (!branchCode) return allDockets;
    return allDockets.filter(
      (d) => (d.docket_loc || "").toLowerCase() === branchCode.toLowerCase()
    );
  }, [allDockets, branchCode]);

  // Map rows for the grid
  const gridRows = useMemo(() => {
    return branchDockets.map((d, index) => {
      const row = {
        ...d,
        docket_date: toDate(d.docket_date),
        docket_tot_pkgs: d.docket_tot_pkgs ?? d.total_pkgs ?? "",
        docket_act_wt: d.docket_act_wt ?? d.actual_wt ?? "",
        docket_chrg_wt: d.docket_chrg_wt ?? "",
        docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
        docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
        delivery_status: d.delivery_status || "Pending",
      };
      row.id = row.docket_no + (row.docket_date || "") + index;
      return row;
    });
  }, [branchDockets]);

  const handleRefresh = () => {
    setSelectedRow(null);
    loadDockets();
  };

  // Single-row selection: keep only the last selected row
  const handleRowSelection = (selectionModel) => {
    if (selectionModel && selectionModel.length > 0) {
      const lastId = selectionModel[selectionModel.length - 1];
      const row = gridRows.find((r) => r.id === lastId);
      setSelectedRow(row || null);
    } else {
      setSelectedRow(null);
    }
  };

  // Handle row click for single selection (no checkbox)
  const handleRowClick = (params) => {
    const row = gridRows.find((r) => r.id === params.id);
    if (row) {
      setSelectedRow(row);
    }
  };

  const handlePrint = async () => {
    if (!selectedRow) {
      showError("Please select a docket to print");
      return;
    }

    try {
      showLoading();
      const d = selectedRow;
      let charges = [];
      if (withCharges) {
        charges = await fetchCharges(d.docket_no);
        if (!Array.isArray(charges)) charges = [];
      }

      const tenantConfig = getTenantConfig();
      const logoUrl = tenantConfig?.logo_url || "";
      const co = company || {};
      const coName = co.company_name || tenantConfig?.tenant_name || "";
      const coAddr = [co.regoff_address, co.regoff_city_code, co.regoff_state_code, co.regoff_pincode_code].filter(Boolean).join(", ");
      const coGstin = co.gstin_no || "";
      const coPan = co.pan_no || "";
      const coPhone = co.mobile_no || "";
      const coEmail = co.email_id || "";

      const currentLocCode = JSON.parse(localStorage.getItem("current_user") || "null")?.location_id
        || localStorage.getItem("loc_code") || "";
      const currentLoc = branchName || currentLocCode;

      const chargeRows = [
        "Freight @", "GR_Charges", "Hamali", "Delivery Chrg",
        "Collection_chrg", "Detn Chrg", "Other Chrg",
      ];
      const chargeMap = {};
      charges.forEach((c) => { chargeMap[c.charge_name || c.charge_code] = c.charge_amt; });
      const totalFreight = charges.reduce((s, c) => s + (parseFloat(c.charge_amt) || 0), 0);

      const slipHtml = (copyLabel) => `
        <div class="slip">
          <div class="slip-inner">
            <!-- Header -->
            <div class="header-row">
              <div class="logo-col">
                ${logoUrl ? `<img src="${logoUrl}" alt="logo" class="co-logo" />` : ""}
              </div>
              <div class="company-block">
                <div class="company-name">${fmt(coName)}</div>
                ${coAddr ? `<div class="company-addr">${coAddr}</div>` : ""}
                <div class="company-contact">
                  ${coGstin ? `GSTIN: ${coGstin}` : ""}${coPan ? ` &nbsp;|&nbsp; PAN: ${coPan}` : ""}
                </div>
                <div class="company-contact">
                  ${coEmail ? `&#9993; ${coEmail}` : ""}${coPhone ? ` &nbsp; &#9990; ${coPhone}` : ""}
                </div>
              </div>
              <div class="cn-block">
                <div class="cn-title">CONSIGNMENT</div>
                <div class="cn-barcode">&#9632;&#9632;&#9632;&#9632;&#9632;&#9632;&#9632;&#9632;&#9632;</div>
                <div class="cn-no">${fmt(d.docket_no)}</div>
                <div class="cn-billed">${fmt(d.docket_pay_type)}</div>
              </div>
            </div>

            <!-- Route row -->
            <table class="route-table">
              <thead>
                <tr>
                  <th>ORIGIN</th><th>DESTINATION</th><th>DISPATCH MODE</th>
                  <th>BILLING STATION</th><th>C/N DATE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${fmt(d.docket_pickup_town || d.docket_loc)}</td>
                  <td>${fmt(d.docket_dly_town || d.docket_to_loc)}</td>
                  <td>${fmt(d.docket_transit_type)}</td>
                  <td>${fmt(d.docket_pay_loc)}</td>
                  <td>${fmt(d.docket_date)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Consignor / Consignee -->
            <div class="party-row">
              <div class="party-box">
                <div class="party-title">CONSIGNOR</div>
                <div class="party-name">${fmt(d.cnor_name)}</div>
                <div class="party-addr">${fmt(d.cnor_address)}${d.cnor_city ? ", " + d.cnor_city : ""}${d.cnor_state ? ", " + d.cnor_state : ""}${d.cnor_pincode ? " - " + d.cnor_pincode : ""}</div>
                <div class="party-gstin">GSTIN: ${fmt(d.cnor_gstin)}</div>
              </div>
              <div class="party-box">
                <div class="party-title">CONSIGNEE</div>
                <div class="party-name">${fmt(d.cnee_name)}</div>
                <div class="party-addr">${fmt(d.cnee_address)}${d.cnee_city ? ", " + d.cnee_city : ""}${d.cnee_state ? ", " + d.cnee_state : ""}${d.cnee_pincode ? " - " + d.cnee_pincode : ""}</div>
                <div class="party-gstin">GSTIN: ${fmt(d.cnee_gstin)}</div>
              </div>
            </div>

            <!-- Package / Charges row -->
            <div class="pkg-charges-row">
              <div class="pkg-section">
                <table class="pkg-table">
                  <tbody>
                    <tr>
                      <td class="pkg-label">Delivery To</td>
                      <td colspan="2">${fmt(d.docket_dly_type)}</td>
                      <td class="pkg-label">ACTUAL WEIGHT</td>
                      <td>${fmt(d.docket_act_wt)} Kg</td>
                      <td class="pkg-label">CHARGE WEIGHT</td>
                      <td>${fmt(d.docket_chrg_wt)} Kg</td>
                      <td class="pkg-label">PACKAGE</td>
                      <td>${fmt(d.docket_tot_pkgs)} - ${fmt(d.docket_goods_desc || "Nag")}</td>
                    </tr>
                    <tr>
                      <td class="pkg-label">Inv No</td>
                      <td class="pkg-label">Inv Date</td>
                      <td class="pkg-label">Inv Value</td>
                      <td colspan="2" class="pkg-label">Eway Bill No.</td>
                      <td colspan="4" class="pkg-label">Expiry</td>
                    </tr>
                    <tr>
                      <td>${fmt(d.docket_inv_no)}</td>
                      <td>${fmt(d.docket_inv_date)}</td>
                      <td>${fmt(d.docket_inv_value)}</td>
                      <td colspan="2">${fmt(d.ewb_no || d.eway_bill_no)}</td>
                      <td colspan="4">${fmt(d.ewb_valid)}</td>
                    </tr>
                    <tr>
                      <td class="pkg-label" colspan="9">Remark</td>
                    </tr>
                    <tr>
                      <td colspan="9">${fmt(d.docket_remark)}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="note-block">
                  <strong>NOTE:</strong><br/>
                  * NOT RESPONSIBLE FOR LEAKAGE OR BREAKAGE<br/>
                  * Subject To ${fmt(currentLoc)} Jurisdiction Only.<br/>
                  * Please Make Payment By Cheque In Favour Of ${fmt(coName)}.
                </div>
              </div>
              ${withCharges ? `
              <div class="charges-section">
                <table class="charges-table">
                  <thead>
                    <tr><th>Freight Details</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    ${chargeRows.map((name) => `
                      <tr>
                        <td>${name}</td>
                        <td class="amt-cell">${chargeMap[name] ? fmtAmt(chargeMap[name]) : "0"}</td>
                      </tr>
                    `).join("")}
                    <tr><td>Total Freight</td><td class="amt-cell">${fmtAmt(totalFreight)}</td></tr>
                    <tr class="total-row"><td>Total Freight</td><td class="amt-cell">&#8377; ${fmtAmt(totalFreight)}</td></tr>
                    <tr><td colspan="2" class="company-footer">${fmt(coName)}</td></tr>
                  </tbody>
                </table>
              </div>
              ` : ""}
            </div>

            <!-- Copy label & sign -->
            <div class="copy-footer">
              <span class="copy-label">${copyLabel}</span>
              <span class="auth-sign">Auth. Sign.</span>
            </div>
          </div>
        </div>
      `;

      const printWindow = window.open("", "_blank", "width=900,height=1200");
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Consignment - ${d.docket_no || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 8px; background: #fff; }
    @page { size: A4 portrait; margin: 6mm; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    .page { width: 210mm; padding: 4mm; }
    .slip { border: 1px solid #333; margin-bottom: 4px; page-break-inside: avoid; }
    .slip-inner { padding: 4px 6px; }

    /* Header */
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #333; padding-bottom: 3px; margin-bottom: 3px; gap: 6px; }
    .logo-col { display: flex; align-items: center; justify-content: center; min-width: 48px; }
    .co-logo { max-height: 48px; max-width: 80px; object-fit: contain; }
    .company-block { flex: 1; }
    .company-name { font-size: 11px; font-weight: bold; }
    .company-addr, .company-contact { font-size: 7px; }
    .cn-block { text-align: right; min-width: 100px; }
    .cn-title { font-size: 9px; font-weight: bold; border: 1px solid #333; padding: 1px 4px; background: #eee; }
    .cn-barcode { font-size: 14px; letter-spacing: -2px; color: #222; }
    .cn-no { font-size: 10px; font-weight: bold; }
    .cn-billed { font-size: 7px; }

    /* Route table */
    .route-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; font-size: 7px; }
    .route-table th, .route-table td { border: 1px solid #999; padding: 1px 3px; text-align: left; }
    .route-table th { background: #f0f0f0; font-weight: bold; }

    /* Party row */
    .party-row { display: flex; gap: 4px; margin-bottom: 3px; }
    .party-box { flex: 1; border: 1px solid #999; padding: 3px 4px; }
    .party-title { font-size: 7px; font-weight: bold; background: #f0f0f0; margin: -3px -4px 2px -4px; padding: 1px 4px; }
    .party-name { font-size: 8px; font-weight: bold; }
    .party-addr, .party-gstin, .party-state { font-size: 7px; }

    /* Package + charges */
    .pkg-charges-row { display: flex; gap: 4px; margin-bottom: 3px; }
    .pkg-section { flex: 1; }
    .pkg-table { width: 100%; border-collapse: collapse; font-size: 7px; margin-bottom: 3px; }
    .pkg-table td { border: 1px solid #999; padding: 1px 3px; }
    .pkg-label { background: #f0f0f0; font-weight: bold; white-space: nowrap; }
    .note-block { font-size: 6.5px; border: 1px solid #999; padding: 2px 4px; }
    .charges-section { min-width: 110px; }
    .charges-table { width: 100%; border-collapse: collapse; font-size: 7px; }
    .charges-table th, .charges-table td { border: 1px solid #999; padding: 1px 3px; }
    .charges-table th { background: #f0f0f0; }
    .amt-cell { text-align: right; }
    .total-row td { font-weight: bold; background: #f9f9f9; }
    .company-footer { font-size: 6.5px; text-align: center; font-weight: bold; }

    /* Footer */
    .copy-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #999; padding-top: 2px; margin-top: 2px; }
    .copy-label { font-size: 9px; font-weight: bold; color: #c00; }
    .auth-sign { font-size: 7px; }

    /* Print button */
    .print-btn { display: block; margin: 10px auto; padding: 8px 24px; font-size: 14px; background: #7e22ce; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print(); window.close();">Print</button>
  <div class="page">
    ${slipHtml("Consignor Copy")}
    ${slipHtml("Consignee Copy")}
    ${slipHtml("Driver Copy")}
  </div>
</body>
</html>`);
      printWindow.document.close();
      hideLoading();
    } catch (err) {
      hideLoading();
      showError(err.message || "Failed to print docket");
      console.error("Print docket error:", err);
    }
  };

  return (
    <MainLayout>
      <PageBody title="Docket Report">
        {/* ── Toolbar ── */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <ToggleSwitch
              checked={withCharges}
              onChange={() => setWithCharges((prev) => !prev)}
              labelOn="With Charges"
              labelOff="Without Charges"
              size="small"
            />

            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{
                background: "linear-gradient(135deg, #7e22ce, #a855f7)",
                "&:hover": { background: "linear-gradient(135deg, #6b21a8, #9333ea)" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                ml: 1,
              }}
            >
              Print
            </Button>
          </div>

          <Box sx={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          
            <Chip
              label={`${branchDockets.length} docket(s)`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {selectedRow && (
              <Chip
                label={`Selected: ${selectedRow.docket_no}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </div>

        {/* ── Docket Grid ── */}
        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={docketColumns}
            rows={gridRows}
            getKey={(row, index) => row.docket_no + (row.docket_date || "") + index}
            actions={[]}
            autoHeight
            checkboxSelection
            singleSelection
            onRowClick={handleRowClick}
            onRowSelectionModelChange={handleRowSelection}
          />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading dockets..." />
      </PageBody>
    </MainLayout>
  );
}