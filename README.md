# Explainers

Practical explanations of software concepts, tools, and common problems, organized by topic.

## Catalog

### AI

- [AI](content/ai/index.md): Models, agents, tools, reusable guidance, integrations, and context management. <!-- sidebar: {"label":"Overview","order":0} -->

#### Foundations

- [AI Concepts](content/ai/concepts.md): Start here for models, prompts, context, agents, tools, skills, memory, and RAG.

#### Agents and Tools

- [Coding Agents](content/ai/coding-agents.md): VS Code, Copilot CLI, Claude Code, Codex, execution environments, and permissions.
- [APM: Agent Package Manager](content/ai/apm.md): Agent configuration packages, manifests, lockfiles, target integration, and security boundaries.
- [Tools in VS Code](content/ai/tools-in-vscode.md): How agents discover and call built-in, extension, and MCP tools, with approvals and troubleshooting.

#### Skills

- [Agent Skills](content/ai/skills.md): Reusable task guidance, compatibility checks, and the UI UX Pro Max example.

#### Spec-Driven Development

- [OpenSpec](content/ai/openspec.md): Change proposals, delta specifications, implementation, and archiving, with a CSV export example.
- [GitHub Spec Kit](content/ai/spec-kit.md): Project principles, feature specifications, plans, tasks, and convergence, with a CSV export example.

#### Integrations and Context

- [Model Context Protocol (MCP)](content/ai/mcp.md): Hosts, clients, servers, exposed capabilities, and documentation integrations.
- [Context Optimization](content/ai/context-optimization.md): Input filtering, output concision, and the tradeoffs of Caveman and RTK.

### Databases

- [Databases](content/databases/index.md): Database models, product choices, and learning paths. <!-- sidebar: {"label":"Overview","order":0} -->

#### Concepts

- [Choosing a Database: From Tables to Graphs](content/databases/concepts/database-types.md): Compare database models, use cases, and tradeoffs.
- [Graph Database Fundamentals](content/databases/concepts/graph-database-fundamentals.md): Nodes, relationships, graph modeling, Neo4j, and alternatives.
- [Relational Table Patterns](content/databases/concepts/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](content/databases/concepts/foreign-keys-and-indexes.md): Relationships, integrity constraints, and indexing.

#### PostgreSQL

- [PostgreSQL](content/databases/postgresql/index.md): Relational fundamentals, an SQL lab, and Java/Spring Boot integration. <!-- sidebar: {"label":"Overview","order":0} -->
- [PostgreSQL Fundamentals](content/databases/postgresql/fundamentals.md): Tables, keys, SQL, connections, and transactions.
- [PostgreSQL and SQL: A Hands-On Lab](content/databases/postgresql/sql-lab.md): Set up PostgreSQL and query a bookstore database.
- [PostgreSQL with Java and Spring Boot](content/databases/postgresql/java-spring-boot.md): Connect with JDBC and build a Spring Data JPA API.

#### Neo4j

- [Neo4j](content/databases/neo4j/index.md): Graph fundamentals, Cypher, and Java/Spring Boot integration. <!-- sidebar: {"label":"Overview","order":0} -->
- [Neo4j and Cypher: A Hands-On Lab](content/databases/neo4j/neo4j-cypher-lab.md): Set up Neo4j and query a small graph step by step.
- [Neo4j with Java and Spring Boot](content/databases/neo4j/neo4j-java-spring-boot.md): Connect with the Java driver and Spring Data Neo4j.

#### Migrations

- [Flyway: Database Migrations and SQL Script Tracking](content/databases/migrations/flyway.md): What Flyway does, how to run it, and how filenames, checksums, and database history control SQL migrations.

### Java

#### Language

- [Annotations](content/java/language/annotations.md): Annotation declarations, practical uses, and meta-annotations.
- [Java Streams](content/java/language/streams.md): Why to use streams, chained filters, flatMap, collectors, ordering, and common pitfalls.
- [Super Type Tokens](content/java/language/super-type-tokens.md): Capturing generic type metadata, type erasure, Spring and Jackson usage, and unresolved type-variable pitfalls.

#### Jackson

- [Jackson 3 Mr Bean](content/java/jackson/jackson-3-mrbean.md): What the module does, how to configure it, and its limitations.

