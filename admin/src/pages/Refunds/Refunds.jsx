import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiEye, FiCheck, FiX, FiChevronRight, FiChevronLeft, FiUser, FiCalendar, FiTag } from "react-icons/fi";
import { refundApi } from "../../services/refundApi";
import { apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import Avatar from "../../components/Avatar/Avatar";
import "../Bookings/Bookings.css";
import "./Refunds.css";

dayjs.locale("ar");
const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const ST = {
  pending: { t: "قيد المراجعة", c: "#d97706" },
  approved: { t: "تمت الموافقة", c: "#16a34a" },
  rejected: { t: "مرفوض", c: "#dc2626" },
};
const TABS = [{ k: "", l: "الكل" }, { k: "pending", l: "قيد المراجعة" }, { k: "approved", l: "موافق عليها" }, { k: "rejected", l: "مرفوضة" }];

export default function Refunds() {
  const [data, setData] = useState({ requests: [], summary: {}, total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await refundApi.list({ status: status || undefined, page, limit: 12 })); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [status, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const act = async (kind) => {
    setBusy(true);
    try {
      if (kind === "approve") await refundApi.approve(detail.id, note);
      else await refundApi.reject(detail.id, note);
      toast.success(kind === "approve" ? "تمت الموافقة والاسترداد" : "تم الرفض");
      setDetail(null); setNote(""); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const s = data.summary || {};
  const cards = [
    { l: "إجمالي الطلبات", v: s.total ?? 0, c: "#6d28d9" },
    { l: "قيد المراجعة", v: s.pending ?? 0, c: "#d97706" },
    { l: "موافق عليها", v: s.approved ?? 0, c: "#16a34a" },
    { l: "مرفوضة", v: s.rejected ?? 0, c: "#dc2626" },
    { l: "إجمالي المسترد", v: egp(s.refunded ?? 0), c: "#f75200", wide: true },
  ];

  return (
    <div className="bk-admin">
      <div className="page-head">
        <div><h1>الاستردادات</h1><p>طلبات الاسترداد من المستخدمين — راجع، وافق (يُلغى الحجز ويُسترد المقاعد والنقاط) أو ارفض.</p></div>
      </div>

      <div className="bk-cards">
        {cards.map((c, i) => (
          <div className={`bk-card ${c.wide ? "bk-card--wide" : ""}`} key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="bk-card__bar" style={{ background: c.c }} />
            <span className="bk-card__label">{c.l}</span>
            <span className="bk-card__value" style={{ color: c.c }}>{typeof c.v === "number" ? c.v.toLocaleString("ar-EG") : c.v}</span>
          </div>
        ))}
      </div>

      <div className="bk-toolbar">
        <div className="bk-tabs">{TABS.map((t) => <button key={t.k} className={`chip ${status === t.k ? "chip--on" : ""}`} onClick={() => setStatus(t.k)}>{t.l}</button>)}</div>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المرجع</th><th>المستخدم</th><th>الفعالية</th><th>المبلغ</th><th>السبب</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
              <tbody>
                {data.requests.map((r) => {
                  const st = ST[r.status];
                  return (
                    <tr key={r.id}>
                      <td className="td-mono">{r.booking?.booking_ref}</td>
                      <td>
                        <div className="bk-user">
                          <Avatar src={r.user?.avatar} name={r.user?.name} size={40} />
                          <div><span className="bk-user__name">{r.user?.name}</span><span className="bk-user__mail">{r.user?.email}</span></div>
                        </div>
                      </td>
                      <td className="td-strong">{r.booking?.event?.title_ar}</td>
                      <td className="td-strong">{egp(r.refund_amount)}</td>
                      <td className="rf-reason">{r.reason || "—"}</td>
                      <td><span className="badge" style={{ background: `${st.c}1a`, color: st.c }}>{st.t}</span></td>
                      <td className="bk-date">{dayjs(r.createdAt).format("D MMM · HH:mm")}</td>
                      <td><button className="icon-btn" onClick={() => { setDetail(r); setNote(""); }}><FiEye /></button></td>
                    </tr>
                  );
                })}
                {!data.requests.length && <tr><td colSpan="8" className="td-empty">لا توجد طلبات.</td></tr>}
              </tbody>
            </table>
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

      <Modal open={!!detail} title="طلب استرداد" onClose={() => setDetail(null)} width={540}>
        {detail && (
          <div className="rfd">
            <div className="bkd__top">
              <span className="badge" style={{ background: `${ST[detail.status].c}1a`, color: ST[detail.status].c }}>{ST[detail.status].t}</span>
              <strong className="rfd__amount">{egp(detail.refund_amount)}</strong>
            </div>
            <div className="bkd__grid">
              <div className="bkd__col"><h4><FiUser /> المستخدم</h4><p>{detail.user?.name}</p><p className="text-muted">{detail.user?.email}</p></div>
              <div className="bkd__col"><h4><FiCalendar /> الفعالية</h4><p>{detail.booking?.event?.title_ar}</p><p className="text-muted">{detail.booking?.booking_ref}</p></div>
            </div>
            <div className="bkd__row"><FiTag /> الفئة: <b>{detail.booking?.ticketCategory?.name}</b> × {detail.booking?.quantity}</div>
            <div className="rfd__reason"><span className="text-muted">سبب المستخدم:</span><p>{detail.reason || "بدون سبب"}</p></div>

            {detail.status === "pending" ? (
              <>
                <div className="field"><label>ملاحظة (اختياري)</label><textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب القرار..." /></div>
                <div className="rfd__actions">
                  <button className="btn btn-danger" disabled={busy} onClick={() => act("reject")}><FiX /> رفض</button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => act("approve")}><FiCheck /> موافقة واسترداد</button>
                </div>
              </>
            ) : (
              <div className="rfd__done text-muted">
                {detail.admin_note && <p>ملاحظة الأدمن: {detail.admin_note}</p>}
                <p>تمت المعالجة {detail.responded_at ? dayjs(detail.responded_at).format("D MMM YYYY · HH:mm") : ""}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
