import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Smart Parking &amp; EV</div>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/availability">Availability</NavLink>
          <NavLink to="/reservation">Reserve</NavLink>
          <NavLink to="/charging">Charging</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/support">Support</NavLink>
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">Built for the SRMIST Smart Parking &amp; EV initiative.</footer>
    </div>
  );
}

export default Layout;
