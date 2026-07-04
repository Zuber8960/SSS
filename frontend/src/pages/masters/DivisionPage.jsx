import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  SearchBox,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import { fetchAllDivisionsApi, saveDivisionApi, updateDivisionApi, deleteDivisionApi } from "../../utils/divisionMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const emptyDivisionForm = {
  rec_id: "",
  company_code: "",
  division_code: "",
  division_name: "",
  division_short_name: "",
  opened_on: "",
  closed_on: "",
  status: "A",
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

  const clearForm = () => {
    setForm(emptyDivisionForm);
    setIsEditing(false);
    setOriginalDivision(null);
  };

  const saveDivision = async () => {
    if (!form.company_code) {
      showError("Company Code is required");
      return;
    }

    if (!form.division_code) {
      showError("Division Code is required");
      return;
    }

    if (!form.division_name) {
      showError("Division Name is required");
      return;
    }
    if (form.opened_on && form.closed_on && new Date(form.opened_on) > new Date(form.closed_on)) {
      showError("Opened On date cannot be later than Closed On date");
      return;
    }
    if (form.opened_on || form.closed_on) {
      form.opened_on = form.opened_on ? new Date(form.opened_on) : null;
      form.closed_on = form.closed_on ? new Date(form.closed_on) : null;
    }

    try {
      if (isEditing && (originalDivision?.rec_id || originalDivision?.division_code)) {
        const divisionId = originalDivision.rec_id || originalDivision.division_code;
        await updateDivisionApi(divisionId, form);
        setDivisions((prev) =>
          prev.map((div) =>
            (div.rec_id || div.division_code) === divisionId ? form : div
          )
        );
        showSuccess("Division updated successfully");
      } else {
        await saveDivisionApi(form);
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
    showWarning("Confirm Delete", "Delete Division ?",
      async () => {
        try {
          await deleteDivisionApi(divisionCode);
          setDivisions((prev) => prev.filter((x) => (x.rec_id || x.division_code) !== divisionCode));
          showSuccess("Division deleted successfully");
        } catch (error) {
          showError(error.message || "Failed to delete division");
          console.error("Delete division error:", error);
        }
      }
    );
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

  const divisionActions = [
    { label: "Edit", onClick: editDivision },
    { label: "Delete", onClick: (row) => deleteDivision(row.rec_id) },
  ];

  const [, setError] = useState("");
  const [, setLoading] = useState(true);

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
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveDivision },
            { label: "Export", onClick: () => alert("Export not implemented yet") },
          ]}
        />

        <SearchBox
          placeholder="Search Division..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Company Code" name="company_code" type="number" form={form} setForm={setForm} />
          <FormField label="Division Code" name="division_code" type="number" form={form} setForm={setForm} />
          <FormField label="Division Name" name="division_name" form={form} setForm={setForm} />
          <FormField label="Short Name" name="division_short_name" form={form} setForm={setForm} />
          <FormField label="Opened On" name="opened_on" form={form} setForm={setForm} type="date" />
          <FormField label="Closed On" name="closed_on" form={form} setForm={setForm} type="date" />
          <FormField
            label="Status"
            name="status"
            form={form}
            setForm={setForm}
            options={[
              { label: "Active", value: "A" },
              { label: "Inactive", value: "I" },
            ]}
          />
        </FormPanel>

        <DataTable
          columns={divisionColumns}
          rows={filteredDivisions}
          getKey={(row) => row.rec_id || row.division_code}
          actions={divisionActions}
        />
      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}

