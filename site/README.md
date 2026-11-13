# Explainers Website

The website reads its Markdown directly from the sibling `content/` directory using Astro's filesystem content loader. The articles are the canonical source; builds do not copy, rewrite, or generate files in `content/`. Writers use a level-one heading for each title and ordinary relative `.md` links. The site adapter supplies Starlight's page metadata and routes at render time. The root `README.md` catalog drives the homepage and sidebar.

## Local Development

```sh
cd site
npm ci
npm run dev
```

The development server serves the site at `http://localhost:4321`. From `site/`, the production build and article-link check are:

```sh
npm run check:content
npm run build
npm run preview
```

## Publish

The public site is hosted for free by GitHub Pages. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. To publish, open **Actions → Deploy site → Run workflow** and run it from `main`. The deploy workflow validates links and builds the site before replacing the published version. Pushes and pull requests run the separate site check but do not publish.

The project site is available at `https://idanshal.github.io/explainers/` after Pages is enabled and the first deploy succeeds.