import { Coins } from "lucide-react";
import "../styles/Home.css";
import Footer from "../components/Footer";
import LastSection from "../components/Bottommain";
import FeaturedGames from "../components/FeaturedGames";

const OFFERS = [
  {
    id: "umbrella-escape",
    title: "Diamond",
    reward: "∞",
    description: "Collect sparkling diamonds and unlock special rewards.",
    tileClass: "offer-tile--sky",
    emoji: "💎",
  },
  {
    id: "offer-pro",
    title: "Star",
    reward: "100K",
    description: "Earn bright stars while playing your favourite games.",
    tileClass: "offer-tile--violet",
    emoji: "⭐",
  },
];

const REWARDS = [
  {
    id: "super-offer",
    title: "Super Offer!",
    reward: "100K",
    accentClass: "reward-icon--purple",
    emoji: "🎮",
  },
  {
    id: "play-game",
    title: "Play Game!",
    reward: "100+",
    accentClass: "reward-icon--green",
    emoji: "🕹️",
  },
];

function CurrencyPill({ icon, value, pillClass }) {
  return (
    <div className={`currency-pill ${pillClass}`}>
      {icon}
      <span className="currency-pill__value">{value}</span>
    </div>
  );
}

function WavyDivider() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="wavy-divider">
      <path
        d="M0,4 L150,4 C165,4 165,20 185,20 L215,20 C235,20 235,4 250,4 L400,4"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
    </svg>
  );
}

function SectionBadgeHeading({ title, caption }) {
  return (
    <div className="section-badge-header">
      <div className="section-badge-header__left">
        <span className="section-badge-header__icon" aria-hidden="true">✦</span>
        <h2 className="section-badge-header__title">{title}</h2>
      </div>
      {caption && <p className="section-badge-header__caption">{caption}</p>}
    </div>
  );
}

function OfferCard({ offer }) {
  return (
    <div className="offer-card">
      <div className={`offer-card__tile ${offer.tileClass}`}>
        <span>{offer.emoji}</span>
      </div>
      <p className="offer-card__title">{offer.title}</p>
      <p className="offer-card__reward">
        Get Upto <Coins size={12} className="icon-amber" /> {offer.reward}
      </p>
      <button className="offer-card__claim">
        Claim <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function RewardCard({ reward }) {
  return (
    <div className="reward-card">
      <div className={`reward-card__icon ${reward.accentClass}`}>
        <span>{reward.emoji}</span>
      </div>
      <div className="reward-card__info">
        <p className="reward-card__title">{reward.title}</p>
        <p className="reward-card__reward">
          Get Upto <Coins size={11} className="icon-amber" /> {reward.reward}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const coins = 2240;
  const cash = 100;

  return (
    <div className="home-page">
      <div className="home-page__inner">
        <header className="home-header">
          <div className="home-header__profile">
            <div className="home-header__balance" aria-label={`Coin balance ${coins}`}>
              <span className="home-header__balance-icon" aria-hidden="true">🪙</span>
              <div>
                <p className="home-header__balance-label">Coin Balance</p>
                <p className="home-header__balance-value">{coins.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="home-header__pills">
            <CurrencyPill
              icon={<span className="pill-icon" style={{}}>💵</span>}
              value={`₹ ${cash}`}
              pillClass="currency-pill--streak"
            />
          </div>
        </header>

        <section className="home-game-hero" aria-label="GrowGames">
          <div className="home-game-hero__brand">GrowGames</div>
        </section>

        <div className="wavy-divider-wrap">
          <WavyDivider />
        </div>

        <FeaturedGames />

        <SectionBadgeHeading title="Offers for the Day" />

        <div className="rewards-panel">
          <div className="offer-grid">
            {OFFERS.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>

          <SectionBadgeHeading title="Rewards" caption="WIN COINS INSTANTLY & EASY" />

          <div className="reward-grid">
            {REWARDS.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
          <LastSection />
        </div>
        <Footer />
      </div>
    </div>
  );
}
