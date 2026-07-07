import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import toast from "react-hot-toast";
import { FiSend, FiHeadphones, FiCheck, FiXCircle, FiStar } from "react-icons/fi";
import { useAuth } from "../../store/authStore";
import { supportApi } from "../../services/supportApi";
import { getSocket } from "../../lib/socket";
import Loader from "../../components/Loader/Loader";
import "./Support.css";

dayjs.locale("ar");

export default function Support() {
  const { user, ready } = useAuth();
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [agentOnline, setAgentOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const endRef = useRef(null);
  const typingOff = useRef(null);

  const closed = session?.status === "closed";
  const needsRating = closed && !session?.rating;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    supportApi.messages().then((d) => { if (alive) { setMessages(d.messages); setSession(d.session); setLoading(false); } });

    const socket = getSocket();
    socket.connect();
    const onNew = (msg) => {
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender === "admin") { setAdminTyping(false); socket.emit("support:read", {}); }
    };
    const onAgents = ({ online }) => setAgentOnline(online);
    const onTyping = ({ who, isTyping }) => { if (who === "admin") setAdminTyping(isTyping); };
    const onRead = ({ by }) => { if (by === "admin") setMessages((p) => p.map((m) => m.sender === "user" ? { ...m, is_read: true } : m)); };
    const onClosed = (s) => { setSession(s); setAdminTyping(false); if (s.closed_by === "admin") toast("أنهى فريق الدعم المحادثة"); };
    const onSession = (s) => setSession(s);

    socket.on("support:new", onNew);
    socket.on("support:agents", onAgents);
    socket.on("support:typing", onTyping);
    socket.on("support:read", onRead);
    socket.on("support:closed", onClosed);
    socket.on("support:session", onSession);
    socket.on("support:rated", onSession);

    return () => {
      alive = false;
      socket.off("support:new", onNew); socket.off("support:agents", onAgents);
      socket.off("support:typing", onTyping); socket.off("support:read", onRead);
      socket.off("support:closed", onClosed); socket.off("support:session", onSession);
      socket.off("support:rated", onSession);
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, adminTyping, closed]);

  if (ready && !user) return <Navigate to="/login?redirect=/help" replace />;
  if (!ready) return <Loader fullscreen label="جارٍ التحميل..." />;

  const onType = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    socket.emit("support:typing", { isTyping: true });
    clearTimeout(typingOff.current);
    typingOff.current = setTimeout(() => socket.emit("support:typing", { isTyping: false }), 1500);
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    getSocket().emit("support:typing", { isTyping: false });
    try {
      const d = await supportApi.send(body);
      setSession(d.session); // قد تكون جلسة جديدة
    } catch { setText(body); }
  };

  const endChat = async () => {
    if (!confirm("إنهاء المحادثة نهائيًا؟ لا يمكن إعادة فتحها.")) return;
    try { const d = await supportApi.close(); setSession(d.session); }
    catch (err) { toast.error(err?.response?.data?.message || "تعذّر الإنهاء"); }
  };

  const submitRating = async () => {
    if (!stars) return toast.error("اختر عدد النجوم");
    try {
      const d = await supportApi.rate(session.id, stars, comment);
      setSession(d.session);
      toast.success("شكرًا لتقييمك 🌟");
    } catch (err) { toast.error(err?.response?.data?.message || "تعذّر الإرسال"); }
  };

  const startNew = () => { setMessages([]); setSession(null); setStars(0); setComment(""); };

  return (
    <div className="container support">
      <div className="chat">
        <div className="chat__head">
          <span className="chat__avatar"><FiHeadphones /></span>
          <div className="chat__head-info">
            <span className="chat__head-name">دعم Eventy</span>
            <span className={`chat__status ${agentOnline ? "is-on" : ""}`}>
              {closed ? "المحادثة منتهية" : agentOnline ? "متصل الآن" : "غير متصل — سنرد قريبًا"}
            </span>
          </div>
          {!closed && messages.length > 0 && (
            <button className="chat__end" onClick={endChat}><FiXCircle /> إنهاء</button>
          )}
        </div>

        <div className="chat__body">
          {loading ? (
            <Loader label="جارٍ تحميل المحادثة..." />
          ) : messages.length ? (
            messages.map((m) => (
              <div key={m.id} className={`bubble ${m.sender === "user" ? "bubble--me" : "bubble--them"}`}>
                <p>{m.body}</p>
                <span className="bubble__time">
                  {dayjs(m.createdAt).format("HH:mm")}
                  {m.sender === "user" && <FiCheck className={`bubble__tick ${m.is_read ? "read" : ""}`} />}
                </span>
              </div>
            ))
          ) : (
            <div className="chat__empty">
              <FiHeadphones />
              <p>اكتب رسالتك وسيرد عليك فريق الدعم مباشرة.</p>
            </div>
          )}
          {adminTyping && !closed && (
            <div className="bubble bubble--them bubble--typing"><span></span><span></span><span></span></div>
          )}

          {/* شارة الإنهاء */}
          {closed && (
            <div className="chat__closed">
              <FiXCircle />
              <span>انتهت المحادثة {session.closed_by === "admin" ? "بواسطة فريق الدعم" : "بواسطتك"}</span>
            </div>
          )}

          {/* التقييم */}
          {needsRating && (
            <div className="rating">
              <h4>كيف كانت خدمتنا؟</h4>
              <div className="rating__stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setStars(n)}
                    className={(hover || stars) >= n ? "on" : ""} aria-label={`${n} نجوم`}><FiStar /></button>
                ))}
              </div>
              <textarea placeholder="أضف تعليقًا (اختياري)..." value={comment} onChange={(e) => setComment(e.target.value)} rows="2" />
              <button className="btn btn-primary rating__submit" onClick={submitRating}>إرسال التقييم</button>
            </div>
          )}

          {closed && session?.rating && (
            <div className="rating rating--done">
              <p>تقييمك: {"★".repeat(session.rating)}{"☆".repeat(5 - session.rating)}</p>
              <button className="btn btn-ghost" onClick={startNew}>بدء محادثة جديدة</button>
            </div>
          )}
          {closed && !session?.rating && (
            <button className="chat__newlink" onClick={startNew}>تخطّي وبدء محادثة جديدة</button>
          )}
          <div ref={endRef} />
        </div>

        {!closed && (
          <form className="chat__input" onSubmit={send}>
            <input type="text" placeholder="اكتب رسالتك..." value={text} onChange={onType} />
            <button type="submit" aria-label="إرسال"><FiSend /></button>
          </form>
        )}
      </div>
    </div>
  );
}
