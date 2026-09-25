import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import SecurityIcon from "@mui/icons-material/Security";
import TimelineIcon from "@mui/icons-material/Timeline";
import SpeedIcon from "@mui/icons-material/Speed";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import MedicationLiquidIcon from "@mui/icons-material/MedicationLiquid";
import ElectricCarIcon from "@mui/icons-material/ElectricCar";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import LanguageIcon from "@mui/icons-material/Language";
import TrainIcon from "@mui/icons-material/Train";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";

export const services = [
  {
    id: "ftls",
    title: "Full Truckload (FTL) Freight",
    icon: LocalShippingIcon,
    iconColor: "#ff7a00",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    accent: "#f97316",
    summary:
      "Nationwide linehaul freight with guaranteed truck placement within 2 hours, custom payload axles, and priority green-corridor permits.",
    bullets: ["Zero-transshipment direct dispatch", "Over-Dimensional Cargo (ODC) & heavy trailers", "Dedicated priority route planning"],
    tag: "High Velocity",
  },
  {
    id: "express",
    title: "Express Hub & Parcel Cargo",
    icon: SpeedIcon,
    iconColor: "#0284c7",
    gradient: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    accent: "#0284c7",
    summary:
      "Time-definite scheduled departures connecting industrial corridors overnight with automated barcode sortation and guaranteed arrival SLAs.",
    bullets: ["Daily scheduled line departure slots", "Automated sorter cross-docks", "Last-mile doorstep delivery networks"],
    tag: "Same/Next Day",
  },
  {
    id: "warehousing",
    title: "Grade-A Automated Warehousing",
    icon: WarehouseIcon,
    iconColor: "#10b981",
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    accent: "#10b981",
    summary:
      "Multi-client Grade-A fulfillment hubs featuring automated pallet shuttles, WMS integration, pick-pack operations, and bonded storage.",
    bullets: ["Automated inventory replenishment", "Custom bonded facility options", "Direct ERP & API warehouse bridge"],
    tag: "Turnkey 3PL",
  },
  {
    id: "coldchain",
    title: "Pharma & Agro Cold Chain",
    icon: AcUnitIcon,
    iconColor: "#06b6d4",
    gradient: "linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)",
    accent: "#0891b2",
    summary:
      "Active reefer trucks and temperature-controlled cross-docks engineered for life-saving vaccines, biologics, and premium agro exports.",
    bullets: ["-25°C to +25°C strict thermal integrity", "Pharma-grade GDP certified protocols", "IoT telemetry dual-sensor fail-safes"],
    tag: "Pharma Grade",
  },
  {
    id: "multimodal",
    title: "Rail & Coastal Green Corridors",
    icon: TrainIcon,
    iconColor: "#8b5cf6",
    gradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
    accent: "#8b5cf6",
    summary:
      "Eco-efficient bulk movement linking key industrial ports and inland container depots via scheduled freight trains and coastal vessels.",
    bullets: ["Heavy bulk tonnage economics", "35% lower carbon footprint per ton", "Direct inland railhead connections"],
    tag: "Eco Friendly",
  },
  {
    id: "aircargo",
    title: "Air Freight & Mission Critical",
    icon: FlightTakeoffIcon,
    iconColor: "#ec4899",
    gradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
    accent: "#db2777",
    summary:
      "Emergency air-charter and scheduled domestic cargo bookings for high-value automotive parts, avionics, and high-tech components.",
    bullets: ["Airport-to-factory priority lane", "Hand-carry courier escorts for high value", "Dedicated charter options"],
    tag: "Critical Speed",
  },
];

export const industries = [
  { name: "Automotive & Heavy Vehicles", icon: ElectricCarIcon, color: "#f97316", tag: "JIT Logistics" },
  { name: "Pharmaceuticals & Healthcare", icon: MedicationLiquidIcon, color: "#06b6d4", tag: "GDP Certified" },
  { name: "Heavy Engineering & Infra", icon: PrecisionManufacturingIcon, color: "#8b5cf6", tag: "ODC Trailers" },
  { name: "FMCG, Retail & E-Commerce", icon: ShoppingCartIcon, color: "#10b981", tag: "Rapid Sorter" },
  { name: "Solar & Clean Energy", icon: SolarPowerIcon, color: "#eab308", tag: "Project Cargo" },
  { name: "Chemicals & Petrochemicals", icon: SecurityIcon, color: "#ef4444", tag: "Hazmat Safe" },
  { name: "Hi-Tech & Electronics", icon: BusinessCenterIcon, color: "#3b82f6", tag: "High Security" },
  { name: "Global Trade & Exim", icon: LanguageIcon, color: "#a855f7", tag: "Port Linked" },
];

