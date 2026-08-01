import { NavLink } from "react-router-dom";
import { House, WalletCards, Trophy, CircleUserRound } from "lucide-react";
import "../../styles/Footer.css";

const TABS = [
  { path: "/Home", label: "Home", icon: House, color: "#b7ff51", strokeWidth: 2.5, end: true },
  { path: "/redeem", label: "Redeem", icon: WalletCards, color: "#62e6ff", strokeWidth: 2, end: true },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy, color: "#ffc85a", strokeWidth: 2, end: true },
  { path: "/profile", label: "Profile", icon: CircleUserRound, color: "#bd8cff", strokeWidth: 2.25, end: true },
];

export default function Footer() {
  return (
    <nav className="footer-nav" aria-label="Main navigation">
      {TABS.map(({ path, label, icon: Icon, color, strokeWidth, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          style={{ "--tab-accent": color }}
          className={({ isActive }) =>
            `footer-nav__item ${isActive ? "footer-nav__item--active" : ""}`
          }
        >
          {({ isActive }) => (
            <>
              <span className="footer-nav__icon-wrap">
                <Icon
                  size={21}
                  strokeWidth={isActive ? strokeWidth + 0.4 : strokeWidth}
                  absoluteStrokeWidth
                />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}