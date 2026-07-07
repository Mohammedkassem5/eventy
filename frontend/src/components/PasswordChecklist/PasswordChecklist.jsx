import { FiCheck, FiX } from "react-icons/fi";
import { passwordChecks } from "../../utils/validators";
import "./PasswordChecklist.css";

// قائمة قواعد كلمة المرور — علامة ✓ حيّة لكل قاعدة تتحقق أثناء الكتابة
export default function PasswordChecklist({ value = "", visible = true }) {
  if (!visible) return null;
  const checks = passwordChecks(value);
  return (
    <ul className="pwck" aria-live="polite">
      {checks.map((c) => (
        <li key={c.key} className={`pwck__item ${c.ok ? "ok" : ""}`}>
          <span className="pwck__ic">{c.ok ? <FiCheck /> : <FiX />}</span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}
