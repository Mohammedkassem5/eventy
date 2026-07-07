import { Link } from "react-router-dom";
import {
  FiActivity,
  FiGrid,
  FiShield,
  FiStar,
  FiBookmark,
  FiCalendar,
  FiGift,
  FiInfo,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Logo from "../Logo/Logo";
import "./Footer.css";

const features = [
  { icon: FiActivity, title: "متابعة وتجربة مميزة", desc: "تابع تفاصيل حجزك واستمتع بتجربة سلسة وشفافة في جميع الفعاليات." },
  { icon: FiGrid, title: "فعاليات متنوعة", desc: "نوفر مجموعة واسعة من الفعاليات لتناسب جميع الأذواق والأعمار." },
  { icon: FiShield, title: "حجز سهل وآمن", desc: "بوابة دفع آمنة وسريعة تضمن لك حجز تذاكرك بكل سهولة وراحة." },
  { icon: FiStar, title: "تنظيم المناسبات", desc: "نقدم تنظيمًا كاملًا للفعاليات والمناسبات لجعلها تجربة لا تُنسى لكل الحضور." },
];

const links = [
  { to: "/events", label: "احجز تذكرتك", icon: FiBookmark },
  { to: "/events", label: "الفعاليات القادمة", icon: FiCalendar },
  { to: "/offers", label: "عروض خاصة", icon: FiGift },
  { to: "/about", label: "من نحن", icon: FiInfo },
];

const contacts = [
  { icon: FiMail, label: "info@eventy.com", href: "mailto:info@eventy.com" },
  { icon: FiPhone, label: "+20 100 000 0000", href: "tel:+201000000000" },
  { icon: FaWhatsapp, label: "+20 100 000 0000", href: "https://wa.me/201000000000", green: true },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="ft">
      {/* شريط الشركة */}
      <div className="container ft__top">
        <Logo className="ft__logo" />
        <div className="ft__company">
          <span className="ft__company-name">شركة Eventy للترفيه والتذاكر</span>
          <span className="ft__company-line">الرقم الضريبي: 312-729-870-400003</span>
          <span className="ft__company-line">جميع الحقوق محفوظة لـ Eventy © {year}</span>
        </div>
      </div>

      {/* مميزات */}
      <div className="container ft__features">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="ft-feat">
            <span className="ft-feat__icon"><Icon /></span>
            <h4 className="ft-feat__title">{title}</h4>
            <p className="ft-feat__desc">{desc}</p>
          </div>
        ))}
      </div>

      {/* روابط مهمة */}
      <div className="container ft__section">
        <h3 className="ft__heading">روابط مهمة — Eventy</h3>
        <div className="ft__links">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={label} to={to} className="ft-link">
              <span>{label}</span>
              <Icon className="ft-link__icon" />
            </Link>
          ))}
        </div>
      </div>

      {/* تواصل */}
      <div className="container ft__section">
        <h3 className="ft__heading">تواصل معنا — Eventy</h3>
        <div className="ft__contacts">
          {contacts.map(({ icon: Icon, label, href, green }, i) => (
            <a key={i} href={href} className="ft-contact" target="_blank" rel="noreferrer">
              <span>{label}</span>
              <span className={`ft-contact__icon ${green ? "ft-contact__icon--wa" : ""}`}>
                <Icon />
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* الحقوق */}
      <div className="ft__bottom">
        <span>© {year} <strong>Eventy</strong>. جميع الحقوق محفوظة.</span>
      </div>
    </footer>
  );
}
