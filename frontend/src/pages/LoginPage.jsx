
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {

  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {

    if (userId === "ADMIN" && password === "ADMIN") {
      navigate("/dashboard");
    } else {
      alert("Invalid User");
    }

  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5"
      }}
    >
      <div
        style={{
          width: "400px",
          padding: "30px",
          background: "#fff",
          borderRadius: "10px",
          boxShadow: "0 0 10px #ccc"
        }}
      >
        <h2>Logistics ERP</h2>

        <input
          style={{ width: "100%", padding: "10px" }}
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <br />
        <br />

        <input
          type="password"
          style={{ width: "100%", padding: "10px" }}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br />
        <br />

        <button
          style={{
            width: "100%",
            padding: "10px",
            cursor: "pointer"
          }}
          onClick={handleLogin}
        >
          Login
        </button>

      </div>
    </div>
  );
}