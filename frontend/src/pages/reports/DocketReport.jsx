import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  DataTable,
  PageBody,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchAllDockets, fetchCharges } from "../../utils/docket";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { RefreshIcon, PrintIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Chip, Button, TextField, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { printDocket } from "../../components/common/DocketPrint";
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

export default function DocketReport() {
  const { dialog, closeAlert, showError } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const branchCode = (() => {
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    return currentUser?.location_id || localStorage.getItem("loc_code") || "";
  })();

  const [allDockets, setAllDockets]   = useState([]);
  const [selectedRow, setSelectedRow]   = useState(null);
  const [printAnchor, setPrintAnchor]   = useState(null);
  const [company, setCompany]           = useState(null);
  const [locations, setLocations]     = useState([]);
  const [searchText, setSearchText]   = useState("");

  // Used only by the Refresh button — shows loading indicator
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

  // Initial mount — call fetches in .then() so no setState is synchronous in effect body
  useEffect(() => {
    fetchAllDockets(true)
      .then((data) => setAllDockets(Array.isArray(data) ? data : []))
      .catch((err) => showError(err.message || "Failed to fetch dockets"));
    fetchAllLocations()
      .then((locs) => setLocations(locs))
      .catch((err) => console.error("Failed to load locations:", err));
    fetchAllCompanies()
      .then((data) => { if (data?.length) setCompany(data[0]); })
      .catch((err) => console.error("Failed to load company:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branchDockets = useMemo(() => {
    if (!branchCode) return allDockets;
    return allDockets.filter(
      (d) => (d.docket_loc || "").toLowerCase() === branchCode.toLowerCase()
    );
  }, [allDockets, branchCode]);

  const gridRows = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return branchDockets
      .map((d, index) => {
        const row = {
          ...d,
          docket_date:        toDate(d.docket_date),
          docket_tot_pkgs:    d.docket_tot_pkgs ?? d.total_pkgs ?? "",
          docket_act_wt:      d.docket_act_wt ?? d.actual_wt ?? "",
          docket_chrg_wt:     d.docket_chrg_wt ?? "",
          docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
          docket_dly_town:    d.docket_dly_town || d.docket_to_town || "",
          delivery_status:    d.delivery_status || "Pending",
        };
        row.id = row.docket_no + (row.docket_date || "") + index;
        return row;
      })
      .filter((row) => !q || [
        row.docket_no, row.cnor_name, row.cnee_name,
        row.docket_pickup_town, row.docket_dly_town,
        row.docket_loc, row.docket_to_loc, row.delivery_status,
      ].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [branchDockets, searchText]);

  const handleRefresh = () => {
    setSelectedRow(null);
    loadDockets();
  };

  const handleRowSelection = (selectionModel) => {
    // MUI DataGrid v9: selectionModel = { type: 'include'|'exclude', ids: Set<GridRowId> }
    const ids = [...(selectionModel?.ids ?? selectionModel ?? [])];
    if (ids.length > 0) {
      setSelectedRow(gridRows.find((r) => r.id === ids[ids.length - 1]) || null);
    } else {
      setSelectedRow(null);
    }
  };

  const handlePrint = async (withFreight) => {
    if (!selectedRow) {
      showError("Please select a docket to print");
      return;
    }
    try {
      showLoading();
      const d = selectedRow;

      const form = {
        docket_no:        d.docket_no,
        docket_date:      d.docket_date,
        docket_loc:       d.docket_loc,
        docket_from_town: d.docket_pickup_town || d.docket_from_town,
        docket_to_loc:    d.docket_to_loc,
        docket_to_town:   d.docket_dly_town || d.docket_to_town,
        pay_type:         d.docket_pay_type,
        pay_loc:          d.docket_pay_loc,
        transit_type:     d.docket_transit_type,
        load_type:        d.docket_load_type,
        cnor_name:        d.cnor_name,
        cnor_address:     d.cnor_address,
        cnor_city:        d.cnor_city,
        cnor_state:       d.cnor_state,
        cnor_pincode:     d.cnor_pincode,
        cnor_gstin:       d.cnor_gstin,
        cnee_name:        d.cnee_name,
        cnee_address:     d.cnee_address,
        cnee_city:        d.cnee_city,
        cnee_state:       d.cnee_state,
        cnee_pincode:     d.cnee_pincode,
        cnee_gstin:       d.cnee_gstin,
        dly_type:         d.docket_dly_type,
        act_wt:           d.docket_act_wt,
        chrg_wt:          d.docket_chrg_wt,
        tot_pkgs:         d.docket_tot_pkgs,
        goods_desc:       d.docket_goods_desc,
        invoice_no:       d.docket_inv_no,
        invoice_date:     d.docket_inv_date,
        invoice_value:    d.docket_inv_value,
        remark:           d.docket_remark,
      };

      let charges = [];
      if (withFreight) {
        const result = await fetchCharges(d.docket_no);
        charges = Array.isArray(result) ? result : [];
      }

      const ewbList = d.ewb_no || d.eway_bill_no
        ? [{ ewb_no: d.ewb_no || d.eway_bill_no, ewb_valid: d.ewb_valid, vehicle_no: d.desp_veh_no || "" }]
        : [];

      printDocket({
        form,
        charges,
        ewbList,
        ewbNoDisplay: d.ewb_no || d.eway_bill_no || "",
        company,
        locations,
        copies: ["Consignor Copy", "Consignee Copy", "Driver Copy"],
      });
    } catch (err) {
      showError(err.message || "Failed to print docket");
      console.error("Print docket error:", err);
    } finally {
      hideLoading();
    }
  };

  return (
    <MainLayout>
      <PageBody title="Docket Report">
        {/* ── Toolbar ── */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <TextField
              size="small"
              placeholder="Search docket, consignor, town..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setSelectedRow(null); }}
              sx={{
                minWidth: 260,
                "& .MuiInputBase-input": { fontSize: 13 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#7e22ce" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#7e22ce" },
              }}
            />

            <Chip label={`${gridRows.length} docket(s)`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            {selectedRow && (
              <Chip label={`Selected: ${selectedRow.docket_no}`} size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="contained"
              endIcon={<ArrowDropDownIcon />}
              startIcon={<PrintIcon />}
              onClick={(e) => setPrintAnchor(e.currentTarget)}
              sx={{
                background: "linear-gradient(135deg, #7e22ce, #a855f7)",
                "&:hover": { background: "linear-gradient(135deg, #6b21a8, #9333ea)" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Print
            </Button>
            <Menu
              anchorEl={printAnchor}
              open={Boolean(printAnchor)}
              onClose={() => setPrintAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(true); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print with Freight</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(false); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print without Freight</ListItemText>
              </MenuItem>
            </Menu>
          </div>
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
            disableMultipleRowSelection
            onRowSelectionModelChange={handleRowSelection}
          />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading dockets..." />
      </PageBody>
    </MainLayout>
  );
}
