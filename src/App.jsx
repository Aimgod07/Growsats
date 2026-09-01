import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import RedeemPage from "./pages/RedeemPage";
import Leaderboard from "./pages/Leaderboard";
import AllGames from "./pages/AllGames";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/redeem" element={<RedeemPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/all-games" element={<AllGames />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
