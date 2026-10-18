import ErrorState from './ErrorState';
import './AuthForm.css';

function AuthForm({
  title,
  subtitle,
  submitLabel,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  error,
  passwordAutoComplete = 'current-password',
}) {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="auth-form__input"
              value={email}
              onChange={onEmailChange}
              placeholder="Email"
              autoComplete="email"
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="auth-form__input"
              value={password}
              onChange={onPasswordChange}
              placeholder="Password"
              type="password"
              autoComplete={passwordAutoComplete}
            />
          </div>

          <button className="auth-form__submit" type="submit">
            {submitLabel}
          </button>
        </form>

        <ErrorState message={error} />
      </section>
    </div>
  );
}

export default AuthForm;