#### Persistence

- [JPA ID Generation and Hibernate Schema Management](content/java/persistence/jpa-id-generation-and-hibernate-schema-management.md): ID generation, schema settings, and Spring Boot defaults.

### Spring Boot

#### Core

- [AOP and Spring AOP](content/spring-boot/aop.md): Cross-cutting concerns, proxies, elapsed-time logging and retry annotations, advice ordering, and production pitfalls.
- [Constructor Injection](content/spring-boot/constructor-injection.md): Constructor injection compared with field and setter injection.
- [Managing Multiple Data Sources](content/spring-boot/multiple-data-sources.md): What a datasource is, current JDBC and JPA configuration patterns, transactions, migrations, and operational checks.
- [Spring Boot Dependency Breakdown](content/spring-boot/project-dependency-breakdown.md): A representative Maven application's dependencies, build settings, H2 console activation, and version considerations.

#### Testing

- [Database Connection Exhaustion in Tests](content/spring-boot/testing/database-connection-exhaustion.md): How contexts and connection pools affect database limits, with diagnosis steps and a worked PostgreSQL example.
- [Shared PostgreSQL Testcontainers](content/spring-boot/testing/shared-postgres-testcontainers.md): Container lifecycles, reusable declarations, and sharing PostgreSQL across tests.

### Build Tools

#### Maven

- [Maven: From Java Source to a Running Application](content/build-tools/maven/index.md): Build and run Java with and without Maven, understand POMs and dependencies, then connect the build to Spring Boot. <!-- sidebar: {"label":"Overview","order":0} -->
- [Maven Wrapper](content/build-tools/maven/wrapper.md): Pin Maven per project, generate and use the launcher scripts, and keep local and CI builds aligned.
- [Maven Plugins](content/build-tools/maven/plugins.md): Common build plugins and the role each plays.

#### npm

- [npm: Packages, Dependencies, and Scripts](content/build-tools/npm/index.md): Understand npm and Node.js, add dependencies, use package scripts, and install from a lockfile. <!-- sidebar: {"label":"Overview","order":0} -->

### Command-Line Tools

- [Homebrew: A Practical Guide](content/command-line-tools/homebrew.md): Install and maintain command-line tools and desktop apps with Homebrew.
- [jq: Query and Transform JSON](content/command-line-tools/jq.md): Essential filters, safe shell arguments, grouping, aggregation, and a worked order-summary example.
- [Pandoc: Convert Documents from the Command Line](content/command-line-tools/pandoc.md): Convert Markdown, HTML, Word documents, and PDFs with Pandoc.
- [Vim: A Practical Guide to the Modal Editor](content/command-line-tools/vim.md): Learn Vim's modes, movement, editing operators, search, save and quit commands, and essential shortcuts.

### Web Development

