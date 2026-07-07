import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { FiSave, FiPlus, FiTrash2, FiSettings, FiX } from "react-icons/fi";
import { settingsApi } from "../../services/settingsApi";
import { apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import "./Settings.css";

export default function Settings() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({}); // {key: value}
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await settingsApi.list();
      setRows(s);
      setDraft(Object.fromEntries(s.map((x) => [x.key, x.value])));
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (key) => {
    setSavingKey(key);
    try { await settingsApi.update(key, draft[key]); toast.success("تم الحفظ"); load(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSavingKey(null); }
  };

  const remove = async (key) => {
    if (!confirm(`حذف الإعداد "${key}"؟`)) return;
    try { await settingsApi.remove(key); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const add = async () => {
    if (!addForm.key?.trim()) return toast.error("المفتاح مطلوب");
    setBusy(true);
    try { await settingsApi.create(addForm); toast.success("تمت الإضافة"); setAddForm(null); load(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const dirty = (key) => draft[key] !== rows.find((r) => r.key === key)?.value;

  return (
    <div className="st">
      <div className="page-head">
        <div><h1>إعدادات المنصة</h1><p>القيم العامة التي يتحكم بها الأدمن — تُقرأ ديناميكيًا في كل التطبيق.</p></div>
        <button className="btn btn-primary" onClick={() => setAddForm({ key: "", value: "", label_ar: "" })}><FiPlus /> إعداد جديد</button>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : (
        <div className="st__grid">
          {rows.map((r) => (
            <div className="st-card" key={r.key}>
              <div className="st-card__label">
                <FiSettings />
                <div><b>{r.label_ar || r.key}</b><code>{r.key}</code></div>
              </div>
              <div className="st-card__edit">
                <input value={draft[r.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} />
                <button className="btn btn-primary btn-sm" disabled={!dirty(r.key) || savingKey === r.key} onClick={() => save(r.key)}><FiSave /> حفظ</button>
                <button className="icon-btn icon-btn--danger" title="حذف" onClick={() => remove(r.key)}><FiTrash2 /></button>
              </div>
            </div>
          ))}
          {!rows.length && <div className="td-empty">لا إعدادات.</div>}
        </div>
      )}

      <Modal open={!!addForm} title="إعداد جديد" onClose={() => setAddForm(null)} width={440}>
        {addForm && (
          <div className="st-form">
            <div className="field"><label>المفتاح (بالإنجليزية)</label><input value={addForm.key} onChange={(e) => setAddForm((f) => ({ ...f, key: e.target.value }))} placeholder="مثال: max_tickets_per_order" /></div>
            <div className="field"><label>الاسم بالعربية</label><input value={addForm.label_ar} onChange={(e) => setAddForm((f) => ({ ...f, label_ar: e.target.value }))} placeholder="وصف مفهوم" /></div>
            <div className="field"><label>القيمة</label><input value={addForm.value} onChange={(e) => setAddForm((f) => ({ ...f, value: e.target.value }))} /></div>
            <div className="st-form__actions">
              <button className="btn btn-ghost" onClick={() => setAddForm(null)}><FiX /> إلغاء</button>
              <button className="btn btn-primary" disabled={busy} onClick={add}><FiPlus /> إضافة</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
