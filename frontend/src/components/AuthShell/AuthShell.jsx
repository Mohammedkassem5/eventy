import { Link } from "react-router-dom";
import Logo from "../Logo/Logo";
import "./AuthShell.css";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <Link to="/" className="auth__logo">
          <Logo className="auth__logo-inner" />
        </Link>
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth__footer">{footer}</div>}
      </div>
    </div>
  );
}
