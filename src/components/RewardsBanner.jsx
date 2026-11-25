import {ArrowDown,ArrowRight} from 'lucide-react';
import './rewards-banner.css';

const banners={
 diamonds:{eyebrow:'DISCOVER MORE',title:<>Discover your<br/><em>next diamond.</em></>,description:'Explore available partner offers and discover new games along the way.',action:'Browse offers',target:'#partner-offers',image:'diamonds-banner',facts:['Partner offers','New discoveries']},
 missions:{eyebrow:'YOUR DAILY ADVENTURE',title:<>Play daily.<br/><em>Make it count.</em></>,description:'Complete daily objectives, build your progress, and claim your coin rewards.',action:'View missions',target:'#daily-missions',image:'missions-banner',facts:['Daily objectives','Coin rewards']},
};
export default function RewardsBanner({variant}){
 const banner=banners[variant];if(!banner)return null;
 return <section className={'rewards-banner rewards-banner--'+variant} aria-label={variant==='diamonds'?'Earn diamonds':'Daily missions'}>
  <img className="rewards-banner__art" src={'/playloot-art/'+banner.image+'.webp'} width="2172" height="724" alt="" decoding="async" fetchPriority="high"/>
  <div className="rewards-banner__copy"><span className="rewards-banner__eyebrow">{banner.eyebrow}</span><h1>{banner.title}</h1><p>{banner.description}</p>
   <a className="rewards-banner__action" href={banner.target}>{banner.action}<ArrowDown size={17} aria-hidden="true"/></a>
   <ul>{banner.facts.map(fact=><li key={fact}><ArrowRight size={12} aria-hidden="true"/>{fact}</li>)}</ul>
  </div>
 </section>;
}
