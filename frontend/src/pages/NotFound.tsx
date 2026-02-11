import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="panel">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="button">
        Go home
      </Link>
    </section>
  );
}

export default NotFound;
