# Open in GitHub for Graphite

[![test](https://github.com/leonardourci/graphite-to-github/actions/workflows/test.yml/badge.svg)](https://github.com/leonardourci/graphite-to-github/actions/workflows/test.yml)

Graphite's own extension adds a "View in Graphite" link to GitHub PR pages. Nothing does the reverse, so this does: on a Graphite pull request, it adds links to the same pull request on GitHub.

Three of them:

- **Inline**, beside the `repo #1234` breadcrumb above the PR title.
- **A floating pill**, bottom-left, with a dismiss button.
- **A GitHub icon on each stack row**, so you can jump to a sibling PR on GitHub without opening it in Graphite first.

All three are real `<a href>` elements, so cmd-click and middle-click open a new tab the way you'd expect.

Hovering any of them shows the tooltip, which is the whole reason this exists.

## Install

From source, until the Chrome Web Store listing is live:

1. `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked**, and pick this folder

## How it works

Graphite's PR path is GitHub's path with a `/github` prefix, so the whole thing is a string rewrite — no API, no auth, no network requests, no stored data.

Graphite serves two PR path shapes and both are handled:

| Shape | Where it appears |
| --- | --- |
| `/github/OWNER/REPO/pull/8730` | address bar, comment permalinks |
| `/github/pr/OWNER/REPO/8730/some-title-slug` | stack row links |

Both map to `https://github.com/OWNER/REPO/pull/8730`.

Graphite is a React SPA that changes URLs without a page load and re-renders panels constantly, so injection runs through one idempotent `sync()` driven by a debounced `MutationObserver`. Graphite also ships empty class attributes (CSS-in-JS) and almost no `data-testid`, so anchors are semantic: the breadcrumb is matched by its `repo #1234` text cross-checked against the PR number in the URL, and stack rows by their href shape within the stack panel.

Each of the three injections is independent. If a Graphite redesign moves the breadcrumb or the stack panel, those quietly stop appearing and the floating pill — which uses no Graphite selectors at all — keeps working.

The in-page glyphs are Octicons (`mark-github`, `link-external`), drawn in `currentColor` so they take Graphite's own text colour in either theme.

## Test

```
npm test
```

Runs in CI on every push and pull request. Covers the URL mapping, which is where all the branching logic lives. The DOM injection is verified by hand: load a PR page, a multi-PR stack, and a non-PR Graphite page, then navigate between them and confirm the links appear, retarget, and get cleaned up.

## Icons

`icons/icon.svg` is the source. Regenerate the PNGs with headless Chrome (no image tooling required):

```sh
# Resolve Chrome: PATH first (Linux), then the macOS bundle, which is never on
# PATH. Set CHROME=... yourself for Chromium, Beta/Canary, or ~/Applications.
CHROME="${CHROME:-$(command -v google-chrome || command -v google-chrome-stable \
  || command -v chromium || echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")}"

for s in 16 32 48 128; do
  { printf '<style>html,body{margin:0;overflow:hidden}svg{display:block;width:%spx;height:%spx}</style>' "$s" "$s"; cat icons/icon.svg; } > "${TMPDIR:-/tmp}/wrap-$s.html"
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --screenshot="icons/$s.png" --window-size=$s,$s "${TMPDIR:-/tmp}/wrap-$s.html"
done
```

Absolute pixel sizing matters: old headless Chrome lays out at 800px regardless of `--window-size` and then crops, so viewport units (`100vw`) render the top-left corner of a giant icon.

The landing page's favicon is a copy of the same source, so refresh it too:

```sh
cp icons/icon.svg docs/favicon.svg
{ printf '<style>html,body{margin:0;overflow:hidden}svg{display:block;width:32px;height:32px}</style>'; cat icons/icon.svg; } > "${TMPDIR:-/tmp}/fav.html"
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="docs/favicon-32.png" --window-size=32,32 "${TMPDIR:-/tmp}/fav.html"
```

Read the comment at the top of `icons/icon.svg` before redrawing the artwork — the current design is a set of deliberate constraints, not an accident.

## Privacy

No permissions beyond the content-script host match, no network requests, no storage, no data collection of any kind. The pill's dismissal is in-memory and comes back on reload.

Full policy: <https://leonardourci.github.io/graphite-to-github/privacy.html>

## Known limitations

- `github.com` is hardcoded; GitHub Enterprise hosts aren't supported. Supporting them means a configurable host, which drags in an options page and a `storage` permission.
- The stack-row chip sits at the row's right end, not next to the title. Stack rows are full-width flex elements with no horizontal slack, so `content.js` extends the row's right padding to reserve a slot. Hugging the title looks better on short titles but breaks on long ones: they're ellipsis-truncated, so the text box runs past its visible end and the chip lands under the row's metadata.
- The row chip is icon-only. The reserved slot is 28px, which fits the GitHub mark but not the redirect arrow as well; both appear on the inline link and the pill.

## Links

- Website and demo: <https://leonardourci.github.io/graphite-to-github/>
- Packaging and release: [`store/README.md`](store/README.md)

MIT licensed. Not affiliated with Graphite or GitHub.
