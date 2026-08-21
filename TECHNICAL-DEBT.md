# Technical debt

Known shortcomings that are accepted for now. Each entry says what it is, why it is not fixed yet and
what fixing it would take.

Kept next to the code on purpose: an entry belongs here when it survives longer than a single branch.
Anything smaller goes into a FIXME at the place it concerns.

---

## Test toolchain is from 2022

**What** — Karma 6.4 drives the test run, launched through Puppeteer 16, which brings Chrome 105
(August 2022). `webpack-cli` is on 4 while 6 is current.

**Why it matters** — Karma was declared deprecated by its maintainers in 2023 and gets no further
development. Chrome 105 does not know newer platform features, so the suite can pass on a browser
nobody uses anymore while failing on a current one. Two branches in `PromiseUtils` and `Escaper` are
only reachable on engines the run never sees.

**What it would take** — moving to Web Test Runner or Vitest in browser mode. Both run the specs in a
current browser and bring coverage of their own, which would also make the babel-plugin-istanbul
detour unnecessary. The specs themselves are plain Jasmine and would mostly carry over; `karma.conf.cjs`,
the webpack test build and `test/all-sources.js` would be replaced.

---

## Two files are shipped but not reachable through the package entry

**What** — `src/ServiceHelper.js` and `src/converter/XmlToJson.js` are part of the package and covered
by tests, but `src/index.js` does not export them. They can only be reached through a deep import.

**Why it matters** — a deep import ties the caller to the file layout. Moving a file becomes a
breaking change even though the package surface did not change.

**What it would take** — deciding whether they belong to the public surface. If yes, export them from
`src/index.js` and `browser.js`; if no, say so in the module doc.

---

## Cancel and settle use two different vocabularies

**What** — `timeoutPromise` reports a cancellation through a rejection and an `AbortSignal`,
`lazyPromise` reports its outcome through `resolved`, `error` and `value`. A `timeoutPromise` cannot
be settled from outside, a `lazyPromise` cannot be canceled.

**Why it matters** — the two cover neighbouring needs and using both means holding two models in
mind. It is documented in the module doc of `PromiseUtils`, so it is a known split, not an accident.

**What it would take** — either a shared base carrying both, or an explicit statement that they stay
apart. Not worth doing without a case that actually needs both at once.

---

## The dev bundles inflate the package

**What** — `files` includes `dist/**`, which brings the unminified bundles and their source maps
along. The tarball grew from 19 kB to about 154 kB.

**Why it matters** — every install carries roughly 380 kB of files that only a debugging session
needs.

**What it would take** — narrowing the pattern to the minified bundles, or publishing the source maps
separately.

---

## README is a heading

**What** — `README.md` holds the project name and nothing else. It is the landing page on npm.

**Why it matters** — the modules are documented in JSDoc by now, but nothing points a newcomer at
what the package does or how to start.

**What it would take** — an overview with one example per module. Planned.
