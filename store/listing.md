# Chrome Web Store listing

Paste-ready copy for the dashboard. Assets in this folder are already at exact
required dimensions — the store rejects anything even a pixel off.

| Asset | File | Required |
| --- | --- | --- |
| Store icon | `../icons/128.png` | 128x128 PNG |
| Screenshot | `promo-1280x800.jpg`, `screenshot-annotated-1280x800.jpg`, `screenshot-1280x800.jpg` | 1280x800 or 640x400, JPEG or 24-bit PNG, no alpha |
| Small promo tile | `promo-440x280.jpg` | 440x280 |
| Marquee promo tile | `promo-1400x560.jpg` | 1400x560 |

Up to five screenshots are allowed, and at least one is required. Upload in this
order:

1. `promo-1280x800.jpg` — title card
2. `screenshot-annotated-1280x800.jpg` — arrows pointing at all three injection
   points, which is the fastest way for someone to understand what they get
3. `screenshot-1280x800.jpg` — the same page unannotated

The 440x280 and 1400x560 tiles are optional; they only matter if Google ever
features the extension.

## Store listing tab

**Name**

```
Open in GitHub for Graphite
```

**Summary** (max 132 characters — this is 73)

```
One click from a Graphite pull request to the same pull request on GitHub.
```

**Description**

```
Graphite's own extension adds a "View in Graphite" link to GitHub pull request pages. Nothing does the reverse, so when you're reviewing in Graphite and need GitHub for a check's raw logs, a merge queue detail, or a permalink to paste somewhere, you end up retyping the URL by hand.

This adds that missing direction. On any Graphite pull request page you get three links to the same pull request on GitHub:

• Inline, beside the repository and PR number above the title
• A floating pill in the bottom-left corner, with a dismiss button
• A small GitHub icon on each row of the stack, so you can jump straight to a sibling PR on GitHub without opening it in Graphite first

All three are ordinary links, so cmd-click or middle-click opens a new tab exactly as you'd expect.

HOW IT WORKS

Graphite's pull request path is GitHub's own path behind a /github prefix, so the mapping is a plain string rewrite. There is no API call, no sign-in, no network request of any kind, and nothing is stored. Both of Graphite's URL shapes are handled, including the one its internal links and stack rows use, so the links keep working as you navigate around a stack.

PRIVACY

No data collection of any kind. No analytics, no telemetry, no network requests, no storage. The extension runs only on app.graphite.com and app.graphite.dev, and does nothing anywhere else.

Open source: https://github.com/leonardourci/graphite-to-github
```

**Video** (optional field, above the screenshots)

```
https://www.youtube.com/watch?v=PnYBxjkHfYM
```

Must be Public or Unlisted. A Private video renders as unavailable on the
listing.

**Website**

```
https://leonardourci.github.io/graphite-to-github/
```

Verified in Google Search Console under the same account, so the store can show
it as a verified website rather than a bare link. Keep
`docs/googled30eb243e93eda57.html` in place — verification is re-checked, and
deleting the file silently unverifies the property.

**Category**: Developer Tools
**Language**: English

## Privacy tab

**Single purpose**

```
Adds links from a Graphite pull request page to the same pull request on GitHub.
```

**Host permission justification** (`app.graphite.com`, `app.graphite.dev`)

```
The extension's content script runs only on Graphite's pull request pages. It reads the current page URL to derive the equivalent GitHub pull request URL, and inserts links into the page. It makes no network requests, stores no data, and does not run on any other site.
```

**Remote code**: no.

**Data usage**: leave every one of the nine categories unchecked, then tick all
three compliance declarations. Unchecked declarations fail the publish even when
nothing is declared.

**Privacy policy URL** (required field, regardless of what is declared)

```
https://leonardourci.github.io/graphite-to-github/privacy.html
```

## Distribution tab

Public, all regions, free.
