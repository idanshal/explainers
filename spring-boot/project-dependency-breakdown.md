# Spring Boot Dependency Breakdown

This guide explains a representative Maven configuration for a Spring Boot servlet-based REST application using JPA, H2, validation, and Actuator. It describes a sample, not a particular project's dependency inventory. Keep only the dependencies your application needs.

**Example baseline:** Spring Boot 4.1.1 and Java 25. These are example versions, not a claim that they are the latest releases. Use a supported Boot release and JDK combination, and let its parent POM or BOM manage compatible dependencies.

## Parent POM

| Component | Purpose |
|---|---|
| `spring-boot-starter-parent` (`4.1.1`) | Provides dependency management, plugin configuration defaults, and sensible resource filtering/encoding defaults. This is why the dependencies below do not need explicit `<version>` tags — the parent’s BOM (Bill of Materials) supplies compatible versions automatically. |

## Dependencies

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-boot-h2console` | default | Supplies Boot 4's H2 web-console integration module, not a starter. Adding it does not by itself enable the console; see the development-only configuration below. |
| `spring-boot-starter-data-jpa` | default | Pulls in Spring Data JPA, Hibernate (the default JPA provider), the JDBC layer, and transaction management. This is what allows you to define `@Entity` classes and `Repository` interfaces without writing boilerplate DAO or SQL code. |
| `spring-boot-starter-webmvc` | default | Provides Spring MVC, an embedded servlet container (Tomcat by default), Jackson for JSON serialization, and validation integration for web applications. This is needed to expose REST endpoints and controllers. In Spring Boot `≤3.x`, this was commonly known as `spring-boot-starter-web`; the naming here reflects the newer 4.x structure. |
| `spring-boot-starter-validation` | default | Adds Bean Validation support using Jakarta Validation and its implementation (typically Hibernate Validator). MVC can validate a request body when its parameter is annotated with `@Valid` and the model has constraints such as `@NotNull`, `@Size`, or `@Email`. Simply constructing an annotated object does not validate it automatically. |
| `spring-boot-starter-actuator` | default | Adds production-ready monitoring and management endpoints such as health checks, metrics, environment info, and application insight endpoints. This is useful for observability, readiness/liveness checks, and integration with monitoring tools. Common examples include endpoints for application health and metrics exposure. |
| `com.h2database:h2` | `runtime` | The actual H2 database engine and JDBC driver. It uses `runtime` scope because application code does not directly import H2 classes — it is accessed through JDBC/JPA abstractions, so it is only needed when the application runs and connects to the database. |
| `spring-boot-starter-data-jpa-test` | `test` | Provides testing support for the JPA and persistence layer, including tools such as `@DataJpaTest`, embedded test database setup, and transaction rollback behavior for isolated repository testing without loading the entire application context. |
| `spring-boot-starter-webmvc-test` | `test` | Provides testing support for the web layer, including `@WebMvcTest`, `MockMvc` for simulating HTTP requests without starting a real server, JSON assertion helpers, and related test infrastructure. |

### Enable the H2 Console Only for Development

For a servlet-based application with H2 and `spring-boot-h2console` on the classpath, explicitly enable the console in `application-dev.properties`:

```properties
spring.h2.console.enabled=true
```

Activate the `dev` profile for local development. The default console path is `/h2-console`; keep it disabled in production. Spring Boot DevTools can supply the enabling property during development, but the dependencies listed above do not include DevTools. If Spring Security is present, the console also needs narrowly scoped security configuration; do not disable application-wide protections just to make it accessible.

## Note on Test Starters

| Component Group | Explanation |
|---|---|
| `spring-boot-starter-data-jpa-test` + `spring-boot-starter-webmvc-test` | Boot 4 provides focused test starters for persistence and MVC. They bring the relevant test modules and common test infrastructure. The general-purpose `spring-boot-starter-test` still exists; older Boot releases packaged much of the slice-test support in `spring-boot-test-autoconfigure`. Select starters for the features you test rather than assuming every application needs both. |

## Build Plugin

| Component | Purpose |
|---|---|
| `spring-boot-maven-plugin` | Provides the `repackage` goal for building an executable archive containing the application and its runtime dependencies, including the embedded server in this sample. With Boot's parent POM, declaring the plugin inherits the `repackage` execution. Without that execution, `mvn package` normally creates an ordinary JAR rather than a standalone Boot archive. The plugin also provides `mvn spring-boot:run`. |

## Properties

| Property | Purpose |
|---|---|
| `java.version = 25` | Tells Spring Boot’s parent POM which Java language level and bytecode target to compile against, allowing it to configure the Maven compiler plugin accordingly. |

## Important Version Note

| Topic | Explanation |
|---|---|
| Spring Boot 4.x naming and structure | Boot 4 modularized auto-configuration and test support. Its `spring-boot-starter-webmvc`, `spring-boot-h2console`, and focused test starters should not be copied unchanged into a Boot 3 application. Consult the documentation for your exact Boot version and inspect Maven's effective POM and resolved dependency tree instead of inferring compatibility from a dependency name. |

## References

- [Spring Boot: SQL databases and the H2 console](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Spring Boot: Testing](https://docs.spring.io/spring-boot/reference/testing/index.html)
- [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/maven-plugin/)