import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiImage, FiMapPin, FiUsers } from "react-icons/fi";
import { venueApi } from "../../services/venueApi";
import { mediaUrl, apiError } from "../../lib/api";
import { VENUE_TYPES, venueTypeLabel } from "../../constants/venueTypes";
import Modal from "../../components/Modal/Modal";
import "./Venues.css";

const EMPTY = { name_ar: "", name_en: "", type: "stadium", address: "", city: "", capacity: "", lat: "", lng: "", is_active: true, sort_order: 0 };

export default function Venues() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [mapFile, setMapFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const fileRef = useRef(null);

  const shown = typeFilter ? list.filter((v) => v.type === typeFilter) : list;

  const load = async () => {
    setLoading(true);
    try { setList(await venueApi.list()); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setF(EMPTY); setMapFile(null); setModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setF({ ...EMPTY, ...v, capacity: v.capacity ?? "", lat: v.lat ?? "", lng: v.lng ?? "" });
    setMapFile(null); setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (f.name_ar.trim().length < 2) return toast.error("اكتب اسم المكان");
    setSaving(true);
    try {
      const payload = {
        name_ar: f.name_ar, name_en: f.name_en || null, type: f.type, address: f.address || null, city: f.city || null,
        capacity: f.capacity === "" ? null : Number(f.capacity),
        lat: f.lat === "" ? null : Number(f.lat), lng: f.lng === "" ? null : Number(f.lng),
        is_active: f.is_active, sort_order: Number(f.sort_order) || 0,
      };
      const saved = editing ? await venueApi.update(editing.id, payload) : await venueApi.create(payload);
      if (mapFile) await venueApi.uploadMap(saved.id, mapFile);
      toast.success(editing ? "تم التحديث" : "تمت الإضافة");
      setModal(false); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const remove = async (v) => {
    if (!confirm(`حذف "${v.name_ar}"؟`)) return;
    try { await venueApi.remove(v.id); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const toggle = async (v) => {
    try { await venueApi.update(v.id, { is_active: !v.is_active }); setList((l) => l.map((x) => x.id === v.id ? { ...x, is_active: !x.is_active } : x)); }
    catch (e) { toast.error(apiError(e)); }
  };

  const mapPreview = mapFile ? URL.createObjectURL(mapFile) : f.map_image ? mediaUrl(f.map_image) : null;

  return (
    <div className="venues-admin">
      <div className="page-head">
        <div>
          <h1>الأماكن</h1>
          <p className="text-muted">مخازن الأماكن (ملاعب/قاعات/مسارح) لإعادة استخدامها في الفعاليات.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> مكان جديد</button>
      </div>

      <div className="vn-filters">
        <button className={`chip ${!typeFilter ? "chip--on" : ""}`} onClick={() => setTypeFilter("")}>الكل</button>
        {VENUE_TYPES.map((t) => (
          <button key={t.key} className={`chip ${typeFilter === t.key ? "chip--on" : ""}`} onClick={() => setTypeFilter(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>المخطط</th><th>الاسم</th><th>النوع</th><th>المدينة</th><th>السعة</th><th>العنوان</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id}>
                  <td>{v.map_image ? <img className="vn-thumb" src={mediaUrl(v.map_image)} alt="" /> : <span className="vn-noimg">📍</span>}</td>
                  <td className="td-strong">{v.name_ar}{v.name_en ? <div className="vn-en">{v.name_en}</div> : null}</td>
                  <td><span className="vn-type">{venueTypeLabel(v.type)}</span></td>
                  <td>{v.city || "—"}</td>
                  <td>{v.capacity ? <span className="vn-cap"><FiUsers /> {Number(v.capacity).toLocaleString("ar-EG")}</span> : "—"}</td>
                  <td className="vn-addr">{v.address || "—"}</td>
                  <td><button className={`pill ${v.is_active ? "pill--on" : "pill--off"}`} onClick={() => toggle(v)}>{v.is_active ? <><FiCheck /> مفعّل</> : <><FiX /> معطّل</>}</button></td>
                  <td><div className="row-actions">
                    <button className="icon-btn" onClick={() => openEdit(v)}><FiEdit2 /></button>
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(v)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan="8" className="td-empty">لا توجد أماكن بهذا النوع.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editing ? "تعديل مكان" : "مكان جديد"} onClose={() => setModal(false)} width={560}>
        <form onSubmit={save}>
          <div className="field">
            <label><FiMapPin /> صورة المخطط الافتراضي</label>
            <div className="poster-row">
              {mapPreview ? <img src={mapPreview} alt="" className="poster-prev" /> : <span className="poster-ph">📍</span>}
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}><FiImage /> اختر صورة</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setMapFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>الاسم (عربي) *</label><input value={f.name_ar} onChange={(e) => setF({ ...f, name_ar: e.target.value })} /></div>
            <div className="field"><label>الاسم (إنجليزي)</label><input dir="ltr" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>النوع</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {VENUE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label>المدينة</label><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div className="field"><label>السعة</label><input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
          </div>
          <div className="field"><label>العنوان</label><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="field-row">
            <div className="field"><label>خط العرض (lat)</label><input dir="ltr" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} /></div>
            <div className="field"><label>خط الطول (lng)</label><input dir="ltr" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>الترتيب</label><input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
            <div className="field"><label>الحالة</label>
              <select value={f.is_active ? "1" : "0"} onChange={(e) => setF({ ...f, is_active: e.target.value === "1" })}><option value="1">مفعّل</option><option value="0">معطّل</option></select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saving ? "جارٍ الحفظ..." : editing ? "حفظ" : "إضافة"}</button>
        </form>
      </Modal>
    </div>
  );
}
