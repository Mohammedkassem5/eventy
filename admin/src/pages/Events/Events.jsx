import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiGrid } from "react-icons/fi";
import { eventApi } from "../../services/eventApi";
import { mediaUrl, apiError } from "../../lib/api";
import EventEditor from "./EventEditor";
import TicketsModal from "./TicketsModal";
import "./Events.css";

dayjs.locale("ar");
const egp = (n) => (n == null ? "—" : `${Number(n).toLocaleString("ar-EG")} ج.م`);
const STATUS = { published: { t: "منشورة", c: "#16a34a" }, draft: { t: "مسودة", c: "#94a3b8" } };

export default function Events() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [ticketsFor, setTicketsFor] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setList(await eventApi.list()); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (ev) => {
    if (!confirm(`حذف "${ev.title_ar}"؟ سيُحذف معها كل التذاكر والمقاعد.`)) return;
    try { await eventApi.remove(ev.id); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="events-admin">
      <div className="page-head">
        <div>
          <h1>الفعاليات</h1>
          <p className="text-muted">إدارة كاملة للفعاليات — التفاصيل، التواريخ، التسليم، الإرشادات، التذاكر والمقاعد.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(null)}><FiPlus /> فعالية جديدة</button>
      </div>

      {loading ? (
        <div className="loading">جارٍ التحميل...</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>البوستر</th><th>العنوان</th><th>النوع</th><th>التاريخ</th><th>السعر من</th><th>الحالة</th><th>مميّز</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {list.map((ev) => {
                const st = STATUS[ev.status] || STATUS.draft;
                return (
                  <tr key={ev.id}>
                    <td>{ev.poster ? <img className="ev-thumb" src={mediaUrl(ev.poster)} alt="" /> : <span className="ev-noimg">🎫</span>}</td>
                    <td>
                      <div className="ev-title">{ev.title_ar}</div>
                      {ev.subtitle && <div className="ev-sub">{ev.subtitle}</div>}
                    </td>
                    <td>{ev.category?.name_ar || "—"}</td>
                    <td className="td-date">{ev.date_start ? dayjs(ev.date_start).format("D MMM YYYY · HH:mm") : "—"}</td>
                    <td className="td-strong">{egp(ev.price_from)}</td>
                    <td><span className="badge" style={{ background: `${st.c}1a`, color: st.c }}>{st.t}</span></td>
                    <td>{ev.is_featured ? <FiStar className="star-on" /> : "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="إدارة التذاكر والمقاعد" onClick={() => setTicketsFor(ev)}><FiGrid /></button>
                        <button className="icon-btn" title="تعديل" onClick={() => setEditing(ev)}><FiEdit2 /></button>
                        <button className="icon-btn icon-btn--danger" title="حذف" onClick={() => remove(ev)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan="8" className="td-empty">لا توجد فعاليات — أضف أول فعالية.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <EventEditor event={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      )}
      {ticketsFor && <TicketsModal event={ticketsFor} onClose={() => setTicketsFor(null)} />}
    </div>
  );
}
