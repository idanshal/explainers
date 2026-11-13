# Explainers

Practical explanations of software concepts, tools, and common problems, organized by topic.

## Catalog

### AI

- [AI Concepts](content/ai/concepts.md): Start here for models, prompts, context, agents, tools, skills, memory, and RAG.
- [Coding Agents](content/ai/coding-agents.md): Copilot CLI, Claude Code, Codex, execution environments, permissions, and specialized skills.
- [Context Optimization](content/ai/context-optimization.md): Input filtering, output concision, and the tradeoffs of Caveman and RTK.
- [Model Context Protocol (MCP)](content/ai/mcp.md): Hosts, clients, servers, exposed capabilities, and documentation integrations.

### Databases

- [Database Explainers](content/databases/index.md): Browse database concepts and product-specific learning paths.
- [Neo4j](content/databases/neo4j/index.md): Graph fundamentals, Cypher, and Java/Spring Boot integration.
- [PostgreSQL](content/databases/postgresql/index.md): Relational fundamentals, an SQL lab, and Java/Spring Boot integration.
- [PostgreSQL Fundamentals](content/databases/postgresql/fundamentals.md): Tables, keys, SQL, connections, and transactions.
- [PostgreSQL and SQL: A Hands-On Lab](content/databases/postgresql/sql-lab.md): Set up PostgreSQL and query a bookstore database.
- [PostgreSQL with Java and Spring Boot](content/databases/postgresql/java-spring-boot.md): Connect with JDBC and build a Spring Data JPA API.
- [Choosing a Database: From Tables to Graphs](content/databases/database-types.md): Compare database models, use cases, and tradeoffs.
- [Graph Database Fundamentals](content/databases/graph-database-fundamentals.md): Nodes, relationships, graph modeling, Neo4j, and alternatives.
- [Neo4j and Cypher: A Hands-On Lab](content/databases/neo4j/neo4j-cypher-lab.md): Set up Neo4j and query a small graph step by step.
- [Neo4j with Java and Spring Boot](content/databases/neo4j/neo4j-java-spring-boot.md): Connect with the Java driver and Spring Data Neo4j.
- [Relational Table Patterns](content/databases/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](content/databases/foreign-keys-and-indexes.md): Relationships, integrity constraints, and indexing.
- [Flyway: Database Migrations and SQL Script Tracking](content/databases/flyway.md): What Flyway does, how to run it, and how filenames, checksums, and database history control SQL migrations.

### Java

- [Annotations](content/java/annotations.md): Annotation declarations, practical uses, and meta-annotations.
- [Java Streams](content/java/streams.md): Why to use streams, chained filters, flatMap, collectors, ordering, and common pitfalls.
- [Super Type Tokens](content/java/super-type-tokens.md): Capturing generic type metadata, type erasure, Spring and Jackson usage, and unresolved type-variable pitfalls.
- [Jackson 3 Mr Bean](content/java/jackson/jackson-3-mrbean.md): What the module does, how to configure it, and its limitations.
- [JPA ID Generation and Hibernate Schema Management](content/java/persistence/jpa-id-generation-and-hibernate-schema-management.md): ID generation, schema settings, and Spring Boot defaults.

### Spring Boot

- [AOP and Spring AOP](content/spring-boot/aop.md): Cross-cutting concerns, proxies, elapsed-time logging and retry annotations, advice ordering, and production pitfalls.
- [Constructor Injection](content/spring-boot/constructor-injection.md): Constructor injection compared with field and setter injection.
- [Managing Multiple Data Sources](content/spring-boot/multiple-data-sources.md): What a datasource is, current JDBC and JPA configuration patterns, transactions, migrations, and operational checks.
- [Spring Boot Dependency Breakdown](content/spring-boot/project-dependency-breakdown.md): A representative Maven application's dependencies, build settings, H2 console activation, and version considerations.
- [Database Connection Exhaustion in Tests](content/spring-boot/testing/database-connection-exhaustion.md): How contexts and connection pools affect database limits, with diagnosis steps and a worked PostgreSQL example.
- [Shared PostgreSQL Testcontainers](content/spring-boot/testing/shared-postgres-testcontainers.md): Container lifecycles, reusable declarations, and sharing PostgreSQL across tests.

### Build Tools

