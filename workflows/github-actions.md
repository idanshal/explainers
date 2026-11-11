# GitHub Actions: Practical CI and Automation

Documentation checked: 2026-11-11

GitHub Actions runs automation in response to repository events, schedules, or manual requests. You describe the automation in YAML files, and runners execute its jobs. Common uses include testing pull requests, building packages, publishing releases, deploying applications, and maintaining repositories.

This guide explains the execution model, walks through a Java/Maven CI workflow, and covers the security and operational details needed to use Actions effectively. Examples target **GitHub.com**. GitHub Enterprise Server (GHES), organization policies, runner versions, and plan entitlements can change what is available.

The examples belong in an application repository. This article does not install workflows into this documentation repository.

## 1. What It Is, and What It Is Not

GitHub Actions is an automation platform integrated with GitHub. It orchestrates commands and reusable components; it does not replace your compiler, test framework, deployment tool, or production hosting platform.

- **Continuous integration (CI):** automatically build and test changes to detect problems before merging.
- **Continuous delivery:** produce a releasable result and provide a controlled release path, possibly with approval.
- **Continuous deployment:** automatically release changes that pass the required checks and policies.

Running tests is not deployment. Uploading a JAR to a workflow run is not publishing it to a package registry. A green workflow only proves that the configured steps passed; it does not prove that the tests were sufficient or that the deployed application works.

For example, Actions can build a frontend and invoke a hosting platform's deployment command. The platform then serves the application. See [Cloudflare Pages](../deployment/cloudflare-pages.md) for that hosting side of the process.

## 2. The Execution Model

```text
Event: a pull request changes
  -> workflow run
     -> verification job -> runner -> checkout, install Java, build, test
     -> another independent job -> another runner
     -> dependent jobs start after their needs are satisfied
```

| Term | Meaning |
| --- | --- |
| Workflow | YAML automation definition in `.github/workflows/*.yml` or `*.yaml` |
| Event | Something that can trigger the workflow, such as `pull_request` |
| Run | One execution of a workflow for a particular event and revision |
| Job | A collection of steps executed on a selected runner |
| Step | A shell command or action invocation within a job |
| Action | A reusable automation component invoked with `uses` |
| Runner | The machine or execution environment that runs a job |
| Artifact | Files retained from a run, such as reports or a built package |
| Environment | A named deployment target with configuration and optional protection rules |

Jobs run in parallel unless you connect them with `needs`. Steps within a job run in order. Each `run` step starts a new shell process: files remain available within the job, but a shell variable or `cd` from one step does not automatically carry into the next.

Treat jobs as isolated. On standard GitHub-hosted runners, each job gets a fresh environment. Installing Java or creating `target/app.jar` in one job does not make it appear in another. Self-hosted runners can retain state, but relying on that creates fragile and unsafe workflows.

## 3. Start with a Real Local Command

Before writing YAML, identify the command that actually verifies your application. For a Maven project with the Maven Wrapper:

```sh
./mvnw --batch-mode --no-transfer-progress verify
```

Commit the wrapper files and make `mvnw` executable in Git. The project should already have a root `pom.xml`, its `.mvn` wrapper configuration, and tests. The wrapper selects Maven; a setup action selects Java.

`verify` runs the preceding Maven lifecycle phases, but integration tests run only if your build configures them appropriately. A build with no discovered tests can still succeed. Check the test counts and reports, and configure the build to fail when expected tests are absent.

For another stack, substitute its actual install, lint, test, and build commands. Actions automates those commands; it cannot invent a reliable build for you.

## 4. A Complete Maven CI Workflow

In that application repository, create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify:
    name: Verify Java 21
    runs-on: ubuntu-24.04
    timeout-minutes: 20

    steps:
      - name: Check out source
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Set up Java
        uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Build and verify
        run: ./mvnw --batch-mode --no-transfer-progress verify

      - name: Save test reports
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: test-reports-java-21
          path: |
            **/target/surefire-reports/
            **/target/failsafe-reports/
          if-no-files-found: warn
          retention-days: 7
