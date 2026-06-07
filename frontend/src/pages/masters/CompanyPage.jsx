import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  SearchBox,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";

export default function CompanyPage() {

  const [companies, setCompanies] = useState([
    {
      companyCode: "1001",
      companyName: "ABC Logistics Pvt Ltd",
      state: "Uttar Pradesh",
      city: "Noida",
      panNo: "ABCDE1234F",
      gstNo: "09ABCDE1234F1Z5",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    companyCode: "",
    companyName: "",
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
      companyCode: "",
      companyName: "",
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
  };

  const saveCompany = () => {

    if (!form.companyCode || !form.companyName) {
      alert("Company Code and Company Name are required");
      return;
    }

    setCompanies([...companies, form]);
    clearForm();
  };

  const editCompany = (row) => {
    setForm(row);
  };

  const deleteCompany = (companyCode) => {

    if (!window.confirm("Delete Company ?"))
      return;

    setCompanies(
      companies.filter(
        x => x.companyCode !== companyCode
      )
    );
  };

  const filteredCompanies = companies.filter(
    (x) =>
      x.companyCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.companyName.toLowerCase().includes(searchText.toLowerCase())
  );

  const companyColumns = [
    { key: "companyCode", label: "Code" },
    { key: "companyName", label: "Company" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
  ];

  const companyActions = [
    { label: "Edit", onClick: editCompany },
    { label: "Delete", onClick: (row) => deleteCompany(row.companyCode) },
  ];

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
          <FormField label="Company Code" name="companyCode" form={form} setForm={setForm} />
          <FormField label="Company Name" name="companyName" form={form} setForm={setForm} />
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
          getKey={(row) => row.companyCode}
          actions={companyActions}
        />
      </PageBody>
    </MainLayout>
  );
}