- [Maven Plugins](content/build-tools/maven-plugins.md): Common build plugins and the role each plays.

### Deployment

- [LaunchDarkly](content/deployment/launchdarkly.md): Practical feature flags, Java/Spring integration, targeting, safe rollouts, testing, outage behavior, and flag lifecycle.
- [Cloudflare Pages](content/deployment/cloudflare-pages.md): A practical site-and-API walkthrough, deployment workflows, configuration, routing, security, operations, and Pages versus Workers.

### Docker

- [Dockerfiles, Permissions, and Multi-Stage Builds](content/docker/dockerfiles-and-multi-stage-builds.md): Core instructions, build contexts, non-root users, secrets, and a Spring Boot build/runtime example.
- [Building, Tagging, and Running Images](content/docker/build-tag-and-run.md): Build and runtime flags, image tags and digests, publishing, networking, storage, and container lifecycle.
- [Mounts and Copying Files](content/docker/mounts-and-copying-files.md): Use host files through bind mounts, persist data with volumes, and copy files or directories into and out of containers.

### Networking

- [SSH, Keys, and GitHub](content/networking/ssh-keys-and-github.md): Key pairs, SSH agents, host configuration, and GitHub authentication.

### Security

- [OAuth 2.0: Delegated API Authorization](content/security/oauth2.md): Start here for the industry standard, delegation model, authorization code flow, PKCE, and the distinction from OpenID Connect.
- [OAuth 2.0 Flow with Azure (Microsoft Entra ID)](content/security/oauth2-with-azure.md): Authorization code flow with PKCE, sign-in versus authorization, token roles, and a Microsoft Graph example.
- [OAuth 2.0 Flow with Google](content/security/oauth2-with-google.md): OIDC sign-in, Calendar API access, PKCE, consent, refresh tokens, and differences from Microsoft Entra ID.

### Workflows

- [GitHub Actions](content/workflows/github-actions.md): Practical Maven CI, triggers, runners, outputs, artifacts, caching, security, deployments, and troubleshooting.
- [Temporal Overview](content/workflows/temporal/index.md): Start here for orchestration, replay, Activity value boundaries, and a production checklist.
- [Temporal Activities and Failures](content/workflows/temporal/activities-and-failures.md): Timeouts, retries, heartbeats, cancellation, failure conversion, and duplicate-safe effects.
- [Temporal Data and History](content/workflows/temporal/data-and-history.md): Payload limits, event counts, Continue-As-New, external storage, and retention.
- [Batch Processing with Temporal](content/workflows/temporal/batch-processing.md): Pagination, snapshots, bounded concurrency, durable batch tables, and recovery.
- [Java Concurrency in Temporal](content/workflows/temporal/java-concurrency.md): Workflow concurrency, asynchronous Activity completion, and SDK virtual-thread configuration.
- [Temporal Schedules](content/workflows/temporal/schedules.md): CLI commands, interval timing, overlap policies, updates, pause, and deletion.

## Website

After GitHub Pages is enabled and the first deployment succeeds, browse the public website at [idanshal.github.io/explainers](https://idanshal.github.io/explainers/). The site is built from these Markdown files and deployed manually through **Actions → Deploy site**. For local preview and publishing setup, see [the website guide](site/README.md).

## Organization Conventions

- Give each explainer one canonical home based on its main teaching goal. Link to it from related articles instead of duplicating it.
- Use lowercase `kebab-case` filenames that name the subject. Omit redundant `explainer`, `explained`, and `explanation` suffixes and avoid repeating the parent topic.
- Include versions in filenames only when they materially define the subject. State other version applicability in the article.
- Avoid date and numeric prefixes unless an article is part of an explicitly ordered series.
- Keep `content/` portable Markdown: use H1 titles, relative `.md` links, and standard Markdown without site-specific frontmatter, components, or routes. Keep presentation and deployment code in `site/`.
- Keep folders shallow. Add subfolders when a real topic cluster emerges and `index.md` pages when a section becomes difficult to scan.
- Add every new explainer to this catalog with a relative link and a short description.
- Keep supporting assets beside their article. If an article needs several supporting files, use a topic folder containing `README.md`, `assets/`, and `examples/` as needed.
- Identify the project in project-specific walkthroughs. If several such articles accumulate, group them under `case-studies/<project>/`.