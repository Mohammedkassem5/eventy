import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiCamera, FiSave, FiShield, FiMail, FiUser, FiLock } from "react-icons/fi";
import { profileApi } from "../../services/profileApi";
import { useAuth } from "../../store/authStore";
import { apiError } from "../../lib/api";
import Avatar from "../../components/Avatar/Avatar";
import "./Profile.css";

export default function Profile() {
  const updateAdmin = useAuth((s) => s.updateAdmin);
  const [me, setMe] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    profileApi.get().then((d) => { setMe(d.admin); setRole(d.role); setName(d.admin.name); }).catch((e) => toast.error(apiError(e)));
  }, []);

  const save = async () => {
    if (!name.trim()) return toast.error("الاسم مطلوب");
    setBusy(true);
    try {
      const body = { name };
      if (password) body.password = password;
      const a = await profileApi.update(body);
      setMe(a); setPassword(""); updateAdmin({ name: a.name });
      toast.success("تم حفظ البيانات");
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("الصورة يجب أن تكون أقل من 3MB");
    setUploading(true);
    try {
      const a = await profileApi.uploadAvatar(file);
      setMe(a); updateAdmin({ avatar: a.avatar });
      toast.success("تم تحديث الصورة");
    } catch (err) { toast.error(apiError(err)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  if (!me) return <div className="loading">جارٍ التحميل...</div>;

  return (
    <div className="pf">
      <div className="page-head"><div><h1>ملفي الشخصي</h1><p>عدّل بياناتك وصورتك.</p></div></div>

      <div className="pf__card">
        <div className="pf__avatar-wrap">
          <Avatar src={me.avatar} name={me.name} size={120} className="pf__avatar" />
          <button className="pf__camera" onClick={() => fileRef.current?.click()} disabled={uploading} title="تغيير الصورة"><FiCamera /></button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
        </div>

        <div className="pf__meta">
          <h2>{me.name}</h2>
          <span className="pf__role"><FiShield /> {role || "—"}</span>
          <span className="pf__mail"><FiMail /> {me.email}</span>
        </div>
      </div>

      <div className="pf__form">
        <div className="field">
          <label><FiUser /> الاسم</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label><FiMail /> البريد الإلكتروني</label>
          <input value={me.email} disabled title="لا يمكن تغيير البريد" />
        </div>
        <div className="field">
          <label><FiLock /> كلمة مرور جديدة (اختياري)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="اتركها فارغة للإبقاء عليها" />
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={save}><FiSave /> حفظ التغييرات</button>
      </div>
    </div>
  );
}
