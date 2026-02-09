import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Availability from "./pages/Availability";
import Reservation from "./pages/Reservation";
import Charging from "./pages/Charging";
import Admin from "./pages/Admin";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/charging" element={<Charging />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
