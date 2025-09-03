# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
1. Builds the site with Hugo v0.139.3
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

## Theme Customization

To modify the design, changes must be made to the theme repository at https://github.com/mosuke5/purehugo and then update the submodule:

```bash
# Update theme submodule
git submodule update --remote
```