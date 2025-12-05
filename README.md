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
│   ├── optimize_image.sh
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
// create new article
$ scripts/hugo_new.sh <filename>
// example: bash scripts/hugo_new.sh my-article
// creates: content/ja/entry/YYYY/MM/DD/my-article.md
```

```text
// resize image
// mogrify is included in ImageMagick package
$ mogrify -resize 700 ./static/image/xxxxx.png
```

# How to modify design
This blog site uses a custom theme `mosuke-tech-hugo-theme` located in `themes/` directory as a git submodule.
If modifying or changing design, commit to the theme repository.
