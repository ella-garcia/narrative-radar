import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { compactNumber, flag } from "../lib/format";
function toEditableBriefing(briefing) {
    const refs = new Map();
    briefing.evidence.forEach((e) => {
        e.dsa_tdb_cross_refs?.forEach((ref) => {
            const platform = String(ref.platform ?? e.platform ?? "platform").toUpperCase();
            const decisionGround = String(ref.decision_ground ?? "unspecified decision ground");
            const key = `${platform}:${decisionGround}`;
            const existing = refs.get(key);
            const actions = Number(ref.actions_taken ?? 0);
            if (existing) {
                existing.actions_taken = Math.max(existing.actions_taken, actions);
                existing.source_items.add(e.title ?? e.video_id ?? "untitled item");
            }
            else {
                refs.set(key, {
                    platform,
                    decision_ground: decisionGround,
                    actions_taken: actions,
                    source_items: new Set([e.title ?? e.video_id ?? "untitled item"]),
                });
            }
        });
    });
    return {
        ...briefing,
        dsa_tdb_references: Array.from(refs.values()).map((ref) => ({
            platform: ref.platform,
            decision_ground: ref.decision_ground,
            actions_taken: ref.actions_taken.toLocaleString(),
            source_items: Array.from(ref.source_items).join("; "),
            basis: "The platform has reported moderation actions under this DSA Transparency Database decision ground on similar content. This is used as an external platform-admission signal, not as a legal determination.",
        })),
        user_comments: "",
    };
}
function exportDocx(briefing) {
    const blob = createBriefingDocx(briefing);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSafeName(briefing.title || "narrative-radar-briefing")}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function createBriefingDocx(briefing) {
    const issued = new Date(briefing.issued_at);
    const parts = [
        docxParagraph("Narrative Radar - Parliamentary Compliance Briefing", {
            bold: true,
            color: "003399",
            size: 22,
            spacingAfter: 120,
        }),
        docxParagraph(briefing.title, { bold: true, size: 32, spacingAfter: 180 }),
        docxParagraph(`Issued ${issued.toUTCString().replace(":00 GMT", " GMT")}`),
        docxParagraph(`For: ${briefing.requester}`),
        briefing.constituency ? docxParagraph(`Constituency: ${briefing.constituency}`) : "",
        docxParagraph("Executive Summary", { heading: true }),
        docxParagraph(briefing.executive_summary),
        docxParagraph("Findings", { heading: true }),
        ...briefing.findings.map((finding, i) => docxParagraph(`${i + 1}. ${finding}`)),
        docxParagraph("Cited Articles", { heading: true }),
        ...briefing.cited_articles.flatMap((article) => [
            docxParagraph(`${article.ref}${article.short ? ` - ${article.short}` : ""}`, {
                bold: true,
            }),
            article.summary ? docxParagraph(article.summary) : "",
            article.indicator_basis
                ? docxParagraph(`Indicator basis: ${article.indicator_basis}`, { italic: true })
                : "",
            docxParagraph([
                article.instrument,
                article.official_url ? `official text: ${article.official_url}` : "",
                article.enforcement_date ? `enforceable ${article.enforcement_date}` : "",
            ].filter(Boolean).join(" | "), { size: 18, color: "5A6E89" }),
        ]),
        ...(briefing.dsa_tdb_references.length
            ? [
                docxParagraph("DSA Transparency Database References", { heading: true }),
                ...briefing.dsa_tdb_references.flatMap((ref) => [
                    docxParagraph(`${ref.platform} - ${ref.decision_ground}`, { bold: true }),
                    docxParagraph(`${ref.actions_taken} actions reported on similar content.`),
                    docxParagraph(`Indicator basis: ${ref.basis}`, { italic: true }),
                    docxParagraph(`Source item(s): ${ref.source_items}`, { size: 18, color: "5A6E89" }),
                ]),
            ]
            : []),
        docxParagraph("Evidence Pack", { heading: true }),
        ...briefing.evidence.flatMap((e, i) => [
            docxParagraph(`${i + 1}. ${e.title}`, { bold: true }),
            docxParagraph(`${flag(e.language)} ${e.platform} | ${compactNumber(e.reach)} views | ${e.author} | ${e.url}`, { size: 18, color: "5A6E89" }),
            e.transcript_excerpt ? docxParagraph(e.transcript_excerpt, { italic: true }) : "",
            e.edmo_matches?.length
                ? docxParagraph(`Matched fact-checks: ${e.edmo_matches
                    .map((m) => `${m.source} (${m.similarity.toFixed(2)}) ${m.source_url}`)
                    .join("; ")}`, { size: 18 })
                : "",
            e.dsa_tdb_cross_refs?.length
                ? docxParagraph(`DSA TDB: ${e.dsa_tdb_cross_refs
                    .map((c) => `${Number(c.actions_taken).toLocaleString()} x ${c.decision_ground}`)
                    .join("; ")}`, { size: 18 })
                : "",
            e.gaps?.length
                ? docxParagraph(`Indicators: ${e.gaps.map((g) => `${g.article_ref} (${g.severity})`).join("; ")}`, { size: 18 })
                : "",
            e.derivative_spread_radius
                ? docxParagraph(`Derivative Spread Radius: ${e.derivative_spread_radius.derivative_count} subsequent videos | ${compactNumber(e.derivative_spread_radius.aggregate_reach)} aggregate reach | root proof ${e.derivative_spread_radius.root_proof_status}`, { size: 18 })
                : "",
        ]),
        docxParagraph("User Comments", { heading: true }),
        docxParagraph(briefing.user_comments || "No user comments added."),
        docxParagraph("Disclaimer", { heading: true }),
        docxParagraph(briefing.disclaimer, { italic: true, size: 18, color: "5A6E89" }),
        docxParagraph(`Generated by Narrative Radar v0.1 | ${issued.toISOString()}${briefing.briefing_hash ? ` | ${briefing.briefing_hash}` : ""}`, { size: 16, color: "5A6E89" }),
    ].filter(Boolean);
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${parts.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    return zipBlob({
        "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        "word/document.xml": documentXml,
    });
}
function docxParagraph(value, opts = {}) {
    const text = String(value ?? "");
    const paragraphs = text.split(/\n{2,}/).flatMap((paragraph) => paragraph.split("\n"));
    return paragraphs
        .map((paragraph) => {
        const size = opts.heading ? 24 : opts.size;
        const color = opts.heading ? "003399" : opts.color;
        const bold = opts.heading || opts.bold;
        const spacingAfter = opts.heading ? 160 : opts.spacingAfter ?? 120;
        const runProps = [
            bold ? "<w:b/>" : "",
            opts.italic ? "<w:i/>" : "",
            color ? `<w:color w:val="${color}"/>` : "",
            size ? `<w:sz w:val="${size}"/>` : "",
        ].join("");
        return `<w:p>
  <w:pPr><w:spacing w:after="${spacingAfter}"/></w:pPr>
  <w:r>${runProps ? `<w:rPr>${runProps}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r>
</w:p>`;
    })
        .join("\n");
}
function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function fileSafeName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "narrative-radar-briefing";
}
function zipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    Object.entries(files).forEach(([name, content]) => {
        const nameBytes = encoder.encode(name);
        const data = encoder.encode(content);
        const crc = crc32(data);
        const local = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(local.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, 0, true);
        localView.setUint32(14, crc, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, nameBytes.length, true);
        local.set(nameBytes, 30);
        localParts.push(local, data);
        const central = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, 0, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);
        offset += local.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, Object.keys(files).length, true);
    endView.setUint16(10, Object.keys(files).length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    const zipBytes = concatBytes([...localParts, ...centralParts, end]);
    const zipBuffer = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
    return new Blob([zipBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}
function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => {
        out.set(part, offset);
        offset += part.length;
    });
    return out;
}
function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();
export function Briefing() {
    const [params] = useSearchParams();
    const initialIds = (params.get("video") ?? "").split(",").filter(Boolean);
    const [videos, setVideos] = useState([]);
    const [selected, setSelected] = useState(new Set(initialIds));
    const [briefing, setBriefing] = useState(null);
    const [editedBriefing, setEditedBriefing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [requester, setRequester] = useState("Parliamentary Aide");
    const [constituency, setConstituency] = useState("RO");
    useEffect(() => {
        api.listVideos().then(setVideos);
    }, []);
    useEffect(() => {
        if (initialIds.length && videos.length && !briefing) {
            generate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videos.length]);
    async function generate() {
        setLoading(true);
        try {
            const b = await api.briefing({
                video_ids: selected.size ? Array.from(selected) : undefined,
                constituency,
                requester_name: requester,
            });
            setBriefing(b);
            setEditedBriefing(toEditableBriefing(b));
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Parliamentary briefing" }), _jsx("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: "Two-page factual briefing citing specific DSA / AI Act articles, ready for human editing and DOCX export." })] }), _jsxs("div", { className: "surface p-5 print:hidden", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Requester" }), _jsx("input", { value: requester, onChange: (e) => setRequester(e.target.value), className: "select" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Constituency" }), _jsx("select", { value: constituency, onChange: (e) => setConstituency(e.target.value), className: "select", children: ["RO", "DE", "FR", "PL", "IT", "ES", "NL", "SK", ""].map((c) => (_jsx("option", { value: c, children: c ? `${flag(c)} ${c}` : "All / cross-border" }, c || "all"))) })] }), _jsx("div", { className: "flex items-end", children: _jsx("button", { onClick: generate, disabled: loading, className: "px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 w-full md:w-auto", children: loading ? "Generating…" : "Generate briefing" }) })] }), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "section-heading mb-2", children: ["Items to include ", selected.size > 0 ? `(${selected.size} selected)` : "(top 5 if none selected)"] }), _jsx("div", { className: "space-y-1.5 max-h-56 overflow-y-auto", children: videos.map((v) => (_jsxs("label", { className: "flex items-center gap-3 px-2 py-1 rounded hover:bg-eu-slate-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selected.has(v.metadata.video_id), onChange: (e) => {
                                                const s = new Set(selected);
                                                if (e.target.checked)
                                                    s.add(v.metadata.video_id);
                                                else
                                                    s.delete(v.metadata.video_id);
                                                setSelected(s);
                                            } }), _jsxs("span", { className: "font-mono text-xs text-eu-slate-500 w-16 shrink-0", children: ["sev ", v.severity.score.toFixed(0)] }), _jsx("span", { className: "text-sm truncate", children: v.metadata.title }), _jsxs("span", { className: "text-xs text-eu-slate-500 ml-auto", children: [flag(v.metadata.language), " \u00B7 ", compactNumber(v.metadata.view_count)] })] }, v.metadata.video_id))) })] })] }), briefing && editedBriefing && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "mx-auto flex max-w-[984px] flex-wrap items-center justify-between gap-3 print:hidden", children: [_jsxs("div", { className: "surface-tight flex min-h-10 flex-wrap items-center gap-3 border-eu-blue/30 bg-eu-blue/5 px-4 py-2 text-sm text-eu-ink", children: [_jsx("span", { className: "rounded bg-eu-blue px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white", children: "Edit mode" }), _jsx("span", { children: "Manual edits only. DOCX export uses this edited version; no AI runs after generation." })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => navigator.clipboard.writeText(JSON.stringify(editedBriefing, null, 2)), className: "text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50", children: "Copy JSON" }), _jsx("button", { onClick: () => exportDocx(editedBriefing), className: "text-xs px-3 py-1.5 bg-eu-blue text-white rounded-md hover:bg-eu-blue/90", children: "Export DOCX" })] })] }), _jsx(BriefingDocument, { briefing: editedBriefing, onChange: setEditedBriefing })] }))] }));
}
function BriefingDocument({ briefing, onChange, }) {
    const issued = new Date(briefing.issued_at);
    const hash = briefing.briefing_hash ?? "";
    function update(key, value) {
        onChange({ ...briefing, [key]: value });
    }
    function updateFinding(index, value) {
        update("findings", briefing.findings.map((f, i) => (i === index ? value : f)));
    }
    function updateArticle(index, key, value) {
        update("cited_articles", briefing.cited_articles.map((a, i) => i === index ? { ...a, [key]: value } : a));
    }
    function updateEvidence(index, key, value) {
        update("evidence", briefing.evidence.map((e, i) => i === index ? { ...e, [key]: value } : e));
    }
    function updateDsaTdbReference(index, key, value) {
        update("dsa_tdb_references", briefing.dsa_tdb_references.map((ref, i) => i === index ? { ...ref, [key]: value } : ref));
    }
    return (_jsxs("article", { className: "briefing-doc bg-white shadow-card border border-eu-slate-200 rounded-lg max-w-[984px] mx-auto print:shadow-none print:border-0 print:rounded-none print:max-w-none", children: [_jsxs("div", { className: "briefing-footer hidden print:flex", children: [_jsx("span", { children: "Narrative Radar \u00B7 v0.1 \u00B7 indicator output, not a legal determination" }), _jsx("span", { className: "font-mono", children: hash })] }), _jsx("div", { className: "briefing-banner px-10 py-6 border-b-4 border-eu-gold bg-eu-blue text-white", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase tracking-[0.25em] opacity-80", children: "Narrative Radar \u2014 Parliamentary Compliance Briefing" }), _jsx(EditableText, { value: briefing.title, onChange: (value) => update("title", value), className: "font-serif text-2xl mt-1", printClassName: "font-serif text-2xl mt-1", dark: true })] }), _jsxs("div", { className: "text-right text-[11px] opacity-90", children: [_jsxs("div", { children: ["Issued ", issued.toUTCString().replace(":00 GMT", " GMT")] }), _jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx("span", { children: "For:" }), _jsx(EditableText, { value: briefing.requester, onChange: (value) => update("requester", value), className: "min-w-28 text-right", printClassName: "inline", dark: true, compact: true })] }), briefing.constituency && (_jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx("span", { children: "Constituency:" }), _jsx(EditableText, { value: briefing.constituency, onChange: (value) => update("constituency", value), className: "min-w-12 text-right", printClassName: "inline", dark: true, compact: true })] }))] })] }) }), _jsxs("div", { className: "briefing-body px-10 py-6 font-serif text-eu-ink leading-relaxed", children: [_jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Executive summary", children: _jsx(EditableText, { value: briefing.executive_summary, onChange: (value) => update("executive_summary", value), multiline: true }) }) }), _jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Findings", children: _jsx("ol", { className: "list-decimal pl-5 space-y-1.5", children: briefing.findings.map((f, i) => (_jsx("li", { children: _jsx(EditableText, { value: f, onChange: (value) => updateFinding(i, value), multiline: true }) }, i))) }) }) }), _jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Cited articles", children: _jsx("div", { className: "space-y-3", children: briefing.cited_articles.map((a, i) => (_jsxs("div", { className: "briefing-article border-l-4 border-eu-blue/40 pl-3", children: [_jsxs("div", { className: "font-sans font-semibold text-sm", children: [_jsx(EditableText, { value: a.ref, onChange: (value) => updateArticle(i, "ref", value), className: "inline-block max-w-[9rem] font-semibold", printClassName: "inline font-semibold", compact: true }), _jsx("span", { children: " " }), _jsx(EditableText, { value: a.short ? `— ${a.short}` : "", onChange: (value) => updateArticle(i, "short", value.replace(/^—\s*/, "")), className: "inline-block min-w-48 font-normal text-eu-slate-500", printClassName: "inline font-normal text-eu-slate-500", compact: true })] }), a.summary && (_jsx(EditableText, { value: a.summary, onChange: (value) => updateArticle(i, "summary", value), className: "mt-0.5 text-sm text-eu-slate-700", printClassName: "text-sm text-eu-slate-700 mt-0.5", multiline: true })), a.indicator_basis && (_jsxs("div", { className: "text-xs text-eu-slate-500 mt-1 italic", children: [_jsx("span", { children: "Indicator basis: " }), _jsx(EditableText, { value: a.indicator_basis, onChange: (value) => updateArticle(i, "indicator_basis", value), className: "mt-1 text-xs text-eu-slate-500 italic", printClassName: "inline text-xs text-eu-slate-500 italic", multiline: true })] })), _jsxs("div", { className: "text-[11px] font-mono text-eu-slate-500 mt-1", children: [_jsx(EditableText, { value: a.instrument ?? "", onChange: (value) => updateArticle(i, "instrument", value), className: "inline-block min-w-48 font-mono", printClassName: "inline font-mono", compact: true }), " · ", _jsx("a", { href: a.official_url, target: "_blank", rel: "noreferrer", className: "underline", children: "official text" }), a.enforcement_date && (_jsxs(_Fragment, { children: [" · enforceable ", _jsx(EditableText, { value: a.enforcement_date, onChange: (value) => updateArticle(i, "enforcement_date", value), className: "inline-block min-w-20 font-mono", printClassName: "inline font-mono", compact: true })] }))] })] }, `${a.ref}-${i}`))) }) }) }), briefing.dsa_tdb_references.length > 0 && (_jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "DSA Transparency Database references", children: _jsx("div", { className: "space-y-3", children: briefing.dsa_tdb_references.map((ref, i) => (_jsxs("div", { className: "briefing-article border-l-4 border-eu-blue/40 pl-3", children: [_jsxs("div", { className: "font-sans font-semibold text-sm", children: [_jsx(EditableText, { value: ref.platform, onChange: (value) => updateDsaTdbReference(i, "platform", value), className: "inline-block max-w-[8rem] font-semibold uppercase", printClassName: "inline font-semibold uppercase", compact: true }), _jsx("span", { children: " " }), _jsx(EditableText, { value: `— ${ref.decision_ground}`, onChange: (value) => updateDsaTdbReference(i, "decision_ground", value.replace(/^—\s*/, "")), className: "inline-block min-w-64 font-normal text-eu-slate-500", printClassName: "inline font-normal text-eu-slate-500", compact: true })] }), _jsxs("div", { className: "mt-0.5 text-sm text-eu-slate-700", children: [_jsx(EditableText, { value: ref.actions_taken, onChange: (value) => updateDsaTdbReference(i, "actions_taken", value), className: "inline-block max-w-[10rem] text-sm font-semibold tabular-nums text-eu-ink", printClassName: "inline font-semibold tabular-nums text-eu-ink", compact: true }), _jsx("span", { className: "print:hidden", children: " actions reported on similar content." }), _jsx("span", { className: "hidden print:inline", children: " actions reported on similar content." })] }), _jsxs("div", { className: "text-xs text-eu-slate-500 mt-1 italic", children: [_jsx("span", { children: "Indicator basis: " }), _jsx(EditableText, { value: ref.basis, onChange: (value) => updateDsaTdbReference(i, "basis", value), className: "mt-1 text-xs text-eu-slate-500 italic", printClassName: "inline text-xs text-eu-slate-500 italic", multiline: true })] }), _jsxs("div", { className: "text-[11px] font-mono text-eu-slate-500 mt-1", children: [_jsx("span", { children: "Source item(s): " }), _jsx(EditableText, { value: ref.source_items, onChange: (value) => updateDsaTdbReference(i, "source_items", value), className: "mt-1 font-mono text-[11px] text-eu-slate-500", printClassName: "inline font-mono text-[11px] text-eu-slate-500", multiline: true })] })] }, `${ref.platform}-${ref.decision_ground}-${i}`))) }) }) })), _jsx("div", { className: "briefing-section briefing-evidence", children: _jsx(Section, { title: "Evidence pack", children: _jsx("div", { className: "space-y-4", children: briefing.evidence.map((e, i) => (_jsxs("div", { className: "briefing-evidence-item surface-tight font-sans p-4 text-sm", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2 mb-1", children: [_jsx(EditableText, { value: e.title, onChange: (value) => updateEvidence(i, "title", value), className: "font-semibold text-eu-ink", printClassName: "font-semibold text-eu-ink", multiline: true }), _jsxs("div", { className: "text-xs text-eu-slate-500", children: [flag(e.language), " ", e.platform, " \u00B7 ", compactNumber(e.reach), " views"] })] }), _jsxs("div", { className: "text-xs text-eu-slate-500 mb-2", children: [_jsx(EditableText, { value: e.author, onChange: (value) => updateEvidence(i, "author", value), className: "inline-block min-w-32 text-xs text-eu-slate-500", printClassName: "inline text-xs text-eu-slate-500", compact: true }), " · ", _jsx("a", { href: e.url, target: "_blank", rel: "noreferrer", className: "text-eu-blue underline break-all", children: e.url })] }), e.transcript_excerpt && (_jsx("div", { className: "border-l-2 border-eu-slate-200 pl-3 mt-1", children: _jsx(EditableText, { value: e.transcript_excerpt, onChange: (value) => updateEvidence(i, "transcript_excerpt", value), className: "text-xs text-eu-slate-600 italic", printClassName: "text-xs text-eu-slate-600 italic", multiline: true }) })), e.edmo_matches?.length > 0 && (_jsxs("div", { className: "text-xs mt-2", children: [_jsx("span", { className: "font-semibold", children: "Matched fact-checks:" }), " ", e.edmo_matches.map((m) => (_jsxs("a", { href: m.source_url, target: "_blank", rel: "noreferrer", className: "text-eu-blue underline mr-2", children: [m.source, " (", m.similarity.toFixed(2), ")"] }, m.title)))] })), e.dsa_tdb_cross_refs?.length > 0 && (_jsxs("div", { className: "text-xs mt-1", children: [_jsx("span", { className: "font-semibold", children: "DSA TDB:" }), " ", e.dsa_tdb_cross_refs.map((c) => (_jsxs("span", { className: "mr-2", children: [c.actions_taken.toLocaleString(), " \u00D7 ", c.decision_ground] }, c.decision_ground)))] })), e.gaps?.length > 0 && (_jsxs("div", { className: "text-xs mt-1", children: [_jsx("span", { className: "font-semibold", children: "Indicators:" }), " ", e.gaps.map((g) => (_jsxs("span", { className: "mr-2 font-mono", children: [g.article_ref, " (", g.severity, ")"] }, g.article_ref)))] })), e.derivative_spread_radius && (_jsxs("div", { className: "text-xs mt-2 text-eu-slate-700", children: [_jsx("span", { className: "font-semibold", children: "Derivative Spread Radius:" }), " ", e.derivative_spread_radius.derivative_count, " subsequent videos \u00B7", " ", compactNumber(e.derivative_spread_radius.aggregate_reach), " aggregate reach \u00B7", " ", "root proof ", e.derivative_spread_radius.root_proof_status] }))] }, e.video_id))) }) }) }), _jsx("div", { className: "briefing-section mt-8 pt-4 border-t border-eu-slate-200 text-[11px] text-eu-slate-500 italic", children: _jsx(EditableText, { value: briefing.disclaimer, onChange: (value) => update("disclaimer", value), className: "text-[11px] text-eu-slate-500 italic", printClassName: "text-[11px] text-eu-slate-500 italic", multiline: true }) }), _jsx("div", { className: "briefing-section mt-6 print:break-inside-avoid", children: _jsx(Section, { title: "User comments", children: _jsx(EditableText, { value: briefing.user_comments, onChange: (value) => update("user_comments", value), placeholder: "Add reviewer notes, questions for counsel, or constituency-specific comments.", className: "min-h-28 font-sans text-sm text-eu-slate-700", printClassName: "whitespace-pre-wrap font-sans text-sm text-eu-slate-700", multiline: true }) }) }), _jsxs("div", { className: "text-[10px] text-eu-slate-400 mt-2 font-mono flex flex-wrap gap-x-3 gap-y-1", children: [_jsx("span", { children: "Generated by Narrative Radar v0.1" }), _jsxs("span", { children: ["\u00B7 ", issued.toISOString()] }), hash && _jsxs("span", { children: ["\u00B7 ", hash] })] })] })] }));
}
function Section({ title, children }) {
    return (_jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "font-sans text-[11px] uppercase tracking-[0.2em] text-eu-blue font-semibold mb-2", children: title }), children] }));
}
function EditableText({ value, onChange, placeholder, className = "", printClassName = "", multiline = false, compact = false, dark = false, }) {
    const text = value ?? "";
    const inputClasses = [
        "print:hidden w-full resize-y rounded-md border border-dashed px-2 py-1 outline-none transition-colors",
        dark
            ? "border-white/25 bg-white/5 text-white placeholder:text-white/60 hover:border-white/50 hover:bg-white/10 focus:border-white/80 focus:bg-white/15"
            : "border-eu-blue/20 bg-eu-blue/[0.025] text-eu-ink placeholder:text-eu-slate-400 hover:border-eu-blue/45 hover:bg-eu-blue/5 focus:border-eu-blue focus:bg-white focus:ring-1 focus:ring-eu-blue",
        compact ? "min-h-0 py-0.5 text-inherit leading-snug" : "min-h-[2.5rem]",
        className,
    ].join(" ");
    const printClasses = [
        "hidden print:block whitespace-pre-wrap",
        printClassName || className,
    ].join(" ");
    return (_jsxs(_Fragment, { children: [multiline ? (_jsx("textarea", { value: text, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: inputClasses, rows: compact ? 1 : 3 })) : (_jsx("input", { value: text, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: inputClasses })), _jsx("span", { className: printClasses, children: text || placeholder || "" })] }));
}
