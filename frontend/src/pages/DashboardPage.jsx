import MainLayout from "../layouts/MainLayout";
import { PageBody } from "../components/common/MasterPage";

const dashboardCards = [
  { label: "Active Trips", value: 125 },
  { label: "Today's Booking", value: 845 },
  { label: "Running Vehicles", value: 92 },
  { label: "POD Pending", value: 34 },
];

export default function DashboardPage() {
  return (
    <MainLayout>
      <PageBody title="Dashboard">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "20px"
        }}
      >
        {dashboardCards.map((card) => (
          <div key={card.label} style={{ border: "1px solid #ddd", padding: "20px" }}>
            {card.label}
            <h2>{card.value}</h2>
          </div>
        ))}
      </div>
      </PageBody>
    </MainLayout>
  );
}
