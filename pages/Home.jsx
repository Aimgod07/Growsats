
import { Gem, Sparkles, Coins } from "lucide-react";
import "../styles/Home.css";
import Footer from "../src/components/Footer";
import LastSection from "../src/components/Bottommain";
import FeaturedGames from "../src/components/FeaturedGames";




const OFFERS = [
  {
    id: "umbrella-escape",
    title: "Diamond",
    reward: "∞",
    tileClass: "offer-tile--sky",
    emoji: "💎",
  },
  {
    id: "offer-pro",
    title: "Star",
    reward: "100K",
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
    <svg
      viewBox="0 0 400 24"
      preserveAspectRatio="none"
      className="wavy-divider"
    >
      <path
        d="M0,4 L150,4 C165,4 165,20 185,20 L215,20 C235,20 235,4 250,4 L400,4"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
    </svg>
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

export default function Home({ userName = "Deepanshu", cash = 100, coins = 2240, diamonds = 0 }) {
  return (
    <div className="home-page">
      <div className="home-page__inner">

        {/* ---------------- Header ---------------- */}
        <header className="home-header">
          <div className="home-header__profile">
            <div className="home-header__avatar">🙂</div>
            <div >
              <p className="home-header__greeting">
                Hi {userName.toUpperCase()}
              </p>
             <p>Welcome</p>
            </div>
          </div>

          <div className="home-header__pills">
            {/* <CurrencyPill
              icon={<span className="pill-icon" style={{}}>💵</span>}
              value={`₹ ${cash}`}
              pillClass="currency-pill--cash"
            /> */}
            <CurrencyPill
              icon={<span className="pill-icon" style={{}}>💵</span>}
              value={`₹ ${cash}`}
              pillClass="currency-pill--streak"
            />
          </div>
        </header>

        {/* ---------------- Balance card (div) ---------------- */}
        <div className="balance-card">
          <span className="balance-card__label">Available Balance</span>

          <div className="balance-card__row">
            <div className="balance-chip balance-chip--coins">
              <span className="balance-chip__icon">🪙</span>
              <span className="balance-chip__value">{coins}</span>
            </div>

            <div className="balance-chip balance-chip--diamonds">
              <Gem size={18} className="icon-violet" />
              <span className="balance-chip__value">{diamonds}</span>
            </div>
          </div>
        </div>

      
        {/* ---------------- Wavy divider (from wireframe) ---------------- */}
        <div className="wavy-divider-wrap">
          <WavyDivider />
        </div>

          {/* featured games */}
          <FeaturedGames/>

        {/* ---------------- Text (section title) ---------------- */}
        <div className="section-heading">
          <h2 className="section-heading__title">
            <Sparkles size={16} className="icon-amber not-italic" />
            Offers for the Day
            <Sparkles size={16} className="icon-violet not-italic" />
          </h2>
         
        </div>

        {/* ---------------- Rewards panel (div) ---------------- */}
        <div className="rewards-panel">
          <div className="offer-grid">
            {OFFERS.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>

          <div className="section-heading section-heading--sub">
            <h3 className="section-heading__title section-heading__title--sm">
              <Sparkles size={14} className="icon-amber not-italic" />
               Rewards
              <Sparkles size={14} className="icon-violet not-italic" />
            </h3>
            <p className="section-heading__caption">
              WIN COINS INSTANTLY &amp; EASY
            </p>
          </div>

          <div className="reward-grid">
            {REWARDS.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
          <LastSection/>
        </div>
        <Footer/>
      </div>
    </div>
  );
}