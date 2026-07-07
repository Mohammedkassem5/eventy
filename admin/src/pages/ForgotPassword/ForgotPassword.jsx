import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import toast from "react-hot-toast";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import OtpInput from "../../components/OtpInput/OtpInput";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { meApi } from "../../services/meApi";
import { apiError } from "../../lib/api";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function ForgotPassword() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);

  const [step, setStep] = useState("email"); // email | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!isEmail(email)) return toast.error("اكتب بريدًا إلكترونيًا صحيحًا");
    setBusy(true);
    try {
      await authApi.forgot({ email });
      setStep("reset");
      setTimer(53);
      toast.success("إن وُجد الحساب فقد أرسلنا كودًا");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return toast.error("اكتب الكود المكوّن من 6 أرقام");
    if (password.length < 6) return toast.error("كلمة المرور 6 أحرف على الأقل");
    setBusy(true);
    try {
      await authApi.reset({ email, otp, password });
      toast.success("تم تغيير كلمة المرور — سجّل الدخول");
      navigate("/login");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="إعادة تعيين كلمة المرور"
      subtitle={step === "email" ? "أدخل بريدك لإرسال كود التحقق" : `أدخل الكود المُرسل إلى ${email}`}
      footer={<Link to="/login" className="auth__link">العودة لتسجيل الدخول</Link>}
    >
      {step === "email" ? (
        <form className="auth__form" onSubmit={sendCode}>
          <div>
            <label className="auth__label">البريد الإلكتروني</label>
            <input
              className="auth__input"
              type="email"
              inputMode="email"
              placeholder="admin@eventy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "جارٍ الإرسال..." : "إرسال الكود"}
          </button>
        </form>
      ) : (
        <form className="auth__form" onSubmit={doReset}>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          <div>
            <label className="auth__label">كلمة المرور الجديدة</label>
            <div className="auth__pw-wrap">
              <input
                className="auth__input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="auth__pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="إظهار">
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
          </button>
          <p className="auth__hint">
            {timer > 0 ? (
              <>إعادة الإرسال خلال {timer} ثانية</>
            ) : (
              <button type="button" className="auth__link" onClick={sendCode}>إعادة إرسال الكود</button>
            )}
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
