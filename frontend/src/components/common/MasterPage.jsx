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
    <div style={pageStyle}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function PageToolbar({ actions }) {
  return (
    <div style={toolbarStyle}>
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
      style={searchStyle}
    />
  );
}

export function FormPanel({ children, columns = "150px 300px 150px 300px" }) {
  return (
    <div style={panelStyle}>
      <div style={{ display: "grid", gridTemplateColumns: columns, gap: "10px" }}>
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, name, form, setForm, type = "text", options }) {
  const updateField = (value) => setForm({ ...form, [name]: value });

  return (
    <>
      <label>{label}</label>
      {options ? (
        <select value={form[name]} onChange={(e) => updateField(e.target.value)}>
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
        />
      )}
    </>
  );
}

export function DataTable({ columns, rows, getKey, actions }) {
  return (
    <table width="100%" border="1" cellPadding="8" style={tableStyle}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} width={column.width}>
              {column.label}
            </th>
          ))}
          {actions?.length ? <th width="150">Action</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={getKey(row, index)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
            ))}
            {actions?.length ? (
              <td>
                {actions.map((action, actionIndex) => (
                  <button
                    key={action.label}
                    onClick={() => action.onClick(row, index)}
                    style={actionIndex ? { marginLeft: "5px" } : undefined}
                  >
                    {action.label}
                  </button>
                ))}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
