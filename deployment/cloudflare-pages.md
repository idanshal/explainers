# Cloudflare Pages

Documentation checked: 2026-11-11

Cloudflare Pages hosts websites on Cloudflare's distributed network. You supply deployable files and, optionally, request-handling code. Cloudflare handles publishing, HTTPS, and serving requests; you do not maintain a web server or operating system.

This guide explains the deployment model, walks through a small site with an API endpoint, and covers the configuration and operational details that commonly cause surprises.

## 1. What It Is, and When to Use It

A Pages application can have two parts:

- **Static assets:** HTML, CSS, browser JavaScript, images, and other files that are built or authored before deployment.
- **Pages Functions:** server-side JavaScript or TypeScript executed in the Workers runtime when matching requests arrive.

"Static" does not mean noninteractive. A static JavaScript application can have rich interactions and call an API hosted elsewhere. It means Pages can serve those application files without generating them for each request.

| Workload | How it fits |
| --- | --- |
| Documentation, portfolio, or generated blog | Deploy the generated files |
| Browser-side application | Deploy its built assets; handle client-side routing deliberately |
| Small API or server-rendered application | Use Functions or a framework adapter explicitly supporting this runtime |
| Frontend with an existing Java or other backend | Deploy the frontend here; host the backend separately |
| An arbitrary Spring Boot JAR, Docker image, or persistent Node server | Not something Pages runs directly |
| Scheduled jobs, queue consumers, or a more extensive Cloudflare application | Evaluate Workers and the relevant platform services |

### Pages or Workers for a New Project?

Cloudflare positions Workers as its broader application platform. Workers can serve static assets as well as dynamic code, and supports features beyond Pages, including Cron Triggers and more comprehensive observability. **Evaluate Workers first for a new Cloudflare application**, especially one with significant backend behavior.

Pages is still useful to understand and operate, particularly for existing projects and its established Git-to-site workflow. This guide intentionally teaches Pages, not Workers commands disguised as Pages commands. Check the [current comparison](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) before selecting either product: their routing, configuration, previews, and domain capabilities are not identical.

## 2. Understand Build Time and Request Time

These are separate environments with separate jobs:

```text
BUILD / DEPLOYMENT
Source + dependencies + build configuration
    -> optional build command
    -> output directory of static files + compiled Functions
    -> versioned deployment

REQUEST
Browser -> Cloudflare
    -> static file response, OR
    -> Function -> optional database / external API -> response
```

For Git integration, Cloudflare runs the build. With direct upload, you supply the output; Cloudflare does not run your frontend build for you. Wrangler can still compile a Pages Functions directory as part of deployment.

The **build output directory** contains the site to publish, not necessarily its source. For a frontend framework, this might be `dist`; for a documentation generator, it might be `public`. Use the directory your actual build creates, not a guessed framework default.

Installing Node dependencies during a build does not mean the deployed application has a conventional Node server. Functions use the Workers runtime. Node.js compatibility supports a subset of Node APIs and requires appropriate configuration; it is not a guarantee that every Node package works.

## 3. Choose a Deployment Workflow

| Workflow | Who builds the frontend? | Best fit |
| --- | --- | --- |
| Git integration | Cloudflare, after changes to selected branches | Automatic builds and preview deployments from GitHub or GitLab |
| Direct upload with Wrangler | You or your CI system | Explicit releases, custom CI, or repositories outside the built-in integrations |
| Dashboard drag-and-drop | You supply the files | Simple static uploads; it does not compile a `functions` directory |

Choose the project type deliberately. A Direct Upload project cannot later acquire built-in Git integration; create another project if needed. A Git-integrated project cannot be converted into a Direct Upload project, **but you can disable automatic builds and deploy to it using Wrangler**. Project type and the ability to upload with Wrangler are not the same thing.

For a team using supported Git hosting, Git integration is often the easiest daily workflow. The walkthrough uses Wrangler because it makes the build output and Function deployment explicit and does not require setting up a repository integration.

