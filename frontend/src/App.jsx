import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import SplashScreen from "./components/SplashScreen/SplashScreen";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Loader from "./components/Loader/Loader";
import Home from "./pages/Home/Home";
import { useAuth } from "./store/authStore";
import { authApi } from "./services/authApi";
import { showBanToast } from "./lib/ban";
import { setDemo, isDemo } from "./lib/demo";

// تقسيم الكود — كل صفحة تُحمّل عند الحاجة (أداء أسرع)
const Events = lazy(() => import("./pages/Events/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail/EventDetail"));
const Booking = lazy(() => import("./pages/Booking/Booking"));
const SeatMap = lazy(() => import("./pages/SeatMap/SeatMap"));
const Checkout = lazy(() => import("./pages/Checkout/Checkout"));
const Payment = lazy(() => import("./pages/Payment/Payment"));
const BookingConfirm = lazy(() => import("./pages/BookingConfirm/BookingConfirm"));
const BookingProcessing = lazy(() => import("./pages/BookingProcessing/BookingProcessing"));
const Login = lazy(() => import("./pages/Login/Login"));
const Register = lazy(() => import("./pages/Register/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const MyTickets = lazy(() => import("./pages/MyTickets/MyTickets"));
const Wallet = lazy(() => import("./pages/Wallet/Wallet"));
const Support = lazy(() => import("./pages/Support/Support"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

function App() {
  const [loading, setLoading] = useState(true);
  const [splashGone, setSplashGone] = useState(false);
  const { setUser, setReady, user } = useAuth();

  // إخفاء السبلاش بـ CSS fade ثم إزالته (بدون framer-motion)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setSplashGone(true), 360);
    return () => clearTimeout(t);
  }, [loading]);

  // تهيئة أنيميشن الـ scroll
  useEffect(() => {
    AOS.init({ duration: 650, once: true, offset: 60, easing: "ease-out-cubic" });
  }, []);

  // استعادة الجلسة من الكوكي عند فتح التطبيق
  useEffect(() => {
    authApi
      .me()
      .then((d) => { setDemo(d.user?.is_demo); setUser(d.user); if (d.user?.ban?.active) showBanToast(d.user.ban); })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, [setUser, setReady]);

  useEffect(() => {
    // ومضة علامة قصيرة فقط — لا تنتظر تحميل الصور (حتى لا تؤخّر LCP)
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <ScrollToTop />
      {!splashGone && <SplashScreen hiding={!loading} />}

      {user?.is_demo && (
        <div className="demo-banner">🧪 وضع تجريبي — تغييراتك مؤقتة وتُمحى بالكامل عند تحديث الصفحة</div>
      )}

      <Header />

      <Suspense fallback={<Loader fullscreen label="جارٍ التحميل..." />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/:id/book" element={<Booking />} />
        <Route path="/events/:id/seats" element={<SeatMap />} />
        <Route path="/events/:id/checkout" element={<Checkout />} />
        <Route path="/events/:id/pay" element={<Payment />} />
        <Route path="/booking/processing" element={<BookingProcessing />} />
        <Route path="/booking/:ref" element={<BookingConfirm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/help" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

      <Footer />
    </>
  );
}

export default App;
