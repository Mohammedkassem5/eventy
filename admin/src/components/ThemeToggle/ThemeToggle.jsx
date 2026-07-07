import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../store/themeStore";
import "./ThemeToggle.css";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={toggle}
      aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {dark ? <FiSun /> : <FiMoon />}
    </button>
  );
}
