# Demo script — 5 minutes

The pitch is structured as **3 acts × 90 seconds each**, plus a 30-second close. Cut anything that does not earn its place.

## Setup (before judges enter)

- Backend running: `uvicorn backend.main:app --port 8000`
- Frontend running: `cd frontend && npm run dev`
- Reset store, then pre-seed the 8 demo videos so the dashboard is populated:
  ```bash
  curl -X DELETE http://localhost:8000/storage
  for u in $(curl -s http://localhost:8000/demo-videos | jq -r '.[].url'); do
    curl -s -X POST http://localhost:8000/ingest \
      -H 'content-type: application/json' \
      -d "{\"url\": \"$u\", \"constituency\": \"RO\"}" > /dev/null
  done
  ```
- Browser tab on `http://localhost:5173/` (Dashboard).
- Second tab on the Romania video drawer (open it ahead of time, ready to alt-tab to).
- Third tab on a printable briefing (`/briefing` with the 3 demo cases selected).

## Act 1 — *the problem judges already know* (90s)

> Pull up the dashboard.

> *"In November 2024, the Romanian Constitutional Court annulled a presidential election. The Commission opened DSA proceedings against TikTok. The trigger was a coordinated short-form-video influence operation that pushed candidate Călin Georgescu from 1% to 23% in three weeks. By the time anyone in Brussels noticed, the damage was done."*

> *"Topic C of this hackathon asks: how do we give parliamentary offices and electoral authorities tools to detect, understand, and respond to this — without requiring deep technical literacy. That's what we built."*

[Point to the dashboard.] *"Eight short-form video items, three narrative clusters, twelve EU compliance-gap indicators. The headline number is the **DSA Article 34-35** counter — eight indicators, all backed by the platforms' own DSA Transparency Database submissions. We'll come back to that."*

## Act 2 — *the killer demo path* (90s)

> Click the Romania card.

> *"Here's a Romanian-language video. 2.3 million views. It calls Romania's pro-EU leadership 'NATO puppets.' We pulled the transcript with Whisper, extracted the claims with GPT-4o, and matched them against EUvsDisinfo and EDMO."*

> [Scroll the drawer to the EDMO matches section.]
> *"Three EDMO / EUvsDisinfo cases match — including one from Funky Citizens, the Romanian fact-checker, similarity 0.52."*

> [Scroll to DSA TDB.]
> *"And here's the wow signal. **TikTok's own DSA Transparency Database filings show it has acted 124,583 times on the same decision ground — `ELECTORAL_INTEGRITY_RO`.** That number is not our opinion. That's TikTok admitting in its own DSA submissions that it knows this category of content is risky. So when we see this specific item still live with 2.3 million views, that's a credible Article 34-35 systemic-risk indicator. We don't have to convince anyone the platform should care — they already told us they do."*

> [Close drawer. Click on the Doppelgänger PL card.]
> *"And here's what we get when the same narrative reproduces across languages. This Polish video in the Doppelgänger campaign — and three others in French, German, and Italian — fire the **DSA Article 26 cross-language coordinated-spread indicator**. Three accounts, four languages, one fabricated story about Poland being dragged into war. This is the pattern Meta's own Adversarial Threat Reports document, and we surface it in real time."*

## Act 3 — *the artifact judges keep* (90s)

> Click "Generate parliamentary briefing".

> *"Press one button. Out comes an EU-styled briefing — executive summary, factual findings citing severity scores, the specific articles with EUR-Lex links, and the evidence pack. This is what a parliamentary aide would put on an MEP's desk on Monday morning."*

> [Scroll to disclaimer.]
> *"Crucially, the disclaimer is hard-coded — every output of the system carries this. We are not a deepfake detector. We are not a disinformation classifier. We do not classify content as AI-generated. We **audit whether platforms applied the labels and mitigations the law already requires**. The August 2nd 2026 AI Act Article 50 enforcement deadline is in 109 days. National regulators and parliamentary offices need this tool now."*

## Close — *what makes us different* (30s)

> *"Three things make Narrative Radar a winning entry for Topic C:*

> *1. We are the only tool that combines short-form video monitoring, automated DSA + AI Act compliance-gap detection, and a parliamentary-staff-facing briefing generator. Existing tools are split between detection (Logically, NewsGuard, DeepFake-O-Meter) and policy databases (EDMO, EUvsDisinfo). We bridge them.*

> *2. Our wow signal — DSA Transparency Database cross-reference — is grounded in the platforms' own admissions. That makes it legally defensible in a way no competitor's tool is.*

> *3. Restraint is our differentiator. We do not classify content. We do not file complaints. Every output is qualified, cited, and human-gated. Read our `GOVERNANCE.md` and `MODEL_CARD.md` — that's the policy layer the brief asked for."*

> *"Thank you."*

---

## Judge Q&A — prepared answers

**Q. Is this a deepfake detector?**

> No. Detection is a different, harder problem served by Hive, Reality Defender, TrueMedia, DeepFake-O-Meter. We audit whether platforms applied the AI Act-required disclosure label. The Hive likelihood field shown in our drawer is metadata only — it never gates a compliance gap on its own.

**Q. Aren't you just classifying content?**

> No. Every match in our system points to a determination already made by an accredited EDMO-network fact-checker or by EUvsDisinfo. We compose third-party determinations into a structured briefing. We never make an original truth call.

**Q. What's the false-positive rate?**

> Hackathon-scope: we have not run a formal precision-recall study. The architecture mitigates false-positives via two design choices: (a) the Art. 34-35 indicator only fires when the platform itself has flagged similar content as risky in its DSA TDB filings, which is a strong external signal; (b) low-confidence languages (`ru/uk/be/zh/bg/sr/ro`) trigger a mandatory "human review required" warning. Production deployment requires offline evaluation against held-out EDMO cases.

**Q. How does this differ from EDMO?**

> EDMO is a network of fact-checking organisations. They produce determinations. We do not replace them — we *amplify* their output into political offices that don't have the technical capacity to query their corpora directly. We send EDMO traffic; we don't compete with EDMO.

**Q. How does this differ from Logically / NewsGuard / Blackbird?**

> Those are commercial, closed-source, and analyst-facing. We are open-source, parliamentary-aide-facing, and explicitly scoped to platform-accountability rather than content-detection. Different product, different audience, different licensing.

**Q. Could a government use this to suppress opposition?**

> The system is designed to make this hard: every output points to an external EDMO determination (so the government cannot use Narrative Radar to assert something is false unless an accredited fact-checker has already done so), every gap requires the platform's own DSA filings to corroborate, every briefing carries a hard-coded disclaimer, and our governance framework explicitly prohibits using the system to pre-screen named individuals or build dossiers. See `GOVERNANCE.md`.

**Q. What if the EDMO corpus is biased?**

> EDMO is the EU's officially recognised co-ordination mechanism for fact-checking, regulated under specific transparency requirements. If the EU's official fact-check infrastructure is biased, that's a legitimate concern — but it's a concern about EU institutional design, not about Narrative Radar. We surface what EDMO publishes; we don't filter or rewrite it.

**Q. What's the pilot path?**

> Single member-state parliamentary office, single tenant, single electoral cycle, external audit at end of cycle. Romania is the natural anchor given the 2024 case. See `DEPLOYMENT.md` § Pilot deployment plan.

**Q. Why would a platform care?**

> They wouldn't, until the briefings start landing on the EC's desk under DSA Article 67. Then they care a lot. We don't auto-file — humans do — but we make the evidence pack 80% of the way ready.
