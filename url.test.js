// Run: node url.test.js
const assert = require("node:assert/strict");
const { graphiteToGithub } = require("./url.js");

const PR = "https://github.com/MedBill-AI/medbillai/pull/8730";
const com = (path) => `https://app.graphite.com${path}`;
const dev = (path) => `https://app.graphite.dev${path}`;

// Canonical shape: what the address bar shows.
assert.equal(graphiteToGithub(com("/github/MedBill-AI/medbillai/pull/8730")), PR);
assert.equal(graphiteToGithub(dev("/github/MedBill-AI/medbillai/pull/8730")), PR);

// Internal shape: what stack rows link to, slug and all. The slug is real --
// Graphite leaves parentheses unencoded in it.
assert.equal(
  graphiteToGithub(com("/github/pr/MedBill-AI/medbillai/8730/feat(api)-emit-AI-sign-in-tool-calls")),
  PR,
);
assert.equal(graphiteToGithub(com("/github/pr/MedBill-AI/medbillai/8730")), PR);
assert.equal(graphiteToGithub(com("/github/pr/MedBill-AI/medbillai/8730/")), PR);

// Sub-paths, trailing slash, query and hash all collapse to the PR itself.
assert.equal(graphiteToGithub(com("/github/MedBill-AI/medbillai/pull/8730/files")), PR);
assert.equal(graphiteToGithub(com("/github/MedBill-AI/medbillai/pull/8730/")), PR);
assert.equal(graphiteToGithub(com("/github/MedBill-AI/medbillai/pull/8730?tab=checks#c1")), PR);
// Comment permalinks are canonical-shaped, so they map too. The stack-row
// injection scopes itself to the stack panel rather than relying on this.
assert.equal(graphiteToGithub(com("/github/MedBill-AI/medbillai/pull/8730#discuss")), PR);

// Graphite pages that are not a PR.
for (const path of [
  "/",
  "/dashboard",
  "/github/MedBill-AI/medbillai",
  "/github/MedBill-AI/medbillai/pull",
  "/github/MedBill-AI/medbillai/pull/",
  "/github/MedBill-AI/medbillai/pull/abc",
  "/github/MedBill-AI/medbillai/pull/8730extra",
  "/github/pr/MedBill-AI/medbillai",
  "/github/pr/MedBill-AI/medbillai/abc",
]) {
  assert.equal(graphiteToGithub(com(path)), null, `expected null for ${path}`);
}

// Wrong host. The content script never runs on these, but the stack-row path
// feeds this function hrefs we did not author, including third-party ones.
assert.equal(graphiteToGithub(PR), null);
assert.equal(graphiteToGithub("https://graphite.com/github/O/R/pull/1"), null);
assert.equal(graphiteToGithub("https://evil.app.graphite.com/github/O/R/pull/1"), null);
assert.equal(graphiteToGithub("https://app.coderabbit.ai/change-stack/O/R/pull/8730"), null);

// Malformed input must not throw.
assert.equal(graphiteToGithub("not a url"), null);
assert.equal(graphiteToGithub(""), null);
assert.equal(graphiteToGithub(undefined), null);

console.log("url.js: all cases pass");
