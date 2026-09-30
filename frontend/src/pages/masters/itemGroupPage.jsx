import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { TextField } from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import {
  fetchAllItemGroups,
  fetchNextItemGroupCode,
  createItemGroup,
  updateItemGroup,
  deleteItemGroup,
} from "../../utils/itemGroupMaster";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

const emptyForm = {
  rec_id: "",
  item_group_code: "",
  item_group_desc: "",
  item_group_category: "",
};

export default function ItemGroupPage() {
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [isEditing, setIsEditing] = useState(false);
  const [original, setOriginal] = useState(null);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const loadList = async () => {
    const data = await fetchAllItemGroups();
    setRows(Array.isArray(data) ? data : []);
  };

  const loadNextCode = async () => {
    const code = await fetchNextItemGroupCode();
    setForm((prev) => ({ ...emptyForm, item_group_code: code }));
  };

  const clearForm = async () => {
    setIsEditing(false);
    setOriginal(null);
    try {
      await loadNextCode();
    } catch (err) {
      setForm({ ...emptyForm });
      showError(err.message || "Failed to load next item group code");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadList(), loadNextCode()]);
      } catch (err) {
        showError(err.message || "Failed to load item groups");
      }
    })();
  }, []);

  const save = async () => {
    if (!form.item_group_code?.trim()) {
      showError("Please enter Item Group Code");
      return;
    }
    if (!form.item_group_desc?.trim()) {
      showError("Please enter Item Group Desc");
      return;
    }
    const payload = {
      item_group_code: form.item_group_code,
      item_group_desc: form.item_group_desc.trim().toUpperCase(),
      item_group_category: form.item_group_category.trim().toUpperCase(),
    };
    try {
      if (isEditing && original?.rec_id) {
        const updated = await updateItemGroup(original.rec_id, payload);
        const updatedRow = Array.isArray(updated) ? updated[0] : updated;
        setRows((prev) => prev.map((r) => (r.rec_id === original.rec_id ? updatedRow : r)));
        showSuccess("Record updated successfully");
      } else {
        const created = await createItemGroup(payload);
        const createdRows = Array.isArray(created) ? created : [created];
        setRows((prev) => [...prev, ...createdRows]);
        showSuccess("Record saved successfully");
      }
      await clearForm();
    } catch (err) {
      showError(err.message || "Failed to save item group");
    }
  };

  const editRow = (row) => {
    setForm({
      rec_id: row.rec_id ?? "",
      item_group_code: row.item_group_code ?? "",
      item_group_desc: row.item_group_desc ?? "",
      item_group_category: row.item_group_category ?? "",
    });
    setOriginal(row);
    setIsEditing(true);
  };

  const handleDelete = (rec_id) => {
    showWarning("Delete Item Group", "Are you sure you want to delete this item group?", async () => {
      try {
        await deleteItemGroup(rec_id);
        setRows((prev) => prev.filter((x) => x.rec_id !== rec_id));
        if (original?.rec_id === rec_id) await clearForm();
        showSuccess("Item group deleted successfully");
      } catch (err) {
        showError(err.message || "Failed to delete item group");
      }
    });
  };

  const filtered = rows.filter((x) => {
    const q = searchText.toLowerCase();
    return (
      String(x.item_group_code || "").toLowerCase().includes(q) ||
      String(x.item_group_desc || "").toLowerCase().includes(q) ||
      String(x.item_group_category || "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <PageBody title="Item Group Master">
        <PageToolbar
          actions={[
            { label: "Add New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: isEditing ? "Update" : "Save", icon: <SaveIcon />, onClick: save },
          ]}
          search={{ placeholder: "Search item group...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <TextField
            size="small"
            label="Item Group Code"
            fullWidth
            sx={fieldSx}
            value={form.item_group_code}
            disabled={isEditing}
            onChange={(e) => setField("item_group_code", e.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label="Item Group Desc"
            fullWidth
            sx={fieldSx}
            value={form.item_group_desc}
            onChange={(e) => setField("item_group_desc", e.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label="Item Group Category"
            fullWidth
            sx={fieldSx}
            value={form.item_group_category}
            onChange={(e) => setField("item_group_category", e.target.value.toUpperCase())}
          />
        </FormPanel>

        <DataTable
          columns={[
            { key: "item_group_code", label: "Item Group Code" },
            { key: "item_group_desc", label: "Item Group Desc" },
            { key: "item_group_category", label: "Item Group Category" },
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
