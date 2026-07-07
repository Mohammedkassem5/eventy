import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiSearch, FiChevronRight, FiChevronLeft, FiActivity, FiUser } from "react-icons/fi";
import { auditApi } from "../../services/settingsApi";
import { apiError } from "../../lib/api";
import "./Audit.css";

dayjs.locale("ar");

const COLORS = {
  "admin.create": "#16a34a", "admin.update": "#0ea5e9", "admin.remove": "#dc2626",
  "role.create": "#16a34a", "role.update": "#0ea5e9", "role.delete": "#dc2626",
  "user.ban": "#dc2626", "user.unban": "#16a34a",
  "refund.approve": "#16a34a", "refund.reject": "#dc2626",
  "settings.update": "#d97706", "settings.create": "#6d28d9", "settings.delete": "#dc2626",
};

export default function Audit() {
  const [data, setData] = useState({ logs: [], actions: {}, total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await auditApi.list({ action: action || undefined, q: term || undefined, page, limit: 20 })); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [action, term, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [action, term]);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  return (
    <div className="ad">
      <div className="page-head">
        <div><h1>سجل التدقيق</h1><p>كل إجراء حسّاس يقوم به المشرفون — مَن فعل ماذا ومتى.</p></div>
      </div>

      <div className="ad__toolbar">
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">كل الإجراءات</option>
          {Object.entries(data.actions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="search">
          <FiSearch className="search__icon" />
          <input className="search__input" placeholder="ابحث باسم المشرف أو الهدف..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <>
          <div className="ad__timeline">
            {data.logs.map((l) => {
              const c = COLORS[l.action] || "#888";
              return (
                <div className="ad-item" key={l.id}>
                  <span className="ad-item__dot" style={{ background: c }}><FiActivity /></span>
                  <div className="ad-item__body">
                    <div className="ad-item__top">
                      <span className="ad-item__action" style={{ color: c }}>{l.action_label}</span>
                      <span className="ad-item__time">{dayjs(l.createdAt).format("D MMM YYYY · HH:mm")}</span>
                    </div>
                    {l.target && <p className="ad-item__target">{l.target}</p>}
                    <div className="ad-item__foot">
                      <span className="ad-item__by"><FiUser /> {l.admin_name || "—"}</span>
                      {l.meta && <code className="ad-item__meta">{JSON.stringify(l.meta)}</code>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!data.logs.length && <div className="td-empty">لا سجلات.</div>}
          </div>

          {data.pages > 1 && (
            <div className="bk-pager">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><FiChevronRight /> السابق</button>
              <span>صفحة {data.page} من {data.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>التالي <FiChevronLeft /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
