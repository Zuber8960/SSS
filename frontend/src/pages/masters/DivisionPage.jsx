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

export default function DivisionPage() {

  const [divisions, setDivisions] = useState([
    {
      companyCode: "1001",
      companyName: "ABC Logistics Pvt Ltd",
      divisionCode: "101",
      divisionName: "Road Transport",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    companyCode: "",
    companyName: "",
    divisionCode: "",
    divisionName: "",
    openedOn: "",
    closedOn: "",
    status: "Active"
  });

  const clearForm = () => {
    setForm({
      companyCode: "",
      companyName: "",
      divisionCode: "",
      divisionName: "",
      openedOn: "",
      closedOn: "",
      status: "Active"
    });
  };

  const saveDivision = () => {

    if (!form.companyCode) {
      alert("Company Code is required");
      return;
    }

    if (!form.divisionCode) {
      alert("Division Code is required");
      return;
    }

    if (!form.divisionName) {
      alert("Division Name is required");
      return;
    }

    setDivisions([...divisions, form]);

    clearForm();
  };

  const editDivision = (row) => {
    setForm(row);
  };

  const deleteDivision = (divisionCode) => {

    if (!window.confirm("Delete Division ?"))
      return;

    setDivisions(
      divisions.filter(
        x => x.divisionCode !== divisionCode
      )
    );
  };

  const filteredDivisions = divisions.filter(
    (x) =>
      x.divisionCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.divisionName.toLowerCase().includes(searchText.toLowerCase())
  );

  const divisionColumns = [
    { key: "companyCode", label: "Company Code" },
    { key: "companyName", label: "Company Name" },
    { key: "divisionCode", label: "Division Code" },
    { key: "divisionName", label: "Division Name" },
    { key: "status", label: "Status" },
  ];

  const divisionActions = [
    { label: "Edit", onClick: editDivision },
    { label: "Delete", onClick: (row) => deleteDivision(row.divisionCode) },
  ];

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
          <FormField label="Company Code" name="companyCode" form={form} setForm={setForm} />
          <FormField label="Company Name" name="companyName" form={form} setForm={setForm} />
          <FormField label="Division Code" name="divisionCode" form={form} setForm={setForm} />
          <FormField label="Division Name" name="divisionName" form={form} setForm={setForm} />
          <FormField label="Opened On" name="openedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Closed On" name="closedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Status" name="status" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={divisionColumns}
          rows={filteredDivisions}
          getKey={(row) => row.divisionCode}
          actions={divisionActions}
        />
      </PageBody>
    </MainLayout>
  );
}