import './NotFoundPage.css';

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <span className="not-found-page__icon" aria-hidden="true">
        🛸
      </span>
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
    </section>
  );
}

export default NotFoundPage;
