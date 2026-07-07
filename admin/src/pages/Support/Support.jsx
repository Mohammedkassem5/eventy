import { useEffect, useRef, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiSend, FiSearch, FiCheck, FiHeadphones, FiArrowRight, FiXCircle, FiStar, FiInfo, FiX, FiCreditCard, FiRotateCcw, FiAward } from "react-icons/fi";
import { supportApi } from "../../services/supportApi";
import { getSocket } from "../../lib/socket";
import { apiError } from "../../lib/api";
import Avatar from "../../components/Avatar/Avatar";
import "./Support.css";

dayjs.locale("ar");

export default function Support() {
  const [convos, setConvos] = useState([]);
  const [online, setOnline] = useState({});        // {userId: true}
  const [active, setActive] = useState(null);        // user object
  const [session, setSession] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [showCtx, setShowCtx] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [q, setQ] = useState("");
  const endRef = useRef(null);
  const activeRef = useRef(null);
  const typingTO = useRef(null);
  const typingOff = useRef(null);

  activeRef.current = active?.id;

  const loadConvos = useCallback(async () => {
    try { setConvos(await supportApi.conversations()); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoadingConvos(false); }
  }, []);

  // socket حيّ
  useEffect(() => {
    loadConvos();
    const socket = getSocket();
    socket.connect();

    const onNew = (msg) => {
      const uid = msg.conversationUserId ?? msg.user_id;
      // داخل المحادثة المفتوحة؟ أضِف + علّم مقروء
      if (activeRef.current === uid) {
        setMessages((p) => (p.some((x) => x.id === msg.id) ? p : [...p, msg]));
        if (msg.sender === "user") socket.emit("support:read", { userId: uid });
      }
      // حدّث قائمة المحادثات (آخر رسالة + غير المقروء)
      setConvos((prev) => {
        const list = [...prev];
        const i = list.findIndex((c) => c.user.id === uid);
        const bumpUnread = msg.sender === "user" && activeRef.current !== uid ? 1 : 0;
        if (i === -1) { loadConvos(); return prev; }
        const c = { ...list[i], last: msg, unread: (list[i].unread || 0) + bumpUnread };
        list.splice(i, 1); list.unshift(c);
        return list;
      });
    };
    const onTyping = ({ userId, who, isTyping }) => {
      if (who === "user" && activeRef.current === userId) setUserTyping(isTyping);
    };
    const onPresence = ({ userId, online: on }) => setOnline((p) => ({ ...p, [userId]: on }));
    const onRead = ({ userId, by }) => {
      if (by === "user" && activeRef.current === userId) setMessages((p) => p.map((m) => m.sender === "admin" ? { ...m, is_read: true } : m));
    };
    const onClosed = (s) => {
      const uid = s.conversationUserId ?? s.user_id;
      if (activeRef.current === uid) setSession(s);
      setConvos((prev) => prev.map((c) => c.user.id === uid ? { ...c, session: s } : c));
    };
    const onRated = (s) => {
      const uid = s.conversationUserId ?? s.user_id;
      if (activeRef.current === uid) setSession(s);
      setConvos((prev) => prev.map((c) => c.user.id === uid ? { ...c, session: s } : c));
    };

    socket.on("support:new", onNew);
    socket.on("support:typing", onTyping);
    socket.on("support:presence", onPresence);
    socket.on("support:read", onRead);
    socket.on("support:closed", onClosed);
    socket.on("support:rated", onRated);
    socket.on("support:session", onRated);
    return () => {
      socket.off("support:new", onNew); socket.off("support:typing", onTyping);
      socket.off("support:presence", onPresence); socket.off("support:read", onRead);
      socket.off("support:closed", onClosed); socket.off("support:rated", onRated);
      socket.off("support:session", onRated);
      socket.disconnect();
    };
  }, [loadConvos]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, userTyping]);

  const openConvo = async (user) => {
    setActive(user); setUserTyping(false); setLoadingMsgs(true); setSession(null); setShowCtx(false); setCtx(null);
    setConvos((p) => p.map((c) => c.user.id === user.id ? { ...c, unread: 0 } : c));
    try {
      const d = await supportApi.messages(user.id);
      setMessages(d.messages); setSession(d.session);
      getSocket().emit("support:read", { userId: user.id }); // علّم رسائله مقروءة
      supportApi.context(user.id).then(setCtx).catch(() => {}); // بيانات العميل المفيدة
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoadingMsgs(false); }
  };

  const endChat = async () => {
    if (!active || !confirm("إنهاء المحادثة نهائيًا؟ لا يمكن إعادة فتحها.")) return;
    try { const d = await supportApi.close(active.id); setSession(d.session); }
    catch (e) { toast.error(apiError(e)); }
  };

  const onType = (e) => {
    setText(e.target.value);
    if (!active) return;
    const socket = getSocket();
    socket.emit("support:typing", { userId: active.id, isTyping: true });
    clearTimeout(typingOff.current);
    typingOff.current = setTimeout(() => socket.emit("support:typing", { userId: active.id, isTyping: false }), 1500);
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active || session?.status === "closed") return;
    setText("");
    getSocket().emit("support:typing", { userId: active.id, isTyping: false });
    try { await supportApi.reply(active.id, body); } // socket يضيفها
    catch (err) { toast.error(apiError(err)); setText(body); }
  };

  const filtered = convos.filter((c) => {
    const t = q.trim().toLowerCase();
    return !t || c.user.name?.toLowerCase().includes(t) || c.user.email?.toLowerCase().includes(t);
  });

  return (
    <div className="sup">
      <div className="page-head"><div><h1>الدعم</h1><p>دردشة حيّة مع المستخدمين — رسائل ومؤشّر كتابة وحالة قراءة فورية.</p></div></div>

      <div className={`sup__wrap ${active ? "has-active" : ""}`}>
        {/* قائمة المحادثات */}
        <aside className="sup__list">
          <div className="search"><FiSearch className="search__icon" /><input className="search__input" placeholder="ابحث عن محادثة..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="sup__convos">
            {loadingConvos ? <div className="loading">جارٍ التحميل...</div>
              : filtered.length ? filtered.map((c) => (
                <button key={c.user.id} className={`convo ${active?.id === c.user.id ? "convo--on" : ""}`} onClick={() => openConvo(c.user)}>
                  <div className="convo__av">
                    <Avatar src={c.user.avatar} name={c.user.name} size={44} />
                    {online[c.user.id] && <span className="convo__dot" />}
                  </div>
                  <div className="convo__body">
                    <div className="convo__top"><span className="convo__name">{c.user.name || `#${c.user.id}`}</span><span className="convo__time">{c.last && dayjs(c.last.createdAt).format("HH:mm")}</span></div>
                    <div className="convo__bottom">
                      <span className="convo__last">{c.last?.sender === "admin" ? "أنت: " : ""}{c.last?.body}</span>
                      {c.unread > 0 && <span className="convo__badge">{c.unread}</span>}
                    </div>
                    {c.session?.status === "closed" && (
                      <span className="convo__closed">
                        مغلقة{c.session.rating ? ` · ${c.session.rating}★` : ""}
                      </span>
                    )}
                  </div>
                </button>
              )) : <div className="sup__empty"><FiHeadphones /><p>لا محادثات بعد.</p></div>}
          </div>
        </aside>

        {/* لوحة الدردشة */}
        <section className="sup__chat">
          {!active ? (
            <div className="sup__placeholder"><FiHeadphones /><p>اختر محادثة للبدء</p></div>
          ) : (
            <>
              <header className="sup__chat-head">
                <button className="sup__back icon-btn" onClick={() => setActive(null)}><FiArrowRight /></button>
                <Avatar src={active.avatar} name={active.name} size={40} />
                <div>
                  <span className="sup__chat-name">{active.name || `#${active.id}`}</span>
                  <span className={`sup__chat-status ${online[active.id] ? "on" : ""}`}>{online[active.id] ? "متصل الآن" : "غير متصل"}</span>
                </div>
                <span className="sup__chat-mail">{active.email}</span>
                <button className="sup__infobtn icon-btn" title="معلومات العميل" onClick={() => setShowCtx((v) => !v)}><FiInfo /></button>
                {session?.status === "open" && <button className="sup__endbtn" onClick={endChat}><FiXCircle /> إنهاء</button>}
              </header>

              <div className="sup__body">
                {loadingMsgs ? <div className="loading">جارٍ التحميل...</div> : messages.map((m) => (
                  <div key={m.id} className={`bub ${m.sender === "admin" ? "bub--me" : "bub--them"}`}>
                    <p>{m.body}</p>
                    <span className="bub__meta">{dayjs(m.createdAt).format("HH:mm")}{m.sender === "admin" && <FiCheck className={`bub__tick ${m.is_read ? "read" : ""}`} />}</span>
                  </div>
                ))}
                {userTyping && session?.status !== "closed" && <div className="bub bub--them bub--typing"><span></span><span></span><span></span></div>}

                {session?.status === "closed" && (
                  <div className="sup__closed">
                    <FiXCircle />
                    <span>انتهت المحادثة {session.closed_by === "admin" ? "بواسطة الدعم" : "بواسطة العميل"}</span>
                    {session.rating
                      ? <span className="sup__rating">{[1,2,3,4,5].map((n) => <FiStar key={n} className={n <= session.rating ? "on" : ""} />)} <b>{session.rating}/5</b></span>
                      : <span className="sup__norating">بانتظار تقييم العميل</span>}
                    {session.rating_comment && <p className="sup__ratecomment">“{session.rating_comment}”</p>}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {session?.status === "closed" ? (
                <div className="sup__closedbar">المحادثة منتهية — لا يمكن إرسال رسائل</div>
              ) : (
                <form className="sup__input" onSubmit={send}>
                  <input value={text} onChange={onType} placeholder="اكتب ردًا..." />
                  <button type="submit" aria-label="إرسال"><FiSend /></button>
                </form>
              )}

              {showCtx && <CtxPanel ctx={ctx} onClose={() => setShowCtx(false)} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* لوحة بيانات العميل المفيدة للدعم فقط */
const egp = (n) => `${Number(n).toLocaleString("ar-EG")} ج.م`;
const BST = { confirmed: ["مؤكد", "#16a34a"], pending: ["معلّق", "#d97706"], cancelled: ["ملغي", "#dc2626"] };
const PST = { paid: ["مدفوع", "#16a34a"], pending: ["غير مدفوع", "#d97706"], refunded: ["مسترد", "#6d28d9"] };
const RST = { pending: ["قيد المراجعة", "#d97706"], approved: ["موافَق", "#16a34a"], rejected: ["مرفوض", "#dc2626"] };

function CtxPanel({ ctx, onClose }) {
  if (!ctx) return <div className="ctx"><div className="ctx__head"><b>معلومات العميل</b><button className="icon-btn" onClick={onClose}><FiX /></button></div><div className="loading">جارٍ التحميل...</div></div>;
  const u = ctx.user;
  const banned = u.is_banned || (u.banned_until && new Date(u.banned_until) > new Date());
  return (
    <div className="ctx">
      <div className="ctx__head"><b>معلومات العميل</b><button className="icon-btn" onClick={onClose}><FiX /></button></div>
      <div className="ctx__scroll">
        <div className="ctx__id">
          <h4>{u.name}</h4>
          <p>{u.email}</p>
          {u.phone && <p>📱 {u.phone}</p>}
          <p className="ctx__muted">عضو منذ {dayjs(u.createdAt).format("D MMM YYYY")}</p>
          {banned && <span className="ctx__ban">⛔ محظور{u.ban_reason ? `: ${u.ban_reason}` : ""}</span>}
        </div>

        <div className="ctx__stats">
          <div><span>الحجوزات</span><b>{ctx.stats.totalBookings}</b></div>
          <div><span>الإنفاق</span><b>{egp(ctx.stats.spent)}</b></div>
          <div><span><FiAward /> نقاط</span><b>{u.loyalty_points}</b></div>
          <div><span>المحفظة</span><b>{egp(u.wallet_balance)}</b></div>
        </div>

        <div className="ctx__sec">
          <h5><FiCreditCard /> آخر الحجوزات</h5>
          {ctx.bookings.length ? ctx.bookings.map((b, i) => {
            const bs = BST[b.status] || [b.status, "#888"], ps = PST[b.payment_status] || [b.payment_status, "#888"];
            return (
              <div className="ctx__bk" key={i}>
                <div className="ctx__bk-top"><b>{b.event || "—"}</b><span className="ctx__mono">{b.booking_ref}</span></div>
                <div className="ctx__bk-meta">
                  <span>{egp(b.total_amount)} · ×{b.quantity}</span>
                  <span className="ctx__pill" style={{ color: bs[1], background: `${bs[1]}1a` }}>{bs[0]}</span>
                  <span className="ctx__pill" style={{ color: ps[1], background: `${ps[1]}1a` }}>{ps[0]}</span>
                  {b.payment_method && <span className="ctx__method">{b.payment_method}</span>}
                </div>
              </div>
            );
          }) : <p className="ctx__muted">لا حجوزات.</p>}
        </div>

        {ctx.refunds.length > 0 && (
          <div className="ctx__sec">
            <h5><FiRotateCcw /> طلبات الاسترداد</h5>
            {ctx.refunds.map((r, i) => {
              const rs = RST[r.status] || [r.status, "#888"];
              return (
                <div className="ctx__bk" key={i}>
                  <div className="ctx__bk-top"><b>{egp(r.refund_amount)}</b><span className="ctx__pill" style={{ color: rs[1], background: `${rs[1]}1a` }}>{rs[0]}</span></div>
                  {r.reason && <p className="ctx__muted">{r.reason}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
