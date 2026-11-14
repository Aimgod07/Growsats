import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Sparkles, Mail, Lock, X, Loader2, LogIn, Trophy, Zap, ShieldCheck, Users, ChevronRight } from "lucide-react";
import { backend, isSignedIn } from "../utils/api";
import Turnstile from "../components/Turnstile";
import "../styles/Login.css";

// The challenge widget reports failures separately from form/credential
// errors. Only these should be cleared automatically when a token arrives.
const CAPTCHA_ERROR_PREFIXES = [
  "Security check failed",
  "Security check could not load",
  "Complete the security check",
];

function isCaptchaError(message) {
  return CAPTCHA_ERROR_PREFIXES.some((prefix) => (message || "").startsWith(prefix));
}

export default function Login() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(() => isSignedIn());
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(true);
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (!isSignedIn()) {
      setCheckingSession(false);
      return undefined;
    }

    let active = true;
    backend.me()
      .then(() => {
        if (active) navigate("/Home", { replace: true });
      })
      .catch(() => {
        // A 401 clears the expired local session in the API client. Keep the
        // login form available for expired or otherwise invalid sessions.
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, [navigate]);

  // A fresh token means the challenge finally passed, so drop the stale
  // "Security check failed" banner. Credential/validation errors must survive,
  // because Turnstile re-mints a token after every failed submit.
  const handleCaptchaToken = useCallback((token) => {
    setTurnstileToken(token);
    if (token) {
      setError((current) => (isCaptchaError(current) ? null : current));
    }
  }, []);

  const signIn = async (credentials) => {
    setBusy(true);
    setError(null);
    try {
      if (registering) await backend.register(name.trim(), credentials.email, credentials.password, inviteCode.trim(), turnstileToken);
      else await backend.login(credentials.email, credentials.password, code.trim(), turnstileToken);
      navigate("/Home");
    } catch (err) {
      setError(err.message || "Couldn't sign you in. Please try again.");
      // Tokens are single-use, so a retry always needs a fresh challenge.
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const needsCaptcha = captchaRequired && !turnstileToken;
    if (!email.trim() || !password || needsCaptcha) {
      setError(needsCaptcha ? "Complete the security check to continue" : "Please enter both email and password");
      return;
    }
    signIn({ email: email.trim(), password });
  };

  if (checkingSession) {
    return <div className="login-page" style={{ display: "grid", placeItems: "center", color: "#fff" }}>Opening the arcade…</div>;
  }

  return (
    <div className="login-page">
      <div className="login-page__glow login-page__glow--purple" />
      <div className="login-page__glow login-page__glow--cyan" />
      <div className="login-page__grid" />

      <header className="login-header">
        <div className="brand-lockup">
          <span className="brand-lockup__icon"><Gamepad2 size={22} /></span>
          <span>PLAYLOOT</span>
        </div>
        <div className="server-status"><span /> Servers online</div>
      </header>

      <main className="login-content">
        <section className="game-hero" aria-labelledby="login-title">
          <div className="game-hero__eyebrow"><Sparkles size={14} /> Your next win starts here</div>
          <div className="app-icon-wrap" aria-hidden="true">
            <Sparkles size={17} className="sparkle sparkle--tl" />
            <Sparkles size={13} className="sparkle sparkle--br" />
            <span className="coin coin--tr">🪙</span>
            <span className="coin coin--bl">🪙</span>
            <div className="app-icon"><Gamepad2 size={54} strokeWidth={1.6} /></div>
            <div className="level-ring"><span>LVL</span><strong>01</strong></div>
          </div>
          <h1 className="login-title" id="login-title">Play. Win. <span>Get rewarded.</span></h1>
          <p className="login-subtitle">Sign in to enter the arcade, climb the leaderboard, and turn your playtime into rewards.</p>
          <div className="hero-stats" aria-label="Playloot community stats">
            <div><Users size={15} /><span><strong>25K+</strong> players</span></div>
            <div><Trophy size={15} /><span><strong>120+</strong> challenges</span></div>
            <div><Zap size={15} /><span><strong>Daily</strong> rewards</span></div>
          </div>
          <div className="floating-card floating-card--streak" aria-hidden="true"><span className="floating-card__icon"><Zap size={16} /></span><span><small>Daily streak</small><strong>7 DAYS</strong></span></div>
          <div className="floating-card floating-card--rank" aria-hidden="true"><span className="floating-card__icon"><Trophy size={16} /></span><span><small>Season rank</small><strong># 2,481</strong></span></div>
        </section>

        <section className="auth-shell" aria-label="Account access">
          {error && <p className="login-error" role="alert">{error}</p>}
          {!showEmailForm && (
            <button className="auth-button auth-button--primary" onClick={() => { setError(null); setShowEmailForm(true); }} disabled={busy}>
              <Mail size={18} /><span>Continue with email</span><ChevronRight size={18} />
            </button>
          )}
          {showEmailForm && (
            <form className="email-panel" onSubmit={handleSubmit}>
              <button type="button" className="email-panel__close" onClick={() => setShowEmailForm(false)} aria-label="Close email form"><X size={17} /></button>
              <div className="email-panel__heading">
                <span className="email-panel__kicker">PLAYER ACCESS</span>
                <h2>{registering ? 'Create your player profile' : 'Welcome back, player'}</h2>
                <p>{registering ? 'Join the arcade and start earning rewards.' : 'Enter your details to continue your quest.'}</p>
              </div>
              {registering && <label className="input-field"><Gamepad2 size={17} className="input-field__icon" /><input type="text" placeholder="Gamer name" value={name} onChange={e => setName(e.target.value)} maxLength={40} required /></label>}
              <label className="input-field"><Mail size={17} className="input-field__icon" /><input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
              {!registering && <label className="input-field"><ShieldCheck size={17} className="input-field__icon" /><input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code (optional)" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>}
              <label className="input-field"><Lock size={17} className="input-field__icon" /><input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 10 : undefined} required /></label>
              <div className="password-options">
                <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /><span>Show password</span></label>
                {!registering && <span className="password-hint">Secure login</span>}
              </div>
              {registering && <label className="input-field"><Sparkles size={17} className="input-field__icon" /><input type="text" placeholder="Invite code (optional)" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} maxLength={12} /></label>}
              <Turnstile
                ref={turnstileRef}
                action={registering ? "register" : "login"}
                onToken={handleCaptchaToken}
                onRequiredChange={setCaptchaRequired}
                onError={setError}
              />
              <button type="submit" className="email-panel__submit" disabled={busy || (captchaRequired && !turnstileToken)}>{busy ? <Loader2 size={19} className="spin" /> : <><LogIn size={19} /> {registering ? 'Create my player' : 'Enter the arcade'} <ChevronRight size={18} /></>}</button>
              <div className="auth-divider"><span>NEW QUEST</span></div>
              <button type="button" className="switch-auth" onClick={() => { setRegistering(!registering); setError(null); }}>{registering ? 'Already have a profile? Sign in' : 'New player? Create a free account'}</button>
            </form>
          )}
          <div className="trust-note"><ShieldCheck size={14} /> Protected login · Your progress stays synced</div>
          <p style={{fontSize:11,color:'#aeb6c7',textAlign:'center',margin:'10px 0'}}>For account security, Playloot records your IP address, device details and an app installation identifier to flag potentially shared accounts.</p>
        </section>
      </main>

      <footer className="login-footer"><span>© 2026 Playloot</span><span>Play responsibly</span></footer>
    </div>
  );
}