```

The action versions above follow their official documentation checked on the date shown. They use modern action runtimes; old self-hosted runners may not support them. The artifact action used here is not supported on GHES; consult the action's compatibility guidance there.

**Version tags are used for readability, not immutability.** For production workflows, replace action tags with reviewed full commit SHAs from the official repositories, retain a version comment, and configure automated update PRs. Pinning does not remove the need to review the code you trust.

### Read It from Top to Bottom

1. **`on`:** run for pull requests targeting `main`, pushes to `main`, or a manual request. A PR branch filter matches the destination branch, not the contributor's branch name.
2. **`permissions`:** restrict the job's built-in GitHub token to repository-content reads. This workflow does not need publishing or deployment permissions.
3. **`concurrency`:** group runs by workflow and ref. A new PR run can cancel an obsolete active run for the same PR. Active production-branch verification is not canceled by this expression.
4. **`runs-on`:** request a specific hosted Ubuntu image family. This reduces surprises compared with a moving `ubuntu-latest` alias, but the image still receives updates.
5. **`checkout`:** download the event's source revision. Source files are not automatically present just because the workflow belongs to the repository.
6. **`setup-java`:** install the requested JDK and enable Maven dependency caching. The Maven Wrapper still controls Maven itself.
7. **`run`:** execute your existing verification command. A nonzero exit normally fails the step and job.
8. **Report upload:** attempt to preserve reports even after test failure, but not after cancellation. Missing reports produce a warning; the original failed build remains failed.

`persist-credentials: false` avoids leaving checkout credentials configured for later Git operations. It does not sandbox subsequent code or make arbitrary actions safe.

### Try It and Prove It Works

Open the application's **Actions** tab after introducing the workflow through your normal review process. Check the selected event, source revision, runner, Java version, test counts, and uploaded reports.

Then make a deliberately failing test on a test branch. Verify that CI fails, reports remain available, and the merge policy blocks the failing check. Restore the test and verify recovery. Testing the failure path is as important as observing one green run.

The manual **Run workflow** control requires a `workflow_dispatch` workflow present on the default branch and appropriate access. Organization action policies and fork approval policies can also prevent a run from starting.

## 5. Choose Triggers Deliberately

| Trigger | Typical use | Important detail |
| --- | --- | --- |
| `pull_request` | Verify proposed code | Normally tests the PR merge revision, not just its head commit |
| `push` | Verify or release trusted branch changes | Use explicit branch/tag filters rather than deploying every push |
| `workflow_dispatch` | Manual operations with optional inputs | Treat input validation and authorization as part of the design |
| `schedule` | Periodic maintenance or checks | Default-branch execution; scheduled time is not a punctuality guarantee |
| `merge_group` | Required checks for a merge queue | Separate event; PR and push triggers alone are insufficient |
| `workflow_call` | Invoke a reusable workflow | Defines a reusable interface, not a standalone user event |
| `workflow_run` | Follow-up after another workflow | Can cross a privilege boundary; completion is not proof of success or trust |

For a repository using a merge queue, add this event alongside the existing triggers:

```yaml
merge_group:
  types: [checks_requested]
  branches: [main]
```

That is a fragment under `on`, not a complete workflow. Required checks must run for the merge group as well as the PR.

Avoid indiscriminately triggering the same work on both every branch push and every PR update; that often duplicates runs. The main example uses PR verification plus post-merge verification on `main`.

Schedules can be delayed, especially under load. Use them for periodic work, not a guaranteed exact-time scheduler. Check current scheduling syntax, timezone options, and inactive-repository behavior when setting one up.

### Required Checks and Path Filters

Use repository rulesets or branch protection to require the verification check before merging. Merely creating a workflow does not require anybody to pass it.

Keep required job/check names stable and unambiguous. A workflow skipped by branch or path filters can leave an expected required check pending and block merging. Conversely, a skipped job can report a non-failing result without having tested anything. When optimizing monorepo workflows, design an explicit gate that still verifies all applicable jobs.

## 6. Pass Data at the Right Boundary

| Need | Mechanism |
| --- | --- |
| Variable inside one shell invocation | A normal shell variable |
| Configuration for steps in a job | `env`, or write a value to `$GITHUB_ENV` for later steps |
| Small named result from a step | Write to `$GITHUB_OUTPUT`; give the step an `id` |
| Small result passed to a dependent job | Map a step output to a job output; read it through `needs` |
| Files passed between jobs or retained for inspection | Upload and download artifacts |
| Faster dependency restoration across runs | Cache |
| Human-readable run notes | Append Markdown to `$GITHUB_STEP_SUMMARY` |

Here is a separate, complete workflow demonstrating step and job outputs:

```yaml
name: Output example

