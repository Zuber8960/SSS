import { useState, useRef, useEffect, useCallback } from "react";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import CloseIcon from "@mui/icons-material/Close";
import { getTenantConfig } from "../utils/tenantService";
import Api from "../services/api";

const WELCOME = "Hi! I'm your logistics assistant 👋\nAsk me anything about dockets, manifests, reports, or how to use the system.";

export default function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const tenantConfig = getTenantConfig();
  const gradient = tenantConfig?.brand?.gradient || "linear-gradient(135deg, #7c3aed, #a855f7)";
  const primaryColor = tenantConfig?.brand?.primary_color || "#7c3aed";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // Exclude welcome message, keep last 10 to control token usage
      const history = nextMessages.filter((_, i) => i !== 0).slice(-10);
      const { data } = await Api.post("/ai/chat", { messages: history });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the AI service. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in your browser. Please use Chrome or Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      inputRef.current?.focus();
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      {/* FAB — sits above the Search button */}
      <button
        onClick={() => setOpen(true)}
        title="Saral AI Assistant"
        style={{
          position: "fixed",
          bottom: 92,
          right: 28,
          zIndex: 1200,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: gradient,
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.12)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.35)";
        }}
      >
        <SmartToyIcon style={{ fontSize: 24 }} />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 1300,
            width: "min(400px, calc(100vw - 24px))",
            height: "min(580px, calc(100vh - 80px))",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "aiSlideUp 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{ background: gradient, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SmartToyIcon style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Saral AI Assistant</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                {loading ? "Typing..." : "Online • Saral AI"}
              </div>
            </div>
            <button
              onClick={() => setMessages([{ role: "assistant", content: WELCOME }])}
              title="Clear chat"
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6 }}
            >
              <CloseIcon style={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, background: "#f6f7fb" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "9px 13px",
                    borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: msg.role === "user" ? primaryColor : "#fff",
                    color: msg.role === "user" ? "#fff" : "#1e1e2e",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 2px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map((j) => (
                    <span key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: primaryColor, display: "inline-block", animation: `aiDot 1.2s ${j * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send)"
              rows={1}
              style={{
                flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 10,
                padding: "8px 12px", fontSize: 13.5, resize: "none",
                outline: "none", fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 96, overflowY: "auto", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = primaryColor)}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />

            {/* Mic button */}
            <button
              onClick={toggleVoice}
              title={listening ? "Stop recording" : "Voice input"}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: listening ? "#ef4444" : "#f3f4f6",
                color: listening ? "#fff" : "#6b7280",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
                animation: listening ? "aiPulse 1s ease-in-out infinite" : "none",
              }}
            >
              <MicIcon style={{ fontSize: 18 }} />
            </button>

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: input.trim() && !loading ? gradient : "#e5e7eb",
                color: input.trim() && !loading ? "#fff" : "#9ca3af",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <SendIcon style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes aiPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </>
  );
}
