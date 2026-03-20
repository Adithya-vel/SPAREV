import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="panel">
      <p className="eyebrow">Error 404</p>
      <h1>Page not found</h1>
      <p>The route you requested is unavailable or may have been moved.</p>
      <Link to="/" className="button">
        Return to dashboard
      </Link>
    </section>
  );
}

export default NotFound;
