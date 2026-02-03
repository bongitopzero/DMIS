export default function StatCard({ title, value, subtitle }) {
  return (
    <div className="card">
      <p style={{ color: "#6b7280" }}>{title}</p>
      <h2>{value}</h2>
      <span style={{ fontSize: "13px" }}>{subtitle}</span>
    </div>
  );
}
