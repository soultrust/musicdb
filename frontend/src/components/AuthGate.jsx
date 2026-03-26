export default function AuthGate({
  authMode,
  authEmail,
  authPassword,
  authLoading,
  authError,
  onSubmit,
  onChangeEmail,
  onChangePassword,
  onToggleAuthMode,
}) {
  return (
    <div className="app">
      <div className="auth-screen">
        <h1>MusicDB</h1>
        <p className="auth-subtitle">Sign in to search and manage your music lists.</p>
        <form onSubmit={onSubmit} className="auth-form">
          <input
            type="email"
            value={authEmail}
            onChange={onChangeEmail}
            placeholder="Email"
            autoComplete="email"
            disabled={authLoading}
          />
          <input
            type="password"
            value={authPassword}
            onChange={onChangePassword}
            placeholder="Password"
            autoComplete={authMode === "register" ? "new-password" : "current-password"}
            disabled={authLoading}
          />
          {authError && <p className="error">{authError}</p>}
          <button type="submit" disabled={authLoading}>
            {authLoading ? "Please wait…" : authMode === "register" ? "Register" : "Log in"}
          </button>
        </form>
        <button type="button" className="auth-toggle" onClick={onToggleAuthMode}>
          {authMode === "login" ? "Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

