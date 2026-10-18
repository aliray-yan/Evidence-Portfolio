export default function StatCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper && <small>{helper}</small>}
      </div>
      {Icon && (
        <div className="stat-icon">
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
