import ThemeToggle from "../ThemeToggle/ThemeToggle";
import "./AuthLayout.css";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <ThemeToggle className="theme-toggle--float" />
      {/* لوحة العلامة */}
      <aside className="auth__brand">
        <div className="auth__brand-inner">
          <div className="auth__logo">
            <span className="auth__logo-mark">🎫</span> Eventy
          </div>
          <h2>لوحة تحكم Eventy</h2>
          <p>إدارة كل تفاصيل المنصة من مكان واحد — الفعاليات، التذاكر، الحجوزات، الإعدادات والمزيد.</p>
        </div>
      </aside>

      {/* نموذج */}
      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__logo auth__logo--mobile">
            <span className="auth__logo-mark">🎫</span> Eventy Admin
          </div>
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
