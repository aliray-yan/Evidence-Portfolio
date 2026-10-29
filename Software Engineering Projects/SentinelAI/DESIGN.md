---
name: SentinelAI
description: Evidence-centered review with traceable sources and human oversight.
colors:
  navigation: "#10232d"
  canvas: "#f4f7f8"
  surface: "#fff"
  text: "#20343d"
  muted: "#61717a"
  supporting-text: "#5d727c"
  border: "#dce4e7"
  input-border: "#cbd7dc"
  focus: "#299e95"
  accent: "#087b73"
  accent-hover: "#06665f"
  danger: "#b42334"
  danger-hover: "#951c2a"
  warning: "#9a620a"
  nav-text: "#b9cbd1"
  nav-active: "#1c4548"
  nav-active-text: "#a9e8db"
  secondary-text: "#344d58"
  secondary-hover: "#edf3f4"
  citation-bg: "#eaf5f0"
  citation-text: "#277b6b"
  timestamp-bg: "#eaf5f1"
  timestamp-text: "#216a60"
  transcript-active: "#f0f8f5"
  risk-normal-text: "#45656d"
  risk-normal-bg: "#edf3f5"
  risk-low-text: "#286c5c"
  risk-low-bg: "#eaf5ef"
  risk-ambiguous-text: "#8d5a0c"
  risk-ambiguous-bg: "#fff4df"
  risk-high-text: "#a2581d"
  risk-high-bg: "#fff0e5"
  risk-emergency-text: "#a6293c"
  risk-emergency-bg: "#fcebef"
  risk-unassessed-text: "#5b6475"
  risk-unassessed-bg: "#eef0f5"
typography:
  headline:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  subheading:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  supporting:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
  citation:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  identifier:
    fontFamily: "Consolas, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  timecode:
    fontFamily: "Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: normal
  metric:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-1px"
  score:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1.5px"
rounded:
  tag: "3px"
  status: "4px"
  badge: "5px"
  navigation: "7px"
  control: "8px"
  menu: "9px"
  upload: "10px"
  panel: "12px"
  dialog: "14px"
spacing:
  compact: "4px"
  inline: "8px"
  control: "12px"
  group: "16px"
  inset: "20px"
  evidence-gap: "22px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 16px"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  nav-item:
    textColor: "{colors.nav-text}"
    rounded: "{rounded.navigation}"
    padding: "11px 14px"
  nav-item-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.nav-active-text}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  risk-badge:
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  source-label:
    textColor: "{colors.supporting-text}"
    rounded: "{rounded.tag}"
    padding: "1px 5px"
  evidence-citation:
    backgroundColor: "{colors.citation-bg}"
    textColor: "{colors.citation-text}"
    typography: "{typography.citation}"
    rounded: "{rounded.control}"
    padding: "6px 9px"
  timestamp:
    backgroundColor: "{colors.timestamp-bg}"
    textColor: "{colors.timestamp-text}"
    typography: "{typography.timecode}"
    rounded: "{rounded.status}"
    padding: "5px 6px"
  transcript-row:
    backgroundColor: "{colors.surface}"
    padding: "20px"
  transcript-row-playing:
    backgroundColor: "{colors.transcript-active}"
---

# Design System: SentinelAI

## Overview

**Creative North Star: "The Evidence Catalogue"**

SentinelAI uses an evidence catalogue as its visual reference: a stable navy navigation rail, neutral work surfaces, restrained teal actions, and compact records that keep sources close to interpretations. The user specified this palette and the human-review purpose. “The Evidence Catalogue” names that implemented direction; it is descriptive documentation, not an independently approved visual comp.

The recognizable pattern is timestamped evidence navigation. Transcript rows, event times, and source citations seek the same evidence player; source labels distinguish synthetic material from uploads, while review forms place a written rationale before a recorded human decision. The visual system supports inspection and comparison with familiar controls and limited motion.

This document refreshes provisional files created during the same implementation. It describes the final CSS cascade and components, including their compact exceptions. It is a source-derived design reference, not a claim of complete accessibility conformance or a substitute for rendered verification.

**Key Characteristics:**

- Navy navigation, pale neutral canvas, and bordered white working panels.
- Teal actions, named risk states, and explicit source provenance.
- Compact system typography with monospaced identifiers and timecodes.
- Timestamp navigation, visible uncertainty, and reasoned human review.
- Responsive stacked workspaces with native forms, media controls, and confirmation dialogs.

The current source of visual truth is `src/styles.css`, including the verification refinements after the main media queries. Shared behavior lives in `src/components.tsx`; the shell, investigation, capture, alert, and administration views establish their contexts. Surface mode and composition remain in `.impeccable/surfaces/workspace.md`. There is no approved visual comp.

## Colors

Deep navy and slate establish the workspace, with pale neutral surfaces and restrained semantic accents. Frontmatter values are the normative extracted palette; color names below explain their use.

