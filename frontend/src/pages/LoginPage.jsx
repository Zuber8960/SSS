
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "../images/Cargo Yaan Logo.jpeg";

function Logo({ className, style }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 0 }} className={className}>
      <img
        src={logoImg}
        alt="Cargo Yaan"
        style={{
          width: "300px",
          maxWidth: "65%",
          height: "auto",
          display: "block",
          margin: "0 auto"
        }}
      />
    </div>
  );
}

function Field({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 6,
        border: "1px solid #e0e0e0",
        boxSizing: "border-box"
      }}
    />
  );
}

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
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        padding: 0,
        background: "#f4f6f8"
      }}
    >
      {/* Left: Promo column (gradient) */}
      <div
        style={{
          flex: "1 1 420px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#0ea5a4,#065f49)",
          color: "#ffffff",
          padding: 40
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div >
              <img src={logoImg} alt="Cargo Yaan" style={{ height: 126,width:300 }} />
            </div>
          </div>

          <h5 style={{ fontSize: 40, margin: "6px 0 12px", textAlign: "center" }}>Cargo Yaan</h5>
          <p style={{ opacity: 0.95, marginBottom: 24 }}>Enterprise Resource Planning System</p>

          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: 18, borderRadius: 10 }}>
              <strong>Secure & Reliable</strong>
              <div style={{ opacity: 0.95 }}>Enterprise-grade security for your logistics operations</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.08)", padding: 18, borderRadius: 10 }}>
              <strong>Real-Time Analytics</strong>
              <div style={{ opacity: 0.95 }}>Track and optimize your business performance</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.08)", padding: 18, borderRadius: 10 }}>
              <strong>Unified Platform</strong>
              <div style={{ opacity: 0.95 }}>Streamline operations across all departments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login column */}
      <div
        style={{
          flex: "1 1 420px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10px 36px",
          
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 28,
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(33,37,41,0.08)",
            border: "2px solid #a6faf0"
          }}
        >
          <Logo />

          {/* <h2 style={{ textAlign: "left", margin: "6px 0 18px", color: "#203040" }}>
            Welcome Back
          </h2> */}

          <p style={{ margin: "0 0 12px", color: "#586672" }}>
            Sign in to access your account
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <Field
              placeholder="Username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />

            <Field
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#556" }}>
                <input type="checkbox" style={{ width: 16, height: 16 }} /> Remember me
              </label>
              <a href="#" style={{ color: "#0ea5a4", textDecoration: "none" }}>Forgot password?</a>
            </div>

            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#0052cc",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}