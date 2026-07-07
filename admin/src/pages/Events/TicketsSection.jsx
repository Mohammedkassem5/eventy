import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiEdit2, FiMap } from "react-icons/fi";
import { ticketApi } from "../../services/eventApi";
import { apiError } from "../../lib/api";
import SeatmapBuilder from "./SeatmapBuilder";

const blank = { name: "", price: "", color_hex: "#f75200", rows_count: 5, cols_count: 12, points_reward: 0 };

function SeatGrid({ seats, color }) {
  const rows = useMemo(() => {
    const m = new Map();
    seats.forEach((s) => {
      if (!m.has(s.row_label)) m.set(s.row_label, []);
      m.get(s.row_label).push(s);
    });
    return [...m.entries()]
      .sort((a, b) => a[1][0].y - b[1][0].y)
      .map(([l, arr]) => [l, arr.sort((x, y) => x.seat_number - y.seat_number)]);
  }, [seats]);

  return (
    <div className="sm-scroll">
      <div className="sm-grid">
        {rows.map(([label, arr]) => (
          <div className="sm-row" key={label}>
            <span className="sm-rl">{label}</span>
            {arr.map((s) => (
              <span
                key={s.id}
                className={`sm-seat ${s.status === "booked" ? "is-booked" : ""}`}
                style={s.status !== "booked" ? { background: `${color}33`, borderColor: color } : undefined}
                title={`${s.seat_code} — ${s.status === "booked" ? "محجوز" : "متاح"}`}
              >
                {s.seat_number}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TicketsSection({ event, onChange, defaultTab = "cats", hideTabs = false }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mapCat, setMapCat] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const openMap = async (c) => {
    if (mapCat === c.id) {
      setMapCat(null);
      return;
    }
    setMapCat(c.id);
    setMapData(null);
    try {
      setMapData(await ticketApi.seats(c.id));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await ticketApi.list(event.id);
      setList(data);
      if (onChange) onChange(data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (event?.id) {
      load();
    }
  }, [event?.id]);

  const reset = () => {
    setEditing(null);
    setF(blank);
  };

  const edit = (c) => {
    setEditing(c);
    setF({
      name: c.name,
      price: c.price,
      color_hex: c.color_hex,
      rows_count: c.rows_count,
      cols_count: c.cols_count,
      points_reward: c.points_reward,
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("اكتب اسم الفئة");
    setSaving(true);
    try {
      if (editing) {
        await ticketApi.update(editing.id, {
          name: f.name,
          price: Number(f.price),
          color_hex: f.color_hex,
          points_reward: Number(f.points_reward),
        });
        toast.success("تم تحديث الفئة");
      } else {
        await ticketApi.create({
          event_id: event.id,
          name: f.name,
          price: Number(f.price),
          color_hex: f.color_hex,
          rows_count: Number(f.rows_count),
          cols_count: Number(f.cols_count),
          points_reward: Number(f.points_reward),
        });
        toast.success("تمت إضافة الفئة + توليد المقاعد");
      }
      reset();
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!confirm(`حذف فئة "${c.name}" وكل مقاعدها؟`)) return;
    try {
      await ticketApi.remove(c.id);
      toast.success("تم الحذف");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="tickets-section-wrapper">
      {!hideTabs && (
        <div className="wiz-tabs" style={{ marginBottom: 15 }}>
          <button
            type="button"
            className={`wiz-tab ${tab === "cats" ? "is-on" : ""}`}
            onClick={() => setTab("cats")}
          >
            الفئات والمقاعد
          </button>
          <button
            type="button"
            className={`wiz-tab ${tab === "layout" ? "is-on" : ""}`}
            onClick={() => setTab("layout")}
          >
            مخطط المكان
          </button>
        </div>
      )}

      {tab === "layout" ? (
        <SeatmapBuilder event={event} categories={list} onChange={load} />
      ) : loading ? (
        <div className="loading" style={{ padding: "20px 0", textAlign: "center" }}>
          جارٍ التحميل...
        </div>
      ) : (
        <div className="tk-list">
          {list.map((c) => (
            <div key={c.id}>
              <div className="tk-row">
                <span className="tk-dot" style={{ background: c.color_hex }} />
                <div className="tk-info">
                  <span className="tk-name">{c.name}</span>
                  <span className="tk-meta">
                    متاح {c.available_seats} · محجوز {c.total_seats - c.available_seats} · إجمالي {c.total_seats} ·{" "}
                    {c.points_reward} نقطة
                  </span>
                </div>
                <span className="tk-price">{Number(c.price).toLocaleString("ar-EG")} ج.م</span>
                <button type="button" className="icon-btn" title="المقاعد" onClick={() => openMap(c)}>
                  <FiMap />
                </button>
                <button type="button" className="icon-btn" onClick={() => edit(c)}>
                  <FiEdit2 />
                </button>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(c)}>
                  <FiTrash2 />
                </button>
              </div>
              {mapCat === c.id && (
                <div className="seatmap-admin">
                  {!mapData ? (
                    <p className="text-muted">جارٍ التحميل...</p>
                  ) : (
                    <>
                      <div className="sm-counts">
                        <span>
                          <i className="sm-lg sm-lg--free" /> متاح {mapData.counts.available}
                        </span>
                        <span>
                          <i className="sm-lg sm-lg--booked" /> محجوز {mapData.counts.booked}
                        </span>
                        <span>الإجمالي {mapData.counts.total}</span>
                      </div>
                      <SeatGrid seats={mapData.seats} color={c.color_hex} />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {!list.length && <p className="td-empty">لا توجد فئات بعد.</p>}
        </div>
      )}

      {tab === "cats" && (
        <div className="tk-form" style={{ marginTop: 20, borderTop: "1px solid var(--color-border)", paddingTop: 15 }}>
          <h4 className="ev-section" style={{ margin: "0 0 15px 0" }}>
            {editing ? "تعديل الفئة" : "إضافة فئة جديدة"}
          </h4>
          <div className="field-row">
            <div className="field">
              <label>الاسم</label>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="VIP" />
            </div>
            <div className="field">
              <label>السعر</label>
              <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>اللون</label>
              <input
                type="color"
                value={f.color_hex}
                onChange={(e) => setF({ ...f, color_hex: e.target.value })}
                style={{ height: 44, padding: 4 }}
              />
            </div>
            <div className="field">
              <label>نقاط لكل مقعد</label>
              <input
                type="number"
                value={f.points_reward}
                onChange={(e) => setF({ ...f, points_reward: e.target.value })}
              />
            </div>
          </div>
          {!editing && (
            <div className="field-row">
              <div className="field">
                <label>عدد الصفوف</label>
                <input
                  type="number"
                  value={f.rows_count}
                  onChange={(e) => setF({ ...f, rows_count: e.target.value })}
                />
              </div>
              <div className="field">
                <label>المقاعد لكل صف</label>
                <input
                  type="number"
                  value={f.cols_count}
                  onChange={(e) => setF({ ...f, cols_count: e.target.value })}
                />
              </div>
            </div>
          )}
          {editing && <p className="tk-hint text-muted">عدد الصفوف/المقاعد ثابت بعد التوليد (لتفادي تعارض الحجوزات).</p>}
          <div className="tk-actions" style={{ display: "flex", gap: 10, marginTop: 15 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? "..." : editing ? "حفظ" : <><FiPlus /> إضافة</>}
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={reset}>
                إلغاء
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
