import "../../styles/Lastsection.css";

const INVITE_FRIEND_CARDS = [
  { id: "riya", emoji: "🦸", name: "Riya", coins: "+500" },
  { id: "karan", emoji: "🎮", name: "Karan", coins: "+500" },
  { id: "zoya", emoji: "🕹️", name: "Zoya", coins: "+500" },
];

export default function LastSection() {
  return (
    <div className="lastsection">

      {/* SECTION 1: Hero / PlayTime */}
      <section className="hero-section">
        <h1 className="hero-title"> PlayTime!</h1>
        <p className="hero-subtitle">WIN UNLIMITED COINS</p>

        <div className="playtime-card">
          <div className="playtime-glow" aria-hidden="true"></div>
          <span className="playtime-tag">GROWGAMES REWARDS™</span>

          <h2 className="playtime-heading">PLAYTIME</h2>

          <p className="playtime-quote">&ldquo; EARN AS YOU PLAY &rdquo;</p>
          <p className="playtime-desc">
            Get Upto Coins playing by game per-minutes.
          </p>

          <button className="playtime-play-btn">
            <span className="playtime-play-icon">▶</span> Play
          </button>

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
              <div className="offer-card__icon-wrap">
                <span className="offer-card__glow logo-growdeck" aria-hidden="true"></span>
                <span className="offer-card__icon logo-growdeck">🐍</span>
              </div>
              <h4 className="offer-card__title">Snake Rush</h4>
              <p className="offer-card__desc">Play snake and win big every day</p>
              <div className="offer-card__footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>

            <div className="offer-card">
              <div className="offer-card__icon-wrap">
                <span className="offer-card__glow logo-pubscale" aria-hidden="true"></span>
                <span className="offer-card__icon logo-pubscale">📱</span>
              </div>
              <h4 className="offer-card__title">PubScale</h4>
              <p className="offer-card__desc">Complete quick offers and earn instantly</p>
              <div className="offer-card__footer">
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
              <div className="offer-card__icon-wrap">
                <span className="offer-card__glow logo-p" aria-hidden="true"></span>
                <span className="offer-card__icon logo-p">P</span>
              </div>
              <h4 className="offer-card__title">Prime Offers</h4>
              <p className="offer-card__desc">Unlock premium rewards in minutes</p>
              <div className="offer-card__footer">
                <div className="offer-win">
                  <span className="coin-icon small">●</span> Win UpTo 100K+
                </div>
                <button className="get-now-btn">Get Now »</button>
              </div>
            </div>

            <div className="offer-card">
              <div className="offer-card__icon-wrap">
                <span className="offer-card__glow logo-timewall" aria-hidden="true"></span>
                <span className="offer-card__icon logo-timewall">🎧</span>
              </div>
              <h4 className="offer-card__title">
                Wolf<span className="wall-highlight">gate</span>
              </h4>
              <p className="offer-card__desc">Explore surveys and stack up coins</p>
              <div className="offer-card__footer">
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
      <section className="invite-hero">
        <div className="invite-hero__glow" aria-hidden="true"></div>
        <div className="invite-hero__stars" aria-hidden="true"></div>
        <div className="invite-hero__fence" aria-hidden="true"></div>

        <div className="invite-hero__body">
          <div className="invite-hero__content">
            <h2 className="invite-hero__headline">
              INVITE YOUR FRIENDS,
              <br />
              WIN <span className="invite-hero__accent">REWARDS!</span>
            </h2>

            <p className="invite-hero__subtitle">
              Refer and win — share with your friends and unlock exciting
              rewards together.
            </p>

            <div className="invite-hero__cards">
              {INVITE_FRIEND_CARDS.map((card) => (
                <div className="invite-mini-card" key={card.id}>
                  <div className="invite-mini-card__avatar">{card.emoji}</div>
                  <div className="invite-mini-card__footer">
                    <div>
                      <p className="invite-mini-card__name">{card.name}</p>
                      <p className="invite-mini-card__coins">{card.coins} Coins</p>
                    </div>
                    <span className="invite-mini-card__arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="invite-hero__testimonial">
              <strong>ALEX R.</strong> — Invited 8 friends and earned 12,400
              coins in his first week.
            </p>

            <button className="invite-hero__cta">Invite Now! →</button>
          </div>

          <div className="invite-hero__side">
            <div className="invite-hero__stats">
              <div className="invite-hero__stat">
                <span className="invite-hero__stat-num">10K+</span>
                <span className="invite-hero__stat-label">
                  Friends invited this month
                </span>
              </div>
              <div className="invite-hero__stat">
                <span className="invite-hero__stat-num">24 HRS</span>
                <span className="invite-hero__stat-label">
                  Avg. time to first reward
                </span>
              </div>
              <div className="invite-hero__stat">
                <span className="invite-hero__stat-num">5%</span>
                <span className="invite-hero__stat-label">
                  Bonus on every friend's play
                </span>
              </div>
            </div>

            <img
              src="/invite-mascot.png"
              alt="GrowGames mascot"
              className="invite-hero__character"
            />
          </div>
        </div>
      </section>

    </div>
  );
}