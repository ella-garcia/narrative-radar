# Deployment

How a national parliament, EU institution, or national regulator would actually run Narrative Radar.

## Reference architecture

```
                      ┌────────────────────────────────────┐
                      │  EU-resident cloud (EUCS-aligned)  │
                      │                                    │
  Parliamentary ──▶  │   ┌─────────┐    ┌──────────────┐  │
  aide browser       │   │ Frontend│ ←→ │  FastAPI     │  │
  (SSO via EU Login) │   │ (static)│    │  backend     │  │
                      │   └─────────┘    └──────┬───────┘  │
                      │                          │          │
                      │              ┌───────────┼──────┐   │
                      │              │           │      │   │
                      │   ┌──────────▼──┐  ┌─────▼────┐ │   │
                      │   │ Postgres    │  │ Object   │ │   │
                      │   │ (analyses,  │  │ store    │ │   │
                      │   │ briefings,  │  │ (videos, │ │   │
                      │   │ audit log)  │  │ FAISS    │ │   │
                      │   └─────────────┘  │ index)   │ │   │
                      │                    └──────────┘ │   │
                      └────────────────────────────────────┘
                              │              │            │
                              ▼              ▼            ▼
                        EDMO / EUvsDisinfo  DSA TDB    OpenAI / Anthropic
                        nightly sync        daily sync (EU regions)
```

## Hosting

- **Region**: EU-resident cloud, ideally EUCS-aligned (Gaia-X compatible). Avoid US-region hyperscaler defaults.
- **Compute**: a single 4-vCPU / 16GB API node handles ~50 videos/day. Add a single GPU worker (Lambda Labs A10 or equivalent) when WhisperX is enabled — daily idle is fine.
- **Frontend**: build to static files, ship behind any standard EU CDN (Bunny, Cloudflare EU regions, OVH).
- **Storage**: PostgreSQL 16, S3-compatible object store (Wasabi EU, OVH, Scaleway).

## Identity

- **SSO via EU Login** for any EU-institution deployment. National parliaments typically use their own SAML/OIDC identity provider.
- **Two roles**:
  - `aide` — can ingest, browse, generate briefings.
  - `mp` — can read briefings issued to them. Cannot ingest or modify.
- **No anonymous access** outside of public-facing read endpoints (e.g. a "transparency" page exposing aggregate counts of issued briefings).

## API keys & secrets

Provided via environment variables (or KMS-backed secret store):

```
OPENAI_API_KEY=…       # GPT-4o-mini for claim extraction
ANTHROPIC_API_KEY=…    # Claude for briefing summaries
HIVE_API_KEY=…         # OPTIONAL, third-party synthetic-media hint
```

Operating without keys: the system runs end-to-end on its deterministic fallback paths. Useful for air-gapped pilot deployments and as a demo/recovery mode.

## Data residency

| Data | Region |
|---|---|
| Postgres | EU-resident |
| Object store | EU-resident |
| OpenAI / Anthropic API calls | Use EU regions where supported (`eu-` deployments where offered). |
| Hive | Vendor diligence required if used; otherwise omit. |

## GDPR considerations

- **Lawful basis**: Article 6(1)(e) — performance of a task carried out in the public interest by a parliamentary or regulatory body. Document this in the institution's Records of Processing Activities (RoPA).
- **Data minimisation**: only public, high-reach short-form video metadata and transcripts are processed. Personal data of social-media users is limited to the public handle and posting timestamp.
- **Retention**: see `GOVERNANCE.md` § Data retention.
- **DSAR (Data Subject Access Request)**: if a user named in our store requests access, the operating institution provides the handle, posting times, and any extracted-claim text we hold on them. Removal is processed within 30 days unless an active investigation makes deletion unlawful.
- **Cross-border transfers**: avoid by default; require DPO sign-off if unavoidable.

## Operational runbook

### Daily
- Verify backend `/health` returns OK.
- Verify `dsa-tdb` sync completed.
- Skim audit log for unusual ingestion volumes.

### Weekly
- Refresh EDMO + EUvsDisinfo corpus (see `scripts/refresh_corpus.py` — to be added).
- Re-build FAISS index.
- Verify rule-engine threshold values still match the operating institution's policy.

### Monthly
- Review issued briefings sample for accuracy.
- Refresh `legal_refs.json` against EUR-Lex (article texts can change).

### Incident response
- If a briefing is challenged: pull the briefing-hash from the audit log; reproduce the inputs; have legal counsel review.
- If misuse is suspected: lock the account, pull the audit-log slice, refer to DPO.

## Pilot deployment plan (suggested for Q3 2026)

1. Pick a single member-state parliamentary office willing to pilot (Romania is the natural anchor).
2. Deploy single-tenant on EU-resident cloud.
3. Run for one electoral cycle.
4. Externally audit the briefings issued and the rule outputs.
5. Open-source the rule engines (already MIT-licensed in this prototype) and publish a deployment template.
