import { NavLink } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link is-active" : "nav-link";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <span className="brand-mark" aria-hidden="true">SP</span>
          <div>
            <p className="brand-title">SPAREV</p>
            <p className="brand-subtitle">Smart Parking and EV Network</p>
          </div>
        </div>

        <nav className="nav-cluster" aria-label="Primary">
          <NavLink to="/" className={linkClass}>Home</NavLink>
          <NavLink to="/availability" className={linkClass}>Availability</NavLink>
          <NavLink to="/charging" className={linkClass}>Charging</NavLink>
          <NavLink to="/reservation" className={linkClass}>Reservation</NavLink>
          <NavLink to="/analytics" className={linkClass}>Analytics</NavLink>
          <NavLink to="/admin" className={linkClass}>Admin</NavLink>
          <NavLink to="/support" className={linkClass}>Support</NavLink>
        </nav>
      </header>

      <main className="content">{children}</main>

      <footer className="footer">
        <p>SPAREV Dashboard</p>
        <p>Reliable campus parking and EV charging operations.</p>
      </footer>
    </div>
  );
}
