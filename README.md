[![deploy](https://github.com/mosuke5/hugo-blog.mosuke.tech/actions/workflows/deploy.yaml/badge.svg)](https://github.com/mosuke5/hugo-blog.mosuke.tech/actions/workflows/deploy.yaml)

# hugo file of blog.mosuke.tech
This is the blog.mosuke.tech's hugo repository.

## Directory Structure

```text
.
├── .github
│   └── workflows
│       └── deploy.yaml ... GitHub Actions workflow definition
├── archetypes ... Content templates for new posts
├── content ... Blog post markdown files
│   ├── en
│   └── ja
│       └── entry
│           └── ...
├── layouts ... Custom layout templates overriding the theme
│   └── shortcodes
├── public ... Generated static site (ignored by git)
├── scripts ... Utility scripts for maintenance and deployment
│   ├── delete_page_cache.sh
│   ├── hugo_new.sh
│   ├── setup.sh
│   └── test_page_url.sh
├── static ... Static assets (images, etc.)
├── themes
│   └── mosuke-tech-hugo-theme ... Custom theme (git submodule)
├── config.yaml ... Main configuration file
└── README.md
```

## Deployment

This repository uses GitHub Actions for CI/CD. The workflow is defined in `.github/workflows/deploy.yaml`.

### Workflow Steps

1.  **Trigger**:
    -   **Push**: Triggered on push to the `main` branch.
    -   **Schedule**: Triggered daily at 8:00 AM JST (23:00 UTC) to publish future-dated posts.
2.  **Build**:
    -   Clones the repository with submodules.
    -   Sets up Hugo (version 0.152.2).
    -   Builds the static site using `hugo`.
3.  **Deploy**:
    -   Deploys the `./public` directory to the `mosuke5-lab/mosuke5-lab.github.io` repository on the `main` branch.
    -   Uses a personal access token (`DEPLOY_TOKEN`) for authentication.
4.  **Cache Purge**:
    -   Purges the Cloudflare cache using `scripts/delete_page_cache.sh`.
    -   **Diff Range**: Detects changes between the current commit (`HEAD`) and the previous commit (`HEAD^`).
    -   **Selective Purge**: If only content (`content/*.md`) or static files (`static/*`) are changed, only the corresponding URLs are purged.
    -   **Full Purge**: If layout files (`layouts/*`) are changed, the entire cache is purged.

### Known Limitations

-   **Multiple Commits Push**: The cache purge script (`scripts/delete_page_cache.sh`) only checks the difference between the latest commit and its parent (`HEAD` vs `HEAD^`). If multiple commits are pushed simultaneously, changes in commits prior to the latest one will not be detected for cache purging.

# How to use
```text
// set up. This site uses original theme.
$ git submodule update --init --recursive
$ hugo server

// update submodule
$ git submodule update --remote
```

```text
// create new article (Japanese by default)
$ bash scripts/hugo_new.sh <filename>
// example: bash scripts/hugo_new.sh my-article
// creates: content/ja/entry/YYYY/MM/DD/my-article.md

// create English article
$ bash scripts/hugo_new.sh -l en <filename>
// creates: content/en/entry/YYYY/MM/DD/<filename>.md
```

```text
// resize image
// mogrify is included in ImageMagick package
$ mogrify -resize 700 ./static/image/xxxxx.png
```

## Tests

End-to-end checks live under `e2e-test/` and use [Playwright](https://playwright.dev/) against the **built** site in `../public`. The config starts a static server (`npx serve ../public -l 1314`) automatically; run `hugo` first so `public/` exists.

### CI (GitHub Actions)

Workflow: [`.github/workflows/test.yaml`](.github/workflows/test.yaml)

| Item | Detail |
|------|--------|
| Triggers | `push`, `pull_request` |
| Timezone | `TZ=Asia/Tokyo` |
| Hugo | `0.152.2` (same as deploy) |
| Node.js | `24` (npm cache: `e2e-test/package-lock.json`) |
| Install | `npm ci` in `e2e-test/` |
| Browsers | `npx playwright install --with-deps chromium` |
| Build | `hugo` at repository root |
| Run | `npx playwright test` in `e2e-test/` |
| Artifacts | `playwright-report/` uploaded on completion (retention 7 days) |

### Local setup

1. Initialize submodules (`git submodule update --init --recursive`) and install Hugo **0.152.2** if you want parity with CI.
2. Install JS deps and Chromium for Playwright (once, or when lockfile changes):

   ```bash
   cd e2e-test && npm ci && npx playwright install --with-deps chromium
   ```

   The dev container runs an equivalent install in `postCreateCommand`.

### Running tests

From the repository root:

```bash
hugo
cd e2e-test && npm test
```

Or from `e2e-test/` only (builds then tests):

```bash
npm run test:build
```

### What the suites cover

| File | Purpose |
|------|---------|
| `tests/build.spec.ts` | HTTP status for top, `/entry/`, first article link, `/en/`, 404 for unknown paths; `sitemap.xml` and `/index.xml` (RSS) shape |
| `tests/html-validation.spec.ts` | `html[lang]` (`ja` on home, `en` on `/en/`), head/body/main, charset/viewport, OGP/Twitter meta; article: `og:description`, `h1`, `link[rel=canonical]` |
| `tests/internal-links.spec.ts` | Header nav, article links (up to 10), sidebar/aside; in-article internal links (taxonomy URLs under `/categories/`, `/archive/`, `/tags/` are warnings only); image load checks on top and article pages; `img[src*="/image/"]` URLs return 200 |

Playwright uses `baseURL` `http://localhost:1314`. In CI, tests run with `workers: 1`, `retries: 1`, and the GitHub reporter; locally the list reporter is used and an existing server on that port may be reused when not in CI.

## Cursor Agent Skills

This repository defines [Cursor Agent Skills](https://cursor.com/docs/context/skills) under [`.cursor/skills/`](.cursor/skills/). Each skill is a `SKILL.md` with a name, description, and workflow the agent can follow when you ask for that kind of work (for example: “run the e2e test skill” or “review this post using the review skill”).

| Skill | Path | Summary |
|-------|------|---------|
| **review-blog-post** | [`.cursor/skills/review-blog-post/SKILL.md`](.cursor/skills/review-blog-post/SKILL.md) | Pre-publish review: validate front matter, check and resize images, verify content structure, then report. |
| **write-blog-post** | [`.cursor/skills/write-blog-post/SKILL.md`](.cursor/skills/write-blog-post/SKILL.md) | Turn a memo into a new post: create the file, set TOML front matter, draft body (Japanese under `content/ja/` by default). |
| **run-e2e-test** | [`.cursor/skills/run-e2e-test/SKILL.md`](.cursor/skills/run-e2e-test/SKILL.md) | Run `hugo`, execute Playwright tests in `e2e-test/`, and summarize pass/fail. |

# How to modify design
This blog site uses a custom theme `mosuke-tech-hugo-theme` located in `themes/` directory as a git submodule.
If modifying or changing design, commit to the theme repository.
