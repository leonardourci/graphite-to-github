# Packaging and release

Maintainer notes: everything needed to build the package and drive the Chrome Web
Store listing. Contributors don't need any of this — see the root `README.md`.

`listing.md` holds the listing copy and says which asset goes in which field.

The store validates dimensions exactly — a 1274x799 screenshot is rejected with
nothing but "incorrect image size", so don't hand it a raw window capture.

## Building the package

```sh
zip -r dist.zip manifest.json url.js content.js style.css icons -x 'icons/icon.svg'
```

Only what the extension runs: no tests, no docs, no store assets, no SVG source.
`dist.zip` is gitignored.

## Publishing

The first submission is manual. The Web Store API publishes a *package*, but
can't create the store item or set listing metadata, so the extension has to
exist in the dashboard first — which needs a Google account, the one-time $5
developer registration, and a few days of review.

Updates after that:

```sh
npx chrome-webstore-upload-cli upload --source dist.zip --extension-id <id> --auto-publish
```

Bump `version` in `manifest.json` first; the store rejects a re-upload of an
existing version.

One-time auth setup for the CLI: a Google Cloud project with the Chrome Web Store
API enabled, a Desktop-app OAuth client, and one consent flow to mint a refresh
token (`npx chrome-webstore-upload-keys` walks it). The client id, client secret,
and refresh token are passed as env vars from a gitignored `.env`. They must never
enter the repo or the published zip.

## Icon artwork and the Octocat

The extension icon includes GitHub's Octocat. GitHub's logo policy asks that their
mark not be used in an app icon or as part of another product's branding, and
borrowed branding is a documented Web Store rejection reason. Accepted knowingly
after two original-cat drafts failed to read as cats.

If a reviewer objects, swap the `<g>` in `../icons/icon.svg` for original artwork,
re-run the icon and favicon commands in the root README, rebuild `dist.zip`, and
re-upload. No other file changes.

Using the mark *in the page* to label a link to GitHub is ordinary nominative use
and isn't the exposed part.

## Rebuilding the promo tiles

All three tiles are generated from `../icons/icon.svg`, so they stay in sync when
the icon changes. Sources are the `.html` files here. `promo-1280x800.jpg` is a
title card sized to the screenshot slot, not a promo-tile slot of its own.

```sh
# Resolve Chrome: PATH first (Linux), then the macOS bundle, which is never on
# PATH. Set CHROME=... yourself for Chromium, Beta/Canary, or ~/Applications.
CHROME="${CHROME:-$(command -v google-chrome || command -v google-chrome-stable \
  || command -v chromium || echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")}"

for s in 440x280 1280x800 1400x560; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --screenshot="${TMPDIR:-/tmp}/promo-$s.png" --window-size="${s%x*},${s#*x}" "store/promo-$s.html"
  sips -s format jpeg -s formatOptions 95 "${TMPDIR:-/tmp}/promo-$s.png" --out "store/promo-$s.jpg"
done
```

`sips` is macOS-only. On Linux, swap it for `magick promo-$s.png -quality 95 promo-$s.jpg`.

The tile sizes are absolute px in the HTML rather than viewport units, because
old headless Chrome lays out at 800px wide regardless of `--window-size` and then
crops — `100vw` gets you the top-left corner of a giant page.

## Reshooting the screenshot

Capture a Graphite PR page with the extension loaded, then pad it to exactly
1280x800:

```sh
sips --padToHeightWidth 800 1280 --padColor FFFFFF input.jpg --out screenshot-1280x800.jpg
```

Padding rather than scaling keeps the text crisp; a few px of white at the edges
is invisible against the page.

Use a public repository. Store listings are public and indexed permanently, so a
screenshot of a private repo's PR leaks its name, branch names, reviewers, and
description text. The stack in this repo's own PRs is a safe subject.
