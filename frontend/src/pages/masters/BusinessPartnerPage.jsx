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
import { fetchAllBusinessPartners, saveBusinessPartner as saveBusinessPartnerApi, updateBusinessPartner as updateBusinessPartnerApi, deleteBusinessPartner as deleteBusinessPartnerApi } from "../../utils/businessPartner";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const emptyPartnerForm = {
  record_id: "",
  company_code: "",
  division_code: "",
  bp_type: "1",
  bp_registration_no: "",
  bp_tan_no: "",
  bp_status: "1",
};

const mapPartnerToForm = (row) => ({
  record_id: row.record_id ?? "",
  company_code: row.company_code ?? "",
  division_code: row.division_code ?? "",
  bp_type: row.bp_type ?? "1",
  bp_registration_no: row.bp_registration_no ?? "",
  bp_tan_no: row.bp_tan_no ?? "",
  bp_status: row.bp_status ?? "1",
});

export default function BusinessPartnerPage() {
  const [partners, setPartners] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState(emptyPartnerForm);

  const [isEditing, setIsEditing] = useState(false);
  const [originalPartner, setOriginalPartner] = useState(null);

  const clearForm = () => {
    setForm(emptyPartnerForm);
    setIsEditing(false);
    setOriginalPartner(null);
  };

  const savePartner = async () => {
    if (!form.bp_registration_no) {
      showError("Registration No Required");
      return;
    }
    if (!form.bp_type) {
      showError("Partner Type Required");
      return;
    }

    try {
      if (isEditing && originalPartner?.record_id) {
        await updateBusinessPartnerApi(originalPartner.record_id, form);
        setPartners((prev) =>
          prev.map((p) =>
            p.record_id === originalPartner.record_id ? form : p
          )
        );
        showSuccess("Business Partner updated successfully");
      } else {
        await saveBusinessPartnerApi(form);
        setPartners((prev) => [...prev, form]);
        showSuccess("Business Partner saved successfully");
      }

      clearForm();
    } catch (error) {
      showError(error.message || "Failed to save business partner");
      console.error("Save business partner error:", error);
    }
  };

  const editPartner = (row) => {
    setForm(mapPartnerToForm(row));
    setOriginalPartner(row);
    setIsEditing(true);
  };

  const deletePartner = async (recordId) => {
    showWarning("Confirm Delete", "Delete Business Partner ?",
      async () => {
        try {
          await deleteBusinessPartnerApi(recordId);
          setPartners((prev) => prev.filter((x) => x.record_id !== recordId));
          showSuccess("Business Partner deleted successfully");
        } catch (error) {
          showError(error.message || "Failed to delete business partner");
          console.error("Delete business partner error:", error);
        }
      }
    );
  };

  const filteredPartners = searchText ? partners.filter(
    (x) =>
      String(x.record_id ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.bp_registration_no ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.bp_tan_no ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.bp_type ?? "").toLowerCase().includes(searchText.toLowerCase())
  ) : partners;

  const partnerColumns = [
    { key: "record_id", label: "Record ID" },
    { key: "company_code", label: "Company Code" },
    { key: "division_code", label: "Division Code" },
    { key: "bp_type", label: "Type" },
    { key: "bp_registration_no", label: "Registration No" },
    { key: "bp_tan_no", label: "TAN No" },
    { key: "bp_status", label: "Status" },
  ];

  const partnerActions = [
    { label: "Edit", onClick: editPartner },
    { label: "Delete", onClick: (row) => deletePartner(row.record_id) },
  ];

  const [, setError] = useState("");
  const [, setLoading] = useState(true);

  useEffect(() => {
    const loadPartnersAtMount = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllBusinessPartners();
        setPartners(data);
      } catch (err) {
        setError(err.message || "Failed to load business partners");
        console.error("Error loading business partners:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPartnersAtMount();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Business Partner Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: savePartner },
            { label: "Export", onClick: () => alert("Export not implemented yet") },
          ]}
        />

        <SearchBox
          placeholder="Search Partner..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Company Code" name="company_code" form={form} setForm={setForm} />
          <FormField label="Division Code" name="division_code" form={form} setForm={setForm} />
          <FormField label="Partner Type" name="bp_type" form={form} setForm={setForm} />
          <FormField label="Registration No" name="bp_registration_no" form={form} setForm={setForm} />
          <FormField label="TAN No" name="bp_tan_no" form={form} setForm={setForm} />
          <FormField label="Status" name="bp_status" form={form} setForm={setForm} />
        </FormPanel>

        <DataTable
          columns={partnerColumns}
          rows={filteredPartners}
          getKey={(row) => row.record_id}
          actions={partnerActions}
        />
      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}
