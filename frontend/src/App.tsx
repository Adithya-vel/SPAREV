import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Availability from "./pages/Availability";
import Charging from "./pages/Charging";
import Reservation from "./pages/Reservation";
import Admin from "./pages/Admin";
import { SlotProvider } from "./context/SlotContext";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";


export default function App() {
  return (
    <SlotProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/charging" element={<Charging />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SlotProvider>
  );
}
