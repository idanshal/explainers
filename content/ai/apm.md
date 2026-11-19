---
level: intermediate
technologies:
  - Agent Package Manager
  - GitHub Copilot
---

# APM: Agent Package Manager

APM is an open-source package manager for AI coding-agent configuration. It
declares agent-related dependencies in a project manifest, resolves their
dependencies, and installs the resulting files for one or more coding-agent
clients. The goal is to make a team's agent setup reproducible and reviewable,
rather than a collection of manually copied prompts and skills on each
developer's machine.

APM does not run the agent or provide a model. It prepares files that supported
agent clients can discover and use.

## What Gets Managed

Agent packages can include reusable pieces of context and configuration, such
as skills, instructions, prompts, agent definitions, hooks, and MCP server
declarations. APM calls these pieces primitives. Packages can group primitives
and declare dependencies on other packages, so a project can install a complete
dependency tree from one top-level declaration.

Each client, such as GitHub Copilot or Claude Code, is a target (also called a
harness). APM integrates package contents into the target's expected files and
directories. Some targets may also need a compile step to assemble root-level
instruction files.

| File or concept | Role |
|---|---|
| `apm.yml` | Project manifest: package dependencies, optional targets, and other project settings. |
| `apm.lock.yaml` | Resolved dependency versions and integrity data, for repeatable installs. |
| `apm_modules/` | Local package cache; APM manages it and adds it to `.gitignore`. |
| Target files | Reviewable agent instructions and primitives integrated for the selected clients. |

## Install a Package

On macOS with Homebrew, install the CLI and initialize a project:

```sh
brew install apm
apm --version
apm init my-agent
cd my-agent
```

Install a sample package for GitHub Copilot:

```sh
apm install microsoft/apm-sample-package#v1.0.0 --target copilot
```

The explicit target is useful for a new project that does not yet contain files
APM can use to detect a client. A successful install updates `apm.yml`, writes
`apm.lock.yaml`, caches the package, and integrates its primitives into the
target. The sample also has a transitive dependency, which APM resolves as part
of the same install.

For subsequent installs, contributors can run:

```sh
apm install
```

This replays the locked dependency tree. In CI, use `apm install --frozen` to
fail when the manifest and lockfile are out of sync. Use `apm update` when you
intend to refresh dependencies to newer matching refs; review and commit the
resulting manifest, lockfile, and target-file changes together.

## Reproducibility and Trust

The manifest records what the project wants. The lockfile records what APM
resolved, including pinned source revisions and content integrity data. Commit
both files so another machine or CI runner can reproduce the setup. Commit
target-owned outputs as reviewable files, too; do not commit the generated
`apm_modules/` cache.

APM also scans deployable content for certain hidden Unicode characters before
installation. Organizations can use `apm-policy.yml` to constrain which
dependencies or capabilities are allowed. Review changes to prompts,
instructions, hooks, and MCP declarations just as carefully as other project
dependencies: they can influence agent behavior or request access to tools.

These controls have limits. APM is a build-time dependency manager, not a
runtime sandbox. It does not sandbox MCP servers, prove that a package's
instructions are safe, or control what an agent does after reading them. The
lockfile and content checks improve reproducibility and integrity; they are not
package signatures or a guarantee of harmless behavior. Treat package sources
as dependencies that need review.

## When to Use APM

APM is useful when a team wants shared, versioned agent configuration across
multiple clients, transitive package dependencies, or a repeatable setup for
local development and CI. For a one-off personal prompt, a package manager may
be unnecessary. For a team repository, APM makes the source, selected targets,
resolved package versions, and deployed files explicit in code review.

## References

- [APM Quickstart](https://microsoft.github.io/apm/quickstart/)
- [Install packages](https://microsoft.github.io/apm/consumer/install-packages/)
- [Package types](https://microsoft.github.io/apm/reference/package-types/)
- [Security model](https://microsoft.github.io/apm/enterprise/security/)
- [Microsoft APM repository](https://github.com/microsoft/apm)