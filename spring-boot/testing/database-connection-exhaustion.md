# Why Spring Boot Tests Run Out of Database Connections

Spring Boot integration tests can pass individually but fail as a suite with a database error such as PostgreSQL's **"too many connections."**

One common cause is **too many connection pools, too much capacity per pool, or both**. Different test configurations can create separate Spring application contexts, each normally with its own pool. Their combined connections can exceed the database's limit.

## What's happening

An **application context** is the collection of Spring beans created for a particular configuration. When that configuration includes a database, those beans normally include a `DataSource` backed by a **connection pool**. The pool keeps database connections open so the application can reuse them.

Imagine three test classes using the same PostgreSQL container but different Spring configurations:

```text
Test class A -> Spring context A -> HikariCP pool A --+
Test class B -> Spring context B -> HikariCP pool B --+--> One PostgreSQL database
Test class C -> Spring context C -> HikariCP pool C --+
```

**One database container does not mean one connection pool.** Each pool has its own connection budget, but they all count toward the same database limit.

### The connection math

For pools connected to the same database server, the potential connection demand is:

```text
Total pool capacity = sum of the maximum sizes of all live pools

If each context has one pool of the same size:
Total pool capacity = live contexts x maximum connections per pool
```

Include pools in every test JVM that uses that server. Leave room for other applications, tools, and reserved connection slots too.

The maximum is a ceiling, not a promise that a pool opens all its connections immediately. Actual usage depends on demand and idle-connection settings. HikariCP defaults its maximum pool size to **10** and, unless configured otherwise, its `minimum-idle` to the maximum pool size. Pools therefore try to maintain that many connections even without active queries.

Reducing pool capacity can lower connection demand, but it does not reduce the number of pools. Reusing an application context avoids creating another pool in the first place.


## Why multiple test classes can create multiple pools

Spring caches application contexts so that test classes with matching configurations can reuse them. Finishing a test class does not normally close its cached context, so its pool can stay open while other test classes run. **Tests do not have to run in parallel for several pools to remain alive.**

The important distinction is:

```text
Matching Spring configurations:
Multiple test classes -> 1 cached context -> 1 pool

Different Spring configurations:
Multiple test classes -> multiple cached contexts -> multiple pools
```

Configuration differences that can require separate contexts include:

- Different active profiles, such as `test` versus `integration`
- Different properties in `@SpringBootTest` or `@TestPropertySource`
- Different mock or spy bean definitions
- Different configuration classes, imports, or initializers

Separate test JVMs also have separate context caches. Even identical test configurations cannot share a context across those processes.

## How to fix it

### 1. Confirm what is consuming connections

Before changing the test structure, count the live application contexts, connection pools, and test JVMs that use the database. Compare their pool capacities with the database's available connections.

