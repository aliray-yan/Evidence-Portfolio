import { Award, Download } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function CertificatePage() {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    try {
      const data = await api.post("/progress/certificate", {
        title: "RAG AI Mastery: Zero to Advanced"
      });
      setCertificate(data.certificate);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Certificate</span>
          <h1>RAG AI Mastery credential</h1>
          <p>Generate a local certificate record after completing your learning path milestones.</p>
        </div>
      </section>
      <section className="certificate">
        <Award size={48} />
        <span>Certificate of Completion</span>
        <h2>{certificate?.title || "RAG AI Mastery: Zero to Advanced"}</h2>
        <p>Awarded to</p>
        <strong>{user.name}</strong>
        <small>Developer: Ali Rayyan</small>
        {certificate && <code>Verification: {certificate.verificationCode}</code>}
      </section>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button" type="button" onClick={generate}>
        <Download size={18} /> Generate Certificate Record
      </button>
    </div>
  );
}
