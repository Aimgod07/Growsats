import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  Zap,
  Coins,
  Smartphone,
  ShoppingBag,
  Banknote,
  Wallet,
  Loader2,
} from "lucide-react";
import "../styles/Redeempage.css";
import Footer from "../components/Footer";
import { mockDelay } from "../utils/api";

const CATEGORY_ICON = {
  "google-play": Smartphone,
  amazon: ShoppingBag,
  imps: Banknote,
  paypal: Wallet,
};

const CATEGORY_ICON_CLASS = {
  "google-play": "category-icon--googleplay",
  amazon: "category-icon--amazon",
  imps: "category-icon--imps",
  paypal: "category-icon--paypal",
};

async function fetchUserBalance() {
  await mockDelay(400);
  return {
    name: "Deepanshu",
    coins: 2240,
    country: { code: "IN", label: "India", flag: "🇮🇳" },
    redemptionsUsedToday: 0,
    redemptionsAllowedPerDay: 5,
  };
}

async function fetchRedeemCategories() {
  await mockDelay(600);
  return [
    {
      id: "google-play",
      title: "Redeem Coins as Google Play (IN)",
      icon: "google-play",
      options: [
        { id: "gp-1", coinsRequired: 4800, amount: "15", currency: "₹" },
        { id: "gp-2", coinsRequired: 9600, amount: "30", currency: "₹" },
        { id: "gp-3", coinsRequired: 19200, amount: "60", currency: "₹" },
      ],
    },
    {
      id: "amazon",
      title: "Redeem Coins as Amazon (IN)",
      icon: "amazon",
      options: [
        { id: "az-1", coinsRequired: 4800, amount: "15", currency: "₹" },
        { id: "az-2", coinsRequired: 9600, amount: "30", currency: "₹" },
        { id: "az-3", coinsRequired: 19200, amount: "60", currency: "₹" },
      ],
    },
    {
      id: "imps",
      title: "Redeem Coins as IMPS",
      icon: "imps",
      options: [
        { id: "imps-1", coinsRequired: 8000, amount: "25", currency: "₹" },
        { id: "imps-2", coinsRequired: 16000, amount: "50", currency: "₹" },
        { id: "imps-3", coinsRequired: 32000, amount: "100", currency: "₹" },
      ],
    },
    {
      id: "paypal",
      title: "Redeem Coins as Paypal",
      icon: "paypal",
      options: [
        { id: "pp-1", coinsRequired: 128000, amount: "5", currency: "$" },
        { id: "pp-2", coinsRequired: 256000, amount: "10", currency: "$" },
        { id: "pp-3", coinsRequired: 512000, amount: "20", currency: "$" },
      ],
    },
  ];
}

async function submitRedemption() {
  await mockDelay(700);
  return { success: true };
}

function RedeemCard({ option, userCoins, onRedeem, isRedeeming }) {
  const progress = Math.min(100, Math.round((userCoins / option.coinsRequired) * 100));
  const unlocked = userCoins >= option.coinsRequired;

  return (
    <div className={`redeem-card ${unlocked ? "redeem-card--unlocked" : ""}`}>
      <div className="redeem-card__progress-track">
        <div className="redeem-card__progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="redeem-card__coins">
        <Coins size={12} className="icon-amber" />
        {userCoins.toLocaleString()} of {option.coinsRequired.toLocaleString()} coins
      </p>
      <button
        className="redeem-card__button"
        disabled={!unlocked || isRedeeming}
        onClick={() => onRedeem(option.id)}
      >
        {isRedeeming ? (
          <Loader2 size={14} className="spin" />
        ) : (
          `${option.currency} ${option.amount}`
        )}
      </button>
    </div>
  );
}

function RedeemCategory({ category, userCoins, onRedeem, redeemingId }) {
  const Icon = CATEGORY_ICON[category.icon] || Wallet;

  return (
    <section className="redeem-category">
      <h3 className="redeem-category__title">{category.title}</h3>
      <div className="redeem-category__scroller">
        {category.options.map((option) => (
          <article key={option.id} className="redeem-tile">
            <div className={`category-icon ${CATEGORY_ICON_CLASS[category.icon] || ""}`}>
              <Icon size={22} />
            </div>
            <RedeemCard
              option={option}
              userCoins={userCoins}
              onRedeem={(optionId) => onRedeem(category.id, optionId)}
              isRedeeming={redeemingId === option.id}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export default function RedeemPage() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, categoryData] = await Promise.all([
        fetchUserBalance(),
        fetchRedeemCategories(),
      ]);
      setUser(userData);
      setCategories(categoryData);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async (categoryId, optionId) => {
    setRedeemingId(optionId);
    try {
      const result = await submitRedemption(categoryId, optionId);
      if (result.success) {
        const freshUser = await fetchUserBalance();
        setUser(freshUser);
      }
    } catch (err) {
      setError(err.message || "Redemption failed. Please try again.");
    } finally {
      setRedeemingId(null);
    }
  };

  const remainingRedemptions = user
    ? Math.max(0, user.redemptionsAllowedPerDay - user.redemptionsUsedToday)
    : null;

  if (loading) {
    return (
      <div className="redeem-page redeem-page--center">
        <Loader2 size={28} className="spin icon-amber" />
        <p className="redeem-page__loading-text">Loading your balance…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="redeem-page redeem-page--center">
        <p className="redeem-page__error-text">{error}</p>
        <button className="redeem-page__retry" onClick={loadData}>Try again</button>
      </div>
    );
  }

  return (
    <div className="redeem-page">
      <div className="redeem-hero">
        <div className="redeem-hero__icon">🏦</div>

        <p className="redeem-hero__greeting">
          Hey, <span className="redeem-hero__name">{user.name.toUpperCase()}</span>
        </p>
        <p className="redeem-hero__subtext">Here is your total balance</p>

        <div className="balance-pill">
          <Coins size={16} className="icon-amber" />
          <span className="balance-pill__value">{user.coins.toLocaleString()}</span>
        </div>
        <p className="redeem-hero__caption">Available Coins</p>

        <div className="redeem-hero__meta-row">
          <button className="country-pill">
            <span>{user.country.flag}</span>
            <span className="country-pill__divider" />
            <span>{user.country.label}</span>
            <ChevronRight size={14} />
          </button>

          <div className="limit-banner">
            <Zap size={14} />
            <span>
              {remainingRedemptions} redemption{remainingRedemptions === 1 ? "" : "s"} left today
            </span>
            <Zap size={14} />
          </div>
        </div>
      </div>

      <div className="wavy-divider-wrap">
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="wavy-divider">
          <path
            d="M0,4 L150,4 C165,4 165,20 185,20 L215,20 C235,20 235,4 250,4 L400,4"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="redeem-categories">
        {categories.map((category) => (
          <RedeemCategory
            key={category.id}
            category={category}
            userCoins={user.coins}
            onRedeem={handleRedeem}
            redeemingId={redeemingId}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}
