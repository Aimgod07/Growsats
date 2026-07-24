import { NavLink } from "react-router-dom";
import { Home as HomeIcon, Wallet, Trophy, User } from "lucide-react";
import "../../styles/Footer.css";



const TABS = [
  { path: "/", label: "Home", icon: HomeIcon, end: true },
  { path: "/redeem", label: "Redeem", icon: Wallet ,end: true},
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy ,end: true},
  { path: "/profile", label: "Profile", icon: User,end: true },
];

export default function Footer() {
  return (
    <nav className="footer-nav">
      {TABS.map(({ path, label, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) =>
            `footer-nav__item ${isActive ? "footer-nav__item--active" : ""}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={12} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}