Check whether connections are idle in pools or remain checked out after tests finish. The first can indicate excess pool capacity; the second can indicate unclosed connections or unfinished transactions. Use the queries and logs described in [How to confirm the diagnosis](#how-to-confirm-the-diagnosis).

### 2. Use a pool size that fits your tests

Choose `spring.datasource.hikari.maximum-pool-size` based on how many connections a test needs simultaneously and how many pools can be alive together. Use `minimum-idle` to control how many idle connections each pool tries to keep ready.

A smaller pool is a valid test configuration when it supports the workload. It is not automatically a band-aid, and there is no universally correct size. Concurrent database work or nested transactions may require more connections than a simple sequential test.

Put test-specific settings in test configuration, not production configuration. If you use `src/test/resources/application-test.yml`, activate the `test` profile, for example with `@ActiveProfiles("test")`.

### 3. Remove unnecessary configuration differences

When tests genuinely need the same setup, align their profiles, properties, imports, and mock definitions so Spring can reuse a context. **Matching configuration enables reuse; a shared parent class is not required.**

#### Start with annotations directly on each test class

"Explicit annotations" simply means writing the setup on each test class, rather than inheriting it from a base class. These independent classes each request the full Spring Boot application and activate the same test profile:

```java
@SpringBootTest
@ActiveProfiles("test")
class OrderIntegrationTest {
}

@SpringBootTest
@ActiveProfiles("test")
class CustomerIntegrationTest {
}
```

They can reuse a cached context if their remaining configuration matches. Different properties, imports, or mock definitions can still require separate contexts. Repeating two annotations is often clearer than introducing a base class only to hold them.

#### Import a configuration when tests need the same extra beans

Annotations such as `@SpringBootTest` select the test setup. A **test configuration** defines additional Spring-managed objects, or beans, that the test needs. `@Import` tells Spring to include those bean definitions in the test's application context.

For example, suppose application code accepts an injected `Clock`, but the application does not already define a `Clock` bean. Tests can supply a fixed clock so time-dependent behavior is repeatable. Define this configuration under `src/test/java`:

```java
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration(proxyBeanMethods = false)
class FixedClockTestConfiguration {

  @Bean
  Clock testClock() {
    return Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
  }
}
```

Each test that needs this clock opts in with `@Import`:

```java
@SpringBootTest
@ActiveProfiles("test")
@Import(FixedClockTestConfiguration.class)
class OrderIntegrationTest {
}

@SpringBootTest
@ActiveProfiles("test")
@Import(FixedClockTestConfiguration.class)
class CustomerIntegrationTest {
}
```

`@TestConfiguration` marks this as test-only configuration; Spring Boot's normal component scanning does not automatically include a top-level test configuration. `@Bean` registers the clock, and `@Import` explicitly adds the configuration alongside the application's normal setup. If the application already defines a clock bean, use an explicit bean-replacement strategy rather than accidentally adding a competing bean.

**These tests reuse bean definitions. They share the actual clock instance only if they also reuse the same application context.** Separate contexts create their own clock beans, just as they create their own connection pools. Importing the same configuration does not by itself force context sharing.

The clock is only an illustration. The same pattern works for other test-specific beans; container examples are in the [Testcontainers explainer](shared-postgres-testcontainers.md).

#### Add an abstraction only when it helps

If the same annotation combination appears in many tests, a composed annotation such as `@PostgresIntegrationTest` can bundle it. This is optional configuration reuse, not a requirement for caching. Likewise, keep shared beans in focused imported configurations rather than putting every test dependency into a large superclass.

Inheritance can suit a genuine shared testing contract, but it can also hide configuration, lifecycle methods, and mutable state. Do not introduce it merely to reuse annotations. Do not force unrelated tests into the same setup either: the goal is to remove unnecessary differences, not all differences.

### 4. Review context restarts and parallelism

`@DirtiesContext` tells Spring to remove and close a cached context. A later test that needs it must build another one, including a new pool.

Closing the context normally closes its pool, so `@DirtiesContext` does not simply accumulate pools forever. It does cause expensive restarts, however. Use it when a test changes shared application state that cannot otherwise be cleaned up, not as a routine connection-management fix.

Also check parallel test execution and forked test JVMs: each additional process can add its own pools to the same database.

### 5. Treat container sharing as a separate decision

Container sharing controls database startup and lifecycle. Context reuse and pool sizing control how many connections the application opens.

- **One shared PostgreSQL container can still receive connections from many pools.**
- `@ServiceConnection` supplies connection details to Spring Boot; it does not merge contexts or pools.
- A static `@Container` field is shared across methods in its test class, not automatically started once for the entire suite, even when inherited from a base class.
- A Spring-managed container bean belongs to its application context. Reusing that context also reuses the bean; separate contexts can create separate containers.

See [Sharing PostgreSQL Testcontainers in Spring Boot Tests](shared-postgres-testcontainers.md) for lifecycle patterns and configuration examples.

## Worked example: several pools targeting one PostgreSQL container

Consider a suite like the reported case: the tests use PostgreSQL in Testcontainers, and reducing the maximum pool size appears to resolve a "too many connections" failure.

For illustration, assume:

- The PostgreSQL server is configured with `max_connections = 100`.
- Eleven distinct application contexts remain live, each with one HikariCP pool connected to that server.
- Each pool has a maximum size of ten.

```text
11 live contexts x 10 connections per pool = up to 110 connections
```

That potential demand exceeds the server's limit, even before accounting for other clients and reserved slots. Eleven test classes alone would not prove this diagnosis: they might share a context. Check the actual contexts and pools.

Suppose these particular tests need no more than two simultaneous connections per pool. This test-profile configuration could then be appropriate:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 2
      minimum-idle: 1
```

```text
11 live contexts x 2 connections per pool = up to 22 connections
```

**Two is only an example for this assumed workload, not a recommended default for all tests.** The change lowers each pool's capacity; all eleven pools still exist. Review whether configuration differences are creating unnecessary contexts as well.

If equivalent tests can share one context, they can also share its pool. If the contexts genuinely need to differ, keep them separate and size their pools within the shared connection budget.

## How to confirm the diagnosis

While the suite is running, check PostgreSQL's configured limit and the connections to the test database:

```sql
SHOW max_connections;

SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY count(*) DESC;
```

This query shows the current database's sessions; the server's connection limit is shared across databases. If these counts do not explain the failure, check other databases and clients on the same server too.

Compare the counts with Spring's context-cache statistics and HikariCP pool startup/shutdown logs. Many idle database sessions can be connections held ready by pools, rather than a connection leak. If contexts are being reused but connections remain checked out after tests finish, investigate unclosed connections or unfinished transactions too.

## Summary

| What you find | What to do |
|---|---|
| Equivalent tests create separate contexts | Align their profiles, properties, imports, and mock definitions. |
| Several necessary pools exceed the connection budget | Size pools for actual concurrency and the total available connections. |
| Contexts are repeatedly rebuilt | Check whether `@DirtiesContext` is really needed. |
| Several test JVMs use the same database | Account for every process's pools; reduce overlapping processes if needed. |
| One shared container still runs out of connections | Check the pools connected to it; container sharing does not combine them. |

**The goal is not necessarily one context or one container. It is to keep the total connections from all live pools within the database's available connection budget.**

## References

- [Spring Boot: Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html) - test configuration and explicit imports.
- [Spring Boot: Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html) — container lifecycle and `@ServiceConnection`.
- [Spring Framework: Context Caching](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html) — how test application contexts are cached.
- [HikariCP: Configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby) — pool size and minimum-idle settings.
- [Testcontainers: JUnit 5 integration](https://java.testcontainers.org/test_framework_integration/junit_5/) — static `@Container` lifecycle.
- [PostgreSQL: Connection settings](https://www.postgresql.org/docs/current/runtime-config-connection.html) — `max_connections` behavior.
