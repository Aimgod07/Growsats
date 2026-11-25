import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,test,expect,vi} from 'vitest';
import DesktopExtras from './DesktopExtras';
const navigate=vi.fn();
vi.mock('react-router-dom',()=>({useNavigate:()=>navigate}));
vi.mock('./WalletState',()=>({useWallet:()=>({data:{coins:1490,diamonds:20}})}));
vi.mock('../config/appConfig',()=>({useAppConfig:()=>({screens:{arcade:{groGames:{enabled:true}}}})}));
afterEach(cleanup);
test('uses wallet balances and opens the separate GroGames catalog',()=>{render(<DesktopExtras/>);expect(screen.getByText('1,490')).toBeTruthy();fireEvent.click(screen.getByRole('link',{name:'Play GroGames',hidden:true}));expect(navigate).toHaveBeenCalledWith('/all-games?source=grogames');expect(screen.getAllByRole('article',{hidden:true})).toHaveLength(3)});

