import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import AuthShell from "../../components/AuthShell/AuthShell";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { apiError } from "../../lib/api";
import { isEmail } from "../../utils/validators";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuth((s) => s.setUser);
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(""); // خطأ بيانات الدخول

  const clearError = (f) => { setErrors((e) => ({ ...e, [f]: undefined })); setAuthError(""); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = "البريد الإلكتروني مطلوب";
    else if (!isEmail(email)) errs.email = "بريد إلكتروني غير صحيح";
    if (!password) errs.password = "كلمة المرور مطلوبة";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setAuthError("");
    try {
      const data = await authApi.login({ email, password, remember });
      setUser(data.user);
      toast.success("تم تسجيل الدخول");
      navigate(redirectTo);
    } catch (err) {
      // حساب غير مفعّل → روح لصفحة التحقق
      if (err?.response?.data?.needVerify) {
        toast.error("الحساب غير مفعّل — أدخل كود التحقق");
        navigate("/register", { state: { email, verify: true } });
        return;
      }
      setAuthError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (f) =>
    errors[f] && (
      <p className="auth__field-error" role="alert">
        <FiAlertCircle /> {errors[f]}
      </p>
    );

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بياناتك للدخول إلى حسابك"
      footer={
        <>
          ليس لديك حساب؟ <Link to="/register">إنشاء حساب</Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={submit} noValidate>
        {authError && (
          <div className="auth__alert" role="alert">
            <FiAlertCircle /> {authError}
          </div>
        )}

        <div>
          <label className="auth__label">البريد الإلكتروني</label>
          <input
            className={`auth__input ${errors.email ? "auth__input--error" : ""}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
            autoFocus
          />
          {fieldError("email")}
        </div>

        <div>
          <label className="auth__label">كلمة المرور</label>
          <div className="auth__pw-wrap">
            <input
              className={`auth__input ${errors.password ? "auth__input--error" : ""}`}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
            />
            <button
              type="button"
              className="auth__pw-toggle"
              aria-label={showPw ? "إخفاء" : "إظهار"}
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {fieldError("password")}
        </div>

        <div className="auth__row">
          <label className="auth__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            تذكرني
          </label>
          <button type="button" className="auth__forgot" onClick={() => navigate("/reset-password")}>
            نسيت كلمة المرور؟
          </button>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </AuthShell>
  );
}
