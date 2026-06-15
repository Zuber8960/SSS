import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header />

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
