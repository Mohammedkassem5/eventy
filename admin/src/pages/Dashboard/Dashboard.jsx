import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import "./Dashboard.css";

export default function Dashboard() {
  const { admin, clearAdmin } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await authApi.logout().catch(() => {});
    clearAdmin();
    navigate("/login");
  };

  return (
    <div className="dash">
      <ThemeToggle className="theme-toggle--float" />
      <h1>لوحة التحكم</h1>
      <p className="text-muted">مرحبًا {admin?.name} — سنبني الأقسام تباعًا.</p>
      <button className="btn btn-primary" onClick={logout}>تسجيل الخروج</button>
    </div>
  );
}
