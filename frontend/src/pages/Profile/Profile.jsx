import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { FiArrowRight, FiCamera, FiEdit2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../store/authStore";
import { userApi } from "../../services/userApi";
import { mediaUrl, apiError } from "../../lib/api";
import Loader from "../../components/Loader/Loader";
import "./Profile.css";

const FALLBACK_AVATAR = "https://i.pravatar.cc/160?img=12";

export default function Profile() {
  const navigate = useNavigate();
  const { user, ready, setUser } = useAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // عند تحميل المستخدم (بعد refresh) املأ الحقول — initializer بيشتغل مرة واحدة بس
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setBirthdate(user.birthdate || "");
    setPhone(user.phone || "");
    setGender(user.gender || "");
  }, [user?.id]);

  if (!ready) return <Loader fullscreen label="جارٍ التحميل..." />;
  if (!user) return <Navigate to="/login" replace />;

  const avatarSrc = user.avatar ? mediaUrl(user.avatar) : FALLBACK_AVATAR;

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await userApi.uploadAvatar(file);
      setUser(data.user);
      toast.success("تم تحديث الصورة");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (name.trim().length < 2) return toast.error("اكتب اسمك");
    setBusy(true);
    try {
      const data = await userApi.updateProfile({
        name: name.trim(),
        birthdate: birthdate || null,
        phone: phone || null,
        gender: gender || null,
      });
      setUser(data.user);
      toast.success("تم حفظ التعديلات");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="edit-profile">
      <div className="edit-profile__head">
        <button className="edit-profile__back" aria-label="رجوع" onClick={() => navigate(-1)}>
          <FiArrowRight />
        </button>
        <h1 className="edit-profile__title">تعديل الملف الشخصي</h1>
        <span className="edit-profile__spacer" />
      </div>

      <div className="edit-profile__avatar-wrap">
        <img className="edit-profile__avatar" src={avatarSrc} alt={user.name} />
        <button
          className="edit-profile__cam"
          aria-label="تغيير الصورة"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <FiCamera />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={pickAvatar}
        />
      </div>

      <div className="edit-profile__fields">
        <label className="ep-field">
          <input
            className="ep-field__input"
            type="text"
            placeholder="الاسم الكامل"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FiEdit2 className="ep-field__icon" />
        </label>

        <label className="ep-field">
          <input
            className="ep-field__input"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
          <FiEdit2 className="ep-field__icon" />
        </label>

        <label className="ep-field">
          <input
            className="ep-field__input"
            type="tel"
            inputMode="tel"
            placeholder="رقم الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FiEdit2 className="ep-field__icon" />
        </label>

        <label className="ep-field">
          <select
            className="ep-field__input"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">النوع</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
          <FiEdit2 className="ep-field__icon" />
        </label>

        <div className="ep-field ep-field--readonly">
          <span className="ep-field__input ep-field__static">{user.email}</span>
        </div>
      </div>

      <button className="edit-profile__save" onClick={save} disabled={busy}>
        {busy ? "جارٍ الحفظ..." : "حفظ"}
      </button>
    </div>
  );
}
