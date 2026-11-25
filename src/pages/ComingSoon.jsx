import { ArrowLeft, Bolt, Shield, Trophy } from 'lucide-react';
import { Bell } from '../components/PlaylootIcons';
import {Link, Navigate, useParams} from 'react-router-dom';
import '../styles/coming-soon.css';

const FEATURES={
  'quick-match':{title:'Quick Match',eyebrow:'60 SECOND ROUNDS',copy:'Fast head-to-head rounds are being prepared for the arcade.',Icon:Bolt,color:'#ffbd60'},
  'boss-raids':{title:'Boss Raids',eyebrow:'CO-OP PLAY',copy:'Team challenges, shared objectives and raid rewards are coming soon.',Icon:Shield,color:'#b79cff'},
  tournaments:{title:'Tournaments',eyebrow:'COMPETE & WIN',copy:'Scheduled competitions, live standings and tournament prizes are coming soon.',Icon:Trophy,color:'#73e8ba'},
};

export default function ComingSoon({ feature } = {}){
 const params=useParams(),item=FEATURES[feature ?? params.feature];
 if(!item)return <Navigate to="/Home" replace/>;
 const {Icon}=item;
 return <main className="coming-soon" aria-label={item.title}>
  {item!==FEATURES.tournaments&&<header className="coming-soon__header"><Link to="/Home" aria-label="Back to Arcade"><ArrowLeft/></Link><div><small>PLAYLOOT</small><h1>{item.title}</h1></div></header>}
  <section className="coming-soon__card" style={{'--feature-color':item.color}}>
   <div className="coming-soon__glow"/><div className="coming-soon__icon"><Icon/></div>
   <span>{item.eyebrow}</span><h2>Coming soon</h2><p>{item.copy}</p>
   <div className="coming-soon__status"><Bell/><div><b>Feature in development</b><small>Watch your notifications for launch updates.</small></div></div>
   <Link className="coming-soon__button" to="/Home">Explore the Arcade</Link>
  </section>
 </main>;
}
