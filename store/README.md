# Store assets

Everything the Chrome Web Store dashboard asks for. See `listing.md` for the
copy and which file goes in which field.

The store validates dimensions exactly — a 1274x799 screenshot is rejected with
nothing but "incorrect image size", so don't hand it a raw window capture.

## Rebuilding the promo tiles

All three tiles are generated from `../icons/icon.svg`, so they stay in sync when
the icon changes. Sources are the `.html` files here. `promo-1280x800.jpg` is a
title card sized to the screenshot slot, not a promo-tile slot of its own.

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for s in 440x280 1280x800 1400x560; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --screenshot="/tmp/promo-$s.png" --window-size="${s%x*},${s#*x}" "store/promo-$s.html"
  sips -s format jpeg -s formatOptions 95 "/tmp/promo-$s.png" --out "store/promo-$s.jpg"
done
```

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
