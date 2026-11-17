---
level: intermediate
---

# GitHub Pages

Documentation checked: 2026-11-15

GitHub Pages turns files in a GitHub repository into a website. It builds and
serves static files such as HTML, CSS, JavaScript, and images, either directly
from a repository branch or through a GitHub Actions workflow. GitHub handles
the hosting and HTTPS; you do not need to run a web server.

Pages is useful for project documentation, personal portfolios, blogs, demos,
and other sites that can be delivered to a browser as static files. A site can
still be interactive: browser JavaScript can update the page or call an API
hosted elsewhere. Pages does not run a persistent application server, database,
or server-side code such as PHP, Python, or Java. Keep secrets and private
business logic on a backend, not in the published files or browser code.

## 1. Choose a Site Address

There are two kinds of Pages sites:

| Site | Repository name | Default address |
| --- | --- | --- |
| User or organization | `<owner>.github.io` | `https://<owner>.github.io/` |
| Project | Any repository, such as `docs` | `https://<owner>.github.io/docs/` |

A project site is usually the right choice for documentation about one
repository or product. The repository name becomes part of the URL. This also
means the site generator must support a base path such as `/docs/`; otherwise,
asset links and navigation may work at the domain root but fail on the project
site. A custom domain can replace the default address.

## 2. Choose How to Publish

- **Deploy from a branch:** Use this when the files are already built and do
  not need a custom build command. Pages can publish the repository root or its
  `/docs` folder. This is straightforward for hand-written HTML or a workflow
  that commits generated files to a branch.
- **GitHub Actions:** Use this for a static site generator, a custom build,
  tests before publishing, or when you want generated files to remain out of
  Git. The workflow builds the site, uploads the output as an artifact, and
  deploys that artifact.

For branch publishing, GitHub uses Jekyll by default. Choose Actions when your
site uses another generator, or when you need control over the build. Do not
select the source-code directory as the publishing folder unless it contains
the finished site: publish the build output, commonly `dist`, `build`, or
`_site`.

## 3. Publish a Site

1. Put a working static site or site generator in a GitHub repository. For a
   generated site, run its build locally and confirm which directory contains
   the finished files.
2. Push the source to the repository's default branch. For a project site,
   check that the generator is configured for the repository's base path.
3. Open the repository on GitHub and select **Settings → Pages**.
4. Under **Build and deployment**, choose the publishing source:
   - For existing static files, select **Deploy from a branch**, choose the
     branch and either `/ (root)` or `/docs`, then select **Save**.
   - For a custom build, select **GitHub Actions**. Add a workflow under
     `.github/workflows/` that builds and uploads the output, then deploys it.
5. Open **Actions** and inspect the workflow run. When it succeeds, the Pages
   settings show the published URL. Visit it and check that links, images,
   styles, and client-side routes work at that address.

Here is a minimal workflow for a Node-based site whose repository-root build
command is `npm run build` and whose output directory is `dist`. Adjust the
Node version, install/build commands, and artifact path for the project. If the
site lives in a subdirectory, run its commands there and upload its actual
output directory.

```yaml
name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

The deploy job only runs after the build job succeeds. Its `pages: write` and
`id-token: write` permissions allow the Pages deployment; the build job only
gets read access to repository contents. The example deploys on pushes to
`main` and manual runs, not on pull requests. Add a separate build-and-test
workflow for pull requests if you want to validate changes before merging.

## 4. Check Common Issues

- **The run succeeded, but Pages is not enabled:** In **Settings → Pages**,
  set the source to **GitHub Actions** when using a custom workflow.
- **The site is blank or assets are missing:** Check the build output and
  configure the generator's base path for a project URL such as
  `/<repository>/`. Inspect the published page's browser developer console for
  failed asset requests.
- **Deep links show a 404:** Static hosting does not automatically provide
  server-side routing. Configure the generator's Pages-compatible fallback or
  use routes that correspond to generated files.
- **A deployment does not start:** Confirm the workflow file is on the
  repository's default branch, the event branch matches the workflow filter,
  and the repository allows the workflow to deploy Pages.
- **The site needs dynamic or private data:** Host the API or application
  backend separately and have the browser call it. Do not put credentials in
  frontend code; anything deployed to Pages can be downloaded by visitors.

Pages is designed for static sites, not high-traffic application servers.
GitHub documents a 1 GB published-site limit, a 10-minute deployment timeout,
and soft bandwidth and build-frequency limits. Review the current
[usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
before using it for a site with large assets or substantial traffic.

## Further Reading

- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Custom workflows for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)