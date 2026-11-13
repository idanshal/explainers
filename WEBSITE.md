# Explainers Website

The website is built directly from the articles in `src/content/docs`. Each page keeps its H1 for GitHub readability and uses frontmatter for its browser title. The topic catalog in the root `README.md` also drives the homepage and sidebar.

## Local Development

```sh
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