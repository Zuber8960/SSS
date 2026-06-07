import "../../styles/MasterPage.css";

const pageStyle = { padding: "10px" };
const toolbarStyle = { display: "flex", gap: "10px", marginBottom: "15px" };
const searchStyle = { width: "300px", padding: "8px", marginBottom: "15px" };
const panelStyle = {
  border: "1px solid #ddd",
  padding: "15px",
  borderRadius: "5px",
  marginBottom: "20px",
};
const tableStyle = { borderCollapse: "collapse" };

export function PageBody({ title, children }) {
  return (
    <div className="pageBody">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function PageToolbar({ actions }) {
  return (
    <div className="pageToolbar">
      {actions.map((action) => (
        <button key={action.label} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="searchBox"
    />
  );
}

export function FormPanel({ children, columns = "150px 300px 150px 300px" }) {
  return (
    <div className="formPanel">
      <div className="formGrid">
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, name, form, setForm, type = "text", options }) {
  const updateField = (value) => setForm({ ...form, [name]: value });

  return (
    <div className="formFieldGroup">
      <label>{label}</label>
      {options ? (
        <select value={form[name]} onChange={(e) => updateField(e.target.value)}>
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[name]}
          onChange={(e) => updateField(e.target.value)}
          placeholder={`Enter ${label}`}
        />
      )}
    </div>
  );
}

export function DataTable({ columns, rows, getKey, actions }) {
  return (
    <div className="dataTableWrapper">
      <table className="dataTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {actions?.length ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions?.length ? 1 : 0)} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={getKey(row, index)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
                {actions?.length ? (
                  <td>
                    <div className="tableActions">
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => action.onClick(row, index)}
                          className={action.label.toLowerCase() === "delete" ? "deleteBtn" : "editBtn"}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
