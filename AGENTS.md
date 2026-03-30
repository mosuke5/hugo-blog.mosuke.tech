# Project Instructions

This file provides guidance to AI agents when working with code in this repository.

## Commands

### Build and serve the site
```bash
# Local development server
hugo server

# Build static site
hugo
```

### Create new blog post
```bash
# Create a new blog post with current date
bash scripts/hugo_new.sh <filename>
# Example: bash scripts/hugo_new.sh my-article
# Creates: content/ja/entry/YYYY/MM/DD/my-article.md
```

### Image optimization
```bash
# Resize images (using ImageMagick)
mogrify -resize 700 ./static/image/xxxxx.png

# Optimize images in git diff
bash scripts/optimize_image.sh
```

### Deployment
Deployment is automated via GitHub Actions when pushing to the main branch. The workflow:
1. Builds the site with Hugo v0.152.2
2. Deploys to mosuke5-lab/mosuke5-lab.github.io repository
3. Purges Cloudflare cache

## Architecture

This is a multilingual Hugo blog with Japanese (ja) and English (en) content:

- **Theme**: Custom theme at `themes/mosuke-tech-hugo-theme` (git submodule from mosuke5/purehugo)
- **Content structure**: 
  - `content/ja/`: Japanese content (default language)
  - `content/en/`: English content
  - Blog posts: `content/{lang}/entry/YYYY/MM/DD/title.md`
- **Configuration**: `config.yaml` contains site settings, languages, and taxonomies
- **Static assets**: Images and other static files in `static/`
- **Custom layouts**: Override theme templates in `layouts/`

The site uses categories and archives as taxonomies, with Disqus for comments and Google Analytics for tracking.

## Blog Post Conventions

### Front matter

Front matter uses **TOML** format (delimited by `+++`). All fields shown below are required:

```toml
+++
categories = ["Category1", "Category2"]
date = "2026-03-09T10:01:05+09:00"
description = "A short summary of the article for SEO and social sharing"
draft = false
image = "/image/header-image-name.png"
tags = ["Tech"]
title = "Article title"
author = "mosuke5"
archive = ["2026"]
+++
```

- `author`: Always `"mosuke5"`
- `archive`: Year of the article as a list (e.g. `["2026"]`)
- `date`: ISO 8601 with JST timezone offset `+09:00`
- `image`: Path relative to `static/` directory

### Content guidelines

- Primary language is **Japanese** (`content/ja/`)
- Create new posts with `bash scripts/hugo_new.sh <slug>` (uses `archetypes/default.md` as template)
- Place the `<!--more-->` tag after the introductory paragraph to define the summary shown in article lists
- Header images go in `static/image/` and should be resized to 700px width (`mogrify -resize 700`)

## Available Shortcodes

Custom shortcodes in `layouts/shortcodes/`:

- `admission-webhook-series` - Admission Webhook series navigation
- `argocd-series` - Argo CD series navigation
- `go-system-programming-series` - Go system programming series navigation
- `tekton-series` - Tekton series navigation

## Theme Customization

To modify the design, changes must be made to the theme repository at https://github.com/mosuke5/purehugo and then update the submodule:

```bash
# Update theme submodule
git submodule update --remote
```

## Important Warnings

- **Do not edit files under `themes/mosuke-tech-hugo-theme/`** - This is a git submodule. Design changes must be made in the [theme repository](https://github.com/mosuke5/purehugo).
- **Do not change the front matter format** - Always use TOML (`+++`) delimiters. Do not convert to YAML (`---`) or JSON.
- **Do not change `date` or URL paths of published articles** - This breaks existing external links and bookmarks.
- **Do not modify secrets in `config.yaml`** - Fields like `google_analytics`, `disqusShortname`, and verification codes should not be changed.