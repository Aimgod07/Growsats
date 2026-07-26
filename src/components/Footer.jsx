import { NavLink } from "react-router-dom";
import { LayoutGrid, Wallet, Medal, Users } from "lucide-react";
import "../../styles/Footer.css";

const TABS = [
  {
    path: "/",
    label: "Home",
    icon: LayoutGrid,
    color: "#ff00dd",
    strokeWidth: 2.5,
    end: true,
  },
  {
    path: "/redeem",
    label: "Redeem",
    icon: Wallet,
    color: "#00fffb",
    strokeWidth: 2,
    end: true,
  },
  {
    path: "/leaderboard",
    label: "Leaderboard",
    icon: Medal,
    color: "#fffa66",
    strokeWidth: 2,
    end: true,
  },
  {
    path: "/profile",
    label: "Profile",
    icon: Users,
    color: "#47ff5d",
    strokeWidth: 2.25,
    end: true,
  },
];

export default function Footer() {
  return (
    <nav className="footer-nav">
      {TABS.map(({ path, label, icon: Icon, color, strokeWidth, end }) => (
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
              <Icon
                size={20}
                color={color}
                strokeWidth={isActive ? strokeWidth + 0.4 : strokeWidth}
                absoluteStrokeWidth
              />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}