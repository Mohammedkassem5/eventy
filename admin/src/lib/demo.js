// وضع تجريبي (Sandbox) — يعترض كتابات المستخدم التجريبي:
// لا تُرسل للسيرفر أبدًا (لا تُحفظ)، تُخزَّن في overlay بالذاكرة،
// وتُدمج داخل قراءات GET حتى يرى المستخدم تغييراته — تختفي كلها عند التحديث (reload).

let DEMO = false;
export const setDemo = (v) => { DEMO = !!v; };
export const isDemo = () => DEMO;

// overlay بالذاكرة فقط — يُمسح تلقائيًا عند إعادة تحميل الصفحة
const store = { created: {}, updated: {}, deleted: {} };
let seq = 900000000; // معرّفات تجريبية بعيدة عن الحقيقية
const nextId = () => ++seq;

// يفصل المسار إلى (المجموعة، المعرّف) — /admin/events/12 → {collection:/admin/events, id:12}
function parse(url = "") {
  const path = url.split("?")[0].replace(/\/$/, "");
  const parts = path.split("/");
  const last = parts[parts.length - 1];
  const isId = /^\d+$/.test(last);
  return { collection: isId ? parts.slice(0, -1).join("/") : path, id: isId ? Number(last) : null };
}

const isWrite = (m) => ["post", "put", "patch", "delete"].includes(m);
const singular = (seg = "") => seg.replace(/ies$/, "y").replace(/s$/, "");

// يبني ردًّا مزيّفًا يشبه رد السيرفر
function fakeResponse(config) {
  const m = config.method.toLowerCase();
  const { collection, id } = parse(config.url);
  let body = {};
  try { body = config.data instanceof FormData ? {} : (config.data ? JSON.parse(config.data) : {}); } catch { body = {}; }
  const seg = collection.split("/").pop();
  let payload;

  if (m === "post") {
    const item = { id: nextId(), ...body, _demo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    (store.created[collection] ||= []).unshift(item);
    payload = { message: "تم الحفظ (وضع تجريبي)", [singular(seg)]: item, [seg]: item, ...item };
  } else if (m === "patch" || m === "put") {
    (store.updated[collection] ||= {})[id] = { ...(store.updated[collection]?.[id] || {}), ...body };
    // حدِّث أي عنصر منشأ محليًا بنفس المعرّف
    const cre = store.created[collection]?.find((x) => x.id === id);
    if (cre) Object.assign(cre, body);
    const item = { id, ...body };
    payload = { message: "تم التحديث (وضع تجريبي)", [singular(seg)]: item, [seg]: item, ...item };
  } else { // delete
    (store.deleted[collection] ||= new Set()).add(id);
    if (store.created[collection]) store.created[collection] = store.created[collection].filter((x) => x.id !== id);
    payload = { message: "تم الحذف (وضع تجريبي)" };
  }
  return { data: payload, status: 200, statusText: "OK (demo)", headers: {}, config };
}

// يدمج overlay داخل قائمة قراءة
function applyOverlay(collection, list) {
  if (!Array.isArray(list)) return list;
  const del = store.deleted[collection];
  const upd = store.updated[collection] || {};
  const cre = store.created[collection] || [];
  let out = del ? list.filter((x) => !del.has(x?.id)) : list;
  out = out.map((x) => (upd[x?.id] ? { ...x, ...upd[x.id] } : x));
  return [...cre, ...out];
}

// يجد أول مصفوفة داخل رد ويطبّق overlay عليها
function mergeIntoData(collection, data) {
  if (Array.isArray(data)) return applyOverlay(collection, data);
  if (data && typeof data === "object") {
    for (const k of Object.keys(data)) {
      if (Array.isArray(data[k])) { data[k] = applyOverlay(collection, data[k]); return data; }
    }
  }
  return data;
}

// يُركّب المعترضات على نسخة axios
export function attachDemoInterceptors(api) {
  api.interceptors.request.use((config) => {
    if (!DEMO) return config;
    const m = (config.method || "get").toLowerCase();
    if (isWrite(m) && !/\/auth\//.test(config.url || "")) {
      config.adapter = async () => fakeResponse(config); // لا يذهب للسيرفر إطلاقًا
    }
    return config;
  });

  api.interceptors.response.use((res) => {
    if (DEMO && (res.config.method || "get").toLowerCase() === "get" && !/\/auth\/|\/me$|\/profile/.test(res.config.url || "")) {
      const { collection } = parse(res.config.url);
      res.data = mergeIntoData(collection, res.data);
    }
    return res;
  });
}
