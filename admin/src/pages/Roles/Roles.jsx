import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiShield, FiUser, FiMail, FiLock, FiKey,
  FiSlash, FiCheckCircle, FiCheck, FiUsers, FiHeadphones, FiStar,
} from "react-icons/fi";
import { roleApi } from "../../services/roleApi";
import { useAuth } from "../../store/authStore";
import { apiError } from "../../lib/api";
import Modal from "../../components/Modal/Modal";
import Avatar from "../../components/Avatar/Avatar";
import "./Roles.css";

export default function Roles() {
  const meId = useAuth((s) => s.admin?.id);
  const [tab, setTab] = useState("admins");
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adminForm, setAdminForm] = useState(null); // create/edit admin
  const [roleForm, setRoleForm] = useState(null);    // create/edit role
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, p] = await Promise.all([roleApi.listAdmins(), roleApi.listRoles(), roleApi.permissions()]);
      setAdmins(a); setRoles(r); setCatalog(p);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // catalog مجمّع حسب group
  const groups = useMemo(() => {
    const map = {};
    catalog.forEach((p) => { (map[p.group] ||= []).push(p); });
    return Object.entries(map); // [ [group, perms[]], ... ]
  }, [catalog]);

  const assignableRoles = roles.filter((r) => !r.is_system);

  /* ---------- admins ---------- */
  const saveAdmin = async () => {
    const f = adminForm;
    if (!f.name?.trim()) return toast.error("الاسم مطلوب");
    if (!f.id) {
      if (!f.email?.trim()) return toast.error("البريد مطلوب");
      if (!f.password || f.password.length < 6) return toast.error("كلمة مرور 6 أحرف+");
    }
    if (!f.admin_role_id) return toast.error("اختر الدور");
    setBusy(true);
    try {
      if (f.id) {
        const body = { name: f.name, admin_role_id: Number(f.admin_role_id) };
        if (f.password) body.password = f.password;
        await roleApi.updateAdmin(f.id, body);
        toast.success("تم تحديث المشرف");
      } else {
        await roleApi.createAdmin({ name: f.name, email: f.email, password: f.password, admin_role_id: Number(f.admin_role_id), is_demo: !!f.is_demo });
        toast.success("تم إنشاء المشرف");
      }
      setAdminForm(null); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const toggleBanAdmin = async (a) => {
    try { await roleApi.updateAdmin(a.id, { is_banned: !a.is_banned }); toast.success(a.is_banned ? "تم رفع الحظر" : "تم الحظر"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const removeAdmin = async (a) => {
    if (!confirm(`إزالة صلاحيات ${a.name}؟ سيصبح مستخدمًا عاديًا.`)) return;
    try { await roleApi.removeAdmin(a.id); toast.success("تمت الإزالة"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  /* ---------- roles ---------- */
  const togglePerm = (key) => setRoleForm((f) => {
    const has = f.permissions.includes(key);
    return { ...f, permissions: has ? f.permissions.filter((k) => k !== key) : [...f.permissions, key] };
  });
  const toggleGroup = (perms) => setRoleForm((f) => {
    const keys = perms.map((p) => p.key);
    const allOn = keys.every((k) => f.permissions.includes(k));
    return { ...f, permissions: allOn ? f.permissions.filter((k) => !keys.includes(k)) : [...new Set([...f.permissions, ...keys])] };
  });
  const saveRole = async () => {
    const f = roleForm;
    if (!f.name?.trim()) return toast.error("اسم الدور مطلوب");
    setBusy(true);
    try {
      if (f.id) { await roleApi.updateRole(f.id, { name: f.name, permissions: f.permissions }); toast.success("تم تحديث الدور"); }
      else { await roleApi.createRole({ name: f.name, permissions: f.permissions }); toast.success("تم إنشاء الدور"); }
      setRoleForm(null); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };
  const deleteRole = async (r) => {
    if (!confirm(`حذف دور "${r.name}"؟`)) return;
    try { await roleApi.deleteRole(r.id); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const roleName = (id) => roles.find((r) => r.id === id)?.name || "—";

  return (
    <div className="rl">
      <div className="page-head">
        <div><h1>المشرفون والصلاحيات</h1><p>أنشئ مشرفين، عيّن لكل واحد دورًا، وحدّد بدقّة ما يستطيع كل دور فعله.</p></div>
        {tab === "admins"
          ? <button className="btn btn-primary" onClick={() => setAdminForm({ name: "", email: "", password: "", admin_role_id: assignableRoles[0]?.id || "" })}><FiPlus /> مشرف جديد</button>
          : <button className="btn btn-primary" onClick={() => setRoleForm({ name: "", permissions: [] })}><FiPlus /> دور جديد</button>}
      </div>

      <div className="bk-tabs rl__tabs">
        <button className={`chip ${tab === "admins" ? "chip--on" : ""}`} onClick={() => setTab("admins")}><FiUser /> المشرفون ({admins.length})</button>
        <button className={`chip ${tab === "roles" ? "chip--on" : ""}`} onClick={() => setTab("roles")}><FiShield /> الأدوار ({roles.length})</button>
      </div>

      {loading ? <div className="loading">جارٍ التحميل...</div> : tab === "admins" ? (
        <div className="rl__admins">
          {admins.map((a) => {
            const sys = a.adminRole?.is_system;
            return (
              <div className="adm-card" key={a.id}>
                <div className="adm-card__top">
                  <Avatar src={a.avatar} name={a.name} size={52} />
                  <div className="adm-card__id">
                    <h3>{a.name} {a.id === meId && <span className="adm-you">أنت</span>}</h3>
                    <p><FiMail /> {a.email}</p>
                  </div>
                  {a.is_demo && <span className="badge badge-demo">تجريبي</span>}
                  {a.is_banned && <span className="badge badge-ban">محظور</span>}
                </div>
                <div className="adm-card__role">
                  <span className={`role-pill ${sys ? "role-pill--owner" : ""}`}><FiShield /> {a.adminRole?.name || "—"}</span>
                  <span className="adm-card__perms">{sys ? "كل الصلاحيات" : `${a.adminRole?.permissions?.length || 0} صلاحية`}</span>
                </div>
                {a.is_support_agent && (
                  <div className="adm-card__cc">
                    <span className="cc-badge"><FiHeadphones /> كول سنتر</span>
                    <span className="cc-rating">
                      {a.support_rating?.avg != null
                        ? <><FiStar className="cc-star" /> <b>{a.support_rating.avg}</b>/5 <em>({a.support_rating.count} تقييم · {a.support_rating.handled} محادثة)</em></>
                        : <em>لا تقييمات بعد</em>}
                    </span>
                  </div>
                )}
                {!sys && a.id !== meId && (
                  <div className="adm-card__actions">
                    <button className="icon-btn" title="تعديل" onClick={() => setAdminForm({ id: a.id, name: a.name, email: a.email, password: "", admin_role_id: a.adminRole?.id || "" })}><FiEdit2 /></button>
                    <button className="icon-btn" title={a.is_banned ? "رفع الحظر" : "حظر"} onClick={() => toggleBanAdmin(a)}>{a.is_banned ? <FiCheckCircle /> : <FiSlash />}</button>
                    <button className="icon-btn icon-btn--danger" title="إزالة" onClick={() => removeAdmin(a)}><FiTrash2 /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rl__roles">
          {roles.map((r) => (
            <div className={`role-card ${r.is_system ? "role-card--owner" : ""}`} key={r.id}>
              <div className="role-card__head">
                <h3><FiShield /> {r.name}{r.is_system && <span className="badge badge-owner">نظام</span>}</h3>
                <span className="role-card__count"><FiUsers /> {r.admins_count}</span>
              </div>
              <div className="role-card__perms">
                {r.is_system ? <span className="perm-tag perm-tag--all">كل الصلاحيات ✦</span>
                  : r.permissions?.length
                    ? catalog.filter((p) => r.permissions.includes(p.key)).map((p) => <span className="perm-tag" key={p.key}>{p.label_ar}</span>)
                    : <span className="text-muted">لا صلاحيات</span>}
              </div>
              {!r.is_system && (
                <div className="role-card__actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setRoleForm({ id: r.id, name: r.name, permissions: [...(r.permissions || [])] })}><FiEdit2 /> تعديل</button>
                  <button className="btn btn-ghost btn-sm btn-danger-ghost" onClick={() => deleteRole(r)}><FiTrash2 /> حذف</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== Admin modal ===== */}
      <Modal open={!!adminForm} title={adminForm?.id ? "تعديل مشرف" : "مشرف جديد"} onClose={() => setAdminForm(null)} width={460}>
        {adminForm && (
          <div className="rl-form">
            <div className="field"><label><FiUser /> الاسم</label><input value={adminForm.name} onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم المشرف" /></div>
            <div className="field"><label><FiMail /> البريد</label><input type="email" value={adminForm.email} disabled={!!adminForm.id} onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@eventy.com" /></div>
            <div className="field"><label><FiLock /> {adminForm.id ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</label><input type="password" value={adminForm.password} onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل" /></div>
            <div className="field"><label><FiShield /> الدور</label>
              <select value={adminForm.admin_role_id} onChange={(e) => setAdminForm((f) => ({ ...f, admin_role_id: e.target.value }))}>
                <option value="" disabled>اختر دورًا</option>
                {assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {adminForm.admin_role_id && (
                <p className="rl-form__hint">يمنح: {roles.find((r) => r.id === Number(adminForm.admin_role_id))?.permissions?.length || 0} صلاحية</p>
              )}
            </div>
            {!adminForm.id && (
              <label className="rl-demo">
                <input type="checkbox" checked={!!adminForm.is_demo} onChange={(e) => setAdminForm((f) => ({ ...f, is_demo: e.target.checked }))} />
                <span>🧪 حساب تجريبي — يجرّب كل شيء لكن تغييراته لا تُحفظ وتختفي عند التحديث</span>
              </label>
            )}
            <div className="usr__actions">
              <button className="btn btn-ghost" onClick={() => setAdminForm(null)}>إلغاء</button>
              <button className="btn btn-primary" disabled={busy} onClick={saveAdmin}><FiCheck /> حفظ</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== Role modal — granular permissions ===== */}
      <Modal open={!!roleForm} title={roleForm?.id ? "تعديل الدور والصلاحيات" : "دور جديد"} onClose={() => setRoleForm(null)} width={620}>
        {roleForm && (
          <div className="rl-form">
            <div className="field"><label><FiKey /> اسم الدور</label><input value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: مدير الفعاليات" /></div>

            <div className="perm-editor">
              <div className="perm-editor__head">
                <span>الصلاحيات ({roleForm.permissions.length}/{catalog.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setRoleForm((f) => ({ ...f, permissions: f.permissions.length === catalog.length ? [] : catalog.map((p) => p.key) }))}>
                  {roleForm.permissions.length === catalog.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              </div>
              {groups.map(([group, perms]) => {
                const keys = perms.map((p) => p.key);
                const allOn = keys.every((k) => roleForm.permissions.includes(k));
                const someOn = !allOn && keys.some((k) => roleForm.permissions.includes(k));
                return (
                  <div className="perm-group" key={group}>
                    <button className={`perm-group__head ${allOn ? "on" : someOn ? "some" : ""}`} onClick={() => toggleGroup(perms)}>
                      <span className="perm-check">{allOn ? <FiCheck /> : someOn ? "–" : ""}</span>
                      {group}
                    </button>
                    <div className="perm-group__items">
                      {perms.map((p) => {
                        const on = roleForm.permissions.includes(p.key);
                        return (
                          <button key={p.key} className={`perm-item ${on ? "on" : ""}`} onClick={() => togglePerm(p.key)}>
                            <span className="perm-check">{on && <FiCheck />}</span>
                            <span>{p.label_ar}</span>
                            <code>{p.key}</code>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="usr__actions">
              <button className="btn btn-ghost" onClick={() => setRoleForm(null)}>إلغاء</button>
              <button className="btn btn-primary" disabled={busy} onClick={saveRole}><FiCheck /> حفظ الدور</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
