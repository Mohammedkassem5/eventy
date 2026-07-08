import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/authStore";
import { meApi } from "./services/meApi";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
import { firstAllowedPath } from "./components/AdminLayout/nav";
import { setDemo } from "./lib/demo";

const Login = lazy(() => import("./pages/Login/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword/ForgotPassword"));
const Overview = lazy(() => import("./pages/Overview/Overview"));
const Categories = lazy(() => import("./pages/Categories/Categories"));
const Events = lazy(() => import("./pages/Events/Events"));
const Venues = lazy(() => import("./pages/Venues/Venues"));
const Bookings = lazy(() => import("./pages/Bookings/Bookings"));
const Refunds = lazy(() => import("./pages/Refunds/Refunds"));
const Users = lazy(() => import("./pages/Users/Users"));
const Roles = lazy(() => import("./pages/Roles/Roles"));
const Finance = lazy(() => import("./pages/Finance/Finance"));
const Support = lazy(() => import("./pages/Support/Support"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Audit = lazy(() => import("./pages/Audit/Audit"));
const Profile = lazy(() => import("./pages/Profile/Profile"));

function Protected({ children }) {
  const { admin, ready } = useAuth();
  if (!ready) return null;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}
function GuestOnly({ children }) {
  const { admin, ready } = useAuth();
  if (!ready) return null;
  if (admin) return <Navigate to="/" replace />;
  return children;
}
function Gate({ perm, children }) {
  const can = useAuth((s) => s.can);
  return can(perm) ? children : <Navigate to={firstAllowedPath(can)} replace />;
}
// الرئيسية: لوحة القيادة لمن يملك dashboard.view، وإلا أول صفحة متاحة
function Home() {
  const can = useAuth((s) => s.can);
  if (can("dashboard.view")) return <Overview />;
  return <Navigate to={firstAllowedPath(can)} replace />;
}

export default function App() {
  const { setSession, clear, setReady } = useAuth();

  useEffect(() => {
    meApi
      .get()
      .then((d) => { setDemo(d.user?.is_demo); setSession({ user: d.user, permissions: d.permissions, role: d.role }); })
      .catch(() => clear())
      .finally(() => setReady(true));
  }, [setSession, clear, setReady]);

  return (
    <Suspense fallback={null}>
    <ScrollToTop />
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />

      <Route element={<Protected><AdminLayout /></Protected>}>
        <Route index element={<Home />} />
        <Route path="categories" element={<Gate perm="categories.manage"><Categories /></Gate>} />
        <Route path="events" element={<Gate perm="events.manage"><Events /></Gate>} />
        <Route path="venues" element={<Gate perm="venues.manage"><Venues /></Gate>} />
        <Route path="bookings" element={<Gate perm="bookings.manage"><Bookings /></Gate>} />
        <Route path="refunds" element={<Gate perm="refunds.manage"><Refunds /></Gate>} />
        <Route path="users" element={<Gate perm="users.manage"><Users /></Gate>} />
        <Route path="roles" element={<Gate perm="roles.manage"><Roles /></Gate>} />
        <Route path="payments" element={<Gate perm="payments.manage"><Finance /></Gate>} />
        <Route path="marketing" element={<Gate perm="marketing.manage"><ComingSoon title="التسويق والولاء" /></Gate>} />
        <Route path="support" element={<Gate perm="support.reply"><Support /></Gate>} />
        <Route path="settings" element={<Gate perm="settings.manage"><Settings /></Gate>} />
        <Route path="audit" element={<Gate perm="audit.view"><Audit /></Gate>} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
