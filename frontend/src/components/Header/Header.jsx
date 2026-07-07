import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiGrid,
  FiUser,
  FiBookmark,
  FiCreditCard,
  FiSettings,
  FiHelpCircle,
  FiLogOut,
  FiPlusCircle,
} from "react-icons/fi";
import Logo from "../Logo/Logo";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { mediaUrl } from "../../lib/api";
import "./Header.css";

const FALLBACK_AVATAR = "https://i.pravatar.cc/120?img=12";

// روابط القائمة — مشتركة بين الـ drawer (موبايل) والـ dropdown (ديسكتوب)
const menu = [
  { to: "/", label: "الرئيسية", icon: FiHome, end: true },
  { to: "/events", label: "الفعاليات", icon: FiGrid },
  { to: "/profile", label: "ملفي الشخصي", icon: FiUser },
  { to: "/my-tickets", label: "حجوزاتي", icon: FiBookmark },
  { to: "/wallet", label: "المحفظة", icon: FiCreditCard },
  { to: "/settings", label: "الإعدادات", icon: FiSettings },
  { to: "/help", label: "المساعدة والأسئلة", icon: FiHelpCircle },
];

export default function Header() {
  const [open, setOpen] = useState(false); // drawer (موبايل)
  const [menuOpen, setMenuOpen] = useState(false); // dropdown (ديسكتوب)
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, clearUser } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const close = () => setOpen(false);

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // تجاهل
    }
    clearUser();
    close();
    setMenuOpen(false);
    navigate("/");
  };

  const avatarSrc = user?.avatar ? mediaUrl(user.avatar) : FALLBACK_AVATAR;

  return (
    <header className="hdr">
      <div className="container hdr__bar">
        <NavLink to="/" className="hdr__logo" onClick={close}>
          <Logo className="hdr__logo-inner" />
        </NavLink>

        <nav className="hdr__nav">
          <NavLink to="/" end className="hdr__link">الرئيسية</NavLink>
          <NavLink to="/events" className="hdr__link">الفعاليات</NavLink>
        </nav>

        <div className="hdr__actions">
          {user ? (
            <>
              <NavLink to="/my-tickets" className="hdr__link">حجوزاتي</NavLink>
              <div className="hdr__profile" ref={menuRef}>
                <button
                  className="hdr__avatar-btn"
                  aria-label="القائمة"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <img className="hdr__avatar" src={avatarSrc} alt={user.name} />
                </button>

                {menuOpen && (
                  <div className="hdr__menu">
                    <div className="container hdr__menu-inner">
                      <div className="hdr__menu-user">
                        <img className="hdr__menu-avatar" src={avatarSrc} alt={user.name} />
                        <div className="hdr__menu-uinfo">
                          <span className="hdr__menu-name">{user.name}</span>
                          <span className="hdr__menu-email">{user.email || user.phone}</span>
                        </div>
                      </div>

                      <div className="hdr__menu-list">
                        {menu.map(({ to, label, icon: Icon, end }) => (
                          <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className="hdr__menu-item"
                            onClick={() => setMenuOpen(false)}
                          >
                            <Icon className="hdr__menu-icon" />
                            <span>{label}</span>
                          </NavLink>
                        ))}
                      </div>

                      <button className="hdr__menu-item hdr__menu-item--logout" onClick={signOut}>
                        <FiLogOut className="hdr__menu-icon" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">تسجيل الدخول</Link>
              <Link to="/register" className="btn btn-primary">إنشاء حساب</Link>
            </>
          )}
        </div>

        <button className="hdr__burger" aria-label="فتح القائمة" onClick={() => setOpen(true)}>
          <FiMenu />
        </button>
      </div>

      {/* ===== Drawer (موبايل) ===== */}
      <div className={`drawer ${open ? "drawer--open" : ""}`}>
        <div className="drawer__overlay" onClick={close} />

        <aside className="drawer__panel">
          <button className="drawer__close" aria-label="إغلاق" onClick={close}>
            <FiX />
          </button>

          {user ? (
            <>
              <div className="drawer__user">
                <img className="drawer__avatar" src={avatarSrc} alt={user.name} />
                <div className="drawer__user-info">
                  <span className="drawer__name">{user.name}</span>
                  <span className="drawer__email">{user.email || user.phone}</span>
                </div>
              </div>

              <nav className="drawer__menu">
                {menu.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className="drawer__item" onClick={close}>
                    <Icon className="drawer__item-icon" />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <button className="drawer__item drawer__item--btn" onClick={signOut}>
                  <FiLogOut className="drawer__item-icon" />
                  <span>تسجيل الخروج</span>
                </button>
              </nav>

              <button className="drawer__cta" onClick={close}>
                <FiPlusCircle />
                <span>أنشئ فعاليتك</span>
              </button>
            </>
          ) : (
            <>
              <nav className="drawer__menu drawer__menu--guest">
                <NavLink to="/" end className="drawer__item" onClick={close}>
                  <FiHome className="drawer__item-icon" />
                  <span>الرئيسية</span>
                </NavLink>
                <NavLink to="/events" className="drawer__item" onClick={close}>
                  <FiGrid className="drawer__item-icon" />
                  <span>الفعاليات</span>
                </NavLink>
              </nav>

              <div className="drawer__guest">
                <Link to="/login" className="btn btn-block drawer__guest-btn" onClick={close}>
                  تسجيل الدخول
                </Link>
                <Link
                  to="/register"
                  className="btn btn-block drawer__guest-btn drawer__guest-btn--ghost"
                  onClick={close}
                >
                  إنشاء حساب
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </header>
  );
}
