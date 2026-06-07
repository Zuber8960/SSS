
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "../images/Cargo Yaan Logo.jpeg";
import Footer from "../layouts/Footer";

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
import { loginUser, resetPassword } from "../utils/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetUserId, setResetUserId] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await loginUser(userId, password);
      navigate("/dashboard");
      localStorage.setItem("current_user", JSON.stringify(response.user));
    } catch (err) {
      setError(err.message || "Invalid credentials");
      alert(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }

  };

  const handleResetPassword = async () => {
    try {
      if (!email || !mobileNo) {
        alert("Email and Mobile Number are required");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      console.log('Resetting password for:', { resetUserId, email, mobileNo, newPassword });
      const response = await resetPassword(resetUserId, email, mobileNo, newPassword);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      alert("Password reset successful");

      setShowForgot(false);
      setEmail("");
      setMobileNo("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
    <div
      style={{
        minHeight: "70vh",
        width: "90vw",
        display: "flex",
        alignItems: "stretch",
        padding: "1vh 0",
        margin: "0 auto",
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
          // background: "linear-gradient(135deg,#0ea5a4,#065f49)",
          background: "linear-gradient(180deg, #8e2de2, #c850c0, #a4508b)",
          color: "#ffffff",
          padding: 20
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div >
              <img src={logoImg} alt="Cargo Yaan" style={{ height: 126, width: 300 }} />
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
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setResetUserId(userId);
                  setShowForgot(true);
                }}
                style={{
                  color: "#0ea5a4",
                  textDecoration: "none"
                }}
              >
                Forgot password?
              </a>
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

      {showForgot && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999
          }}
        >
          <div
            style={{
              width: 420,
              background: "#fff",
              padding: 25,
              borderRadius: 12
            }}
          >
            <h3>Reset Password</h3>

            <div style={{ display: "grid", gap: 12 }}>
              <Field
                placeholder="User ID"
                value={resetUserId}
                onChange={(e) => setResetUserId(e.target.value)}
              />
              <Field
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Field
                placeholder="Mobile Number"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
              />

              <Field
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Field
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowForgot(false)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ccc"
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleResetPassword}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: "#0052cc",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      <Footer/>
      </>
  );
}