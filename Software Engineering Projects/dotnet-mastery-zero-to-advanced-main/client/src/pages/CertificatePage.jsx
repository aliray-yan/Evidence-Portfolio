import { Award, Download } from "lucide-react";
import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";
import { shortDate } from "../utils/format.js";

export default function CertificatePage() {
  const { user } = useAuth();
  const dashboard = useAsync(() => api.dashboard(), []);
  const [certificate, setCertificate] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.certificate().then(setCertificate).catch(() => setCertificate(null));
  }, []);

  async function generate() {
    setMessage("");
    try {
      setCertificate(await api.generateCertificate());
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (dashboard.loading) return <div className="page-loader">Preparing certificate...</div>;
  if (dashboard.error) return <EmptyState title="Certificate unavailable" body={dashboard.error} />;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Certificate-style completion</span>
        <h1>.NET Mastery completion</h1>
      </div>

      <div className="certificate">
        <div className="certificate-border">
          <Award size={42} />
          <span>.NET Mastery: Zero to Advanced</span>
          <h2>{user?.name}</h2>
          <p>has completed the full professional .NET learning path.</p>
          <strong>{certificate?.certificateCode || "Certificate locked"}</strong>
          <small>{certificate ? shortDate(certificate.completionDate) : "Complete all lessons to generate"}</small>
        </div>
      </div>

      <ProgressBar value={dashboard.data.completionPercent} label="Completion requirement" />
      {message && <div className="alert alert-error">{message}</div>}
      <button className="btn btn-primary" type="button" onClick={generate}>
        <Download size={17} /> Generate certificate
      </button>
    </section>
  );
}
