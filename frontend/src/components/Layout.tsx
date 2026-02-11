import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav style={{ display: "flex", gap: "15px", padding: "10px" }}>
        <Link to="/">Home</Link>
        <Link to="/availability">Parking</Link>
        <Link to="/charging">EV Charging</Link>
        <Link to="/reservation">Reservation</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/support">Support</Link>
        <Link to="/analytics">Analytics</Link>
      </nav>

      <hr />

      <main style={{ padding: "20px" }}>{children}</main>
    </div>
  );
}
