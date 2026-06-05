import MainLayout from "../layouts/MainLayout";

export default function DashboardPage() {

  return (
    <MainLayout>

      <h1>Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "20px"
        }}
      >
        <div style={{ border: "1px solid #ddd", padding: "20px" }}>
          Active Trips
          <h2>125</h2>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "20px" }}>
          Today's Booking
          <h2>845</h2>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "20px" }}>
          Running Vehicles
          <h2>92</h2>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "20px" }}>
          POD Pending
          <h2>34</h2>
        </div>

      </div>

    </MainLayout>
  );
}