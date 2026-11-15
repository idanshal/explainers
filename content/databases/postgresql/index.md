# PostgreSQL

PostgreSQL is an open-source relational database management system. It stores rows in tables, uses SQL for querying and changes, and provides constraints and transactions to help preserve data integrity under concurrent use.

Applications connect through a driver and authenticate as a database role. Tables, indexes, schema migrations, and connection pools remain relevant whether the application uses SQL directly or an object-relational mapper such as Hibernate. A local instance is useful for learning; a deployed database also needs security, backups, monitoring, and an upgrade plan.

New to databases? Begin with [Choosing a Database](../concepts/database-types.md), then
follow this learning path:

1. [PostgreSQL Fundamentals](fundamentals.md): Tables, keys, SQL, connections, and transactions.
2. [PostgreSQL and SQL Lab](sql-lab.md): Start PostgreSQL and query a bookstore database.
3. [PostgreSQL with Java and Spring Boot](java-spring-boot.md): Use JDBC and build a Spring Data JPA API.

## Related Guides

- [Foreign Keys and Indexes](../concepts/foreign-keys-and-indexes.md): Relational integrity and PostgreSQL indexing behavior.
- [Relational Table Patterns](../concepts/relational-table-patterns.md): Common relational modeling patterns.
- [Flyway](../migrations/flyway.md): Track and apply database migrations.
- [Database Connection Exhaustion in Tests](../../spring-boot/testing/database-connection-exhaustion.md): Connection pools and a worked PostgreSQL example.
- [Shared PostgreSQL Testcontainers](../../spring-boot/testing/shared-postgres-testcontainers.md): PostgreSQL containers in Spring Boot tests.

For a comparison with other data models, see [Databases](../index.md).