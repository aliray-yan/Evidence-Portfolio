import { Mail, Shield, User } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { shortDate } from "../utils/format.js";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data, error, loading } = useAsync(() => api.dashboard(), []);

  if (loading) return <div className="page-loader">Loading profile...</div>;
  if (error) return <EmptyState title="Profile stats unavailable" body={error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Profile</span>
        <h1>{user?.name}</h1>
      </div>
      <div className="profile-panel">
        <div><User size={18} /><span>{user?.name}</span></div>
        <div><Mail size={18} /><span>{user?.email}</span></div>
        <div><Shield size={18} /><span>{user?.role}</span></div>
        <div><span>Created</span><strong>{shortDate(user?.createdAt)}</strong></div>
      </div>
      <ProgressBar value={data.completionPercent} label="Learning path completion" />
    </section>
  );
}
