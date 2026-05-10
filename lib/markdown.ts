/**
 * Minimal Markdown → safe HTML for AI-generated blog content.
 * Intentionally narrow: AI output is structured (H2/H3, paragraphs, lists,
 * inline emphasis, links) and we control the prompt, so a full parser is
 * overkill. Anything not whitelisted is escaped.
 *
 * Why not micromark/marked?
 * - Adding 50+KB to the bundle for content we generate ourselves is wasteful.
 * - We already escape HTML before processing → XSS-safe by construction.
 *
 * If/when richer Markdown is needed (tables, code blocks), swap to `marked`.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  // Apply inline formatting AFTER HTML-escaping the text.
  let out = escapeHtml(s);
  // [text](url) — only allow http(s) URLs
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) =>
    `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${t}</a>`);
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // *italic*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) { out.push(`</${inList}>`); inList = null; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); closeList(); continue; }

    // Headings
    let m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      flushPara(); closeList();
      const level = Math.min(m[1].length, 6);
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      continue;
    }
    // Unordered list
    if ((m = /^[-*+]\s+(.+)$/.exec(line))) {
      flushPara();
      if (inList !== "ul") { closeList(); out.push("<ul>"); inList = "ul"; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    // Ordered list
    if ((m = /^\d+\.\s+(.+)$/.exec(line))) {
      flushPara();
      if (inList !== "ol") { closeList(); out.push("<ol>"); inList = "ol"; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    // Paragraph (accumulate adjacent lines)
    closeList();
    para.push(line);
  }
  flushPara();
  closeList();
  return out.join("\n");
}