on:
  workflow_dispatch:

permissions: {}

jobs:
  prepare:
    runs-on: ubuntu-24.04
    outputs:
      revision: ${{ steps.metadata.outputs.revision }}
    steps:
      - name: Record revision
        id: metadata
        run: printf 'revision=%s\n' "$GITHUB_SHA" >> "$GITHUB_OUTPUT"

  summarize:
    needs: prepare
    runs-on: ubuntu-24.04
    env:
      REVISION: ${{ needs.prepare.outputs.revision }}
    steps:
      - name: Write summary
        run: printf 'Verified metadata for `%s`\n' "$REVISION" >> "$GITHUB_STEP_SUMMARY"
```

This records metadata only; it does not check out or test source. `needs` establishes ordering and makes declared outputs available. If `prepare` fails, `summarize` is skipped by default.

`$GITHUB_ENV` affects subsequent steps in the same job, not the shell currently writing it and not another job. Avoid obsolete `::set-output` examples. For arbitrary multiline output, use the documented multiline format rather than assuming a single-line command handles it.

### Contexts Are Not Shell Variables

`${{ github.sha }}` and `${{ needs.prepare.outputs.revision }}` are Actions expressions evaluated by the workflow engine at the relevant stage. `$GITHUB_SHA` and `$REVISION` are variables expanded by the shell on the runner. Some workflow fields are processed before a runner starts and cannot read shell-created variables.

Values are frequently strings. The string `"false"` is not automatically a boolean false in every expression; use typed inputs or explicit parsing such as `fromJSON` when appropriate. Avoid clever expression chains when a straightforward condition would be clearer.

### Cache Is Not an Artifact or a Release

A dependency cache is a performance optimization. Cache misses must not break correctness, and a cache hit must not skip required installation or verification steps. Cache access has branch and event scoping rules; it is not an unlimited shared directory.

Artifacts are explicit outputs such as reports or packages. Download the required artifact in the consuming job; `needs` alone does not transfer files. Use unique names for matrix outputs because modern artifact uploads do not append multiple jobs' files to the same artifact.

Neither mechanism is secret storage. Untrusted PR workflows can access some caches, and uploaded files may be available to people with access to the run. Review file globs, hidden-file behavior, retention, and executable-bit preservation. Do not upload the entire workspace by default.

A workflow artifact also expires; use an appropriate package/container registry or release mechanism for distributable software. For deployments, identify the exact artifact and source revision and promote the tested build instead of silently rebuilding different bytes.

## 7. Parallelism, Matrices, and Failure Behavior

For a project intentionally supporting Java 21 and 25, this fragment can replace the main example's job configuration and Java-version input:

```yaml
strategy:
  fail-fast: false
  max-parallel: 2
  matrix:
    java: ['21', '25']
