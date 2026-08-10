/**
 * @file URL mapping between Graphite and GitHub pull request pages.
 *
 * Loaded twice over: as the first content script (before `content.js`, which
 * calls into it) and as a CommonJS module by `url.test.js`.
 */

/**
 * Graphite hosts that serve pull request pages.
 *
 * `app.graphite.dev` 301s to `.com`, but old links and long-lived tabs still
 * use it.
 *
 * @type {Set<string>}
 */
const GRAPHITE_HOSTS = new Set(["app.graphite.com", "app.graphite.dev"]);

/**
 * The shape shown in the address bar, and used by comment permalinks.
 * Identical to GitHub's own path under a `/github` prefix.
 */
const CANONICAL = /^\/github\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

/**
 * The shape Graphite's internal links use, stack rows included. Carries a
 * title slug that this module discards.
 */
const INTERNAL = /^\/github\/pr\/([^/]+)\/([^/]+)\/(\d+)(?:\/|$)/;

/**
 * Maps a Graphite pull request URL to the same pull request on GitHub.
 *
 * A string rewrite: no API call, no auth, no network. Sub-paths (`/files`,
 * `/checks`) and the title slug are dropped on purpose, because Graphite's
 * routes below the PR don't map one-to-one onto GitHub's -- landing on the PR
 * and letting GitHub route from there is correct more often. Reading only
 * `pathname` drops query and hash for free.
 *
 * Canonical is tried before internal. The two shapes are ambiguous only for an
 * owner literally named `pr` whose repo is named `pull`, and reading that as
 * canonical is the better bet, since `pull` is a reserved path on GitHub.
 *
 * @param {string} href Absolute URL. Anything unparseable yields `null` rather
 *   than throwing, because callers pass hrefs this extension didn't author.
 * @returns {string|null} The GitHub PR URL, or `null` if `href` is not a
 *   Graphite PR page.
 *
 * @example
 * graphiteToGithub("https://app.graphite.com/github/o/r/pull/8730");
 * // "https://github.com/o/r/pull/8730"
 *
 * graphiteToGithub("https://app.graphite.com/github/pr/o/r/8730/some-slug");
 * // "https://github.com/o/r/pull/8730"
 */
function graphiteToGithub(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (!GRAPHITE_HOSTS.has(url.hostname)) return null;

  const match = CANONICAL.exec(url.pathname) || INTERNAL.exec(url.pathname);
  if (!match) return null;

  const [, owner, repo, number] = match;
  return `https://github.com/${owner}/${repo}/pull/${number}`;
}

// ponytail: dual-use file. Chrome loads it as a content script (no `module`),
// url.test.js requires it as a CommonJS module. Beats a build step.
if (typeof module !== "undefined") module.exports = { graphiteToGithub };
