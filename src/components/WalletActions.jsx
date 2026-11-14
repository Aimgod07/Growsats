import CoinConversion from './CoinConversion';
import {Link} from 'react-router-dom';
import {ArrowDownLeft,ArrowUpRight} from 'lucide-react';
export default function WalletActions(){
 return <><CoinConversion/><section className="neo-panel wallet-actions"><h2>Cash wallet</h2><p>Convert coins to INR cash, then request a withdrawal.</p><div className="wallet-actions__buttons"><Link to="/transactions?direction=withdraw"><ArrowUpRight size={18}/>Withdraw</Link></div><Link className="wallet-actions__history" to="/transactions">Transaction history →</Link></section></>;
}
