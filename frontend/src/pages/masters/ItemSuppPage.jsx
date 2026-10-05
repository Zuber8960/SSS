import { useEffect, useState } from "react";
import { SaveIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllItemGroups } from "../../utils/itemGroupMaster";
import { fetchAllItems } from "../../utils/itemMaster";
import {
  fetchItemSuppliers,
  fetchSuppList,
  saveItemSuppliers,
} from "../../utils/itemSuppMaster";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

const blankRow = (index, itemAmt = 0) => ({
  id: `new-${index}-${Date.now()}`,
  rec_id: "",
  row_type: "N",
  supp_code: "",
  supplier_name: "",
  item_uom: "",
  item_weight: "",
  item_pack_type: "",
  item_pack_qty: "",
  item_amt: itemAmt || 0,
  valid_to: today(),
  status: "VL",
});

export default function ItemSuppPage() {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemGroupCode, setItemGroupCode] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

  const locCode = (() => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null")?.loc_code || "";
    } catch {
      return "";
    }
  })();

  // Objects so the open dropdown matches the cell label ("CODE > NAME").
  const supplierOptions = [
    { value: "", label: "[Select]" },
    ...suppliers.map((s) => ({ value: s.supp_code, label: s.label })),
  ];
  const supplierLabel = (code) => {
    const s = suppliers.find((x) => x.supp_code === code);
    return s ? s.label : code || "";
  };

  useEffect(() => {
    (async () => {
      try {
        const [g, s] = await Promise.all([fetchAllItemGroups(), fetchSuppList(locCode)]);
        setGroups(Array.isArray(g) ? g : []);
        setSuppliers(Array.isArray(s) ? s : []);
      } catch (err) {
        showError(err.message || "Failed to load masters");
      }
    })();
  }, []);

  const onGroupChange = async (value) => {
    setItemGroupCode(value);
    setItemCode("");
    setRows([]);
    setSelectedIds([]);
    if (!value) {
      setItems([]);
      return;
    }
    try {
      const data = await fetchAllItems({ item_group_code: value });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err.message || "Failed to load items");
    }
  };

  const onItemChange = async (value) => {
    setItemCode(value);
    setSelectedIds([]);
    if (!value) {
      setRows([]);
      return;
    }
    try {
      const existing = await fetchItemSuppliers(value);
      const item = items.find((i) => String(i.item_code) === String(value));
      const rate = item?.rate ?? 0;
      const existingRows = (Array.isArray(existing) ? existing : []).map((r) => ({
        ...r,
        id: `old-${r.rec_id}`,
        row_type: "O",
      }));
      setRows([...Array.from({ length: 4 }, (_, i) => blankRow(i, rate)), ...existingRows]);
    } catch (err) {
      showError(err.message || "Failed to load item suppliers");
    }
  };

  const clearForm = () => {
    setItemGroupCode("");
    setItemCode("");
    setItems([]);
    setRows([]);
    setSelectedIds([]);
  };

  const save = async () => {
    if (!itemGroupCode) {
      showError("Please select Item Group Code");
      return;
    }
    if (!itemCode) {
      showError("Please select Item Code");
      return;
    }
    const selected = rows.filter((r) => selectedIds.includes(r.id) && r.supp_code);
    if (!selected.length) {
      showError("Please tick at least one row with a supplier");
      return;
    }
    try {
      const result = await saveItemSuppliers({ item_code: itemCode, loc_code: locCode, rows: selected });
      showSuccess(result?.message || "Record saved");
      await onItemChange(itemCode);
    } catch (err) {
      showError(err.message || "Failed to save");
    }
  };

  const onSelectionChange = (model) => {
    if (Array.isArray(model)) setSelectedIds(model);
    else if (model?.ids) setSelectedIds(Array.from(model.ids));
    else setSelectedIds([]);
  };

  return (
    <MainLayout>
      <PageBody title="Item Supp Master">
        <PageToolbar
          actions={[
            { label: "Save", icon: <SaveIcon />, onClick: save },
            { label: "Clear", onClick: clearForm },
          ]}
        />
        <FormPanel>
          <MuiSelect
            label="Item Group Code"
            value={itemGroupCode}
            onChange={onGroupChange}
            options={[
              { value: "", label: "[Select]" },
              ...groups.map((g) => ({
                value: g.item_group_code,
                label: `${g.item_group_code} > ${g.item_group_desc || ""}`,
              })),
            ]}
          />
          <MuiSelect
            label="Item Code"
            value={itemCode}
            onChange={onItemChange}
            options={[
              { value: "", label: "[Select]" },
              ...items.map((i) => ({
                value: i.item_code,
                label: `${i.item_code} > ${i.item_category || ""} > ${i.item_desc || ""} > ${i.rate ?? ""}`,
              })),
            ]}
          />
        </FormPanel>

        <DataTable
          checkboxSelection
          editable
          columns={[
            {
              key: "supp_code",
              label: "Supp Code",
              minWidth: 180,
              editable: true,
              options: supplierOptions,
              render: (row) => supplierLabel(row.supp_code),
            },
            { key: "item_uom", label: "Item UOM", editable: true, minWidth: 100 },
            { key: "item_weight", label: "Item Weight", editable: true, minWidth: 110 },
            { key: "item_pack_type", label: "Item Pack Type", editable: true, minWidth: 120 },
            { key: "item_pack_qty", label: "Item Pack Qty", editable: true, minWidth: 110 },
            { key: "item_amt", label: "Item Amt.", editable: true, minWidth: 100 },
            { key: "valid_to", label: "Valid To", editable: true, isDate: true, minWidth: 120 },
            {
              key: "status",
              label: "Status",
              editable: true,
              minWidth: 100,
              options: [
                { value: "VL", label: "Valid" },
                { value: "NV", label: "Un-Valid" },
              ],
              render: (row) => (row.status === "NV" ? "Un-Valid" : row.status === "VL" ? "Valid" : row.status),
            },
          ]}
          rows={rows}
          getKey={(row) => row.id}
          onRowUpdate={async (newRow) => {
            setRows((prev) => prev.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r)));
            return newRow;
          }}
          onRowSelectionModelChange={onSelectionChange}
          isHeight={320}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
