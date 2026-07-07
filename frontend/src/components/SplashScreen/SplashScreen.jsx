import Logo from "../Logo/Logo";
import "./SplashScreen.css";

const DOTS = Array.from({ length: 12 });

// CSS-only — no framer-motion (keeps it out of the initial bundle)
export default function SplashScreen({ hiding }) {
  return (
    <div className={`splash ${hiding ? "splash--hide" : ""}`} role="status" aria-label="جاري التحميل">
      <div className="splash__center">
        <Logo className="splash__logo" />
      </div>
      <div className="splash__loader-wrap">
        <div className="splash__loader">
          {DOTS.map((_, i) => (
            <span key={i} style={{ "--i": i }} />
          ))}
        </div>
      </div>
    </div>
  );
}
