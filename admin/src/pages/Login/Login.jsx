import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import toast from "react-hot-toast";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { meApi } from "../../services/meApi";
import { apiError } from "../../lib/api";
import { firstAllowedPath } from "../../components/AdminLayout/nav";
import { setDemo } from "../../lib/demo";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const redirectTo = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return toast.error("اكتب بريدًا إلكترونيًا صحيحًا");
    if (password.length < 6) return toast.error("كلمة المرور 6 أحرف على الأقل");

    setBusy(true);
    try {
      await authApi.login({ email, password, remember });
      const me = await meApi.get();
      setDemo(me.user?.is_demo);
      setSession({ user: me.user, permissions: me.permissions, role: me.role });
      toast.success("مرحبًا بك");
      // وجّه لأول صفحة متاحة (مثلًا مشرف الدعم → /support بدل الرئيسية)
      const perms = me.permissions || [];
      const can = (p) => perms.includes("*") || perms.includes(p);
      const target = redirectTo !== "/" ? redirectTo : firstAllowedPath(can);
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="ادخل ببيانات حساب المالك/الأدمن للوصول إلى لوحة التحكم"
      footer={<Link to="/forgot-password" className="auth__link">نسيت كلمة المرور؟</Link>}
    >
      <form className="auth__form" onSubmit={submit}>
        <div>
          <label className="auth__label">البريد الإلكتروني</label>
          <input
            className="auth__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="admin@eventy.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="auth__label">كلمة المرور</label>
          <div className="auth__pw-wrap">
            <input
              className="auth__input"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="auth__pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="إظهار">
              {showPw ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <label className="auth__remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          تذكرني
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </AuthLayout>
  );
}