```

Use `${{ matrix.java }}` in `setup-java`'s `java-version`, the job name, and the report artifact name. Each matrix combination is a separate job with its own setup, logs, runner usage, and files. Only include versions your project actually supports; this does not make a Java-25-only project compile on Java 21.

`fail-fast: false` allows other matrix combinations to finish after one fails, improving diagnostics at the cost of more execution. `max-parallel` caps simultaneous matrix jobs. Neither creates dependencies between them.

Steps normally run only while previous steps are successful; dependent jobs normally require successful dependencies. Use conditions deliberately:

- `failure()` for diagnostics after failure.
- `!cancelled()` for follow-up work that should run after success or failure but not cancellation.
- `always()` only where execution even during cancellation is truly intended.
- `continue-on-error` for explicitly non-blocking checks, not to disguise failing required tests.

Put job timeouts around potentially hanging tests and external calls. A timeout is a safety bound, not a substitute for diagnosing slow or flaky work.

### Concurrency Is Not a Deployment Queue

Concurrency groups can prevent overlapping work, but ordering is not generally guaranteed and the default pending-run behavior can replace older pending runs. Do not assume `cancel-in-progress: false` preserves every queued release in FIFO order.

Canceling stale CI is often useful. Canceling a deployment midway through database changes can be harmful. Use deployment-specific serialization and recovery procedures, and make deploy scripts safe to rerun.

## 8. Security: Treat Workflow Code as Privileged Code

Actions run code from your repository, dependencies, and third-party action repositories. That code can read files, access the network, and use credentials available in its job. A build script or dependency installation can execute code just as a test command can.

### Tokens, Secrets, and Variables

`GITHUB_TOKEN` is a short-lived repository-scoped token provided for jobs. Specify the least permissions needed, preferably raising privileges only for the job that needs them. Specifying permissions makes unspecified scopes `none`; it does not grant access beyond organization or event restrictions.

Use Actions variables (`vars`) for non-sensitive configuration and secrets for credentials. Secrets are not automatically shell environment variables: pass a needed secret explicitly to the action or step that consumes it. Avoid broad job-level secret exposure when only one step needs it.

The built-in token is not a universal credential for other private repositories or cloud accounts. Prefer a scoped GitHub App token for suitable cross-repository automation, or OIDC for supported cloud authentication, rather than an overprivileged personal token.

Log masking is a safeguard, not a guarantee. Never print secrets or enable shell tracing around credentials. Derived values and generated files can leak information even if the original value is masked.

### Pull Requests Are Untrusted Code

Fork PR workflows normally receive a restricted token and no ordinary repository secrets; approvals and repository settings can affect execution. Dependabot-triggered workflows also have special restrictions. Do not "fix" these restrictions by exposing production credentials to PR jobs.

Use `pull_request` for testing proposed code. `pull_request_target` runs in the trusted base-repository context and can have privileged access. It can be appropriate for carefully designed metadata operations, **not checking out and executing an untrusted PR's scripts with secrets**. Modern checkout guardrails do not make privileged execution of untrusted code safe.

Similarly, a privileged `workflow_run` consumer must validate the source run, event, revision, conclusion, and artifact provenance. A downloaded artifact or cache produced by untrusted code is not safe to execute simply because a trusted workflow downloaded it.

### Prevent Expression-to-Shell Injection

Do not interpolate a PR title, branch name, issue body, or user input directly into a `run` script. Actions substitutes expressions before the shell parses the script, which can turn malicious text into commands.

Pass the value through `env` and quote it in the shell. This fragment belongs in a PR workflow's steps:

```yaml
- name: Print PR title as data
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: printf '%s\n' "$PR_TITLE"
```

This avoids treating the title as shell source. It does not make it safe to pass to `eval`, execute as a command, or use as an unchecked tool argument.

### Protect the Automation Itself

Review changes to workflow definitions, deployment scripts, action references, and reusable workflows. Apply appropriate ownership/review rules. Pin external actions to reviewed SHAs and keep them updated; a major-version tag can move.

Do not run arbitrary public PR code on a persistent self-hosted runner with privileged network access. Ephemeral isolated runners reduce persistence risk, but their credentials and network reach still require careful design.

## 9. Separate Verification from Deployment

A useful release model is:

```text
PR -> unprivileged build and tests -> required review/checks -> merge
Trusted revision -> build/test/package -> identified artifact
  -> staging -> smoke checks -> production approval -> deploy -> verify
