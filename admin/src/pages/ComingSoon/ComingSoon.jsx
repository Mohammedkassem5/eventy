export default function ComingSoon({ title = "هذه الصفحة" }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
      <h2 style={{ color: "var(--text)", margin: "0 0 6px" }}>{title}</h2>
      <p>قيد الإنشاء — سنبنيها قريبًا.</p>
    </div>
  );
}
