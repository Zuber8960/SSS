import { DataTable } from "../../../components/common/MasterPage";
import useAlert from "../../../components/common/UseAlert";

const ewbColumns = [
  { key: "ewb_no", label: "EWB No" },
  { key: "ewb_date", label: "EWB Date" },
  { key: "ewb_valid", label: "Valid Upto" },
  { key: "inv_no", label: "Invoice No" },
  { key: "inv_date", label: "Invoice Date" },
];

export default function EwayBillSection({
  ewbList,
  onAdd,
  onDelete,
  onCellChange,
  buttonStyle,
  sectionHeaderStyle,
  sectionActionsStyle,
}) {
  const { showSuccess } = useAlert();

  const handleSave = () => {
    console.log("Save EWB Data:", { ewbList });
    showSuccess("EWB saved successfully (console log)");
  };

  return (
    <div>
      <div style={sectionHeaderStyle}>
        <h3>EWB Details</h3>
        <div style={sectionActionsStyle}>
          <button type="button" onClick={onAdd} style={buttonStyle}>
            Add EWB
          </button>
          <button type="button" onClick={handleSave} style={buttonStyle}>
            Save
          </button>
        </div>
      </div>
      <DataTable
        columns={ewbColumns}
        rows={ewbList}
        getKey={(row, idx) => idx}
        actions={[{ label: "Delete", onClick: onDelete }]}
        editable
        singleClick
        onCellChange={onCellChange}
      />
    </div>
  );
}
