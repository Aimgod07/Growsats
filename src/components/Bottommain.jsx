
import "../../styles/Lastsection.css";

export default function LastSection() {
  return (
    <div className="lastsection">

      {/* SECTION 1: Hero / PlayTime */}
      <section className="hero-section">
        <h1 className="hero-title"> PlayTime!</h1>
        <p className="hero-subtitle">WIN UNLIMITED COINS</p>

        <div className="playtime-card">
          <h2 className="playtime-heading">PlayTime</h2>
          <p className="playtime-desc">
            Get Upto{" "}
            Coins playing by game per-minutes.
          </p>

          <div className="playtime-badge">PlayTime</div>

          <div className="gamepad-icon gamepad-1">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M6 10h.01M6 14h.01M4 12h4M16 9h.01M18 11h.01M16 13h.01M14 11h.01" />
              <path d="M17 6H7a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h1l1.5 2h5L16 16h1a5 5 0 0 0 5-5v0a5 5 0 0 0-5-5Z" />
            </svg>
          </div>
          <div className="gamepad-icon gamepad-2">
            <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M6 10h.01M6 14h.01M4 12h4M16 9h.01M18 11h.01M16 13h.01M14 11h.01" />
              <path d="M17 6H7a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h1l1.5 2h5L16 16h1a5 5 0 0 0 5-5v0a5 5 0 0 0-5-5Z" />
            </svg>
          </div>
        </div>
      </section>

      {/* SECTION 2: Offer Partners header + Task/Survey offers */}
      <section className="offers-section">
        <h2 className="offers-title"> Partners</h2>
        <p className="offers-subtitle">WIN COINS INSTANTLY &amp; EASY</p>

        <div className="offer-group">
          <div className="offer-group-header">
            <h3>Big win </h3>
            <span className="hot-badge">🔥 Hot Offer</span>
          </div>

          <div className="offer-cards">
            <div className="offer-card">
              <div className="offer-logo logo-growdeck">Snake</div>
              <div className="offer-footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>

            <div className="offer-card">
              <div className="offer-logo logo-pubscale">PubScale</div>
              <div className="offer-footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>
          </div>

          <button className="view-all-btn">View All</button>
        </div>

        <div className="offer-group">
          <div className="offer-group-header">
            <h3>Big win with Survey</h3>
            <span className="hot-badge">🔥 Hot Offer</span>
          </div>

          <div className="offer-cards">
            <div className="offer-card">
              <div className="offer-logo logo-p">P</div>
              <div className="offer-footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>

            <div className="offer-card">
              <div className="offer-logo logo-timewall">
                Wolf<span className="wall-highlight">gate</span>
              </div>
              <div className="offer-footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Rayole Offers */}
      <section className="rayole-section">
        <h2 className="rayole-title">Royal Offers</h2>
        <p className="rayole-subtitle">WIN BIG WITH ROYAL</p>

        <div className="rayole-cards">
          <div className="rayole-card">
            <div className="rayole-preview cashthug-preview">
              <div className="mock-row">
                <span className="mock-avatar"></span>
                <span className="mock-line"></span>
              </div>
              <div className="mock-row">
                <span className="mock-avatar"></span>
                <span className="mock-line"></span>
              </div>
              <div className="mock-row">
                <span className="mock-avatar"></span>
                <span className="mock-line"></span>
              </div>
            </div>
            <p className="rayole-desc">Get more with other Apps</p>
            <p className="rayole-heading">
              Maximize your reward
              <br />
              with these Apps.
            </p>
            <button className="rayole-btn">Claim Now</button>
          </div>

          <div className="rayole-card">
            <div className="rayole-preview social-preview">
              <span className="social-icon twitter">𝕏</span>
              <span className="social-icon messenger">💬</span>
              <span className="social-icon fb">f</span>
              <span className="social-icon insta">📷</span>
              <span className="social-icon like">👍</span>
            </div>
            <p className="rayole-desc">Follow and stay Updated!</p>
            <p className="rayole-heading">
              Stay Update and win
              <br />
              more coins.
            </p>
            <button className="rayole-btn">Follow Now</button>
          </div>
        </div>
      </section>

      {/* SECTION 5: Invite friends */}
      <section className="invite-section">
        <h3 className="invite-title">Invite your friends, win Rewards!</h3>
        <p className="invite-subtitle">
          Refer and win, Share with your friends
          <br />
          unlock exciting rewards!
        </p>
        <button className="invite-btn">Invite Now! →</button>
        <div className="invite-glow">
          <span className="heart heart-1">❤️</span>
          <span className="heart heart-2">❤️</span>
          <span className="heart heart-3">❤️</span>
          <div className="glow-podium"></div>
        </div>
      </section>

    </div>
  );
}