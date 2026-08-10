/**
 * @file Injects links from a Graphite PR page to the same PR on GitHub.
 *
 * Graphite is a React SPA: the URL changes without a page load and panels
 * re-render in ways that wipe injected nodes. So there is one idempotent entry
 * point, {@link sync}, driven by a debounced `MutationObserver`.
 *
 * Graphite ships empty class attributes (CSS-in-JS) and only a handful of
 * `data-testid` values, none in the header. Anchoring is therefore semantic:
 * the breadcrumb is found by its `repo #1234` text cross-checked against the PR
 * number in the URL, and stack rows by their href shape within the stack panel.
 */

/** Attribute stamped on every injected node, for idempotence and cleanup. */
const MARKER = "data-gh2gt";

/** Visible label, and the accessible name where the chip is icon-only. */
const LABEL = "View on GitHub";

/** The entire reason this extension exists. */
const TOOLTIP = "ah, shit, here we go again — back to github";

/**
 * Whether the floating pill has been dismissed.
 *
 * In-memory only: the pill returns on reload. The inline link is always
 * present, so persisting this would buy nothing but a `storage` permission.
 *
 * @type {boolean}
 */
let pillDismissed = false;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Octicons `mark-github` and `link-external`, both on a 16x16 grid.
 *
 * Using GitHub's mark to label a link to GitHub is ordinary nominative use.
 *
 * @type {Record<"github" | "external", string>}
 */
const ICON_PATHS = {
  github:
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z",
  external:
    "M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5A1.75 1.75 0 0 1 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z",
};

/**
 * Builds an icon element, filled with `currentColor` so it takes whatever text
 * colour Graphite computed for that spot -- correct in both themes, no media
 * query and no theme detection.
 *
 * Uses `createElementNS` rather than `innerHTML`, which a Trusted Types CSP
 * would block.
 *
 * @param {"github" | "external"} name
 * @param {number} size Rendered width and height in px.
 * @returns {SVGSVGElement}
 */
function makeIcon(name, size) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

/**
 * Builds one of the injected links.
 *
 * A real `<a href>` rather than a click handler, so cmd-click and middle-click
 * open a new tab without any code.
 *
 * @param {string} className One of `gh2gt-inline`, `gh2gt-pill-link`,
 *   `gh2gt-row`. Styling and lookup both key off it.
 * @param {string} href Target GitHub URL.
 * @param {{withText: boolean}} options `withText: false` yields an icon-only
 *   chip for the narrow stack-row slot, which keeps `LABEL` as its
 *   `aria-label`.
 * @returns {HTMLAnchorElement}
 */
function makeLink(className, href, { withText }) {
  const a = document.createElement("a");
  a.setAttribute(MARKER, "");
  a.className = className;
  a.href = href;
  a.title = TOOLTIP;
  a.rel = "noopener";
  a.setAttribute("aria-label", LABEL);

  a.append(makeIcon("github", withText ? 14 : 15));
  if (withText) {
    a.append(document.createTextNode(LABEL), makeIcon("external", 11));
  }
  return a;
}

/**
 * Attempts before giving up on finding the breadcrumb, per target.
 *
 * Generous because a cold Graphite load can take well over 10s to hydrate and
 * mutation batches fire throughout, so a tight cap burns its attempts before
 * the breadcrumb exists. 100 scans total is still nothing next to one every
 * 300ms forever.
 */
const MAX_INLINE_ATTEMPTS = 100;

let inlineTarget = null;
let inlineMisses = 0;

/**
 * Injects the inline link beside the `medbillai #8730` breadcrumb above the PR
 * title.
 *
 * The cheap check comes first: finding the breadcrumb means scanning every
 * `span` on the page, and a PR page with its diffs open has thousands. While
 * the link is present -- the normal case, on every one of Graphite's frequent
 * re-renders -- this costs one selector match and returns. An earlier version
 * scanned unconditionally and stalled the renderer outright.
 *
 * Silently does nothing if the breadcrumb can't be found; the pill covers it.
 *
 * @param {string} target GitHub URL for the current PR.
 * @param {string} number PR number, used to confirm the breadcrumb belongs to
 *   this PR rather than matching some other `repo #123` text.
 * @returns {void}
 */
function syncInline(target, number) {
  const existing = document.querySelector("a.gh2gt-inline");
  if (existing) {
    existing.href = target;
    inlineMisses = 0;
    return;
  }

  if (inlineTarget !== target) {
    inlineTarget = target;
    inlineMisses = 0;
  }
  if (inlineMisses >= MAX_INLINE_ATTEMPTS) return;
  inlineMisses++;

  const pattern = new RegExp(`^[\\w.-]+\\s*#${number}$`);
  const crumb = [...document.querySelectorAll("span")].find(
    (el) => el.children.length === 0 && pattern.test(el.textContent.trim()),
  );
  if (!crumb) return;

  crumb.after(makeLink("gh2gt-inline", target, { withText: true }));
  inlineMisses = 0;
}

