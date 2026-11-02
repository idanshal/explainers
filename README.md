# Explainers

Practical explanations of software concepts, tools, and common problems, organized by topic.

## Catalog

### AI

- [Concepts, Agents, Skills, and MCP](ai/concepts-agents-skills-and-mcp.md): Core AI terminology, coding agents, context tools, and MCP integrations.

### Databases

- [Relational Table Patterns](databases/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](databases/foreign-keys-and-indexes.md): Relationships, integrity constraints, and indexing.

### Java

- [Annotations](java/annotations.md): Annotation declarations, practical uses, and meta-annotations.
- [Jackson 3 Mr Bean](java/jackson/jackson-3-mrbean.md): What the module does, how to configure it, and its limitations.
- [JPA ID Generation and Hibernate Schema Management](java/persistence/jpa-id-generation-and-hibernate-schema-management.md): ID generation, schema settings, and Spring Boot defaults.

### Spring Boot

- [Constructor Injection](spring-boot/constructor-injection.md): Constructor injection compared with field and setter injection.
- [Project Dependency Breakdown](spring-boot/project-dependency-breakdown.md): A project-specific walkthrough of dependencies, build settings, and version considerations.
- [Database Connection Exhaustion in Tests](spring-boot/testing/database-connection-exhaustion.md): Why test suites create too many database connections and how to diagnose the cause.
- [Shared PostgreSQL Testcontainers](spring-boot/testing/shared-postgres-testcontainers.md): Container lifecycles, reusable declarations, and sharing PostgreSQL across tests.

### Build Tools

- [Maven Plugins](build-tools/maven-plugins.md): Common build plugins and the role each plays.

### Networking

- [SSH, Keys, and GitHub](networking/ssh-keys-and-github.md): Key pairs, SSH agents, host configuration, and GitHub authentication.

### Workflows

- [Temporal Best Practices](workflows/temporal-best-practices.md): Activities, data, retries, timeouts, and schedules.

## Organization Conventions

- Give each explainer one canonical home based on its main teaching goal. Link to it from related articles instead of duplicating it.
- Use lowercase `kebab-case` filenames that name the subject. Omit redundant `explainer`, `explained`, and `explanation` suffixes and avoid repeating the parent topic.
- Include versions in filenames only when they materially define the subject. State other version applicability in the article.
- Avoid date and numeric prefixes unless an article is part of an explicitly ordered series.
- Keep folders shallow. Add subfolders when a real topic cluster emerges and category READMEs when a section becomes difficult to scan.
- Add every new explainer to this catalog with a relative link and a short description.
- Keep supporting assets beside their article. If an article needs several supporting files, use a topic folder containing `README.md`, `assets/`, and `examples/` as needed.
- Identify the project in project-specific walkthroughs. If several such articles accumulate, group them under `case-studies/<project>/`.