- [Chrome DevTools: A Developer's Field Guide](content/web-development/chrome-devtools.md): Inspect pages, debug JavaScript and network requests, test responsive behavior, and profile performance.

### Deployment

- [GitHub Pages](content/deployment/github-pages.md): Static site hosting, project and user site URLs, branch publishing, GitHub Actions setup, and troubleshooting.
- [Cloudflare Pages](content/deployment/cloudflare-pages.md): A practical site-and-API walkthrough, deployment workflows, configuration, routing, security, operations, and Pages versus Workers.

#### Feature Flags

- [LaunchDarkly](content/deployment/feature-flags/launchdarkly.md): Practical feature flags, Java/Spring integration, targeting, safe rollouts, testing, outage behavior, and flag lifecycle.

### Containers

#### Docker

- [Docker](content/containers/docker/index.md): Containers, images, architecture, a first local service, and the learning path. <!-- sidebar: {"label":"Overview","order":0} -->
- [Dockerfiles and Image Builds](content/containers/docker/dockerfiles-and-multi-stage-builds.md): Build contexts, instructions, caching, multi-stage builds, users, and build secrets.
- [Docker Images and Containers](content/containers/docker/build-tag-and-run.md): Build, tag, publish, run, inspect, and manage application containers.
- [Docker Storage](content/containers/docker/mounts-and-copying-files.md): Bind mounts, named volumes, permissions, persistence, and copying files.
- [Docker Networking](content/containers/docker/networking.md): Published ports, container DNS, service discovery, host access, and connectivity debugging.
- [Docker Compose](content/containers/docker/compose.md): Run a repeatable local stack with health checks, secrets, persistent data, and a PostgreSQL/Adminer lab.
- [Docker Troubleshooting and Daily Operations](content/containers/docker/troubleshooting.md): Diagnose builds, crashes, networking, permissions, health, disk usage, and safe cleanup.

### Networking

- [SSH, Keys, and GitHub](content/networking/ssh-keys-and-github.md): Key pairs, SSH agents, host configuration, and GitHub authentication.
- [NGINX](content/networking/nginx.md): Web serving, virtual hosts, location matching, reverse proxying, load balancing, and configuration troubleshooting.

### Security

#### OAuth 2.0

- [OAuth 2.0: Delegated API Authorization](content/security/oauth2/fundamentals.md): Start here for the industry standard, delegation model, authorization code flow, PKCE, and the distinction from OpenID Connect. <!-- sidebar: {"label":"Overview","order":0} -->
- [OAuth 2.0 Flow with Azure (Microsoft Entra ID)](content/security/oauth2/oauth2-with-azure.md): Authorization code flow with PKCE, sign-in versus authorization, token roles, and a Microsoft Graph example.
- [OAuth 2.0 Flow with Google](content/security/oauth2/oauth2-with-google.md): OIDC sign-in, Calendar API access, PKCE, consent, refresh tokens, and differences from Microsoft Entra ID.

### CI/CD

- [GitHub Actions](content/ci-cd/github-actions.md): Practical Maven CI, triggers, runners, outputs, artifacts, caching, security, deployments, and troubleshooting.

### Workflow Orchestration

#### Temporal

- [Temporal Overview](content/workflow-orchestration/temporal/index.md): Orchestration, replay, Activity value boundaries, and a production checklist. <!-- sidebar: {"label":"Overview","order":0} -->
- [Temporal Activities and Failures](content/workflow-orchestration/temporal/activities-and-failures.md): Timeouts, retries, heartbeats, cancellation, failure conversion, and duplicate-safe effects.
- [Temporal Data and History](content/workflow-orchestration/temporal/data-and-history.md): Payload limits, event counts, Continue-As-New, external storage, and retention.
- [Batch Processing with Temporal](content/workflow-orchestration/temporal/batch-processing.md): Pagination, snapshots, bounded concurrency, durable batch tables, and recovery.
- [Java Concurrency in Temporal](content/workflow-orchestration/temporal/java-concurrency.md): Workflow concurrency, asynchronous Activity completion, and SDK virtual-thread configuration.
- [Temporal Schedules](content/workflow-orchestration/temporal/schedules.md): CLI commands, interval timing, overlap policies, updates, pause, and deletion.

## Website

After GitHub Pages is enabled and the first deployment succeeds, browse the public website at [idanshal.github.io/explainers](https://idanshal.github.io/explainers/). The site is built from these Markdown files and deployed manually through **Actions → Deploy site**. For local preview and publishing setup, see [the website guide](site/README.md).

## Organization Conventions

- Give each explainer one canonical home based on its main teaching goal. Link to it from related articles instead of duplicating it.
- Use lowercase `kebab-case` filenames that name the subject. Omit redundant `explainer`, `explained`, and `explanation` suffixes and avoid repeating the parent topic.
- Include versions in filenames only when they materially define the subject. State other version applicability in the article.
- Avoid date and numeric prefixes unless an article is part of an explicitly ordered series.
- Keep `content/` portable Markdown: use H1 titles, relative `.md` links, and standard Markdown without site-specific frontmatter, components, or routes. Keep presentation and deployment code in `site/`.
- Use title case for article headings, preserving the spelling of code and product names.
- Keep folders shallow. Add subfolders when a real topic cluster emerges and `index.md` pages when a section becomes difficult to scan.
- Add every new explainer to this catalog with a relative link and a short description.
- Catalog and sidebar labels may be shorter than an article's H1, but should clearly identify the same subject.
- Keep supporting assets beside their article. If an article needs several supporting files, use a topic folder containing `README.md`, `assets/`, and `examples/` as needed.
- Identify the project in project-specific walkthroughs. If several such articles accumulate, group them under `case-studies/<project>/`.