/**
 * Injects the floating pill, bottom-left.
 *
 * Uses no Graphite selectors at all, so it survives a redesign that breaks the
 * other two injections. Confirmed in testing on a load where Graphite rendered
 * nothing but its left nav rail.
 *
 * @param {string} target GitHub URL for the current PR.
 * @returns {void}
 */
function syncPill(target) {
  const existing = document.querySelector(".gh2gt-pill");

  if (pillDismissed) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.querySelector("a").href = target;
    return;
  }

  const pill = document.createElement("div");
  pill.className = "gh2gt-pill";
  pill.setAttribute(MARKER, "");

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "gh2gt-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => {
    pillDismissed = true;
    pill.remove();
  });

  pill.append(dismiss, makeLink("gh2gt-pill-link", target, { withText: true }));
  document.body.append(pill);
}

/** Pixels of right padding borrowed from a stack row to seat its chip. */
const CHIP_SLOT = 28;

/**
 * Injects one chip per PR row in the stack panel, so a sibling PR can be opened
 * on GitHub without loading it in Graphite first.
 *
 * Scoped to the panel deliberately: comment permalinks share the canonical PR
 * URL shape, so href alone would also match every "2d ago" timestamp.
 *
 * The row layout dictates the rest. Every row is a sibling inside one block
 * container, and each row is a full-width flex whose content already reaches its
 * own right edge. So a chip in normal flow becomes its own row, and absolute
 * positioning alone lands it on top of the row's timestamp -- hence the borrowed
 * padding. Hugging the end of the title would read better on short titles, but
 * long ones are ellipsis-truncated, so their text box runs past the visible end
 * and the chip ends up under the metadata anyway.
 *
 * @returns {void}
 */
function syncStack() {
  const heading = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.trim().startsWith("Stack"),
  );
  const panel = heading?.parentElement?.parentElement;
  if (!panel) return;

  for (const row of panel.querySelectorAll("a")) {
    const target = graphiteToGithub(row.href);
    if (!target) continue;

    // Graphite's own padding is measured once per node and kept, so re-running
    // cannot stack increments. A re-render replaces the node, which resets it.
    if (row.dataset.gh2gtPad === undefined) {
      row.dataset.gh2gtPad = Number.parseFloat(getComputedStyle(row).paddingRight) || 0;
    }
    row.style.paddingRight = `${Number(row.dataset.gh2gtPad) + CHIP_SLOT}px`;

    // Rows share a parent, so existence is checked per row via the immediate
    // sibling -- a parent-wide query would inject one chip for a whole stack.
    row.parentElement.classList.add("gh2gt-rowhost");
    let chip = row.nextElementSibling;
    if (!chip?.classList.contains("gh2gt-row")) {
      // An <a> cannot nest, so the chip is the row's sibling, not its child.
      chip = makeLink("gh2gt-row", target, { withText: false });
      row.after(chip);
    }
    chip.href = target;
    chip.style.top = `${row.offsetTop + row.offsetHeight / 2}px`;
  }
}

/**
 * Brings the page in line with the current URL: injects what's missing,
 * retargets what's stale, removes everything when the page is no longer a PR.
 *
 * Idempotent, which is what makes it safe to call on every mutation batch.
 * Each injection is independently guarded, so a Graphite redesign that breaks
 * the breadcrumb or the stack panel can't take the pill down with it.
 *
 * @returns {void}
 */
function sync() {
  const target = graphiteToGithub(location.href);

  if (!target) {
    for (const node of document.querySelectorAll(`[${MARKER}]`)) node.remove();
    for (const host of document.querySelectorAll(".gh2gt-rowhost")) host.classList.remove("gh2gt-rowhost");
    // Hand back the padding borrowed for the chip slot.
    for (const row of document.querySelectorAll("[data-gh2gt-pad]")) {
      row.style.paddingRight = `${row.dataset.gh2gtPad}px`;
      delete row.dataset.gh2gtPad;
    }
    return;
  }

  const number = target.slice(target.lastIndexOf("/") + 1);

  for (const step of [() => syncInline(target, number), () => syncPill(target), syncStack]) {
    try {
      step();
    } catch {
      // Anchor moved or vanished. Nothing to do until the next mutation.
    }
  }
}

let pending;

/**
 * Debounced {@link sync}.
 *
 * 300ms is generous on purpose: Graphite mutates the page continuously (live
 * check results, comment polling), and a link appearing a moment later is
 * unnoticeable next to the cost of running on every batch. Since `sync` is
 * idempotent, the mutations it causes settle after one extra pass rather than
 * looping.
 *
 * @returns {void}
 */
const scheduleSync = () => {
  clearTimeout(pending);
  pending = setTimeout(sync, 300);
};

new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
sync();
