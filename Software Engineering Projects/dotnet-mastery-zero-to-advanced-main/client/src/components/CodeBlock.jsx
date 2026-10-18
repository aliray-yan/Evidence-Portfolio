import { Copy } from "lucide-react";
import { useState } from "react";

export default function CodeBlock({ code = "", language = "csharp" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="code-shell">
      <div className="code-toolbar">
        <span>{language}</span>
        <button className="icon-btn" onClick={copy} title="Copy code" type="button">
          <Copy size={16} />
        </button>
      </div>
      <pre><code>{code}</code></pre>
      {copied && <span className="copy-toast">Copied</span>}
    </div>
  );
}
