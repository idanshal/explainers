# PostgreSQL Fundamentals

Research checked: 2026-11-12

New to database models? Start with [Choosing a Database](../database-types.md).
Then read this guide before the [PostgreSQL SQL Lab](sql-lab.md).

## What Is PostgreSQL?

PostgreSQL, often called **Postgres**, is an open-source relational database
management system. It stores data, accepts queries, enforces constraints, and
coordinates concurrent users. Applications connect to a PostgreSQL server; the
server manages the data. PostgreSQL uses SQL, with PostgreSQL-specific features
and extensions. It is not the same thing as SQL: SQL is a query language, while
PostgreSQL is one database system that implements it.

PostgreSQL is a strong general-purpose choice for orders, payments, inventory,
business applications, reporting, and many other workloads needing structured
data and transactions. It also supports JSON, full-text search, geospatial data
through extensions, and other features. Those capabilities do not imply it is
always the best choice for specialized search, graph traversal, or very large
distributed workloads; compare requirements and measure representative queries.
Alternatives include MySQL, MariaDB, SQL Server, Oracle Database, and SQLite,
each with its own features, operating model, and licensing.

## The Relational Model

Imagine a small bookstore:

| Table | Example row | Purpose |
| --- | --- | --- |
| `customers` | `1, Alice` | One customer |
| `books` | `10, Graphs, 25.00` | One book and its price |
| `orders` | `100, 1` | An order belonging to customer 1 |
| `order_items` | `100, 10, 2` | Two copies of book 10 in order 100 |

A **table** contains rows; a **column** describes one field and has a data type.
A **primary key** identifies a row within a table and cannot be null. A
**foreign key** refers to a key in another table, enforcing that a non-null
reference exists. A `NOT NULL` constraint is needed if the relationship is
required. An order can have many items; the `order_items` table expresses the
relationship between orders and books and carries the quantity.

A **join** combines related rows in a query. Tables are not files an
application should directly modify; clients send SQL to PostgreSQL. See
[Relational Table Patterns](../relational-table-patterns.md) and
[Foreign Keys and Indexes](../foreign-keys-and-indexes.md) for deeper examples.

## SQL at a Glance

```sql
SELECT customer.name, orders.id
FROM customers AS customer
JOIN orders ON orders.customer_id = customer.id
WHERE customer.name = 'Alice'
ORDER BY orders.id;
```

`SELECT` chooses output columns, `FROM` identifies the starting table, `JOIN`
combines matching rows, `WHERE` filters them, and `ORDER BY` specifies output
order. Single quotes delimit string values; unquoted identifiers are folded to
lowercase. Without `ORDER BY`, row order is not guaranteed. SQL is declarative:
you describe the desired result, and PostgreSQL chooses an execution plan.

You will also use `CREATE TABLE` to define data, `INSERT` to add rows, `UPDATE`
to change rows, and `DELETE` to remove them. `NULL` represents an unknown or
missing value: use `IS NULL`, not `= NULL`. The lab explains and runs these
operations on one consistent example.

## Server, Database, Schema, and Client

| Term | Meaning |
| --- | --- |
| Server / instance | The running PostgreSQL processes managing a cluster of databases |
| Database | An isolated collection of schemas and other objects to which a client connects |
| Schema | A namespace within a database; `public` is a common default |
| Role | A database identity that can own objects or receive privileges; a login role can connect |
| `psql` | PostgreSQL's interactive command-line client, not the database server itself |
| Driver | A library an application uses to connect, such as the PostgreSQL JDBC driver |

The word **cluster** in PostgreSQL can mean the databases managed by one server
instance, not necessarily a group of machines. A `schema.table` name identifies
a table in a schema. `psql` commands such as `\dt` are client commands, not
SQL. Connecting requires a reachable host and port, database name, user, and
authentication; permissions determine what that user may do afterward.

## Transactions and Concurrent Work

A transaction groups operations into an all-or-nothing unit. For example,
creating an order and its items should either succeed together or roll back
together. `BEGIN`, `COMMIT`, and `ROLLBACK` control explicit transactions;
without an explicit transaction, each successful statement normally commits
individually in `psql`'s default mode.

PostgreSQL uses multi-version concurrency control (**MVCC**) so queries can see
consistent snapshots while other transactions modify data. This does not remove
the need to reason about isolation, locks, retries, or conflicting writes. The
default isolation level is `READ COMMITTED`; a transaction's successive queries
can see newly committed changes. Higher isolation levels have different behavior
and may require retries. ACID describes transactional properties, not a
substitute for a correct application design or backups.

## What to Learn Next

1. Use the [SQL lab](sql-lab.md) to start PostgreSQL and try statements yourself.
2. Use [Java and Spring Boot](java-spring-boot.md) to connect an application.
3. Learn constraints, indexes, query plans, migrations, backup and restore, and
   access control before treating a database as production-ready. Indexes speed
   up some reads but cost storage and write work; use `EXPLAIN` on realistic
   queries rather than indexing every column.

## References

- [PostgreSQL Tutorial](https://www.postgresql.org/docs/18/tutorial.html)
- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL: Schemas](https://www.postgresql.org/docs/18/ddl-schemas.html)