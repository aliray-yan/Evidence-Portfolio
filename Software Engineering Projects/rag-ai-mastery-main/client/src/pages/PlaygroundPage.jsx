import { Database, FileText, MessageSquare, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChunkVisualizer from "../components/ChunkVisualizer.jsx";
import RetrievalResults from "../components/RetrievalResults.jsx";
import VectorBars from "../components/VectorBars.jsx";
import { api } from "../services/api.js";
import { chunkText, localAnswer } from "../utils/ragDemo.js";

const sampleText =
  "Retrieval-Augmented Generation, or RAG, is a pattern for building AI assistants that answer using retrieved documents. " +
  "A RAG system usually ingests documents, extracts text, splits the text into chunks, embeds those chunks, stores vectors, " +
  "retrieves relevant chunks for a user question, and sends the retrieved context to a language model. " +
  "If the provided context does not contain the answer, a safe RAG assistant should say it does not know based on the provided context.";
const standaloneMode = import.meta.env.VITE_STANDALONE_MODE === "true";

export default function PlaygroundPage() {
  const [text, setText] = useState(sampleText);
  const [filename, setFilename] = useState("sample-rag-notes.md");
  const [file, setFile] = useState(null);
  const [chunkSize, setChunkSize] = useState(700);
  const [overlap, setOverlap] = useState(100);
  const [mode, setMode] = useState("mock");
  const [topK, setTopK] = useState(4);
  const [document, setDocument] = useState(null);
  const [question, setQuestion] = useState("What should a safe RAG assistant do when context is missing?");
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const localChunks = useMemo(() => chunkText(text, Number(chunkSize), Number(overlap)), [text, chunkSize, overlap]);
  const chunks = document?.chunks?.length ? document.chunks : localChunks;

  useEffect(() => {
    setAnswer(null);
  }, [text, chunkSize, overlap, mode]);

  async function handleFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const lower = selected.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md") && !lower.endsWith(".markdown")) {
      setError("Only TXT and Markdown files are supported in the safe local demo.");
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError("File is too large for the demo. Keep uploads under 2 MB.");
      return;
    }

    const content = await selected.text();
    setFile(selected);
    setFilename(selected.name);
    setText(content);
    setDocument(null);
    setError("");
  }

  async function uploadDocument() {
    setSaving(true);
    setError("");
    try {
      if (standaloneMode) {
        const localDocument = {
          id: "standalone-document",
          title: filename,
          filename,
          text,
          chunkSize,
          overlap,
          mode: "mock",
          chunks: localChunks
        };
        localStorage.setItem("rag_mastery_standalone_document", JSON.stringify(localDocument));
        setDocument(localDocument);
        return;
      }

      const formData = new FormData();
      const blob = file || new File([text], filename, { type: "text/markdown" });
      formData.append("document", blob);
      formData.append("title", filename);
      formData.append("chunkSize", String(chunkSize));
      formData.append("overlap", String(overlap));
      formData.append("mode", mode);
      const data = await api.form("/rag/documents", formData);
      setDocument(data.document);
    } catch (err) {
      setError(`${err.message}. Local preview still works in the browser.`);
    } finally {
      setSaving(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setError("");
    if (!question.trim()) return;

    try {
      if (document?.id) {
        if (standaloneMode || document.id === "standalone-document") {
          setAnswer({ ...localAnswer(question, chunks), mode: "mock" });
          return;
        }

        const data = await api.post(`/rag/documents/${document.id}/query`, {
          question,
          mode,
          topK
        });
        setAnswer(data);
      } else {
        setAnswer({ ...localAnswer(question, localChunks), mode: "mock" });
      }
    } catch (err) {
      setError(`${err.message}. Showing browser-local mock answer instead.`);
      setAnswer({ ...localAnswer(question, localChunks), mode: "mock" });
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Safe educational RAG playground</span>
          <h1>Upload, chunk, embed, retrieve, cite</h1>
          <p>
            Demo mode uses deterministic fake embeddings and mock answers. OpenAI-compatible and Ollama modes are optional
            and only work when environment variables are configured on the server.
          </p>
        </div>
      </section>

      <section className="playground-grid">
        <div className="surface">
          <div className="section-title">
            <h2>1. Document</h2>
            <FileText size={18} />
          </div>
          <label className="upload-box">
            <Upload size={22} />
            <span>{filename || "Choose TXT or Markdown"}</span>
            <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={handleFile} />
          </label>
          <textarea className="document-textarea" value={text} onChange={(event) => setText(event.target.value)} />
        </div>

        <div className="surface">
          <div className="section-title">
            <h2>2. Chunking controls</h2>
            <span>{chunks.length} chunks</span>
          </div>
          <div className="control-grid">
            <label>
              Chunk size
              <input type="number" min="120" max="2500" value={chunkSize} onChange={(event) => setChunkSize(event.target.value)} />
            </label>
            <label>
              Overlap
              <input type="number" min="0" max="1000" value={overlap} onChange={(event) => setOverlap(event.target.value)} />
            </label>
            <label>
              Top K
              <input type="number" min="1" max="8" value={topK} onChange={(event) => setTopK(event.target.value)} />
            </label>
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="mock">Mock/local demo</option>
                <option value="openai">OpenAI-compatible API</option>
                <option value="ollama">Local Ollama</option>
              </select>
            </label>
          </div>
          <button className="primary-button" onClick={uploadDocument} type="button" disabled={saving}>
            <Database size={18} /> {saving ? "Storing..." : "Store Chunks"}
          </button>
          {document && <div className="success-text">Stored document with {document.chunks.length} chunks.</div>}
          {error && <div className="form-error">{error}</div>}
        </div>
      </section>

      <section className="surface">
        <div className="section-title">
          <h2>Extracted text</h2>
          <span>{text.length} characters</span>
        </div>
        <pre className="text-preview">{text}</pre>
      </section>

      <section className="surface">
        <div className="section-title">
          <h2>Chunks and fake embeddings</h2>
          <VectorBars vector={chunks[0]?.vector || []} />
        </div>
        <ChunkVisualizer chunks={chunks} />
      </section>

      <section className="playground-grid">
        <div className="surface">
          <div className="section-title">
            <h2>3. Ask question</h2>
            <MessageSquare size={18} />
          </div>
          <form className="ask-form" onSubmit={askQuestion}>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
            <button className="primary-button" type="submit">
              Retrieve and Answer
            </button>
          </form>
          <div className="prompt-template">
            <strong>Prompt template</strong>
            <pre>{`System: Answer only from provided context. If missing, say you do not know.\nContext: {retrieved_chunks}\nQuestion: {user_question}\nAnswer with citations.`}</pre>
          </div>
        </div>

        <div className="surface">
          <div className="section-title">
            <h2>4. Answer</h2>
            <span>{answer?.mode || mode}</span>
          </div>
          <div className="answer-box">{answer?.answer || "Ask a question to retrieve context and generate a mock answer."}</div>
          {answer && <RetrievalResults results={answer.retrieved} />}
        </div>
      </section>
    </div>
  );
}
