import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import {
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
} from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllItemGroups } from "../../utils/itemGroupMaster";
import {
  fetchAllItems,
  fetchNextItemCode,
  createItem,
  updateItem,
  deleteItem,
} from "../../utils/itemMaster";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options, disabled = false }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        sx={{ fontSize: 13 }}
      >
        {options.map((opt) => (
          <MenuItem
            key={typeof opt === "object" ? opt.value : opt}
            value={typeof opt === "object" ? opt.value : opt}
            sx={{ fontSize: 13 }}
          >
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const emptyForm = {
  rec_id: "",
  item_code: "",
  item_desc: "",
  item_category: "",
  item_group_code: "",
  item_group_category: "",
  account_code: "",
  expiry_date: "",
  status: "VL",
  rate: "",
  labor: "",
  gst_rate: "",
  battery_flag: "N",
  sac_hsn_flag: "",
};

export default function ItemPage() {
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [isEditing, setIsEditing] = useState(false);
  const [original, setOriginal] = useState(null);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const groupOptions = groups
    .filter((g) => g.item_group_code !== "7777")
    .map((g) => ({
      value: g.item_group_code,
      label: `${g.item_group_code} > ${g.item_group_desc}${g.item_group_category ? ` > ${g.item_group_category}` : ""}`,
    }));

  const onGroupChange = (name, value) => {
    const group = groups.find((g) => g.item_group_code === value);
    setForm((prev) => ({
      ...prev,
      item_group_code: value,
      item_group_category: group?.item_group_category || "",
    }));
  };

  const loadList = async () => {
    const data = await fetchAllItems();
    setRows(Array.isArray(data) ? data : []);
  };

  const loadNextCode = async () => {
    const code = await fetchNextItemCode();
    setForm((prev) => ({ ...emptyForm, item_code: code }));
  };

  const clearForm = async () => {
    setIsEditing(false);
    setOriginal(null);
    try {
      await loadNextCode();
    } catch (err) {
      setForm({ ...emptyForm });
      showError(err.message || "Failed to load next item code");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [itemData, groupData] = await Promise.all([fetchAllItems(), fetchAllItemGroups()]);
        setRows(Array.isArray(itemData) ? itemData : []);
        setGroups(Array.isArray(groupData) ? groupData : []);
        const code = await fetchNextItemCode();
        setForm({ ...emptyForm, item_code: code });
      } catch (err) {
        showError(err.message || "Failed to load items");
      }
    })();
  }, []);

  const save = async () => {
    if (!form.item_code?.trim()) {
      showError("Please enter Item Code");
      return;
    }
    if (!form.item_desc?.trim()) {
      showError("Please enter Item Desc");
      return;
    }
    if (!form.item_group_code) {
      showError("Please select Item Group Code");
      return;
    }
    if (!form.sac_hsn_flag) {
      showError("Please select Goods (HSN) or Services (SAC)");
      return;
    }
    if (form.labor !== "" && Number(form.labor) > 3000) {
      showError("Labour Charge can not be greater than 3000/-");
      return;
    }
    const payload = {
      ...form,
      item_code: form.item_code.trim().toUpperCase(),
      item_desc: form.item_desc.trim().toUpperCase(),
      item_category: form.item_category.trim().toUpperCase(),
      account_code: form.account_code.trim().toUpperCase(),
    };
    try {
      if (isEditing && original?.rec_id) {
        const updated = await updateItem(original.rec_id, payload);
        const updatedRow = Array.isArray(updated) ? updated[0] : updated;
        setRows((prev) => prev.map((r) => (String(r.rec_id) === String(original.rec_id) ? updatedRow : r)));
        showSuccess("Record updated successfully");
      } else {
        const created = await createItem(payload);
        const createdRows = Array.isArray(created) ? created : [created];
        setRows((prev) => [...prev, ...createdRows]);
        showSuccess("Record saved successfully");
      }
      await loadList();
      await clearForm();
    } catch (err) {
      showError(err.message || "Failed to save item");
    }
  };

  const editRow = (row) => {
    setForm({
      rec_id: row.rec_id ?? "",
      item_code: row.item_code ?? "",
      item_desc: row.item_desc ?? "",
      item_category: row.item_category ?? "",
      item_group_code: row.item_group_code ?? "",
      item_group_category: row.item_group_category ?? "",
      account_code: row.account_code ?? "",
      expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "",
      status: row.status || "VL",
      rate: row.rate ?? "",
      labor: row.labor ?? "",
      gst_rate: row.gst_rate ?? "",
      battery_flag: row.battery_flag || "N",
      sac_hsn_flag: row.sac_hsn_flag || "",
    });
    setOriginal(row);
    setIsEditing(true);
  };

  const handleDelete = (rec_id) => {
    showWarning("Delete Item", "Are you sure you want to delete this item?", async () => {
      try {
        await deleteItem(rec_id);
        setRows((prev) => prev.filter((x) => String(x.rec_id) !== String(rec_id)));
        if (String(original?.rec_id) === String(rec_id)) await clearForm();
        showSuccess("Item deleted successfully");
      } catch (err) {
        showError(err.message || "Failed to delete item");
      }
    });
  };

  const filtered = rows.filter((x) => {
    const q = searchText.toLowerCase();
    return (
      String(x.item_code || "").toLowerCase().includes(q) ||
      String(x.item_desc || "").toLowerCase().includes(q) ||
      String(x.item_group_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <PageBody title="Item Master">
        <PageToolbar
          actions={[
            { label: "Add New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: isEditing ? "Update" : "Save", icon: <SaveIcon />, onClick: save },
          ]}
          search={{ placeholder: "Search item...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <TextField
            size="small"
            label="Item Code"
            fullWidth
            sx={fieldSx}
            value={form.item_code}
            disabled={isEditing}
            onChange={(e) => setField("item_code", e.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label="Item Desc"
            fullWidth
            sx={fieldSx}
            value={form.item_desc}
            onChange={(e) => setField("item_desc", e.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label="Item Category"
            fullWidth
            sx={fieldSx}
            value={form.item_category}
            onChange={(e) => setField("item_category", e.target.value.toUpperCase())}
          />
          <MuiSelect
            label="Item Group Code"
            name="item_group_code"
            value={form.item_group_code}
            onChange={onGroupChange}
            options={[{ value: "", label: "[Select]" }, ...groupOptions]}
          />
          <TextField
            size="small"
            label="Item Group Category"
            fullWidth
            sx={fieldSx}
            value={form.item_group_category}
            disabled
          />
          <TextField
            size="small"
            label="Account Code"
            fullWidth
            sx={fieldSx}
            inputProps={{ maxLength: 5 }}
            value={form.account_code}
            onChange={(e) => setField("account_code", e.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label="Expiry Date"
            type="date"
            fullWidth
            sx={fieldSx}
            value={form.expiry_date}
            onChange={(e) => setField("expiry_date", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <MuiSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={setField}
            options={[
              { value: "VL", label: "Valid" },
              { value: "NV", label: "Un-Valid" },
            ]}
          />
          <TextField
            size="small"
            label="Rate"
            fullWidth
            sx={fieldSx}
            value={form.rate}
            onChange={(e) => setField("rate", e.target.value)}
          />
          <TextField
            size="small"
            label="Labour Charge"
            fullWidth
            sx={fieldSx}
            value={form.labor}
            onChange={(e) => setField("labor", e.target.value)}
          />
          <MuiSelect
            label="GST Rate"
            name="gst_rate"
            value={form.gst_rate}
            onChange={setField}
            options={[
              { value: "", label: "Select" },
              { value: "0", label: "0" },
              { value: "5", label: "5" },
              { value: "12", label: "12" },
              { value: "18", label: "18" },
              { value: "28", label: "28" },
            ]}
          />
          <MuiSelect
            label="Battery"
            name="battery_flag"
            value={form.battery_flag}
            onChange={setField}
            options={[
              { value: "N", label: "No" },
              { value: "Y", label: "Yes" },
            ]}
          />
          <FormControl>
            <FormLabel sx={{ fontSize: 13 }}>Option</FormLabel>
            <RadioGroup
              row
              value={form.sac_hsn_flag}
              onChange={(e) => setField("sac_hsn_flag", e.target.value)}
            >
              <FormControlLabel value="HSN" control={<Radio size="small" />} label="Goods" />
              <FormControlLabel value="SAC" control={<Radio size="small" />} label="Services" />
            </RadioGroup>
          </FormControl>
        </FormPanel>

        <DataTable
          columns={[
            { key: "item_code", label: "Code" },
            { key: "item_desc", label: "Desc" },
            { key: "item_group_code", label: "Group" },
            { key: "item_category", label: "Cat." },
            { key: "status", label: "Status" },
            { key: "rate", label: "Rate" },
            { key: "labor", label: "Labour" },
            { key: "gst_rate", label: "GST" },
          ]}
          rows={filtered}
          getKey={(row) => row.rec_id}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editRow },
            { label: "Delete", icon: <DeleteIcon />, onClick: (row) => handleDelete(row.rec_id) },
          ]}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
