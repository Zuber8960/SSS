import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons broken by vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const originIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const destIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const vehicleIcon = new L.DivIcon({
  html: `<div style="width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 50%; box-shadow: 0 3px 10px rgba(0,0,0,0.4); border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 20px;">🚚</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -28],
  className: ''
});

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) map.fitBounds(coords, { padding: [40, 40] });
  }, [map, coords]);
  return null;
}

async function geocode(city, country = "India") {
  const q = encodeURIComponent(`${city}, ${country}`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { "Accept-Language": "en", "User-Agent": "logistics-erp" } }
  );
  const data = await res.json();
  if (!data.length) throw new Error(`Could not find location: ${city}`);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

async function getRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error("Route not found");
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

function getClosestPointOnRoute(lat, lng, route) {
  let closestPoint = route[0];
  let minDistance = Infinity;

  for (let i = 0; i < route.length; i++) {
    const dx = route[i][0] - lat;
    const dy = route[i][1] - lng;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = route[i];
    }
  }
  return closestPoint;
}

/**
 * RouteMap — reusable route map panel using OpenStreetMap + OSRM (free, no API key).
 *
 * Props:
 *   fromCity    {string}  — origin city/town name
 *   toCity      {string}  — destination city/town name
 *   country     {string}  — country for geocoding context (default: "India")
 *   height      {number}  — map height in px (default: 400)
 *   title       {string}  — header title (optional, auto-generated if omitted)
 *   subtitle    {string}  — extra info shown beside the title (e.g. vehicle no)
 *   onClose     {func}    — if provided, shows a close button and calls this on click
 *   routeColor  {string}  — polyline colour (default: "#7e22ce")
 *   currentLat  {number}  — current vehicle latitude (optional)
 *   currentLng  {number}  — current vehicle longitude (optional)
 */
export default function RouteMap({
  fromCity,
  toCity,
  country   = "India",
  height    = 400,
  title,
  subtitle,
  onClose,
  routeColor = "#7e22ce",
  currentLat,
  currentLng,
}) {
  const [status,    setStatus]    = useState("loading");
  const [fromCoord, setFromCoord] = useState(null);
  const [toCoord,   setToCoord]   = useState(null);
  const [route,     setRoute]     = useState([]);
  const [errMsg,    setErrMsg]    = useState("");

  useEffect(() => {
    if (!fromCity || !toCity) { setStatus("error"); setErrMsg("Origin and destination are required"); return; }
    let cancelled = false;
    Promise.all([geocode(fromCity, country), geocode(toCity, country)])
      .then(([from, to]) => {
        if (cancelled) return;
        setFromCoord(from);
        setToCoord(to);
        return getRoute(from, to)
          .then((pts) => { if (!cancelled) { setRoute(pts); setStatus("ready"); } })
          .catch(()  => { if (!cancelled) { setRoute([from, to]); setStatus("ready"); } });
      })
      .catch((e) => { if (!cancelled) { setErrMsg(e.message); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [fromCity, toCity, country]);

  const headerTitle = title || `${fromCity} → ${toCity}`;

  return (
    <div style={{
      marginTop: 16,
      border: "1.5px solid #e0e7ef",
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", background: "#f3e8ff", borderBottom: "1px solid #e0e7ef",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: routeColor, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={routeColor}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
          </svg>
          {headerTitle}
          {subtitle && <span style={{ marginLeft: 8, color: "#666", fontWeight: 400 }}>| {subtitle}</span>}
        </span>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: routeColor, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Map body */}
      <div style={{ height, position: "relative" }}>
        {status === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f8", zIndex: 10, fontSize: 14, color: "#555" }}>
            Loading map...
          </div>
        )}
        {status === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff1f1", zIndex: 10, fontSize: 14, color: "#dc2626" }}>
            {errMsg}
          </div>
        )}
        {status === "ready" && fromCoord && toCoord && (
          <MapContainer center={fromCoord} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={fromCoord} icon={originIcon}>
              <Popup>{fromCity} (Origin)</Popup>
            </Marker>
            <Marker position={toCoord} icon={destIcon}>
              <Popup>{toCity} (Destination)</Popup>
            </Marker>
            {route.length > 1 && (
              <Polyline positions={route} pathOptions={{ color: routeColor, weight: 4, opacity: 0.8 }} />
            )}
            {currentLat && currentLng && route.length > 0 && (
              <Marker position={getClosestPointOnRoute(currentLat, currentLng, route)} icon={vehicleIcon}>
                <Popup>Current Vehicle Location 🚛</Popup>
              </Marker>
            )}
            <FitBounds coords={[fromCoord, toCoord]} />
          </MapContainer>
        )}
      </div>
    </div>
  );
}
