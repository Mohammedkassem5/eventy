import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiImage, FiCheck, FiX, FiSearch, FiMove, FiCalendar,
} from "react-icons/fi";
import { categoryApi } from "../../services/categoryApi";
import { mediaUrl, apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import "./Categories.css";

const EMPTY = { name_ar: "", name_en: "", slug: "", icon: "", sort_order: 0, is_active: true };

export default function Categories() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const dragIdx = useRef(null);

  const load = async () => {
    setLoading(true);
    try { setList(await categoryApi.list()); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = q
    ? list.filter((c) => [c.name_ar, c.name_en, c.slug].some((v) => v?.toLowerCase().includes(q.toLowerCase())))
    : list;
  const canDrag = !q;

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    if (form.name_ar.trim().length < 2 || form.name_en.trim().length < 2)
      return toast.error("اكتب الاسم بالعربي والإنجليزي");
    setSaving(true);
    try {
      const payload = {
        name_ar: form.name_ar, name_en: form.name_en, slug: form.slug || undefined,
        icon: form.icon || undefined, sort_order: Number(form.sort_order), is_active: form.is_active,
      };
      if (editing) { await categoryApi.update(editing.id, payload); toast.success("تم تحديث النوع"); }
      else { await categoryApi.create(payload); toast.success("تمت إضافة النوع"); }
      setModal(false); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (c.events_count > 0) return toast.error(`لا يمكن الحذف — مرتبط بـ ${c.events_count} فعالية`);
    if (!confirm(`حذف "${c.name_ar}"؟`)) return;
    try { await categoryApi.remove(c.id); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const toggle = async (c) => {
    try { await categoryApi.update(c.id, { is_active: !c.is_active }); setList((l) => l.map((x) => x.id === c.id ? { ...x, is_active: !x.is_active } : x)); }
    catch (e) { toast.error(apiError(e)); }
  };

  // drag reorder
  const onDrop = async (targetId) => {
    const from = list.findIndex((c) => c.id === dragIdx.current);
    const to = list.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const arr = [...list];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setList(arr);
    try { await categoryApi.reorder(arr.map((c) => c.id)); }
    catch (e) { toast.error(apiError(e)); load(); }
  };

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    try {
      const updated = await categoryApi.uploadImage(editing.id, file);
      setForm((f) => ({ ...f, image: updated.image }));
      setList((l) => l.map((x) => x.id === editing.id ? { ...x, image: updated.image } : x));
      toast.success("تم رفع الصورة");
    } catch (e) { toast.error(apiError(e)); }
    finally { e.target.value = ""; }
  };

  return (
    <div className="cats-admin">
      <div className="page-head">
        <div>
          <h1>أنواع الفعاليات <span className="count-badge">{list.length}</span></h1>
          <p>الفئات التي تظهر للمستخدمين — اسحب لإعادة الترتيب، فعّل/عطّل، أو احذف.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> إضافة نوع</button>
      </div>

      <div className="toolbar">
        <div className="search">
          <FiSearch />
          <input placeholder="ابحث بالاسم أو الـ slug..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th><th>الصورة</th><th>الاسم</th><th>Slug</th><th>الفعاليات</th><th>الحالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}
                  draggable={canDrag}
                  onDragStart={() => (dragIdx.current = c.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(c.id)}
                  className={canDrag ? "draggable-row" : ""}>
                  <td className="drag-cell">{canDrag && <FiMove className="drag-handle" />}</td>
                  <td>{c.image ? <img className="cat-thumb" src={mediaUrl(c.image)} alt="" /> : <span className="cat-emoji">{c.icon || "🎟️"}</span>}</td>
                  <td className="td-strong">{c.name_ar}<div className="cat-en">{c.name_en}</div></td>
                  <td className="td-mono">{c.slug}</td>
                  <td><span className="usage"><FiCalendar /> {c.events_count}</span></td>
                  <td><button className={`pill ${c.is_active ? "pill--on" : "pill--off"}`} onClick={() => toggle(c)}>{c.is_active ? <><FiCheck /> مفعّل</> : <><FiX /> معطّل</>}</button></td>
                  <td><div className="row-actions">
                    <button className="icon-btn" onClick={() => openEdit(c)}><FiEdit2 /></button>
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(c)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7" className="td-empty">{q ? "لا نتائج مطابقة." : "لا توجد أنواع — أضف أول نوع."}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} title={editing ? "تعديل النوع" : "إضافة نوع"} onClose={() => setModal(false)}>
        <form onSubmit={save}>
          {editing && (
            <div className="field img-field">
              <label>الصورة</label>
              <div className="poster-row">
                {form.image ? <img src={mediaUrl(form.image)} alt="" className="poster-prev" /> : <span className="poster-ph">{form.icon || "🎟️"}</span>}
                <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}><FiImage /> رفع صورة</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
              </div>
            </div>
          )}
          <div className="field-row">
            <div className="field"><label>الاسم (عربي)</label><input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="حفلات موسيقية" /></div>
            <div className="field"><label>الاسم (إنجليزي)</label><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Concerts" dir="ltr" /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Slug (اختياري)</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="concerts" dir="ltr" /></div>
            <div className="field"><label>أيقونة (إيموجي)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎤" /></div>
          </div>
          <div className="field">
            <label>الحالة</label>
            <select value={form.is_active ? "1" : "0"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "1" })}>
              <option value="1">مفعّل</option><option value="0">معطّل</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
