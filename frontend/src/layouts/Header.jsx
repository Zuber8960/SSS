import { useNavigate } from "react-router-dom";

export default function Header() {

  const navigate = useNavigate();

  const logout = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        height: "60px",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px"
      }}
    >
      <h3>Logistics ERP</h3>

      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
}