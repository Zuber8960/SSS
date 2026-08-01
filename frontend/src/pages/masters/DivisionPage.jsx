import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { fetchAllDivisionsApi, saveDivisionApi, updateDivisionApi, deleteDivisionApi } from "../../utils/divisionMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt} sx={{ fontSize: 13 }}>
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const emptyDivisionForm = {
  rec_id: "", company_code: "", division_code: "", division_name: "",
  division_short_name: "", opened_on: "", closed_on: "", status: "A",
};

const mapDivisionToForm = (row) => ({
  rec_id: row.rec_id ?? "",
  company_code: row.company_code ?? "",
  division_code: row.division_code ?? "",
  division_name: row.division_name ?? "",
  division_short_name: row.division_short_name ?? "",
  opened_on: row.opened_on ? row.opened_on.slice(0, 10) : "",
  closed_on: row.closed_on ? row.closed_on.slice(0, 10) : "",
  status: row.status ?? "A",
});

export default function DivisionPage() {
  const [divisions, setDivisions] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState(emptyDivisionForm);
  const [isEditing, setIsEditing] = useState(false);
  const [originalDivision, setOriginalDivision] = useState(null);
  const [, setError] = useState("");
  const [, setLoading] = useState(true);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const clearForm = () => {
    setForm(emptyDivisionForm);
    setIsEditing(false);
    setOriginalDivision(null);
  };

  const saveDivision = async () => {
    if (!form.company_code) { showError("Company Code is required"); return; }
    if (!form.division_code) { showError("Division Code is required"); return; }
    if (!form.division_name) { showError("Division Name is required"); return; }
    if (form.opened_on && form.closed_on && new Date(form.opened_on) > new Date(form.closed_on)) {
      showError("Opened On date cannot be later than Closed On date");
      return;
    }
    const payload = {
      ...form,
      opened_on: form.opened_on ? new Date(form.opened_on) : null,
      closed_on: form.closed_on ? new Date(form.closed_on) : null,
    };
    try {
      if (isEditing && (originalDivision?.rec_id || originalDivision?.division_code)) {
        const divisionId = originalDivision.rec_id || originalDivision.division_code;
        await updateDivisionApi(divisionId, payload);
        setDivisions((prev) =>
          prev.map((div) => (div.rec_id || div.division_code) === divisionId ? form : div)
        );
        showSuccess("Division updated successfully");
      } else {
        await saveDivisionApi(payload);
        setDivisions((prev) => [...prev, form]);
        showSuccess("Division saved successfully");
      }
      clearForm();
    } catch (error) {
      showError(error.message || "Failed to save division");
      console.error("Save division error:", error);
    }
  };

  const editDivision = (row) => {
    setForm(mapDivisionToForm(row));
    setOriginalDivision(row);
    setIsEditing(true);
  };

  const deleteDivision = async (divisionCode) => {
    showWarning("Confirm Delete", "Delete Division ?", async () => {
      try {
        await deleteDivisionApi(divisionCode);
        setDivisions((prev) => prev.filter((x) => (x.rec_id || x.division_code) !== divisionCode));
        showSuccess("Division deleted successfully");
      } catch (error) {
        showError(error.message || "Failed to delete division");
        console.error("Delete division error:", error);
      }
    });
  };

  const filteredDivisions = searchText ? divisions.filter(
    (x) =>
      String(x.division_code ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.division_name ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.division_short_name ?? "").toLowerCase().includes(searchText.toLowerCase())
  ) : divisions;

  const divisionColumns = [
    { key: "company_code", label: "Company Code" },
    { key: "division_code", label: "Division Code" },
    { key: "division_name", label: "Division Name" },
    { key: "division_short_name", label: "Short Name" },
    { key: "status", label: "Status" },
  ];

  useEffect(() => {
    const loadDivisionsAtMount = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllDivisionsApi();
        setDivisions(data);
      } catch (err) {
        setError(err.message || "Failed to load divisions");
        console.error("Error loading divisions:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDivisionsAtMount();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Division Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveDivision },
            { label: "Export", icon: <ExportIcon />, onClick: () => alert("Export not implemented yet") },
          ]}
          search={{ placeholder: "Search Division...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <TextField size="small" label="Company Code" fullWidth sx={fieldSx} type="number"
            value={form.company_code} onChange={(e) => setField("company_code", e.target.value)} />
          <TextField size="small" label="Division Code" fullWidth sx={fieldSx} type="number"
            value={form.division_code} onChange={(e) => setField("division_code", e.target.value)} />
          <TextField size="small" label="Division Name" fullWidth sx={fieldSx}
            value={form.division_name} onChange={(e) => setField("division_name", e.target.value)} />
          <TextField size="small" label="Short Name" fullWidth sx={fieldSx}
            value={form.division_short_name} onChange={(e) => setField("division_short_name", e.target.value)} />
          <TextField size="small" label="Opened On" type="date" fullWidth sx={fieldSx}
            value={form.opened_on} onChange={(e) => setField("opened_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Closed On" type="date" fullWidth sx={fieldSx}
            value={form.closed_on} onChange={(e) => setField("closed_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
          <MuiSelect label="Status" name="status" value={form.status} onChange={setField}
            options={[{ label: "Active", value: "A" }, { label: "Inactive", value: "I" }]} />
        </FormPanel>

        <DataTable
          columns={divisionColumns}
          rows={filteredDivisions}
          getKey={(row) => row.rec_id || row.division_code}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editDivision },
            { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deleteDivision(row.rec_id) },
          ]}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
