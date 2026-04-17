# DSA Article 24(5) Complaint — Template

**Use this template when, after legal review, a parliamentary or regulatory office wishes to file a complaint with the European Commission or a national Digital Services Coordinator (DSC) regarding potential platform non-compliance evidenced by a Narrative Radar briefing.**

> **Important.** This template does not authorise or instruct the filing of any complaint. Filing a DSA complaint is a formal act with legal consequences for both the filer and the platform. It must be reviewed by qualified legal counsel and signed by an authorised representative of the operating institution. Narrative Radar's outputs are *indicators*, not legal determinations.

---

## Header

```
To:        [European Commission, DG CONNECT, Digital Services Unit]
           OR [Member-state Digital Services Coordinator, address]
From:      [Operating institution legal representative]
Date:      [YYYY-MM-DD]
Reference: [Internal reference number]
Subject:   Complaint pursuant to Article 24(5) of Regulation (EU) 2022/2065
           regarding potential systemic-risk and disclosure-labelling failures
           by [Platform name] in connection with [narrative cluster].
```

## §1 — Summary

> *One paragraph. Describe the platform, the affected member-state(s), the narrative cluster, and the nature of the alleged compliance gap. Reference the specific DSA / AI Act articles involved.*

## §2 — Background and standing

> *State the operating institution, its public-interest mandate, and the lawful basis on which it has gathered the evidence presented in this complaint. Confirm that Narrative Radar outputs are indicators which have been reviewed by qualified legal counsel before this filing.*

## §3 — Evidence

For each video item being relied upon:

```
Item:               [Video ID]
Platform:           [TikTok / Meta / X / …]
URL:                [Full URL — verified live as of [date]]
Author handle:      [@handle]
Reach (views):      [number — verified via [yt-dlp / platform API] on [date]]
Upload date:        [YYYY-MM-DD]
Language:           [ISO 639-1]
Constituency:       [member state]

Extracted claims (machine-extracted, human-reviewed):
  1. "[claim text]"
  2. "[claim text]"

Documented fact-check matches (third-party):
  - [Title], [organisation], [URL], similarity [0.xx]
  - [Title], [organisation], [URL], similarity [0.xx]

EU DSA Transparency Database cross-reference:
  - [Decision ground], [count] actions reported by [platform] under same ground
    in [time window]. Source: https://transparency.dsa.ec.europa.eu/...

Indicators raised by Narrative Radar:
  - [Article ref] — [severity] — [description]
```

Repeat for each item. Attach the Narrative Radar briefing PDF as **Annex A**.

## §4 — Alleged compliance gap

> *Set out the legal argument. Two model clauses are provided below. Adapt or replace.*

### Model clause — DSA Articles 34–35 (systemic risk)

The Articles 34–35 indicators raised in this complaint reflect a pattern in which:
(a) the content reproduces narratives that an EDMO-affiliated fact-checking organisation has independently determined to be false;
(b) the platform's own DSA Transparency Database submissions evidence that it has identified and acted on similar content elsewhere;
(c) the specific items under complaint remain accessible to the public at the time of this filing, with the reach figures reported in §3.

Taken together, these elements raise a credible question whether the platform has carried out the systemic-risk assessment and adopted reasonable, proportionate, and effective mitigation measures required by Article 35(1).

### Model clause — AI Act Article 50 (disclosure labelling)

The Article 50 indicator raised in this complaint is an *audit of the platform's disclosure-labelling*, not a determination by Narrative Radar that the content is AI-generated. The complaint relies on the platform's failure to surface the legally required machine-readable label notwithstanding the presence of [uploader-declared indicators / hashtag indicators / a third-party synthetic-media-likelihood signal at or above the configured threshold]. Article 50 of Regulation (EU) 2024/1689 is enforceable from 2 August 2026.

## §5 — Requested action

> *Set out what the operating institution requests. Examples: that the addressee open a preliminary inquiry under DSA Article 67; that the addressee refer the matter to the Board for Digital Services; that the platform be invited to submit a substantive reply; that a copy be transmitted to the relevant national DSC.*

## §6 — Disclaimer and limitations

This complaint has been prepared with the assistance of Narrative Radar, an indicator-generation pipeline. The findings reproduced here are indicators for investigation only and do not, in themselves, constitute a legal determination of non-compliance. They have been reviewed by [name of legal counsel] of [institution] before this filing. Operating documentation for the pipeline (model card, governance framework, deployment configuration) is available on request as **Annexes B–D**.

## §7 — Signature

```
[Authorised representative]
[Title]
[Operating institution]
[Date and place]
```

---

## Annexes (suggested)

- **Annex A.** Narrative Radar briefing PDF (auto-generated from the per-video evidence pack).
- **Annex B.** Narrative Radar Model Card.
- **Annex C.** Narrative Radar Governance Framework.
- **Annex D.** Audit log entries documenting ingestion, briefing generation, and counsel review timestamps for each item in §3.
