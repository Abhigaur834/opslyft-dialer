import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginScreen from "./components/dialer/LoginScreen";
import SupervisorDashboard from "./components/dialer/SupervisorDashboard";
import AgentDesktop from "./components/dialer/AgentDesktop";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/supervisor" element={<SupervisorDashboard />} />
        <Route path="/agent" element={<AgentDesktop />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
