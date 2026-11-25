import {Link} from 'react-router-dom';
import footerCss from '../styles/site-footer.css?raw';

const groups = [
  ['Play', [['Arcade', '/Home'], ['Game catalog', '/all-games'], ['Events', '/events'], ['Rankings', '/leaderboard']]],
  ['Rewards', [['Missions', '/missions'], ['Offers', '/offers'], ['Redeem rewards', '/redeem'], ['Transactions', '/transactions']]],
  ['Your account', [['Profile', '/profile'], ['Avatar', '/avatar'], ['Notifications', '/notifications'], ['Settings', '/profile/settings']]],
];

export default function SiteFooter() {
  return <>
    <style>{footerCss}</style>
    <footer className="playloot-footer">
      <div className="playloot-footer__scene" aria-hidden="true">
        <img src="/playloot-art/footer-archer.png" alt="" loading="lazy"/>
        <img src="/playloot-art/footer-pumpkin-doll.png" alt="" loading="lazy"/>
        <img src="/playloot-art/footer-pumpkin-skeleton.png" alt="" loading="lazy"/>
        <img src="/playloot-art/footer-mummy.png" alt="" loading="lazy"/>
        <img src="/playloot-art/footer-fire-mage.png" alt="" loading="lazy"/>
      </div>
      <div className="playloot-footer__body">
        <div className="playloot-footer__identity">
          <Link to="/Home" className="playloot-footer__brand"><img src="/playloot-art/crest.png" alt=""/>PLAYLOOT</Link>
          <p>Play more. Earn more.</p>
          <span className="playloot-footer__language">English</span>
        </div>
        {groups.map(([title, links]) => <nav key={title} aria-label={title + ' footer links'}>
          <h2>{title}</h2>
          {links.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
        </nav>)}
      </div>
      <div className="playloot-footer__wordmark" aria-hidden="true">Playloot</div>
      <div className="playloot-footer__bottom">© {new Date().getFullYear()} Playloot</div>
    </footer>
  </>;
}