## 4. Walkthrough: A Site with a Server-Side Endpoint

This is a documentation example to create in a separate project, not a service already deployed by this repository.

### Prerequisites and Layout

Use a Node.js release supported by the current Wrangler version, npm, and a Cloudflare account for deployment. Local development does not require publishing a project.

Start an empty project and install Wrangler locally:

```sh
mkdir pages-demo
cd pages-demo
npm init -y
npm install --save-dev wrangler
```

Keep the generated lockfile in version control. It makes the installed toolchain reproducible; CI should use `npm ci`.

Create this layout:

```text
pages-demo/
    package.json
    package-lock.json
    wrangler.jsonc
    .gitignore
    public/
        index.html
        404.html
        _routes.json
    functions/
        api/
            status.js
```

The static output is `public`. The `functions` directory is at the **project root**, not inside `public`. Everything intended to be a public asset belongs in the output directory; credentials and server source do not.

### Add the Static Page

Put this in `public/index.html`:

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Pages Demo</title>
    </head>
    <body>
        <h1>Pages Demo</h1>
        <p>The website is available.</p>
        <a href="/api/status">View service status</a>
    </body>
</html>
```

Also add `public/404.html`, using the same HTML structure with a "Page not found" heading. This example is not a single-page application, so unknown static paths should return a real 404 rather than the home page.

### Add the Function

Put this in `functions/api/status.js`:

```javascript
export function onRequestGet(context) {
    return Response.json(
        {
            service: context.env.APP_LABEL ?? "pages-demo",
            status: "ok"
        },
        {
            headers: {
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff"
            }
        }
    );
}
```

The file path maps to `/api/status`. `onRequestGet` handles GET requests. The handler returns a web-standard `Response`; it does not start a server or call `listen()`.

`context.env` contains runtime variables and configured resource bindings. This endpoint reports that the handler ran; it is not a database or upstream-service health check. `no-store` prevents caching this response; it does not provide authentication.

### Configure the Runtime and Invocation Routes

Put this in `wrangler.jsonc`:

```json
{
    "$schema": "./node_modules/wrangler/config-schema.json",
    "name": "pages-demo",
    "pages_build_output_dir": "./public",
    "compatibility_date": "2026-11-11",
    "vars": {
        "APP_LABEL": "pages-demo-production"
    },
    "env": {
        "preview": {
            "vars": {
                "APP_LABEL": "pages-demo-preview"
            }
        }
    }
}
```

Choose an available project name and use it consistently in the configuration and commands. The compatibility date selects runtime compatibility behavior; it is not a dependency version or an automatic update policy. Advance it deliberately and retest.

The base settings apply to local development and production; `env.preview` overrides preview settings. Consequently, the local server initially reports `pages-demo-production`; this is only a label, not a connection to production resources. Never assume local development is isolated if you configure remote bindings.

Put this in `public/_routes.json`:

```json
{
    "version": 1,
    "include": ["/api/*"],
    "exclude": []
}
```

This restricts Function invocation to API paths, keeping the static site outside the compute path. Pages tooling can generate routes automatically, but an explicit file makes this example's boundary clear. If you later add server-side rendering or authentication middleware outside `/api/*`, update the routes too; otherwise that code may never run.

Add these entries to `.gitignore`:

```gitignore
node_modules/
.wrangler/
.dev.vars*
.env*
```

### Run and Check Locally

Run from the project root:

```sh
npx wrangler pages dev
```

Wrangler serves the static assets and Functions together, normally at `http://localhost:8788`. If that port is occupied, add `--port 8789` and use the new port in the checks.

In another terminal:

```sh
curl -i http://localhost:8788/
curl -i http://localhost:8788/api/status
curl -i http://localhost:8788/missing-page
```

Expect HTML for `/`, JSON containing `status: "ok"` and the configured label for `/api/status`, and a 404 for `/missing-page`. Check the status codes and response headers, not only what the browser displays. A generic file server cannot execute the Function.

### Deploy with Wrangler

The next commands authenticate and create real Cloudflare resources. Run them only when ready to publish:

```sh
npx wrangler login
npx wrangler pages project create pages-demo --production-branch main
npx wrangler pages deploy public --project-name pages-demo --branch main
```

Use the name chosen in your configuration instead of `pages-demo`. `login` opens an authorization flow; do not put account tokens in source files. Run deployment from the project root so Wrangler also discovers `functions`.

Open the deployment URL printed by Wrangler and repeat the three HTTP checks against that URL. The production site normally uses `<project>.pages.dev`; use the actual assigned hostname.

For a preview deployment:

```sh
npx wrangler pages deploy public --project-name pages-demo --branch staging
```

This targets preview rather than the production branch. Inspect the printed preview URL and verify that the endpoint reports `pages-demo-preview`. A successful upload is not proof that routing and configuration are correct.

### Alternative: Deploy the Same Files with Git Integration

For a **separate Git-integrated project**, connect the repository through the Pages creation flow in **Workers & Pages**, then use:

| Setting | Value for this example |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | The directory containing `public`, `functions`, and the configuration |
| Build command | Leave blank; these static files need no build |
| Build output directory | `public` |

Adjust the configuration's project name to match the new project. Pushes to the production branch trigger production builds; other enabled branches produce previews. Branch build controls can restrict which branches deploy.

For a real framework application, replace the blank build command with its production build and select its generated output directory. A development server command such as `npm run dev` is not a production build command. SSR requires the correct supported adapter, not merely uploading browser assets.

## 5. Configuration, Secrets, and Persistent Data

### Know Where a Value Is Used

| Kind of configuration | Example | Important consequence |
| --- | --- | --- |
| Build-time input | API base URL embedded by a frontend bundler | Changing it usually requires rebuilding |
| Public browser configuration | An endpoint URL in downloaded JavaScript | Visitors can read it |
| Function runtime variable | `context.env.APP_LABEL` | Available to server-side code; ordinary variables are not secret storage |
| Function secret | An upstream API credential | Store as a platform secret; never return it to the browser |
| Resource binding | `context.env.DB` for a configured D1 database | A runtime capability, not just a connection string |

The use of an environment variable does **not** make a value private. A build tool can bake it into public JavaScript or HTML. Keep privileged API calls in server-side code and expose only the result the caller is authorized to see.

For the configuration-as-code approach above, keep nonsecret runtime settings and bindings in Wrangler configuration. Configure production and preview secrets through Pages settings or the supported Wrangler secret workflow. Do not mix dashboard edits and configuration files without understanding which settings the next deployment will apply.

For local development, a git-ignored `.dev.vars` file can provide values such as:

```dotenv
APP_LABEL="pages-demo-local"
```

Local values do not automatically become deployed secrets. Configure production and preview separately, redeploy after relevant changes, and verify the resulting deployment. Never paste secrets into a command argument that could enter shell history, a screenshot, or a build log.

### Where Data Lives

Do not treat Function memory or a local filesystem as a durable database. Different requests may run in different instances, and an instance can disappear.

Use storage suited to the data: D1 for relational data, KV for suitable key-value workloads, R2 for objects, or an external backend. Configure the relevant binding; use separate preview resources so a feature-branch test cannot modify production data. Consider consistency, latency, authorization, backups, and migrations, not only connectivity.

For an existing Spring Boot backend, a common arrangement is:

```text
Browser -> Pages: frontend files
Browser -> existing backend: authenticated API requests
```

Alternatively, a Function can call that backend. Cross-origin browser requests need appropriate backend CORS and cookie settings; server-to-server requests do not solve the user's authentication requirements automatically. CORS is not access control.

## 6. Routing, Headers, and Caching

### Files, Client Routes, and API Routes Are Different

Without a top-level `404.html`, Pages assumes SPA behavior and serves the root application for unmatched static paths. That allows a browser router to handle URLs such as `/settings` after a refresh.

For a multipage site, supply a proper `404.html`. For an SPA, decide intentionally whether to use the default fallback. An API request returning HTML with a 200 status is often a routing mistake, not a JSON parsing problem.

Redirects can be defined in an output-directory `_redirects` file. For example:

```text
/old-status /api/status 302
```

This tells the browser to request another URL. It is not an internal API implementation. Rules in `_redirects` do not apply to requests served by Pages Functions; implement those redirects in Function code. Avoid adding blanket SPA rewrite rules without checking what they do to APIs and missing assets.

### Set Headers at the Layer Serving the Response

An optional `public/_headers` file can add headers to static responses:

```text
/*
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
```

These rules do **not** apply to responses generated by Functions. Set headers in the Function's `Response`, as the example does. The same distinction matters for CORS, security policy, and cache controls. Design a Content Security Policy around the actual scripts and resources your site needs rather than copying an incompatible policy.

### Browser Cache and Cloudflare Cache Are Different

Cloudflare distributes and caches static assets; browsers also cache responses according to their headers. A new deployment does not erase something a browser has already cached.

Use content-hashed filenames for long-lived assets, such as `app.a1b2c3.js`. Only give an asset a long `max-age` with `immutable` if changing its content also changes its URL. Keep HTML able to discover new asset filenames through appropriate revalidation. Avoid overriding Pages' caching behavior globally unless you understand the consequences.

Do not put personalized responses into shared caches. The example uses `no-store`; a real cache policy needs to consider identity, cookies, authorization, and cache keys. When a release appears stale, inspect browser caching, service workers, response headers, and any custom Cloudflare cache rules before repeatedly redeploying.

## 7. Previews, Domains, and Access

### Preview Is an Environment, Not a Security Boundary

Pages provides deployment-specific URLs and branch aliases. A branch alias tracks that branch's latest deployment; an older deployment URL can still be reachable. By default, do not assume these URLs are private.

Use Cloudflare Access where appropriate and test exactly which hostnames the policy protects. A private Git repository does not make the deployed website private. Search-engine `noindex` behavior is also not authentication. Keep preview credentials and data isolated from production, and check alternate deployment URLs when protecting sensitive content.

### Add a Custom Domain Through Pages First

1. Open the project's custom-domain settings and associate the desired hostname.
2. Follow the DNS instructions and wait for domain verification and certificate provisioning.
3. Check HTTPS and routing on the actual hostname before directing users to it.

An apex domain such as `example.com` must be a zone in the same Cloudflare account, with the required Cloudflare nameserver setup. A subdomain such as `docs.example.com` can use external DNS with a CNAME pointing to the assigned Pages hostname.

Creating only the CNAME without associating the hostname in Pages is not sufficient and can result in a 522 error. If you use both apex and `www`, decide on a canonical hostname and configure the redirect deliberately. A custom domain does not automatically disable the original Pages URLs.

## 8. Operate It Effectively

### A Repeatable Release Workflow

1. Pin the toolchain and dependencies; run the production build and relevant tests.
2. Deploy a preview using preview-specific configuration and data.
3. Check deep links, missing pages, APIs, headers, authentication, and mobile behavior.
4. Release through the designated production branch or CI job, avoiding competing deployers.
5. Verify the production URL and record the deployment and source revision for recovery.

For CI uploads, use narrowly scoped Cloudflare credentials stored in the CI secret store, not an interactive login or a committed token. Distinguish application tests from deployment smoke checks: both are useful.

### Logs and Troubleshooting

Build logs show dependency installation, build failures, and output discovery. Function runtime logs show request-handler execution and exceptions. Browser developer tools show client errors and the actual HTTP requests. Start at the layer that failed.

| Symptom | First things to check |
| --- | --- |
| Build fails | First meaningful error, Node version, lockfile, root directory, required build variables |
| Deploy succeeds but site is missing | Output directory and whether it contains `index.html` |
| `/api/status` is missing or returns HTML | Root-level `functions`, Function compilation, `_routes.json`, fallback behavior |
| Refreshing `/settings` fails | Whether the site is an SPA, presence of `404.html`, framework routing output |
| Local works but preview fails | Compatibility date, flags, variables, secrets, and preview bindings |
| Browser request fails but direct API access works | CORS/preflight, mixed content, cookies, and authentication |
| Custom domain fails but Pages URL works | Pages domain association, DNS, certificate status, conflicting records |
| A release looks stale | Browser cache, service worker, asset URLs, and custom cache rules |
| Static responses have headers but API responses do not | `_headers` does not modify Function-generated responses |

Use the dashboard's real-time Function logs or Wrangler's Pages deployment tail facility while sending a test request. Do not log tokens, cookies, personal data, or full request bodies indiscriminately. Pages' logging features are not identical to Workers' observability features.

### Roll Back Code, but Think Separately About Data

In the deployment history, select a previous successful **production** deployment and choose rollback. Preview deployments are not rollback targets. Verify the production hostname afterward and remember that the next automated production deployment can move it forward again.

A code rollback does not undo database migrations, external API calls, sent emails, or changes to shared resources. Plan compatible schema changes and data recovery separately. Runtime configuration and external service changes also need their own recovery plan.

## 9. Costs and Limits You Should Know

Do not interpret free static hosting as unlimited application compute. Static asset requests and Function invocations have different accounting; Functions count toward Workers usage, and storage services have their own limits and charges. Route only the requests that need compute through Functions.

Some concrete limits from the documentation checked above:

| Area | Documented limit |
| --- | --- |
| Free-plan builds | 500 per month, one concurrent build |
| Build duration | 20-minute timeout |
| Free-plan static files | 20,000 per site |
| Individual static asset | 25 MiB maximum |

These are dated planning figures, not a substitute for checking your account's current plan. Also check Function CPU/memory and request limits, build concurrency, project quotas, redirect/header limits, and the quotas of every bound service. A large video belongs in appropriate object storage, not squeezed into a static deployment.

Before opening a public write endpoint, plan authentication, authorization, validation, abuse controls, and spending visibility. Serverless scaling does not make an expensive or unprotected operation safe.

## Practical Checklist

- Know whether you need Pages, Workers, or only frontend hosting alongside an existing backend.
- Identify exactly what builds, what gets uploaded, and what executes on each request.
- Use one reproducible deployment path with explicit production and preview configuration.
- Treat downloaded files as public; keep secrets server-side and preview data separate.
- Test routes and HTTP responses, not just the home page.
- Understand the runtime, storage, cache, domain, and rollback boundaries before relying on them.
- Check current limits and costs for the whole application, not only static hosting.

## References

- [Pages overview](https://developers.cloudflare.com/pages/) and [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Direct Upload and Wrangler deployment](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Functions setup](https://developers.cloudflare.com/pages/functions/get-started/), [local development](https://developers.cloudflare.com/pages/functions/local-development/), and [Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Bindings, environment variables, and secrets](https://developers.cloudflare.com/pages/functions/bindings/)
- [Serving static pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) and [Function invocation routes](https://developers.cloudflare.com/pages/functions/routing/)
- [Redirects](https://developers.cloudflare.com/pages/configuration/redirects/) and [headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Preview deployments and access](https://developers.cloudflare.com/pages/configuration/preview-deployments/) and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Function debugging and logging](https://developers.cloudflare.com/pages/functions/debugging-and-logging/) and [rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) and [Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Pages-to-Workers migration and compatibility comparison](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

Platform behavior, UI labels, runtime support, and pricing evolve. Recheck the relevant official documentation before deployment or migration.