# Sharing PostgreSQL Testcontainers in Spring Boot Tests

Testcontainers can manage a PostgreSQL container per test method, per test class, or for the lifetime of a Spring application context. Those choices affect startup time and test isolation. They are separate from how Spring Boot learns the database connection details.

This guide covers the JUnit Jupiter extension and Spring Boot's test integration. The examples use PostgreSQL; other services use their own Testcontainers module and may have different Spring connection support.

## First: Which annotations belong together?

The annotations depend on who owns the container lifecycle:

| Approach | Main annotations | Who starts and stops the container? |
| --- | --- | --- |
| JUnit Jupiter extension | `@Testcontainers` on the test class and `@Container` on fields | Testcontainers' JUnit extension |
| Spring-managed container bean | `@Bean`, optionally `@ServiceConnection` | Spring, for the application context lifetime |
| Imported container declarations | `@ImportTestcontainers` on Spring test configuration; `@Container` on declarations | Spring Boot's Testcontainers integration |
| JUnit 4 rule integration | `@Rule` or `@ClassRule` | JUnit 4 and Testcontainers' rule integration |

`@Container` is not a general-purpose annotation that starts a container by itself. With JUnit Jupiter it is discovered by `@Testcontainers`. For Spring Boot's imported-declaration approach, it marks fields in the imported declaration type. Spring bean methods use `@Bean` instead.

## JUnit Jupiter: static versus instance fields

With `org.testcontainers:junit-jupiter` in Testcontainers 1.x, or `org.testcontainers:testcontainers-junit-jupiter` in 2.x, the extension uses the field's static-ness to decide its lifecycle:

```java
@Testcontainers
class PostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16");

    // Tests in this class share the static container.
}
```

A `static` container starts once before the class's tests and stops after the class finishes. An instance container starts before each test method and stops afterward:

```java
@Testcontainers
class IsolatedPostgresTest {

    @Container
    final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16");
}
```

The instance form gives each method a fresh container, but is usually much slower. The static form shares a database server across methods in one class, so tests must account for data left by earlier methods.

### A Spring context lifecycle trap

JUnit's static field is class-scoped, not automatically shared across the whole test suite. Spring's test context cache can keep an `ApplicationContext` alive after a test class finishes. If that context holds a datasource pointing at the class's stopped container, a later class can reuse the context and fail when it tries to connect.

For Spring Boot integration tests, prefer a container whose lifecycle follows the cached Spring context. A static `@Container` field is still useful for plain JUnit tests, or when the context/container lifetime is deliberately managed to match.

## Spring-managed containers

Spring Boot can start a container declared as a bean and stop it when the application context closes. Tests that reuse that context can reuse its container as well. If tests create distinct contexts, each context can have its own container. The factory method may be `static`; it is still an ordinary Spring bean with a context-scoped lifecycle. `static` does not make it a suite-wide singleton.

```java
@TestConfiguration(proxyBeanMethods = false)
class PostgresTestConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>("postgres:16");
    }
}
```

Import the configuration into the integration test:

```java
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class OrderRepositoryIntegrationTest {
}
```

This route does not use JUnit's `@Testcontainers` extension or `@Container` field annotation. Spring owns the bean and its lifecycle. The `@ServiceConnection` annotation is optional if the test supplies connection properties another way.

There is no special lifecycle benefit to using `@ImportTestcontainers` instead of `@Import` when your configuration already declares a container as a Spring bean. `@Import(PostgresTestConfiguration.class)` is the normal choice for that pattern. An imported configuration can also declare a `DynamicPropertyRegistrar` bean to add runtime-derived properties:

```java
@Bean
DynamicPropertyRegistrar postgresProperties(PostgreSQLContainer<?> postgres) {
    return registry -> {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    };
}
```

`DynamicPropertyRegistrar` is available in Spring Framework 6.2 and later. This registrar is itself a Spring bean, so regular `@Import` loads it as part of the configuration.

## Import a reusable container declaration

Spring Boot's `@ImportTestcontainers` is convenient when you want to keep container declarations in a separate class or interface and import them into test configuration. The declaration can be shared by multiple test configurations without making each test class repeat the container setup.

```java
interface PostgresContainers {

    @Container
    @ServiceConnection
    PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16");
}
```

```java
@TestConfiguration(proxyBeanMethods = false)
@ImportTestcontainers(PostgresContainers.class)
class SharedContainersConfiguration {
}
```

```java
@SpringBootTest
@Import(SharedContainersConfiguration.class)
class OrderRepositoryIntegrationTest {
}
```

The imported declarations are managed as part of Spring's test configuration, so the container stays available for as long as the cached context needs it. “Imported once” means the declaration is included by that configuration; it does not guarantee one global container for every test in every JVM. Distinct contexts can still create distinct containers.

`@ImportTestcontainers` is part of Spring Boot's `spring-boot-testcontainers` integration and has been available since Spring Boot 3.1.0. It imports static Testcontainers fields and `@DynamicPropertySource` methods from the declaration type into the Spring `ApplicationContext`. This is the convenience when you want to reuse field-and-method declarations without converting them into `@Bean` methods or a `DynamicPropertyRegistrar` bean. Regular `@Import` does not perform that Testcontainers-specific discovery. If you already have `@Bean` methods or a registrar, regular `@Import` is sufficient.

