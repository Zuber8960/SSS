import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon, RefreshIcon, AddRowIcon, ResetIcon, ViewIcon, AddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import {
  fetchAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../../utils/companyMaster";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

export default function CompanyPage() {

  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalCompany, setOriginalCompany] = useState(null);

  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();

  const [form, setForm] = useState({
    rec_id: "",
    company_name: "",
    regoff_address: "",
    regoff_state_code: "",
    regoff_city_code: "",
    regoff_pincode_code: "",
    mobile_no: "",
    email_id: "",
    website: "",
    pan_no: "",
    gstin_no: "",
    tan_no: "",
    opened_on: "",
    closed_on: "",
    status: "Active"
  });

  const clearForm = () => {
    setForm({
      rec_id: "",
      company_name: "",
      regoff_address: "",
      regoff_state_code: "",
      regoff_city_code: "",
      regoff_pincode_code: "",
      mobile_no: "",
      email_id: "",
      website: "",
      pan_no: "",
      gstin_no: "",
      tan_no: "",
      opened_on: "",
      closed_on: "",
      status: "Active"
    });
    setIsEditing(false);
    setOriginalCompany(null);
  };

  const saveCompany = async () => {
    if (!form.company_name) {
      showError("Company Name is required");
      return;
    }

    const payload = {
      ...form,
      status: form.status === "Active" ? "A" : "I",
      closed_on: form.closed_on || null,
      opened_on: form.opened_on || null,
    };

    try {
      if (isEditing && originalCompany?.rec_id) {
        const updated = await updateCompany(originalCompany.rec_id, payload);
        const updatedRow = Array.isArray(updated) ? updated[0] : updated;
        setCompanies((prev) =>
          prev.map((company) =>
            company.rec_id === originalCompany.rec_id ? updatedRow : company
          )
        );
        showSuccess("Company updated successfully");
      } else {
        delete payload.rec_id; // Ensure rec_id is not sent for new records
        const created = await createCompany({ ...payload});
        setCompanies((prev) => [...prev, ...(Array.isArray(created) ? created : [created])]);
        showSuccess("Company created successfully");
      }
      clearForm();
    } catch (err) {
      setError(err.message || "Failed to save company");
      showError(err.message || "Failed to save company");
      console.error("Save company error:", err);
    }
  };

  const editCompany = (row) => {
    setForm(row);
    setOriginalCompany(row);
    setIsEditing(true);
  };

  const handleDeleteCompany = (rec_id) => {
    showWarning(
      "Delete Company",
      "Are you sure you want to delete this company ?",
      async () => {
        try {
          await deleteCompany(rec_id);
          setCompanies((prev) => prev.filter((x) => x.rec_id !== rec_id));
          showSuccess("Company deleted successfully");
        } catch (err) {
          setError(err.message || "Failed to delete company");
          showError(err.message || "Failed to delete company");
          console.error("Delete company error:", err);
        }
      }
    );
  };

  const filteredCompanies = companies.filter(
    (x) => x.company_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const companyColumns = [
    { key: "company_name", label: "Company" },
    { key: "regoff_state_code", label: "State" },
    { key: "regoff_city_code", label: "City" },
    { key: "status", label: "Status" },
  ];

  const companyActions = [
    { label: "Edit", icon: <EditIcon />, onClick: editCompany },
    { label: "Delete", icon: <DeleteIcon />, onClick: (row) => handleDeleteCompany(row.rec_id) },
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllCompanies();
        setCompanies(data);
      } catch (err) {
        setError(err.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Company Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveCompany },
            { label: "Export", icon: <ExportIcon />, onClick: () => alert("Export not implemented yet") },
          ]}
          search={{ placeholder: "Search Company...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <FormField label="Company Name" name="company_name" form={form} setForm={setForm} />
          <FormField label="Address" name="regoff_address" form={form} setForm={setForm} />
          <FormField label="State" name="regoff_state_code" form={form} setForm={setForm} />
          <FormField label="City" name="regoff_city_code" form={form} setForm={setForm} />
          <FormField label="Pincode" name="regoff_pincode_code" form={form} setForm={setForm} />
          <FormField label="Phone" name="mobile_no" form={form} setForm={setForm} />
          <FormField label="Email" name="email_id" form={form} setForm={setForm} />
          <FormField label="Website" name="website" form={form} setForm={setForm} />
          <FormField label="PAN No" name="pan_no" form={form} setForm={setForm} />
          <FormField label="GST No" name="gstin_no" form={form} setForm={setForm} />
          <FormField label="TAN No" name="tan_no" form={form} setForm={setForm} />
          <FormField label="Opened On" name="opened_on" form={form} setForm={setForm} type="date" />
          <FormField label="Closed On" name="closed_on" form={form} setForm={setForm} type="date" />
          <FormField label="Status" name="status" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={companyColumns}
          rows={filteredCompanies}
          getKey={(row) => row.rec_id}
          actions={companyActions}
        />
      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}