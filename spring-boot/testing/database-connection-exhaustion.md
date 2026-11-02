# Why Spring Boot Tests Run Out of Database Connections

Several Spring Boot integration tests can exhaust a database's connection limit, even when each test passes on its own. The usual cause is not the number of test classes by itself. It is the number of live application contexts, the pools in those contexts, and how many connections those pools are using at the same time.

## The connection math

Each application context that configures a `DataSource` normally creates its own connection pool. A pool's `maximum-pool-size` is its limit, not a guarantee that it immediately opens that many connections. The total possible use is roughly:

```text
live contexts × pools per context × maximum connections per pool
```

For example, eleven live contexts with one pool each and a maximum size of ten could use up to 110 connections. In practice, actual usage depends on demand and each pool's minimum-idle setting. HikariCP defaults `minimum-idle` to `maximum-pool-size`, so a pool can grow toward its full size without waiting for application traffic.

The database limit is shared by all clients, not just the test pools. Application instances, migrations, monitoring, other test processes, and administrative sessions also use connections. Therefore, a test suite can hit a limit below the database's configured `max_connections`.

## Why test classes can create more pools

Spring's TestContext framework caches application contexts and reuses a cached context when test configurations match. Several test classes can share one context. A different configuration can require another context, however, and each live context may retain its own pool.

Context differences can include:

- Different configuration classes or initializers
- Different active profiles or test properties
- Different mock or spy bean definitions
- Different imported test configurations
- `@DirtiesContext`, which tells Spring to evict and close a context

So “eleven test classes” does not necessarily mean eleven pools. It could mean one shared pool, or multiple pools if the classes use distinct configurations. Tests running in separate JVMs also have separate context caches and pools.

## Find the source before changing settings

Check the database's current connection count and limit while the suite is running:

```sql
SHOW max_connections;

SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY count(*) DESC;
```

Then inspect the test setup for distinct Spring configurations, `@DirtiesContext`, forked test processes, parallel test execution, and the number of `DataSource` beans or pools per context. A connection count near the sum of pool capacities points toward pool sizing or context proliferation; many idle sessions can indicate retained pools or a high `minimum-idle` value.

## Reduce unnecessary pools

Where tests have the same application requirements, use consistent test configuration so Spring can reuse the context. A shared base class can help keep annotations and properties aligned, but inheritance alone does not force classes to share a context: their merged configurations still need to match.

Use `@DirtiesContext` only when a test has changed shared application state in a way that cannot be cleaned up. Evicting a context closes its pool, but rebuilding it creates additional startup work and may create another pool while other contexts remain live.

## Set a test-appropriate pool size

Integration tests often need fewer concurrent database connections than a production service. Set a modest maximum in test configuration, then raise it only if tests genuinely need more concurrent connections:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 2
      minimum-idle: 1
```

This limits each pool; it does not merge pools or reduce the number of application contexts. Choose a value that supports the test's concurrency, and account for all contexts and test JVMs that can run at once.

## Understand what container sharing does

A shared database container and a shared connection pool solve different problems. A single Postgres container can still receive connections from many application contexts, each with its own pool.

With Spring Boot 3.1 or later, `@ServiceConnection` can create connection details from a Testcontainers instance and supply them to Boot's auto-configuration. For example, a Spring-managed container configuration can be imported by integration tests:

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

Spring manages that container bean for the lifetime of its application context. Tests that reuse the same cached context can therefore reuse its container as well. If the suite creates multiple contexts, it can also create multiple container beans. `@ServiceConnection` wires connection details; it does not make contexts or pools shared.

Alternatively, a Testcontainers `@Container` static field is shared across test methods in its test class. It is not, by itself, a suite-wide singleton across separate test classes. For a container deliberately shared across classes, Testcontainers documents a manual singleton-container lifecycle pattern. Manage that lifecycle carefully, particularly when tests run in parallel.

## A practical order of fixes

1. Count live contexts and identify why each distinct context is needed.
2. Make equivalent test configurations consistent so Spring can reuse contexts.
3. Reduce test pool capacity and idle connections to fit expected parallelism.
4. Avoid unnecessary `@DirtiesContext` and overlapping test JVMs.
5. Share a container when container startup or duplication is the issue, while remembering that this does not combine connection pools.

Reducing `maximum-pool-size` to two can be a sensible test setting, but it is not a substitute for understanding how many pools are alive. The durable fix is to keep both the number of contexts and the capacity of each pool within the database's connection budget.

## References

- [Spring Boot: Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html) — container lifecycle and `@ServiceConnection`.
- [Spring Framework: Context Caching](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html) — how test application contexts are cached.
- [HikariCP: Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby) — pool size and minimum-idle settings.
- [Testcontainers: JUnit 5 integration](https://java.testcontainers.org/test_framework_integration/junit_5/) — static `@Container` lifecycle.
- [PostgreSQL: Connection settings](https://www.postgresql.org/docs/current/runtime-config-connection.html) — `max_connections` behavior.

Container lifecycle options are covered in [Sharing PostgreSQL Testcontainers in Spring Boot Tests](shared-postgres-testcontainers.md).