## What `@ServiceConnection` does

`@ServiceConnection` tells Spring Boot to derive service connection details from a Testcontainers container. For a typed PostgreSQL container, Boot's Testcontainers integration creates connection-details beans, such as `JdbcConnectionDetails`, which its datasource auto-configuration consumes. The container's mapped host and port are discovered for you.

It does **not** start the container on its own, make containers shared, or merge datasource pools. The lifecycle still comes from the chosen mechanism: Spring bean/import configuration or the JUnit extension.

### With and without `@ServiceConnection`

With `@ServiceConnection`, the test can omit manual datasource URL, username, and password wiring:

```java
@Container
@ServiceConnection
static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");
```

Without it, the application still needs the container's connection values. One common option is `@DynamicPropertySource`:

```java
@Container
static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");

@DynamicPropertySource
static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
}
```

`@DynamicPropertySource` is more explicit and works for settings that do not have a Boot service-connection factory. `@ServiceConnection` is less boilerplate for supported services. When both connection details and ordinary connection properties exist, Boot's service connection details take precedence for the auto-configuration that consumes them.

For a Spring-managed typed `PostgreSQLContainer`, `@ServiceConnection` can be placed on the `@Bean` method. With an untyped `GenericContainer`, Boot cannot infer the service from the return type; use `@ServiceConnection(name = "postgres")` when a matching connection factory supports that image, or wire the properties explicitly.

## `withReuse(true)` is different

Testcontainers reusable containers are an experimental, explicit opt-in feature intended primarily for local development. They can stay running after the test process and be reused by a later run when the container configuration matches.

Enable reuse outside the classpath, for example in `~/.testcontainers.properties`:

```properties
testcontainers.reuse.enable=true
```

Then configure and start the container manually:

```java
PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withReuse(true);

postgres.start();
```

This is not equivalent to a static field. A static field shares a normally managed container across test methods in one class; reuse can keep a matching container alive across test runs. Do not combine reusable-container mode with JUnit-managed `@Container` cleanup: reuse requires explicit lifecycle control and the container must not be stopped by the extension or application code. Testcontainers also advises against relying on reuse in CI.

## Maven dependencies for PostgreSQL

You need the PostgreSQL Testcontainers module and the PostgreSQL JDBC driver. Add the JUnit integration if using `@Testcontainers` and `@Container`. Add Spring Boot's Testcontainers module if using `@ServiceConnection` or `@ImportTestcontainers`.

For Spring Boot 4 with Testcontainers 2.x, a typical test dependency set is:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-testcontainers</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers-junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers-postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Use the Spring Boot parent or BOM to manage compatible Spring and Testcontainers versions; avoid independently choosing versions unless you have a reason to override the managed set. The exact Testcontainers artifact IDs differ across major versions:

| Testcontainers 1.x, common with Spring Boot 3.x | Testcontainers 2.x, common with Spring Boot 4.x |
| --- | --- |
| `org.testcontainers:junit-jupiter` | `org.testcontainers:testcontainers-junit-jupiter` |
| `org.testcontainers:postgresql` | `org.testcontainers:testcontainers-postgresql` |

Projects can override dependency management, so check the resolved versions rather than assuming a Spring Boot major version guarantees a particular Testcontainers major version. The PostgreSQL JDBC driver is a separate dependency; the Testcontainers PostgreSQL module does not supply it.

## Quick choice

- Plain JUnit Jupiter tests: `@Testcontainers` plus a static `@Container` for one container per class.
- Spring Boot integration tests: prefer a Spring-managed container bean or `@ImportTestcontainers` so its lifetime matches the cached context. Use regular `@Import` for a configuration that already declares beans or a `DynamicPropertyRegistrar`.
- Supported service and Spring Boot integration on the classpath: add `@ServiceConnection` to remove manual connection-property wiring.
- Unsupported service or custom connection setup: use `@DynamicPropertySource` or another explicit configuration route.
- Faster repeated local runs: consider `withReuse(true)` only with manual lifecycle management; do not treat it as the default CI strategy.

## References

- [Spring Boot: Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html) — Spring-managed containers, JUnit integration, imported declarations, and service connections.
- [Spring Boot 3.3 API: `@ImportTestcontainers`](https://docs.spring.io/spring-boot/3.3/api/java/org/springframework/boot/testcontainers/context/ImportTestcontainers.html) — supported declaration elements and `Since: 3.1.0`.
- [Spring Boot: Development-time services](https://docs.spring.io/spring-boot/reference/features/dev-services.html) — `@ImportTestcontainers` configuration example.
- [Testcontainers: JUnit Jupiter](https://java.testcontainers.org/test_framework_integration/junit_5/) — static and instance field lifecycles and the JUnit dependency.
- [Testcontainers: PostgreSQL module](https://java.testcontainers.org/modules/databases/postgres/) — PostgreSQL module and JDBC driver requirement.
- [Testcontainers: Reusable containers](https://java.testcontainers.org/features/reuse/) — experimental reuse behavior and opt-in setup.

Related: [Why Spring Boot Tests Run Out of Database Connections](database-connection-exhaustion.md).