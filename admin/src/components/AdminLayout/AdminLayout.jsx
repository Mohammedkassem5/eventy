import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FiMenu, FiLogOut, FiChevronDown, FiX } from "react-icons/fi";
import { useAuth } from "../../store/authStore";
import { authApi } from "../../services/authApi";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { NAV } from "./nav";
import Avatar from "../Avatar/Avatar";
import "./AdminLayout.css";

function Group({ node, can, pathname, closeDrawer }) {
  const visible = node.children.filter((c) => can(c.perm));
  if (!visible.length) return null;

  const activeInside = visible.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
  const [open, setOpen] = useState(activeInside);
  const Icon = node.icon;

  return (
    <div className={`navgroup ${open ? "navgroup--open" : ""}`}>
      <button className="navgroup__head" onClick={() => setOpen((v) => !v)}>
        <Icon />
        <span>{node.label}</span>
        <FiChevronDown className="navgroup__chev" />
      </button>
      <div className="navgroup__items">
        <div className="navgroup__items-inner">
          {visible.map((c) => (
            <NavLink key={c.to} to={c.to} className="sidebar__sublink" onClick={closeDrawer}>
              <span className="dot" /> {c.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { admin, roleName, can, clear } = useAuth();

  const close = () => setDrawer(false);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);
  const logout = async () => {
    await authApi.logout().catch(() => {});
    clear();
    navigate("/login");
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${drawer ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <span className="sidebar__mark">🎫</span> Eventy
          <button className="sidebar__close" onClick={close} aria-label="إغلاق"><FiX /></button>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((node, i) =>
            node.type === "item"
              ? can(node.perm) && (
                  <NavLink key={i} to={node.to} end={node.end} className="sidebar__link" onClick={close}>
                    <node.icon /> <span>{node.label}</span>
                  </NavLink>
                )
              : <Group key={i} node={node} can={can} pathname={pathname} closeDrawer={close} />
          )}
        </nav>

        <button className="sidebar__logout" onClick={logout}><FiLogOut /> <span>تسجيل الخروج</span></button>
      </aside>

      {drawer && <div className="layout__overlay" onClick={close} />}

      <div className="main">
        <header className="topbar">
          <button className="topbar__burger" onClick={() => setDrawer((v) => !v)} aria-label="القائمة">{drawer ? <FiX /> : <FiMenu />}</button>
          <div className="topbar__spacer" />
          <ThemeToggle />
          <NavLink to="/profile" className="topbar__user" title="ملفي الشخصي">
            <Avatar src={admin?.avatar} name={admin?.name} size={38} />
            <div className="topbar__user-txt">
              <span className="topbar__name">{admin?.name}</span>
              <span className="topbar__role">{roleName}</span>
            </div>
          </NavLink>
        </header>
        {admin?.is_demo && (
          <div className="demo-banner">🧪 وضع تجريبي — كل تغييراتك مؤقتة وتُمحى بالكامل عند تحديث الصفحة</div>
        )}
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
