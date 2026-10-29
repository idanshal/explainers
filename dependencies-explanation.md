# Dependency Breakdown

This document explains each dependency and build setting in the project, why it is included, and what role it plays.

## Parent POM

| Component | Purpose |
|---|---|
| `spring-boot-starter-parent` (`4.1.1`) | Provides dependency management, plugin configuration defaults, and sensible resource filtering/encoding defaults. This is why the dependencies below do not need explicit `<version>` tags — the parent’s BOM (Bill of Materials) supplies compatible versions automatically. |

## Dependencies

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-boot-h2console` | default | Enables the H2 web console, an in-browser UI for inspecting and querying your H2 database at runtime, typically at `/h2-console`. In older Spring Boot versions this console support was bundled more implicitly; Spring Boot 4.x split it into its own dedicated starter, which is why it appears as a separate artifact here. |
| `spring-boot-starter-data-jpa` | default | Pulls in Spring Data JPA, Hibernate (the default JPA provider), the JDBC layer, and transaction management. This is what allows you to define `@Entity` classes and `Repository` interfaces without writing boilerplate DAO or SQL code. |
| `spring-boot-starter-webmvc` | default | Provides Spring MVC, an embedded servlet container (Tomcat by default), Jackson for JSON serialization, and validation integration for web applications. This is needed to expose REST endpoints and controllers. In Spring Boot `≤3.x`, this was commonly known as `spring-boot-starter-web`; the naming here reflects the newer 4.x structure. |
| `spring-boot-starter-validation` | default | Adds Bean Validation support using Jakarta Validation and its implementation (typically Hibernate Validator). This lets you use annotations such as `@NotNull`, `@Size`, `@Email`, and `@Valid` to validate incoming request bodies, DTOs, and model objects automatically. It is especially useful in REST APIs for rejecting invalid client input early and consistently. |
| `spring-boot-starter-actuator` | default | Adds production-ready monitoring and management endpoints such as health checks, metrics, environment info, and application insight endpoints. This is useful for observability, readiness/liveness checks, and integration with monitoring tools. Common examples include endpoints for application health and metrics exposure. |
| `com.h2database:h2` | `runtime` | The actual H2 database engine and JDBC driver. It uses `runtime` scope because application code does not directly import H2 classes — it is accessed through JDBC/JPA abstractions, so it is only needed when the application runs and connects to the database. |
| `spring-boot-starter-data-jpa-test` | `test` | Provides testing support for the JPA and persistence layer, including tools such as `@DataJpaTest`, embedded test database setup, and transaction rollback behavior for isolated repository testing without loading the entire application context. |
| `spring-boot-starter-webmvc-test` | `test` | Provides testing support for the web layer, including `@WebMvcTest`, `MockMvc` for simulating HTTP requests without starting a real server, JSON assertion helpers, and related test infrastructure. |

## Note on Test Starters

| Component Group | Explanation |
|---|---|
| `spring-boot-starter-data-jpa-test` + `spring-boot-starter-webmvc-test` | These appear to be the Spring Boot 4.x equivalents or splits of what used to be the single catch-all `spring-boot-starter-test`, which historically bundled JUnit, Mockito, AssertJ, MockMvc, and JPA test support together. |

## Build Plugin

| Component | Purpose |
|---|---|
| `spring-boot-maven-plugin` | Repackages the application into an executable “fat jar” containing the embedded server and all required dependencies. It also enables commands such as `mvn spring-boot:run` and running the packaged app with `java -jar app.jar`. Without it, `mvn package` would typically produce a thin jar that is not standalone-runnable. |

## Properties

| Property | Purpose |
|---|---|
| `java.version = 25` | Tells Spring Boot’s parent POM which Java language level and bytecode target to compile against, allowing it to configure the Maven compiler plugin accordingly. |

## Important Version Note

| Topic | Explanation |
|---|---|
| Spring Boot 4.x naming and structure | Several artifact names here — `spring-boot-starter-webmvc`, `spring-boot-h2console`, `spring-boot-starter-data-jpa-test`, `spring-boot-starter-webmvc-test`, and Spring Boot version `4.1.1` — reflect a newer restructuring associated with Spring Boot 4.x. Since Spring Boot 3.x was, for a long time, the latest widely documented GA line, older tutorials and documentation may use different names such as `spring-boot-starter-web` and the unified `spring-boot-starter-test`. If this project definition came from a recent generator such as start.spring.io, it is likely correct — just newer than much of the documentation you may find online. |