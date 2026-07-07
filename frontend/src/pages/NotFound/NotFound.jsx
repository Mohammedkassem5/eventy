import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="notfound-page">
      <h1>404</h1>
      <p>الصفحة غير موجودة</p>
      <Link to="/">الرجوع للرئيسية</Link>
    </div>
  );
}