### Primary

- **Action teal** is used for primary buttons and selected evidence controls. The deeper hover shade changes state without changing meaning.
- **Timestamp teal** and the pale citation fills connect sources to recorded moments. A selected transcript row uses a pale green fill.

### Secondary

- **Uncertainty amber** marks caution and missing or incomplete analysis. The warning primitive exists in the root declarations; actual notice and badge styles use their own observed amber shades.
- **Urgent red** marks destructive controls and urgent safety states. High risk uses an orange family; it remains distinct from emergency red.
- Risk badges retain six named states: Normal, Low Risk, Ambiguous, High Risk, Emergency, and Unassessed. Their separate text and background tokens are retained rather than flattened to one warning color.

### Neutral

- **Navigation navy** anchors the fixed rail and evidence-player background.
- **Canvas gray**, **panel white**, and **line gray** separate the workspace without ambient card shadows.
- **Main slate** is the default text. **Muted slate** remains the root custom property; **supporting slate** is the later contrast refinement applied to many metadata and help-text selectors. These are distinct values in the current cascade.
- The active navigation item uses a dark teal field and pale teal text. Source labels use neutral treatment for Synthetic and a pale green treatment for Uploaded.

**The Source First Rule.** A color state must retain its readable risk name, source label, or action label. Color alone does not communicate provenance or a review outcome.

## Typography

The interface uses the installed Segoe UI stack with Arial and generic sans-serif fallbacks. There are no bundled display or Urdu font assets. Transcript content uses automatic text direction; actual Urdu glyph rendering depends on the host’s available fonts.

The extracted hierarchy is task-oriented: page headline, panel title, subheading, body, label, supporting text, citation, identifier, metric, and score. It is not a uniform modular scale. Paragraphs use a more open line height (1.65); transcript text uses (1.8). Identifiers and score/metric values use tabular numerals.

Page headings start at (28px); investigation headings start at (26px). At the smallest breakpoint, ordinary page headings become (25px), investigation headings (24px), and panel headings (15px). The login story has its own larger heading (43px on wide layouts) and disappears on small screens.

Many metadata labels were raised to (11px), but the interface still contains compact (9–10px) labels. Citations are (12px) at desktop and mobile sizes. Timestamp buttons use (11px) text on desktop and (10px) at the smallest breakpoint. Mobile source labels, table metadata, and transcript introductions use (10px). Do not infer a universal minimum text size from the body or citation token.

## Layout

The shell has a fixed sidebar (234px), a topbar (68px), a contextual environment strip, and a flexible content region with a maximum width of (1840px). Default content padding is (32px). Panels have borders and separate headers; tables stay tabular inside horizontal overflow containers.

The overview uses four metrics and a two-column chart region. Investigation uses a flexible evidence column plus a review rail (318px), with a gap (22px). Capture uses a flexible form plus an explanatory rail (310px), with a gap (24px). Alerts use a flexible queue plus a response rail (345px). Form grids generally use two columns; policy grids may use four or five.

| Width condition | Implemented adaptation |
| --- | --- |
| At least 1500px | Content padding becomes 36px 44px; investigation and capture rails become 350px. |
| At most 1250px | Sidebar becomes 210px; content padding becomes 26px; investigation, capture, and alert rails become 290px, 270px, and 300px. |
| At most 1100px | Global search hides; investigation, capture, and alerts stack. Review panels form two columns; capture guidance forms two columns. Advanced filters and four-column forms become two columns. |
| At most 850px | Sidebar becomes a hidden off-canvas panel, opened by a menu button and dismissible backdrop. Main margin resets; topbar becomes 62px; content padding becomes 26px 22px. |
| At most 620px | Content padding becomes 22px 16px; topbar becomes 58px. Metrics use two columns; charts, forms, review panels, and capture guidance use one column. Investigation tabs become a two-by-two grid. Login uses its form and mobile brand only. |

The spacing vocabulary is centered on compact inline gaps, larger panel insets, and (22–24px) separations. It is not a strict four-pixel grid: existing (7px), (9px), (10px), (18px), and (26px) values serve compact controls and responsive layouts.

## Elevation & Depth

Working panels are flat, separated by borders and pale tonal changes. Elevation is reserved for temporary layers: export menus, confirmation dialogs, and notification toasts. Native video controls retain their browser appearance.

| Layer | Exact shadow |
| --- | --- |
| Export dropdown | `0 10px 28px #15374620` |
| Confirmation dialog | `0 20px 80px #10252c40` |
| Toast | `0 8px 32px #10242b30` |

The modal backdrop uses `#10242b80`; the mobile navigation backdrop uses `#0c263050`. These values and the focus outline are extension data in the JSON sidecar.

**The Flat Workspace Rule.** Keep ordinary evidence and governance panels border-defined; use shadow for the implemented temporary-layer roles.

