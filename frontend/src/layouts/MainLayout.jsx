import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onToggleMobile={closeMobileSidebar}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Header
          onToggleSidebar={toggleMobileSidebar}
          isMobileSidebarOpen={mobileSidebarOpen}
        />

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ padding: "0px" }}>
            {children}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

