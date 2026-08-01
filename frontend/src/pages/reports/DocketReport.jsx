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
import { fetchAllDockets } from "../../utils/docket";
import { fetchAllLocations } from "../../utils/locationMaster";
import { RefreshIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Chip, Box } from "@mui/material";
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

  const [allDockets, setAllDockets] = useState([]);
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");

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
    return branchDockets.map((d) => ({
      ...d,
      docket_date: toDate(d.docket_date),
      docket_tot_pkgs: d.docket_tot_pkgs ?? d.total_pkgs ?? "",
      docket_act_wt: d.docket_act_wt ?? d.actual_wt ?? "",
      docket_chrg_wt: d.docket_chrg_wt ?? "",
      docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
      docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
      delivery_status: d.delivery_status || "Pending",
    }));
  }, [branchDockets]);

  const handleRefresh = () => {
    loadDockets();
  };

  return (
    <MainLayout>
      <PageBody title="Docket Report">
        {/* ── Toolbar ── */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </div>

          <Box sx={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {branchName && (
              <Chip
                label={`Branch: ${branchName}`}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
            <Chip
              label={`${branchDockets.length} docket(s)`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
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
          />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading dockets..." />
      </PageBody>
    </MainLayout>
  );
}