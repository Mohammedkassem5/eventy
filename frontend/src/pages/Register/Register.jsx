import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import AuthShell from "../../components/AuthShell/AuthShell";
import OtpInput from "../../components/OtpInput/OtpInput";
import PasswordChecklist from "../../components/PasswordChecklist/PasswordChecklist";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { apiError } from "../../lib/api";
import { isEmail, isStrongPassword } from "../../utils/validators";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuth((s) => s.setUser);

  // لو جينا من login بحساب غير مفعّل → ندخل خطوة OTP مباشرة
  const preEmail = location.state?.email || "";
  const preVerify = location.state?.verify || false;

  const [step, setStep] = useState(preVerify ? "otp" : "form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(preEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(preVerify ? 53 : 0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({}); // أخطاء لكل حقل
  const [pwFocused, setPwFocused] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: undefined }));

  const validate = () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = "اكتب اسمك الكامل";
    if (!email.trim()) errs.email = "البريد الإلكتروني مطلوب";
    else if (!isEmail(email)) errs.email = "بريد إلكتروني غير صحيح";
    if (!password) errs.password = "كلمة المرور مطلوبة";
    else if (!isStrongPassword(password)) errs.password = "أكمل كل شروط كلمة المرور بالأسفل";
    if (confirm !== password) errs.confirm = "كلمتا المرور غير متطابقتين";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const data = await authApi.register({ name: name.trim(), email: email.trim(), password });
      setStep("otp");
      setTimer(53);
      toast.success(data?.message || "تم إرسال كود التحقق");
    } catch (err) {
      const msg = apiError(err);
      // البريد مستخدم → خطأ تحت حقل البريد نفسه
      if (err?.response?.status === 409 || err?.response?.data?.field === "email") {
        setErrors((x) => ({ ...x, email: msg }));
      }
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.resendOtp({ email, purpose: "verify" });
      setTimer(53);
      toast.success("تم إرسال كود جديد");
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return toast.error("اكتب الكود المكوّن من 6 أرقام");

    setBusy(true);
    try {
      const data = await authApi.verifyRegister({ email, otp });
      setUser(data.user);
      toast.success("تم إنشاء الحساب");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
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
      title={step === "form" ? "إنشاء حساب" : "تأكيد الحساب"}
      subtitle={
        step === "form"
          ? "أنشئ حسابك واستمتع بكل الخدمات"
          : `أرسلنا كود التحقق إلى ${email}`
      }
      footer={
        step === "form" && (
          <>
            لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
          </>
        )
      }
    >
      {step === "form" ? (
        <form className="auth__form" onSubmit={sendOtp} noValidate>
          <div>
            <label className="auth__label">الاسم الكامل</label>
            <input
              className={`auth__input ${errors.name ? "auth__input--error" : ""}`}
              type="text"
              placeholder="اسمك الكامل"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError("name"); }}
              autoFocus
            />
            {fieldError("name")}
          </div>

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
            />
            {fieldError("email")}
          </div>

          <div>
            <label className="auth__label">كلمة المرور</label>
            <div className="auth__pw-wrap">
              <input
                className={`auth__input ${errors.password ? "auth__input--error" : ""}`}
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                onFocus={() => setPwFocused(true)}
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
            <PasswordChecklist value={password} visible={pwFocused || password.length > 0} />
          </div>

          <div>
            <label className="auth__label">تأكيد كلمة المرور</label>
            <div className="auth__pw-wrap">
              <input
                className={`auth__input ${errors.confirm ? "auth__input--error" : ""}`}
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
              />
            </div>
            {fieldError("confirm")}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "جارٍ الإرسال..." : "إنشاء حساب"}
          </button>
        </form>
      ) : (
        <form className="auth__form" onSubmit={verify}>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "جارٍ التأكيد..." : "تأكيد"}
          </button>
          <p className="auth__hint">
            {timer > 0 ? (
              <>إعادة إرسال الكود خلال {timer} ثانية</>
            ) : (
              <button type="button" className="auth__link-btn" onClick={resend}>
                إعادة إرسال الكود
              </button>
            )}
          </p>
          {!preVerify && (
            <button
              type="button"
              className="auth__link-btn"
              onClick={() => {
                setStep("form");
                setOtp("");
              }}
            >
              رجوع
            </button>
          )}
        </form>
      )}
    </AuthShell>
  );
}
