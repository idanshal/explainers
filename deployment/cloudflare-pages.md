# Cloudflare Pages

Research checked: 2026-10-25

Cloudflare Pages is a managed platform for deploying websites and full-stack applications to Cloudflare's network. It is a deployment platform, not an AI agent or development skill.

## Deployment Model

A common workflow connects a GitHub or GitLab repository, selects a build command and output directory, and deploys on pushes. Git-connected projects can create preview deployments for non-production branches. Pages also supports direct upload and Pages Functions for server-side code.

Pages is especially straightforward for static sites and frontend projects. It is not simply a general-purpose virtual machine: dynamic behavior runs within Cloudflare's serverless platform and its supported runtime/bindings.

```text
Source repository -> build -> deployment to Cloudflare Pages
                         -> preview deployment for a non-production branch
```

The build command, output directory, runtime compatibility, and bindings must match the application. Connecting a repository does not make an arbitrary server application compatible with the platform.

## Pages Versus Workers

Cloudflare's documentation says Workers supports most Pages use cases, has a broader feature set, and is its primary platform for building applications; it recommends starting new projects with Workers.

Pages remains a documented, deployable product, so that guidance is a platform recommendation rather than a statement that Pages is unavailable. Consider Pages for an existing Pages workflow or a simple static deployment; consider Workers for a new application needing the broader current platform. Review the migration compatibility table if relying on a specific feature.

## References

- [Pages overview](https://developers.cloudflare.com/pages/)
- [Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare's Pages-to-Workers comparison and guidance](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

Capabilities and platform recommendations are based on the linked official documentation checked on the research date. Review the current documentation before choosing a deployment target or planning a migration.