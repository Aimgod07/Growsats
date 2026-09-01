import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Sparkles, Mail, Lock, X, Loader2 } from "lucide-react";
import { mockDelay } from "../utils/api";
import "../../src/styles/Login.css";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C39.9 37 44 31 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

async function authenticateWithGoogle() {
  await mockDelay(700);
  return { provider: "google", name: "Sarthak Ahuja", email: "sarthakahuja447@gmail.com" };
}

async function authenticateWithFacebook() {
  await mockDelay(700);
  return { provider: "facebook", name: "Sarthak Ahuja", email: "sarthakahuja447@gmail.com" };
}

async function authenticateWithEmail(email, password) {
  await mockDelay(700);
  if (!email || !password) {
    throw new Error("Please enter both email and password");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  return { provider: "email", name: email.split("@")[0], email };
}

export default function Login() {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeProvider, setActiveProvider] = useState(null);
  const [error, setError] = useState(null);

  const handleSuccess = () => {
    setError(null);
    setActiveProvider(null);
    navigate("/Home");
  };

  const handleGoogleClick = async () => {
    setError(null);
    setActiveProvider("google");
    try {
      await authenticateWithGoogle();
      handleSuccess();
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setActiveProvider(null);
    }
  };

  const handleFacebookClick = async () => {
    setError(null);
    setActiveProvider("facebook");
    try {
      await authenticateWithFacebook();
      handleSuccess();
    } catch (err) {
      setError(err.message || "Facebook sign-in failed");
    } finally {
      setActiveProvider(null);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setActiveProvider("email");
    try {
      await authenticateWithEmail(email, password);
      handleSuccess();
      setShowEmailForm(false);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setActiveProvider(null);
    }
  };

  return (
    <div className="login-page">
      <div className="app-icon-wrap">
        <Sparkles size={16} className="sparkle sparkle--tl" />
        <Sparkles size={12} className="sparkle sparkle--br" />
        <span className="coin coin--tr">🪙</span>
        <span className="coin coin--bl">🪙</span>
        <div className="app-icon">
          <Gamepad2 size={54} strokeWidth={1.6} />
        </div>
      </div>

      <h1 className="login-title">Welcome To GameApp</h1>
      <p className="login-subtitle">Powered by Growsats</p>

      {error && <p className="login-error">{error}</p>}

      <div className="auth-buttons">
        <button
          className="auth-button auth-button--google"
          onClick={handleGoogleClick}
          disabled={activeProvider !== null}
        >
          {activeProvider === "google" ? <Loader2 size={18} className="spin" /> : <GoogleMark />}
          <span>Sign up with Google</span>
        </button>

        <button
          className="auth-button auth-button--facebook"
          onClick={handleFacebookClick}
          disabled={activeProvider !== null}
        >
          {activeProvider === "facebook" ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <Gamepad2 size={18} fill="currentColor" />
          )}
          <span>Continue with Facebook</span>
        </button>

        <button
          className="auth-button auth-button--simple"
          onClick={() => {
            setError(null);
            setShowEmailForm(true);
          }}
          disabled={activeProvider !== null}
        >
          <Mail size={18} />
          <span>Login with Email</span>
        </button>
      </div>

      {showEmailForm && (
        <div className="email-modal">
          <div className="email-modal__backdrop" onClick={() => setShowEmailForm(false)} />
          <form className="email-modal__panel" onSubmit={handleEmailSubmit}>
            <button
              type="button"
              className="email-modal__close"
              onClick={() => setShowEmailForm(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="email-modal__title">Login to Growsats</h2>

            <label className="input-field">
              <Mail size={16} className="input-field__icon" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="input-field">
              <Lock size={16} className="input-field__icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="email-modal__submit" disabled={activeProvider === "email"}>
              {activeProvider === "email" ? <Loader2 size={18} className="spin" /> : "Login"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
