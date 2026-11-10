# Explainers

Practical explanations of software concepts, tools, and common problems, organized by topic.

## Catalog

### AI

- [AI Concepts](ai/concepts.md): Start here for models, prompts, context, agents, tools, skills, memory, and RAG.
- [Coding Agents](ai/coding-agents.md): Copilot CLI, Claude Code, Codex, execution environments, permissions, and specialized skills.
- [Context Optimization](ai/context-optimization.md): Input filtering, output concision, and the tradeoffs of Caveman and RTK.
- [Model Context Protocol (MCP)](ai/mcp.md): Hosts, clients, servers, exposed capabilities, and documentation integrations.

### Databases

- [Relational Table Patterns](databases/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](databases/foreign-keys-and-indexes.md): Relationships, integrity constraints, and indexing.
- [Flyway: Database Migrations and SQL Script Tracking](databases/flyway.md): What Flyway does, how to run it, and how filenames, checksums, and database history control SQL migrations.

### Java

- [Annotations](java/annotations.md): Annotation declarations, practical uses, and meta-annotations.
- [Java Streams](java/streams.md): Why to use streams, chained filters, flatMap, collectors, ordering, and common pitfalls.
- [Super Type Tokens](java/super-type-tokens.md): Capturing generic type metadata, type erasure, Spring and Jackson usage, and unresolved type-variable pitfalls.
- [Jackson 3 Mr Bean](java/jackson/jackson-3-mrbean.md): What the module does, how to configure it, and its limitations.
- [JPA ID Generation and Hibernate Schema Management](java/persistence/jpa-id-generation-and-hibernate-schema-management.md): ID generation, schema settings, and Spring Boot defaults.

### Spring Boot

- [Constructor Injection](spring-boot/constructor-injection.md): Constructor injection compared with field and setter injection.
- [Managing Multiple Data Sources](spring-boot/multiple-data-sources.md): What a datasource is, current JDBC and JPA configuration patterns, transactions, migrations, and operational checks.
- [Spring Boot Dependency Breakdown](spring-boot/project-dependency-breakdown.md): A representative Maven application's dependencies, build settings, H2 console activation, and version considerations.
- [Database Connection Exhaustion in Tests](spring-boot/testing/database-connection-exhaustion.md): How contexts and connection pools affect database limits, with diagnosis steps and a worked PostgreSQL example.
- [Shared PostgreSQL Testcontainers](spring-boot/testing/shared-postgres-testcontainers.md): Container lifecycles, reusable declarations, and sharing PostgreSQL across tests.

### Build Tools

- [Maven Plugins](build-tools/maven-plugins.md): Common build plugins and the role each plays.

### Deployment

- [Cloudflare Pages](deployment/cloudflare-pages.md): Deployment workflows, runtime boundaries, and when to consider Pages versus Workers.

### Docker

- [Dockerfiles, Permissions, and Multi-Stage Builds](docker/dockerfiles-and-multi-stage-builds.md): Core instructions, build contexts, non-root users, secrets, and a Spring Boot build/runtime example.
- [Building, Tagging, and Running Images](docker/build-tag-and-run.md): Build and runtime flags, image tags and digests, publishing, networking, storage, and container lifecycle.
- [Mounts and Copying Files](docker/mounts-and-copying-files.md): Use host files through bind mounts, persist data with volumes, and copy files or directories into and out of containers.

### Networking

- [SSH, Keys, and GitHub](networking/ssh-keys-and-github.md): Key pairs, SSH agents, host configuration, and GitHub authentication.

### Security

- [OAuth 2.0: Delegated API Authorization](security/oauth2.md): Start here for the industry standard, delegation model, authorization code flow, PKCE, and the distinction from OpenID Connect.
- [OAuth 2.0 Flow with Azure (Microsoft Entra ID)](security/oauth2-with-azure.md): Authorization code flow with PKCE, sign-in versus authorization, token roles, and a Microsoft Graph example.
- [OAuth 2.0 Flow with Google](security/oauth2-with-google.md): OIDC sign-in, Calendar API access, PKCE, consent, refresh tokens, and differences from Microsoft Entra ID.

### Workflows

- [Temporal Overview](workflows/temporal/README.md): Start here for orchestration, replay, Activity value boundaries, and a production checklist.
- [Temporal Activities and Failures](workflows/temporal/activities-and-failures.md): Timeouts, retries, heartbeats, cancellation, failure conversion, and duplicate-safe effects.
- [Temporal Data and History](workflows/temporal/data-and-history.md): Payload limits, event counts, Continue-As-New, external storage, and retention.
- [Batch Processing with Temporal](workflows/temporal/batch-processing.md): Pagination, snapshots, bounded concurrency, durable batch tables, and recovery.
- [Java Concurrency in Temporal](workflows/temporal/java-concurrency.md): Workflow concurrency, asynchronous Activity completion, and SDK virtual-thread configuration.
- [Temporal Schedules](workflows/temporal/schedules.md): CLI commands, interval timing, overlap policies, updates, pause, and deletion.

## Organization Conventions

- Give each explainer one canonical home based on its main teaching goal. Link to it from related articles instead of duplicating it.
- Use lowercase `kebab-case` filenames that name the subject. Omit redundant `explainer`, `explained`, and `explanation` suffixes and avoid repeating the parent topic.
- Include versions in filenames only when they materially define the subject. State other version applicability in the article.
- Avoid date and numeric prefixes unless an article is part of an explicitly ordered series.
- Keep folders shallow. Add subfolders when a real topic cluster emerges and category READMEs when a section becomes difficult to scan.
- Add every new explainer to this catalog with a relative link and a short description.
- Keep supporting assets beside their article. If an article needs several supporting files, use a topic folder containing `README.md`, `assets/`, and `examples/` as needed.
- Identify the project in project-specific walkthroughs. If several such articles accumulate, group them under `case-studies/<project>/`.