```

Configure the deployment job to depend on successful verification and to accept only trusted events/revisions. A manual button alone is not a release policy: specify which refs may deploy and what inputs are permitted.

For a production job, reference a GitHub environment using `environment: production`. Configure its protection rules and deployment branch/tag policies in repository settings. The YAML name alone does not create an approval gate; available rules depend on the plan and repository visibility.

When supported by the cloud provider, prefer **OpenID Connect (OIDC)** over a stored long-lived cloud key. Grant `id-token: write` only to the authentication/deployment job, and configure cloud trust to restrict the repository, intended ref or environment, audience, and role permissions. The permission allows requesting an identity token; it does not itself grant cloud access or authenticate your deployment command.

Deployment still requires provider-specific setup, authentication, and a tested deploy command. Avoid a sample that merely echoes "deployed" while implying a real release occurred. Record the deployed artifact identity, perform health/smoke checks, and define recovery for partial deployment and data migrations.

### Avoid Accidental Automation Loops

Events caused by operations using `GITHUB_TOKEN` generally do not start new workflow runs, with documented exceptions including explicit dispatch events. A bot push may therefore not trigger the workflow you expected. Using another credential changes both the behavior and its security implications; design the automation chain explicitly rather than swapping in a powerful token as a workaround.

## 10. Reuse Without Hiding the Build

- **Script:** put substantial shell/application logic in versioned scripts so developers can run the same logic locally.
- **Composite action:** package a repeated group of steps, invoked inside a job.
- **Reusable workflow:** package one or more jobs with `workflow_call`, invoked at the caller's job level.

A reusable workflow can define typed inputs, declared secrets, and outputs. Calling it is not the same as a step's `uses`. The caller cannot use reuse to elevate token permissions beyond its own limits, and secrets are not automatically forwarded through every nested call. Prefer explicit secret interfaces over broad inheritance when practical.

Start with a readable workflow and extract repetition after a stable pattern emerges. Centralized automation is useful, but a hidden maze of reusable workflows can make a five-minute failure difficult to diagnose.

## 11. Debugging and Operating It Effectively

| Symptom | First checks |
| --- | --- |
| No workflow run | File location, YAML validity, event/ref filters, default-branch requirements, Actions policy, fork approval |
| Job remains queued | Runner labels/availability, concurrency, plan limits, environment approval |
| `./mvnw` is missing or not executable | Checkout step, working directory, committed wrapper files and executable bit |
| Local passes but CI fails | Linux case sensitivity, JDK/Maven versions, clean dependencies, services, variables, timezone |
| A downstream job cannot find a file | Job isolation; upload/download the artifact explicitly |
| Secret is empty or access is forbidden | Event restrictions, secret scope, environment protection, token permissions |
| Required check never finishes | Workflow filters, merge-queue trigger, renamed or ambiguous check names |
| Nothing runs after a bot push | The credential used and token-trigger suppression rules |
| Reports disappeared | Upload condition, file glob, retention, artifact naming conflicts |

Inspect the event and checked-out SHA before debugging application behavior. PR merge refs and shallow checkout history can surprise version-generation or change-detection scripts; fetch additional history only when those tools need it.

For monorepos, set the shell working directory explicitly or use `defaults.run.working-directory`. That setting affects `run` steps, not all actions' path inputs. Align checkout paths, dependency-cache paths, build commands, and artifact globs.

Keep logs readable with named steps and concise summaries. Add targeted debug output without exposing credentials. Re-running a failed job may show that a dependency was temporarily unavailable, but it does not explain or fix flaky tests. Do not make "rerun until green" a merge policy.

Validate YAML and Actions-specific semantics with tools such as `actionlint`; valid YAML alone does not guarantee a valid workflow. Local execution tools cannot perfectly reproduce GitHub events, token permissions, hosted images, environments, and fork restrictions. Verify those in real test runs.

### Cost and Performance

Runner execution, matrix expansion, storage, and retention affect usage. Hosted-runner billing depends on repository visibility, plan, runner type, and operating system. Self-hosting has infrastructure, maintenance, and security costs; check current GitHub billing terms rather than assuming a permanent pricing model.

Start with short, deterministic jobs. Cache expensive dependency downloads, avoid redundant triggers, cancel stale CI, limit matrix size, and keep artifacts only as long as needed. Measure setup, downloads, test execution, and upload time before splitting everything into parallel jobs: duplicated setup can outweigh the gain.

## Practical Checklist

- Begin with local commands that genuinely verify the application.
- Choose triggers and required checks deliberately, including merge-queue support when used.
- Treat steps as separate shells and jobs as separate execution environments.
- Use outputs for small values, artifacts for files, and caches only for acceleration.
- Keep PR verification unprivileged; isolate trusted deployment and its credentials.
- Pin reviewed action revisions, update them, and protect automation changes.
- Test failure, cancellation, permissions, and recovery, not just the successful path.
- Track usage, retention, and toolchain changes as part of operating the pipeline.

## References

- [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [trigger events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Java with Maven](https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-maven)
- [Official checkout action](https://github.com/actions/checkout), [Java setup action](https://github.com/actions/setup-java), and [artifact upload action](https://github.com/actions/upload-artifact)
- [Workflow commands and environment files](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
- [Artifacts](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow) and [dependency caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Secure use guidance](https://docs.github.com/en/actions/reference/security/secure-use) and [securely using pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect) and [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [actionlint](https://github.com/rhysd/actionlint)

Recheck official documentation before adopting action versions, relying on plan-specific protections, or making security and billing decisions.