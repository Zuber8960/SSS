import { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  SearchBox,
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

export default function CompanyPage() {

  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalCompany, setOriginalCompany] = useState(null);

  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();

  const [form, setForm] = useState({
    company_code: "",
    company_name: "",
    regAddress: "",
    state: "",
    city: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    panNo: "",
    gstNo: "",
    tanNo: "",
    openedOn: "",
    closedOn: "",
    status: "Active"
  });

  const clearForm = () => {
    setForm({
      company_code: "",
      company_name: "",
      regAddress: "",
      state: "",
      city: "",
      pincode: "",
      phone: "",
      email: "",
      website: "",
      panNo: "",
      gstNo: "",
      tanNo: "",
      openedOn: "",
      closedOn: "",
      status: "Active"
    });
    setIsEditing(false);
    setOriginalCompany(null);
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllCompanies();
      setCompanies(data);
    } catch (err) {
      setError(err.message || "Failed to load companies");
      console.error("Load companies error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async () => {
    if (!form.company_code || !form.company_name) {
      showError("Company Code and Company Name are required");
      return;
    }

    const payload = {
      ...form,
      pincode: form.pincode ? Number(form.pincode) : null,
      phone: form.phone ? Number(form.phone) : null,
    };

    try {
      if (isEditing && originalCompany?.company_code) {
        await updateCompany(originalCompany.company_code, payload);
        setCompanies((prev) =>
          prev.map((company) =>
            company.company_code === originalCompany.company_code ? payload : company
          )
        );
        showSuccess("Company updated successfully");
      } else {
        const created = await createCompany(payload);
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

  const deleteCompany = async (company_code) => {
    if (!window.confirm("Delete Company ?")) return;

    try {
      await deleteCompany(company_code);
      setCompanies((prev) => prev.filter((x) => x.company_code !== company_code));
      showSuccess("Company deleted successfully");
    } catch (err) {
      setError(err.message || "Failed to delete company");
      showError(err.message || "Failed to delete company");
      console.error("Delete company error:", err);
    }
  };

  const filteredCompanies = companies.filter(
    (x) =>
      x.company_code.toLowerCase().includes(searchText.toLowerCase()) ||
      x.company_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const companyColumns = [
    { key: "company_code", label: "Code" },
    { key: "company_name", label: "Company" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
  ];

  const companyActions = [
    { label: "Edit", onClick: editCompany },
    { label: "Delete", onClick: (row) => deleteCompany(row.company_code) },
  ];

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Company Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveCompany },
            { label: "Export", onClick: () => alert("Export not implemented yet") },
          ]}
        />

        <SearchBox
          placeholder="Search Company..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Company Code" name="company_code" form={form} setForm={setForm} />
          <FormField label="Company Name" name="company_name" form={form} setForm={setForm} />
          <FormField label="Address" name="regAddress" form={form} setForm={setForm} />
          <FormField label="State" name="state" form={form} setForm={setForm} />
          <FormField label="City" name="city" form={form} setForm={setForm} />
          <FormField label="Pincode" name="pincode" form={form} setForm={setForm} />
          <FormField label="Phone" name="phone" form={form} setForm={setForm} />
          <FormField label="Email" name="email" form={form} setForm={setForm} />
          <FormField label="Website" name="website" form={form} setForm={setForm} />
          <FormField label="PAN No" name="panNo" form={form} setForm={setForm} />
          <FormField label="GST No" name="gstNo" form={form} setForm={setForm} />
          <FormField label="TAN No" name="tanNo" form={form} setForm={setForm} />
          <FormField label="Opened On" name="openedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Closed On" name="closedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Status" name="status" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={companyColumns}
          rows={filteredCompanies}
          getKey={(row) => row.company_code}
          actions={companyActions}
        />
      </PageBody>
    </MainLayout>
  );
}