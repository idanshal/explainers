# Explainers Website

The active website is built from the canonical Markdown articles in `content/` by the Astro project in `site/`. Each article uses a subject-based H1; the site supplies browser metadata without requiring frontmatter. The root README catalog drives the homepage and navigation. See [site authoring and navigation rules](site/README.md) for optional sidebar metadata and standalone article standards. Older files in `src/content/docs/` are not used by this site.

## Local Development

```sh
cd site
npm ci
npm run dev
```

The development server serves the site at `http://localhost:4321`. The production build and article-link check are:

```sh
npm run check:content
npm run build
npm run preview
```

## Publish

The public site is hosted for free by GitHub Pages. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. To publish, open **Actions → Deploy site → Run workflow** and run it from `main`. The deploy workflow validates links and builds the site before replacing the published version. Pushes and pull requests run the separate site check but do not publish.

The project site is available at `https://idanshal.github.io/explainers/` after Pages is enabled and the first deploy succeeds.