## Shapes

Controls use gently rounded corners (8px), panels use (12px), and dialogs use (14px). Tags, statuses, and badges use smaller (3–5px) corners so they remain compact within records. Navigation items and icon buttons use (7px). Avatars, source dots, and process markers are circular.

Default panel borders are (1px). Upload has a dashed border, a distinct hover tint, and a focus-within outline. Evidence video is framed at (16:9), contained within its media area; frame thumbnails use a shallow landscape shape. No decorative image assets are part of the interface identity.

## Components

### Buttons and focus

Primary actions use teal; secondary actions use a white field with a slate border; destructive actions use red. Base buttons have a minimum height (40px), compact variants (32px), and icon buttons (34px). At at most 620px, ordinary buttons become (44px), icon buttons (40px), while more-specific compact/filter rules retain smaller density. Navigation links have a minimum height (44px).

Interactive elements use a visible outline (3px) in the focus color with an offset (3px). Search containers use a focus-within outline (2px) with a matching offset. Disabled buttons reduce opacity to (0.5) and use the not-allowed cursor.

Background and border changes take (150ms); the mobile sidebar transition takes (180ms ease-out). Loading skeletons pulse over (1.6s) and spinners rotate over (1.4s). The reduced-motion media rule disables CSS animation and transitions. Timestamp navigation explicitly requests smooth scrolling in JavaScript, so the CSS rule alone does not establish reduced-motion behavior for that call.

### Panels, tables, and fields

Panels have a minimum-width safeguard, a clipped border box, and a heading row with title and optional action. Default heading padding is (18px 22px). Body padding is component-specific, commonly (20–24px). Tables use semantic headers, row hover tint, source metadata, and horizontal scrolling on narrow layouts.

Fields use a white fill, a thin input border, control corners, and inset padding (10px 12px). Labels are visible; textarea height starts at (84px) and can be resized vertically. Forms retain native required/type/length validation. Error panels carry an alert role and an optional Retry action; empty states provide a brief explanation and optional next action; skeletons carry a loading status.

### Risk, status, and provenance

Risk badges combine a dot, a named state, and an optional score. Status chips use wording derived from workflow state. The final shared status selector uses supporting slate for text across most state fills; do not assume the earlier per-state text colors survive the cascade.

Synthetic and Uploaded source labels are separate from risk and workflow status. The environment strip identifies the local demo or local instance, while scenario notices explain scripted evidence. On mobile, the per-segment source column hides, but transcript source context and the case-level source label remain.

### Timestamped evidence navigation

Selecting a transcript row, event timestamp, source citation, or frame seeks the shared player. Playback position highlights the current transcript row. Citations resolve persisted event, segment, or evidence identifiers to a start time. When media is absent, the interaction produces an unavailable-media notification rather than inventing playback.

Citation buttons use (12px) text and a minimum height (32px), increasing to (44px) at at most 620px. Event timestamp buttons also receive the mobile minimum height (44px); transcript timecodes are spans inside a larger row button. Evidence tabs expose tab/tabpanel semantics and support Arrow Left, Arrow Right, Home, and End. The other tab-like view switches use ordinary buttons and are not documented as the same tab implementation.

### Human review and confirmation

The review panel pairs an action with a rationale, then opens a native modal dialog before saving. Decision history keeps the actor, action, reason, and time near the evidence. Available actions depend on role and case state. Confirmation uses `showModal()`, native modal focus behavior, a cancel handler, and disabled controls while saving. Some administration and retention actions currently request reasons through `window.prompt`; they are not the custom confirmation-dialog pattern.

Toasts use a status role, a dismiss button, and a timeout (5500ms). Export uses a native details/summary disclosure. Capture retains a visible consent step, file or camera choice, upload progress, cancellation, and explicit camera/location failure messages. Signature patterns are functional controls; the sidecar’s snippets demonstrate their appearance without reproducing application logic.

## Do's and Don'ts

### Do

- Do preserve the user’s navy/slate, neutral, teal, amber, and red palette.
- Do keep risk names and source labels visible alongside color.
- Do make evidence citations seek the persisted source timestamp and preserve the unavailable-media message.
- Do keep human rationale, confirmation, and recorded history together in review workflows.
- Do retain the implemented focus treatment, native form semantics, and reduced-motion rules when adding components.
- Do check the final CSS cascade at desktop and mobile sizes before extending density rules.

### Don't

- Don’t present synthetic scripts, rule interpretations, or missing analysis as real model findings.
- Don’t style a risk score as a determination of guilt or as an external emergency dispatch.
- Don’t assume every supporting label is 12px or every control has a 44px target; the current interface contains documented density exceptions.
- Don’t replace the system font stack with a display font or add decorative motion to routine evidence work.
- Don’t turn generated preview tonal ramps into application tokens without a deliberate implementation change.
