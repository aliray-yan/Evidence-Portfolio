import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const resources = [
  "levels",
  "modules",
  "lessons",
  "quizzes",
  "exercises",
  "projects",
  "tools",
  "achievements"
];

const starterPayloads = {
  levels: {
    number: 99,
    title: "LEVEL 99: Custom Topic",
    description: "Custom admin-created level.",
    difficulty: "Custom",
    sortOrder: 99
  },
  tools: {
    name: "Custom Tool",
    category: "Reference",
    url: "https://example.com",
    description: "Add a short explanation.",
    pricing: "Free",
    tags: ["rag"]
  },
  achievements: {
    code: "CUSTOM_BADGE",
    title: "Custom Badge",
    description: "Awarded by an admin rule.",
    criteria: "Custom criteria",
    points: 10,
    icon: "sparkles"
  }
};

export default function AdminContentPage() {
  const [resource, setResource] = useState("levels");
  const [items, setItems] = useState([]);
  const [payload, setPayload] = useState(JSON.stringify(starterPayloads.levels, null, 2));
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPreview = useMemo(() => (selected ? JSON.stringify(selected, null, 2) : ""), [selected]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/${resource}`);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPayload(JSON.stringify(starterPayloads[resource] || {}, null, 2));
    setSelected(null);
    load();
  }, [resource]);

  async function createItem() {
    try {
      const body = JSON.parse(payload);
      await api.post(`/admin/${resource}`, body);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateItem() {
    if (!selected?.id) return;
    try {
      const body = JSON.parse(payload);
      await api.patch(`/admin/${resource}/${selected.id}`, body);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteItem(id) {
    try {
      await api.delete(`/admin/${resource}/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function chooseItem(item) {
    setSelected(item);
    const clone = { ...item };
    delete clone.id;
    delete clone.createdAt;
    delete clone.updatedAt;
    setPayload(JSON.stringify(clone, null, 2));
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Admin content management</span>
          <h1>Manage curriculum resources</h1>
          <p>Create, update, and delete levels, modules, lessons, quizzes, exercises, projects, tools, and achievements.</p>
        </div>
      </section>

      <section className="admin-tabs">
        {resources.map((item) => (
          <button key={item} className={item === resource ? "selected" : ""} onClick={() => setResource(item)} type="button">
            {item}
          </button>
        ))}
      </section>

      <section className="admin-grid">
        <div className="surface">
          <div className="section-title">
            <h2>{resource}</h2>
            <button className="icon-button" onClick={load} type="button" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
          {loading && <div className="center-panel">Loading...</div>}
          {error && <div className="form-error">{error}</div>}
          <div className="admin-list">
            {items.map((item) => (
              <article key={item.id}>
                <button type="button" onClick={() => chooseItem(item)}>
                  <strong>{item.title || item.name || item.question || item.code || item.id}</strong>
                  <span>{item.description || item.difficulty || item.category || item.type}</span>
                </button>
                <button className="icon-button danger" type="button" onClick={() => deleteItem(item.id)} title="Delete">
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="surface">
          <div className="section-title">
            <h2>{selected ? "Edit JSON" : "Create JSON"}</h2>
            <span>{selected ? selected.id : "new item"}</span>
          </div>
          {selectedPreview && (
            <details>
              <summary>Selected record</summary>
              <pre>{selectedPreview}</pre>
            </details>
          )}
          <textarea className="json-editor" value={payload} onChange={(event) => setPayload(event.target.value)} />
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={createItem}>
              <Plus size={18} /> Create
            </button>
            <button className="primary-button" type="button" onClick={updateItem} disabled={!selected}>
              <Save size={18} /> Save Changes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
