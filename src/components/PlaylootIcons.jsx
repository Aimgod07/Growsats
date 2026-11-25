import '../styles/playloot-icons.css';

export function CalendarDays({ size = 24 }) {
  return <span aria-hidden="true" className="playloot-art-icon playloot-calendar-icon" style={{ '--icon-size': `${size}px` }} />;
}

export function UserRound({ size = 24 }) {
  return <span aria-hidden="true" className="playloot-art-icon playloot-profile-icon" style={{ '--icon-size': `${size}px` }} />;
}

export function NotificationButtonIcon({ size = 24 }) {
  return <span aria-hidden="true" className="playloot-art-icon playloot-notification-button-icon" style={{ '--icon-size': `${size}px` }} />;
}

export function Gift({ size = 24 }) {
  return <span aria-hidden="true" className="playloot-art-icon playloot-gift-icon" style={{ '--icon-size': `${size}px` }} />;
}

export function Coins({ size = 24 }) {
  return <span aria-hidden="true" className="playloot-art-icon playloot-coin-icon" style={{ '--icon-size': `${size}px` }} />;
}

export function Bell({ size = 24, className = '' }) {
  return <span aria-hidden="true" className={`playloot-art-icon playloot-bell-icon ${className}`} style={{ '--icon-size': `${size}px` }} />;
}

export function Gamepad2({ size = 24, className = '' }) {
  return <span aria-hidden="true" className={`playloot-art-icon playloot-gamepad-icon ${className}`} style={{ '--icon-size': `${size}px` }} />;
}
