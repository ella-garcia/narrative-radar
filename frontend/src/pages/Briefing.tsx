import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type {
  AgencyInput,
  AnalyzedVideo,
  Briefing as BriefingT,
  SharedBriefing,
} from "../lib/types";
import { compactNumber, flag } from "../lib/format";

type EditableBriefing = BriefingT & {
  dsa_tdb_references: DSATDBBriefingReference[];
  user_comments: string;
  agency_inputs: AgencyInput[];
};

type DSATDBBriefingReference = {
  platform: string;
  decision_ground: string;
  actions_taken: string;
  source_items: string;
  basis: string;
};

type AgencyContributionDraft = {
  author: string;
  summary: string;
  case_details: string;
  evidence_links: string;
  evidence_notes: string;
};

const EMPTY_AGENCY_DRAFT: AgencyContributionDraft = {
  author: "",
  summary: "",
  case_details: "",
  evidence_links: "",
  evidence_notes: "",
};

function toEditableBriefing(
  briefing: BriefingT,
  agencyInputs: AgencyInput[] = [],
): EditableBriefing {
  const refs = new Map<string, {
    platform: string;
    decision_ground: string;
    actions_taken: number;
    source_items: Set<string>;
  }>();

  briefing.evidence.forEach((e: any) => {
    e.dsa_tdb_cross_refs?.forEach((ref: any) => {
      const platform = String(ref.platform ?? e.platform ?? "platform").toUpperCase();
      const decisionGround = String(ref.decision_ground ?? "unspecified decision ground");
      const key = `${platform}:${decisionGround}`;
      const existing = refs.get(key);
      const actions = Number(ref.actions_taken ?? 0);
      if (existing) {
        existing.actions_taken = Math.max(existing.actions_taken, actions);
        existing.source_items.add(e.title ?? e.video_id ?? "untitled item");
      } else {
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
      basis:
        "The platform has reported moderation actions under this DSA Transparency Database decision ground on similar content. This is used as an external platform-admission signal, not as a legal determination.",
    })),
    user_comments: "",
    agency_inputs: agencyInputs,
  };
}

function toBriefing(briefing: EditableBriefing): BriefingT {
  const {
    dsa_tdb_references: _dsaTdbReferences,
    user_comments: _userComments,
    agency_inputs: _agencyInputs,
    ...base
  } = briefing;
  return base;
}

function exportDocx(briefing: EditableBriefing) {
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

function createBriefingDocx(briefing: EditableBriefing): Blob {
  const issued = new Date(briefing.issued_at);
  const parts: string[] = [
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
      docxParagraph(
        [
          article.instrument,
          article.official_url ? `official text: ${article.official_url}` : "",
          article.enforcement_date ? `enforceable ${article.enforcement_date}` : "",
        ].filter(Boolean).join(" | "),
        { size: 18, color: "5A6E89" },
      ),
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
    ...briefing.evidence.flatMap((e: any, i: number) => [
      docxParagraph(`${i + 1}. ${e.title}`, { bold: true }),
      docxParagraph(
        `${flag(e.language)} ${e.platform} | ${compactNumber(e.reach)} views | ${e.author} | ${e.url}`,
        { size: 18, color: "5A6E89" },
      ),
      e.transcript_excerpt ? docxParagraph(e.transcript_excerpt, { italic: true }) : "",
      e.edmo_matches?.length
        ? docxParagraph(
            `Matched fact-checks: ${e.edmo_matches
              .map((m: any) => `${m.source} (${m.similarity.toFixed(2)}) ${m.source_url}`)
              .join("; ")}`,
            { size: 18 },
          )
        : "",
      e.dsa_tdb_cross_refs?.length
        ? docxParagraph(
            `DSA TDB: ${e.dsa_tdb_cross_refs
              .map((c: any) => `${Number(c.actions_taken).toLocaleString()} x ${c.decision_ground}`)
              .join("; ")}`,
            { size: 18 },
          )
        : "",
      e.gaps?.length
        ? docxParagraph(
            `Indicators: ${e.gaps.map((g: any) => `${g.article_ref} (${g.severity})`).join("; ")}`,
            { size: 18 },
          )
        : "",
      e.derivative_spread_radius
        ? docxParagraph(
            `Derivative Spread Radius: ${e.derivative_spread_radius.derivative_count} subsequent videos | ${compactNumber(e.derivative_spread_radius.aggregate_reach)} aggregate reach | root proof ${e.derivative_spread_radius.root_proof_status}`,
            { size: 18 },
          )
        : "",
    ]),
    ...(briefing.agency_inputs.length
      ? [
          docxParagraph("Agency Contributions", { heading: true }),
          ...briefing.agency_inputs.flatMap((input) => [
            docxParagraph(`${input.agency_name} - ${input.author}`, { bold: true }),
            docxParagraph(`Summary: ${input.summary}`),
            input.case_details ? docxParagraph(`Case details: ${input.case_details}`) : "",
            input.evidence_links.length
              ? docxParagraph(`Evidence links: ${input.evidence_links.join("; ")}`, { size: 18 })
              : "",
            input.evidence_notes ? docxParagraph(`Evidence notes: ${input.evidence_notes}`, { size: 18 }) : "",
          ]),
        ]
      : []),
    docxParagraph("User Comments", { heading: true }),
    docxParagraph(briefing.user_comments || "No user comments added."),
    docxParagraph("Disclaimer", { heading: true }),
    docxParagraph(briefing.disclaimer, { italic: true, size: 18, color: "5A6E89" }),
    docxParagraph(
      `Generated by Narrative Radar v0.1 | ${issued.toISOString()}${briefing.briefing_hash ? ` | ${briefing.briefing_hash}` : ""}`,
      { size: 16, color: "5A6E89" },
    ),
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

function docxParagraph(
  value: string | number | null | undefined,
  opts: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    heading?: boolean;
    size?: number;
    spacingAfter?: number;
  } = {},
): string {
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileSafeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "narrative-radar-briefing";
}

function zipBlob(files: Record<string, string>): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
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
  const zipBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([zipBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function crc32(data: Uint8Array): number {
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
  const sharedId = params.get("shared") ?? "";
  const agencyId = params.get("agency") ?? "";
  const [videos, setVideos] = useState<AnalyzedVideo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));
  const [briefing, setBriefing] = useState<BriefingT | null>(null);
  const [editedBriefing, setEditedBriefing] = useState<EditableBriefing | null>(null);
  const [sharedBriefing, setSharedBriefing] = useState<SharedBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [agencyContact, setAgencyContact] = useState("");
  const [agencyDraft, setAgencyDraft] = useState<AgencyContributionDraft>(EMPTY_AGENCY_DRAFT);
  const [agencySubmitted, setAgencySubmitted] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [requester, setRequester] = useState("Parliamentary Aide");
  const [constituency, setConstituency] = useState("RO");

  useEffect(() => {
    api.listVideos().then(setVideos);
  }, []);

  useEffect(() => {
    if (!sharedId) return;
    setSharedLoading(true);
    api.getSharedBriefing(sharedId)
      .then((shared) => {
        setSharedBriefing(shared);
        setBriefing(shared.briefing);
        setEditedBriefing(toEditableBriefing(shared.briefing, shared.agency_inputs));
        setSharedError(null);
      })
      .catch((e: any) => setSharedError(e.message))
      .finally(() => setSharedLoading(false));
  }, [sharedId]);

  useEffect(() => {
    if (!sharedId && initialIds.length && videos.length && !briefing) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length, sharedId]);

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
      setSharedBriefing(null);
    } finally {
      setLoading(false);
    }
  }

  async function createSharedBriefing() {
    setLoading(true);
    try {
      const shared = await api.createSharedBriefing({
        video_ids: selected.size ? Array.from(selected) : undefined,
        constituency,
        requester_name: requester,
      });
      setSharedBriefing(shared);
      setBriefing(shared.briefing);
      setEditedBriefing(toEditableBriefing(shared.briefing, shared.agency_inputs));
      setSharedError(null);
      window.history.replaceState(null, "", `/briefing?shared=${shared.briefing_id}`);
    } finally {
      setLoading(false);
    }
  }

  async function addAgencyContributor() {
    if (!sharedBriefing || !agencyName.trim()) return;
    setSharedLoading(true);
    try {
      const shared = await api.addSharedBriefingContributor(sharedBriefing.briefing_id, {
        agency_name: agencyName,
        contact_label: agencyContact,
      });
      setSharedBriefing(shared);
      setEditedBriefing((current) =>
        current ? { ...current, agency_inputs: shared.agency_inputs } : current,
      );
      setAgencyName("");
      setAgencyContact("");
      setSharedError(null);
    } catch (e: any) {
      setSharedError(e.message);
    } finally {
      setSharedLoading(false);
    }
  }

  async function saveSharedEdits() {
    if (!sharedBriefing || !editedBriefing) return;
    setSharedLoading(true);
    try {
      const shared = await api.updateSharedBriefing(
        sharedBriefing.briefing_id,
        toBriefing(editedBriefing),
      );
      setSharedBriefing(shared);
      setBriefing(shared.briefing);
      setEditedBriefing(toEditableBriefing(shared.briefing, shared.agency_inputs));
      setSharedError(null);
    } catch (e: any) {
      setSharedError(e.message);
    } finally {
      setSharedLoading(false);
    }
  }

  async function submitAgencyInput() {
    if (!sharedBriefing || !agencyId) return;
    setSharedLoading(true);
    try {
      const agency = sharedBriefing.contributors.find((c) => c.agency_id === agencyId);
      const shared = await api.addSharedBriefingAgencyInput(sharedBriefing.briefing_id, {
        agency_id: agencyId,
        author: agencyDraft.author || agency?.contact_label || agency?.agency_name || "Agency reviewer",
        summary: agencyDraft.summary,
        case_details: agencyDraft.case_details,
        evidence_links: agencyDraft.evidence_links.split(/\n+/).map((l) => l.trim()).filter(Boolean),
        evidence_notes: agencyDraft.evidence_notes,
      });
      setSharedBriefing(shared);
      setBriefing(shared.briefing);
      setEditedBriefing(toEditableBriefing(shared.briefing, shared.agency_inputs));
      setAgencyDraft(EMPTY_AGENCY_DRAFT);
      setAgencySubmitted(true);
      setSharedError(null);
    } catch (e: any) {
      setSharedError(e.message);
    } finally {
      setSharedLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-eu-ink font-semibold">
          Parliamentary briefing
        </h1>
        <p className="text-sm text-eu-slate-500 mt-0.5">
          Two-page factual briefing citing specific DSA / AI Act articles, ready
          for human editing and DOCX export.
        </p>
      </div>

      <div className="surface p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
              Requester
            </span>
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              className="select"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
              Constituency
            </span>
            <select
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              className="select"
            >
              {["RO", "DE", "FR", "PL", "IT", "ES", "NL", "SK", ""].map((c) => (
                <option key={c || "all"} value={c}>
                  {c ? `${flag(c)} ${c}` : "All / cross-border"}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <div className="flex w-full flex-wrap gap-2">
              <button
                onClick={generate}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate briefing"}
              </button>
              <button
                onClick={createSharedBriefing}
                disabled={loading}
                className="px-4 py-2 rounded-md border border-eu-blue/30 bg-eu-blue/5 text-sm font-medium text-eu-blue hover:bg-eu-blue/10 disabled:opacity-50"
              >
                Create shared briefing
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="section-heading mb-2">
            Items to include {selected.size > 0 ? `(${selected.size} selected)` : "(top 5 if none selected)"}
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {videos.map((v) => (
              <label
                key={v.metadata.video_id}
                className="flex items-center gap-3 px-2 py-1 rounded hover:bg-eu-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.metadata.video_id)}
                  onChange={(e) => {
                    const s = new Set(selected);
                    if (e.target.checked) s.add(v.metadata.video_id);
                    else s.delete(v.metadata.video_id);
                    setSelected(s);
                  }}
                />
                <span className="font-mono text-xs text-eu-slate-500 w-16 shrink-0">
                  sev {v.severity.score.toFixed(0)}
                </span>
                <span className="text-sm truncate">{v.metadata.title}</span>
                <span className="text-xs text-eu-slate-500 ml-auto">
                  {flag(v.metadata.language)} · {compactNumber(v.metadata.view_count)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {sharedLoading && (
        <div className="surface p-4 text-sm text-eu-slate-600">
          Updating shared briefing…
        </div>
      )}

      {sharedError && (
        <div className="surface p-4 text-sm text-sev-critical">
          {sharedError}
        </div>
      )}

      {briefing && editedBriefing && (
        <div className="space-y-4">
          {sharedBriefing && agencyId && (
            <AgencyContributionPanel
              sharedBriefing={sharedBriefing}
              agencyId={agencyId}
              draft={agencyDraft}
              submitted={agencySubmitted}
              onChange={setAgencyDraft}
              onSubmit={submitAgencyInput}
            />
          )}
          {sharedBriefing && !agencyId && (
            <SharedBriefingPanel
              sharedBriefing={sharedBriefing}
              agencyName={agencyName}
              agencyContact={agencyContact}
              onAgencyNameChange={setAgencyName}
              onAgencyContactChange={setAgencyContact}
              onAddAgency={addAgencyContributor}
            />
          )}
          <div className="mx-auto flex max-w-[984px] flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="surface-tight flex min-h-10 flex-wrap items-center gap-3 border-eu-blue/30 bg-eu-blue/5 px-4 py-2 text-sm text-eu-ink">
              <span className="rounded bg-eu-blue px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Edit mode
              </span>
              <span>
                Manual edits only. DOCX export uses this edited version; no AI runs after generation.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(editedBriefing, null, 2))}
                className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
              >
                Copy JSON
              </button>
              <button
                onClick={() => exportDocx(editedBriefing)}
                className="text-xs px-3 py-1.5 bg-eu-blue text-white rounded-md hover:bg-eu-blue/90"
              >
                Export DOCX
              </button>
              {sharedBriefing && !agencyId && (
                <button
                  onClick={saveSharedEdits}
                  className="text-xs px-3 py-1.5 border border-eu-blue/30 bg-eu-blue/5 text-eu-blue rounded-md hover:bg-eu-blue/10"
                >
                  Save shared edits
                </button>
              )}
            </div>
          </div>
          <BriefingDocument
            briefing={editedBriefing}
            onChange={setEditedBriefing}
          />
        </div>
      )}
    </div>
  );
}

function SharedBriefingPanel({
  sharedBriefing,
  agencyName,
  agencyContact,
  onAgencyNameChange,
  onAgencyContactChange,
  onAddAgency,
}: {
  sharedBriefing: SharedBriefing;
  agencyName: string;
  agencyContact: string;
  onAgencyNameChange: (value: string) => void;
  onAgencyContactChange: (value: string) => void;
  onAddAgency: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const ownerPath = `/briefing?shared=${sharedBriefing.briefing_id}`;

  return (
    <section className="surface mx-auto max-w-[984px] p-5 print:hidden">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-heading mb-1">Authorized agency input</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            Shared policy briefing
          </h2>
          <p className="mt-1 text-sm text-eu-slate-600">
            Invite authorized agencies to add evidence or case details. Their
            submissions are additive, attributed, and included in the briefing export.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(`${origin}${ownerPath}`)}
          className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
        >
          Copy owner link
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Agency name
          </span>
          <input
            value={agencyName}
            onChange={(e) => onAgencyNameChange(e.target.value)}
            placeholder="e.g. EDMO Hub, national regulator"
            className="select"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Contact label
          </span>
          <input
            value={agencyContact}
            onChange={(e) => onAgencyContactChange(e.target.value)}
            placeholder="analyst name or mailbox"
            className="select"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onAddAgency}
            disabled={!agencyName.trim()}
            className="px-4 py-2 rounded-md bg-eu-blue text-sm font-medium text-white hover:bg-eu-blue/90 disabled:opacity-50"
          >
            Add agency
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {sharedBriefing.contributors.length === 0 ? (
          <div className="surface-tight p-3 text-sm text-eu-slate-500">
            No agencies invited yet.
          </div>
        ) : (
          sharedBriefing.contributors.map((agency) => {
            const path = `/briefing?shared=${sharedBriefing.briefing_id}&agency=${agency.agency_id}`;
            return (
              <div
                key={agency.agency_id}
                className="surface-tight flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-eu-ink">{agency.agency_name}</div>
                  <div className="text-xs text-eu-slate-500">
                    {agency.contact_label || "No contact label"} · {agency.status}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`${origin}${path}`)}
                  className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
                >
                  Copy agency link
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function AgencyContributionPanel({
  sharedBriefing,
  agencyId,
  draft,
  submitted,
  onChange,
  onSubmit,
}: {
  sharedBriefing: SharedBriefing;
  agencyId: string;
  draft: AgencyContributionDraft;
  submitted: boolean;
  onChange: (draft: AgencyContributionDraft) => void;
  onSubmit: () => void;
}) {
  const agency = sharedBriefing.contributors.find((c) => c.agency_id === agencyId);

  if (!agency) {
    return (
      <section className="surface mx-auto max-w-[984px] p-5 text-sm text-sev-critical print:hidden">
        This agency link is not authorized for the shared briefing.
      </section>
    );
  }

  return (
    <section className="surface mx-auto max-w-[984px] p-5 print:hidden">
      <div className="mb-4">
        <div className="section-heading mb-1">Agency contribution</div>
        <h2 className="font-serif text-xl font-semibold text-eu-ink">
          Add input as {agency.agency_name}
        </h2>
        <p className="mt-1 text-sm text-eu-slate-600">
          Additive evidence and case details will be attributed to this agency
          and included in the policy briefing export.
        </p>
      </div>
      {submitted && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Contribution submitted and added to the shared briefing.
        </div>
      )}
      <div className="grid gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Author
          </span>
          <input
            value={draft.author}
            onChange={(e) => onChange({ ...draft, author: e.target.value })}
            placeholder={agency.contact_label || agency.agency_name}
            className="select"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Agency summary
          </span>
          <textarea
            value={draft.summary}
            onChange={(e) => onChange({ ...draft, summary: e.target.value })}
            className="select min-h-24 resize-y"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Case details
          </span>
          <textarea
            value={draft.case_details}
            onChange={(e) => onChange({ ...draft, case_details: e.target.value })}
            className="select min-h-24 resize-y"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Evidence links, one per line
          </span>
          <textarea
            value={draft.evidence_links}
            onChange={(e) => onChange({ ...draft, evidence_links: e.target.value })}
            className="select min-h-20 resize-y font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
            Evidence notes
          </span>
          <textarea
            value={draft.evidence_notes}
            onChange={(e) => onChange({ ...draft, evidence_notes: e.target.value })}
            className="select min-h-20 resize-y"
          />
        </label>
        <div>
          <button
            type="button"
            onClick={onSubmit}
            className="px-4 py-2 rounded-md bg-eu-blue text-sm font-medium text-white hover:bg-eu-blue/90"
          >
            Submit agency input
          </button>
        </div>
      </div>
    </section>
  );
}

function BriefingDocument({
  briefing,
  onChange,
}: {
  briefing: EditableBriefing;
  onChange: (briefing: EditableBriefing) => void;
}) {
  const issued = new Date(briefing.issued_at);
  const hash = briefing.briefing_hash ?? "";

  function update<K extends keyof EditableBriefing>(
    key: K,
    value: EditableBriefing[K],
  ) {
    onChange({ ...briefing, [key]: value });
  }

  function updateFinding(index: number, value: string) {
    update(
      "findings",
      briefing.findings.map((f, i) => (i === index ? value : f)),
    );
  }

  function updateArticle(index: number, key: string, value: string) {
    update(
      "cited_articles",
      briefing.cited_articles.map((a, i) =>
        i === index ? { ...a, [key]: value } : a,
      ),
    );
  }

  function updateEvidence(index: number, key: string, value: string) {
    update(
      "evidence",
      briefing.evidence.map((e: any, i: number) =>
        i === index ? { ...e, [key]: value } : e,
      ),
    );
  }

  function updateDsaTdbReference(index: number, key: keyof DSATDBBriefingReference, value: string) {
    update(
      "dsa_tdb_references",
      briefing.dsa_tdb_references.map((ref, i) =>
        i === index ? { ...ref, [key]: value } : ref,
      ),
    );
  }

  return (
    <article className="briefing-doc bg-white shadow-card border border-eu-slate-200 rounded-lg max-w-[984px] mx-auto print:shadow-none print:border-0 print:rounded-none print:max-w-none">
      {/* Running footer for print only — picked up by @page bottom-left */}
      <div className="briefing-footer hidden print:flex">
        <span>Narrative Radar · v0.1 · indicator output, not a legal determination</span>
        <span className="font-mono">{hash}</span>
      </div>

      {/* Banner */}
      <div className="briefing-banner px-10 py-6 border-b-4 border-eu-gold bg-eu-blue text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">
              Narrative Radar — Parliamentary Compliance Briefing
            </div>
            <EditableText
              value={briefing.title}
              onChange={(value) => update("title", value)}
              className="font-serif text-2xl mt-1"
              printClassName="font-serif text-2xl mt-1"
              dark
            />
          </div>
          <div className="text-right text-[11px] opacity-90">
            <div>Issued {issued.toUTCString().replace(":00 GMT", " GMT")}</div>
            <div className="flex items-center justify-end gap-1">
              <span>For:</span>
              <EditableText
                value={briefing.requester}
                onChange={(value) => update("requester", value)}
                className="min-w-28 text-right"
                printClassName="inline"
                dark
                compact
              />
            </div>
            {briefing.constituency && (
              <div className="flex items-center justify-end gap-1">
                <span>Constituency:</span>
                <EditableText
                  value={briefing.constituency}
                  onChange={(value) => update("constituency", value)}
                  className="min-w-12 text-right"
                  printClassName="inline"
                  dark
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="briefing-body px-10 py-6 font-serif text-eu-ink leading-relaxed">
        <div className="briefing-section">
          <Section title="Executive summary">
            <EditableText
              value={briefing.executive_summary}
              onChange={(value) => update("executive_summary", value)}
              multiline
            />
          </Section>
        </div>

        <div className="briefing-section">
          <Section title="Findings">
            <ol className="list-decimal pl-5 space-y-1.5">
              {briefing.findings.map((f, i) => (
                <li key={i}>
                  <EditableText
                    value={f}
                    onChange={(value) => updateFinding(i, value)}
                    multiline
                  />
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="briefing-section">
          <Section title="Cited articles">
            <div className="space-y-3">
              {briefing.cited_articles.map((a, i) => (
                <div key={`${a.ref}-${i}`} className="briefing-article border-l-4 border-eu-blue/40 pl-3">
                  <div className="font-sans font-semibold text-sm">
                    <EditableText
                      value={a.ref}
                      onChange={(value) => updateArticle(i, "ref", value)}
                      className="inline-block max-w-[9rem] font-semibold"
                      printClassName="inline font-semibold"
                      compact
                    />
                    <span> </span>
                    <EditableText
                      value={a.short ? `— ${a.short}` : ""}
                      onChange={(value) => updateArticle(i, "short", value.replace(/^—\s*/, ""))}
                      className="inline-block min-w-48 font-normal text-eu-slate-500"
                      printClassName="inline font-normal text-eu-slate-500"
                      compact
                    />
                  </div>
                  {a.summary && (
                    <EditableText
                      value={a.summary}
                      onChange={(value) => updateArticle(i, "summary", value)}
                      className="mt-0.5 text-sm text-eu-slate-700"
                      printClassName="text-sm text-eu-slate-700 mt-0.5"
                      multiline
                    />
                  )}
                  {a.indicator_basis && (
                    <div className="text-xs text-eu-slate-500 mt-1 italic">
                      <span>Indicator basis: </span>
                      <EditableText
                        value={a.indicator_basis}
                        onChange={(value) => updateArticle(i, "indicator_basis", value)}
                        className="mt-1 text-xs text-eu-slate-500 italic"
                        printClassName="inline text-xs text-eu-slate-500 italic"
                        multiline
                      />
                    </div>
                  )}
                  <div className="text-[11px] font-mono text-eu-slate-500 mt-1">
                    <EditableText
                      value={a.instrument ?? ""}
                      onChange={(value) => updateArticle(i, "instrument", value)}
                      className="inline-block min-w-48 font-mono"
                      printClassName="inline font-mono"
                      compact
                    />
                    {" · "}
                    <a href={a.official_url} target="_blank" rel="noreferrer" className="underline">official text</a>
                    {a.enforcement_date && (
                      <>
                        {" · enforceable "}
                        <EditableText
                          value={a.enforcement_date}
                          onChange={(value) => updateArticle(i, "enforcement_date", value)}
                          className="inline-block min-w-20 font-mono"
                          printClassName="inline font-mono"
                          compact
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {briefing.dsa_tdb_references.length > 0 && (
          <div className="briefing-section">
            <Section title="DSA Transparency Database references">
              <div className="space-y-3">
                {briefing.dsa_tdb_references.map((ref, i) => (
                  <div
                    key={`${ref.platform}-${ref.decision_ground}-${i}`}
                    className="briefing-article border-l-4 border-eu-blue/40 pl-3"
                  >
                    <div className="font-sans font-semibold text-sm">
                      <EditableText
                        value={ref.platform}
                        onChange={(value) => updateDsaTdbReference(i, "platform", value)}
                        className="inline-block max-w-[8rem] font-semibold uppercase"
                        printClassName="inline font-semibold uppercase"
                        compact
                      />
                      <span> </span>
                      <EditableText
                        value={`— ${ref.decision_ground}`}
                        onChange={(value) =>
                          updateDsaTdbReference(i, "decision_ground", value.replace(/^—\s*/, ""))
                        }
                        className="inline-block min-w-64 font-normal text-eu-slate-500"
                        printClassName="inline font-normal text-eu-slate-500"
                        compact
                      />
                    </div>
                    <div className="mt-0.5 text-sm text-eu-slate-700">
                      <EditableText
                        value={ref.actions_taken}
                        onChange={(value) => updateDsaTdbReference(i, "actions_taken", value)}
                        className="inline-block max-w-[10rem] text-sm font-semibold tabular-nums text-eu-ink"
                        printClassName="inline font-semibold tabular-nums text-eu-ink"
                        compact
                      />
                      <span className="print:hidden"> actions reported on similar content.</span>
                      <span className="hidden print:inline"> actions reported on similar content.</span>
                    </div>
                    <div className="text-xs text-eu-slate-500 mt-1 italic">
                      <span>Indicator basis: </span>
                      <EditableText
                        value={ref.basis}
                        onChange={(value) => updateDsaTdbReference(i, "basis", value)}
                        className="mt-1 text-xs text-eu-slate-500 italic"
                        printClassName="inline text-xs text-eu-slate-500 italic"
                        multiline
                      />
                    </div>
                    <div className="text-[11px] font-mono text-eu-slate-500 mt-1">
                      <span>Source item(s): </span>
                      <EditableText
                        value={ref.source_items}
                        onChange={(value) => updateDsaTdbReference(i, "source_items", value)}
                        className="mt-1 font-mono text-[11px] text-eu-slate-500"
                        printClassName="inline font-mono text-[11px] text-eu-slate-500"
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        <div className="briefing-section briefing-evidence">
          <Section title="Evidence pack">
            <div className="space-y-4">
              {briefing.evidence.map((e: any, i: number) => (
                <div key={e.video_id} className="briefing-evidence-item surface-tight font-sans p-4 text-sm">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <EditableText
                      value={e.title}
                      onChange={(value) => updateEvidence(i, "title", value)}
                      className="font-semibold text-eu-ink"
                      printClassName="font-semibold text-eu-ink"
                      multiline
                    />
                    <div className="text-xs text-eu-slate-500">
                      {flag(e.language)} {e.platform} · {compactNumber(e.reach)} views
                    </div>
                  </div>
                  <div className="text-xs text-eu-slate-500 mb-2">
                    <EditableText
                      value={e.author}
                      onChange={(value) => updateEvidence(i, "author", value)}
                      className="inline-block min-w-32 text-xs text-eu-slate-500"
                      printClassName="inline text-xs text-eu-slate-500"
                      compact
                    />
                    {" · "}
                    <a href={e.url} target="_blank" rel="noreferrer" className="text-eu-blue underline break-all">{e.url}</a>
                  </div>
                  {e.transcript_excerpt && (
                    <div className="border-l-2 border-eu-slate-200 pl-3 mt-1">
                      <EditableText
                        value={e.transcript_excerpt}
                        onChange={(value) => updateEvidence(i, "transcript_excerpt", value)}
                        className="text-xs text-eu-slate-600 italic"
                        printClassName="text-xs text-eu-slate-600 italic"
                        multiline
                      />
                    </div>
                  )}
                  {e.edmo_matches?.length > 0 && (
                    <div className="text-xs mt-2">
                      <span className="font-semibold">Matched fact-checks:</span>{" "}
                      {e.edmo_matches.map((m: any) => (
                        <a
                          key={m.title}
                          href={m.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-eu-blue underline mr-2"
                        >
                          {m.source} ({m.similarity.toFixed(2)})
                        </a>
                      ))}
                    </div>
                  )}
                  {e.dsa_tdb_cross_refs?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="font-semibold">DSA TDB:</span>{" "}
                      {e.dsa_tdb_cross_refs.map((c: any) => (
                        <span key={c.decision_ground} className="mr-2">
                          {c.actions_taken.toLocaleString()} × {c.decision_ground}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.gaps?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="font-semibold">Indicators:</span>{" "}
                      {e.gaps.map((g: any) => (
                        <span key={g.article_ref} className="mr-2 font-mono">
                          {g.article_ref} ({g.severity})
                        </span>
                      ))}
                    </div>
                  )}
                  {e.derivative_spread_radius && (
                    <div className="text-xs mt-2 text-eu-slate-700">
                      <span className="font-semibold">Derivative Spread Radius:</span>{" "}
                      {e.derivative_spread_radius.derivative_count} subsequent videos ·{" "}
                      {compactNumber(e.derivative_spread_radius.aggregate_reach)} aggregate reach ·{" "}
                      root proof {e.derivative_spread_radius.root_proof_status}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {briefing.agency_inputs.length > 0 && (
          <div className="briefing-section">
            <Section title="Agency contributions">
              <div className="space-y-3">
                {briefing.agency_inputs.map((input) => (
                  <div
                    key={input.input_id}
                    className="briefing-evidence-item surface-tight font-sans p-4 text-sm"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="font-semibold text-eu-ink">
                          {input.agency_name}
                        </div>
                        <div className="text-xs text-eu-slate-500">
                          Submitted by {input.author}
                        </div>
                      </div>
                      <span className="chip">External agency input</span>
                    </div>
                    {input.summary && (
                      <div className="mb-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-eu-slate-500">
                          Summary
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-eu-slate-700">
                          {input.summary}
                        </p>
                      </div>
                    )}
                    {input.case_details && (
                      <div className="mb-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-eu-slate-500">
                          Case details
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-eu-slate-700">
                          {input.case_details}
                        </p>
                      </div>
                    )}
                    {input.evidence_links.length > 0 && (
                      <div className="mb-2 text-xs">
                        <span className="font-semibold">Evidence links:</span>{" "}
                        {input.evidence_links.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-2 break-all text-eu-blue underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                    {input.evidence_notes && (
                      <p className="whitespace-pre-wrap text-xs text-eu-slate-600">
                        {input.evidence_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        <div className="briefing-section mt-8 pt-4 border-t border-eu-slate-200 text-[11px] text-eu-slate-500 italic">
          <EditableText
            value={briefing.disclaimer}
            onChange={(value) => update("disclaimer", value)}
            className="text-[11px] text-eu-slate-500 italic"
            printClassName="text-[11px] text-eu-slate-500 italic"
            multiline
          />
        </div>
        <div className="briefing-section mt-6 print:break-inside-avoid">
          <Section title="User comments">
            <EditableText
              value={briefing.user_comments}
              onChange={(value) => update("user_comments", value)}
              placeholder="Add reviewer notes, questions for counsel, or constituency-specific comments."
              className="min-h-28 font-sans text-sm text-eu-slate-700"
              printClassName="whitespace-pre-wrap font-sans text-sm text-eu-slate-700"
              multiline
            />
          </Section>
        </div>
        <div className="text-[10px] text-eu-slate-400 mt-2 font-mono flex flex-wrap gap-x-3 gap-y-1">
          <span>Generated by Narrative Radar v0.1</span>
          <span>· {issued.toISOString()}</span>
          {hash && <span>· {hash}</span>}
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] text-eu-blue font-semibold mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EditableText({
  value,
  onChange,
  placeholder,
  className = "",
  printClassName = "",
  multiline = false,
  compact = false,
  dark = false,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  printClassName?: string;
  multiline?: boolean;
  compact?: boolean;
  dark?: boolean;
}) {
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

  return (
    <>
      {multiline ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          rows={compact ? 1 : 3}
        />
      ) : (
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
      <span className={printClasses}>
        {text || placeholder || ""}
      </span>
    </>
  );
}
