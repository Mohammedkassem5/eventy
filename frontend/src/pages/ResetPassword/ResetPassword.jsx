import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import toast from "react-hot-toast";
import AuthShell from "../../components/AuthShell/AuthShell";
import OtpInput from "../../components/OtpInput/OtpInput";
import PasswordChecklist from "../../components/PasswordChecklist/PasswordChecklist";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { apiError } from "../../lib/api";
import { isEmail, isStrongPassword } from "../../utils/validators";

export default function ResetPassword() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);

  const [step, setStep] = useState("email"); // email | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
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
    if (!isStrongPassword(password)) return toast.error("أكمل كل شروط كلمة المرور");
    setBusy(true);
    try {
      const data = await authApi.reset({ email, otp, password });
      setUser(data.user);
      toast.success("تم تغيير كلمة المرور");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="إعادة تعيين كلمة المرور"
      subtitle={
        step === "email"
          ? "أدخل بريدك لإرسال كود إعادة التعيين"
          : `أدخل الكود المُرسل إلى ${email} وكلمة مرور جديدة`
      }
      footer={
        <>
          تذكرت كلمة المرور؟ <Link to="/login">تسجيل الدخول</Link>
        </>
      }
    >
      {step === "email" ? (
        <form className="auth__form" onSubmit={sendCode}>
          <div>
            <label className="auth__label">البريد الإلكتروني</label>
            <input
              className="auth__input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="example@mail.com"
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
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <PasswordChecklist value={password} visible={password.length > 0} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
          </button>
          <p className="auth__hint">
            {timer > 0 ? (
              <>إعادة إرسال الكود خلال {timer} ثانية</>
            ) : (
              <button type="button" className="auth__link-btn" onClick={sendCode}>
                إعادة إرسال الكود
              </button>
            )}
          </p>
        </form>
      )}
    </AuthShell>
  );
}
