# Explainers Website

In the root catalog, `###` headings define topics and `####` headings define
nested groups. Previous article URLs are mapped in `src/data/redirects.json`.

All group headings expand and collapse; child page links navigate. An existing landing page appears as the first child labeled **Overview**. Groups without a useful landing page do not need an Overview entry. The standard Starlight sidebar handles rendering, keyboard interaction, active-page highlighting, and expansion persistence. Page links use the catalog title and catalog order by default, regardless of filename. Append a hidden JSON comment to an entry to override its sidebar label or order:

```markdown
- [Docker: A Developer Guide](content/containers/docker/index.md): Containers and a first local service. <!-- sidebar: {"label":"Overview","order":0} -->
```

Both fields are optional. `label` must be a nonempty string and `order` must be a finite number. Within each group, explicitly ordered pages appear first in ascending order, with ties and unordered pages retaining catalog order. Ordering does not move a page into a different group or rearrange group headings. Metadata is excluded from descriptions and does not change page titles, URLs, or homepage ordering.

Overview pages should explain their subjects, not just repeat the sidebar. Filenames do not determine labels or ordering. Invalid metadata fails generation rather than silently changing navigation.

## Article Standards

Use subject-based titles, not suffixes such as "Explainers." Each article should define its topic, state important prerequisites and version assumptions, and provide the setup needed for its examples or explicitly identify them as illustrative fragments. Explain essential terms locally rather than making a previous article mandatory. Related links can provide deeper reading without replacing necessary context.

General concepts should be vendor-independent where practical. Named product, language, and platform guides should retain their actual scope and distinguish general principles from product-specific behavior. Keep repository organization and publishing instructions in author documentation, not in technical articles. The canonical articles live in `content/`; older files under `src/content/docs/` are not the active site's source.

The website reads its Markdown directly from the sibling `content/` directory using Astro's filesystem content loader. The articles are the canonical source; builds do not copy, rewrite, or generate files in `content/`. Writers use a level-one heading for each title and ordinary relative `.md` links. The site adapter supplies Starlight's page metadata and routes at render time. The root `README.md` catalog drives the homepage and sidebar.

Each cataloged explainer has a `level` in its Markdown frontmatter: `foundations` introduces the subject, `intermediate` assumes working familiarity, and `advanced` assumes substantial subject knowledge. Topic overview `index.md` pages may omit the level. The catalog preparation step reads these values from the articles and estimates reading time from prose at 200 words per minute and fenced code at 100 tokens per minute, excluding References and Further Reading sections. The estimate is for reading, not completing exercises. Restart the dev server after changing article metadata so the generated catalog is refreshed.

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