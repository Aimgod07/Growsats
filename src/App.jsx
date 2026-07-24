import Home from "../pages/Home"
import {BrowserRouter as Router ,Routes,Route} from 'react-router-dom';
import Login from "../pages/Login";
import Profile from "./components/Profile";
import RedeemPage from "./components/RedeemPage";
import Leaderboard from "./components/Leaderboard";
import AllGames from "../pages/Allgames";

function App() {

  return (

     <Router>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/Login" element={<Login/>}/>
        <Route path="/profile" element={<Profile/>} />
        <Route path="/redeem" element={<RedeemPage/>} />
        <Route path="leaderboard" element={<Leaderboard/>} />
         <Route path="all-games" element={<AllGames/>} />
      </Routes>
     </Router>

  )
}

export default App
