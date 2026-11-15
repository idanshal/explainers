# Databases

A database stores organized data and provides ways to query and change it. A database management system also controls access, concurrency, integrity, and recovery. Choosing one means matching its data model and guarantees to the application's operations, not simply choosing a popular product.

## Choosing a Starting Point

Relational databases organize data into tables and commonly use SQL, keys, constraints, and transactions. They are a strong starting point for applications with structured records and relationships. Graph databases represent entities as nodes and connections as relationships, which can make connected-data traversal more natural.

Document, key-value, and other database models serve different access patterns. The important questions are what you need to read and write, which consistency and integrity guarantees matter, how the workload scales, and how the system will be operated and backed up.

PostgreSQL is a relational database; Neo4j is a graph database. Neither model eliminates the need to design identifiers, enforce business rules, handle failures, or plan migrations. Learn the underlying model before treating a framework's persistence API as the database itself.

For a broader comparison, read [Choosing a Database](concepts/database-types.md). The related material below provides deeper concepts and hands-on product examples.

## General Concepts

- [Choosing a Database: From Tables to Graphs](concepts/database-types.md): Database models and tradeoffs.
- [Graph Database Fundamentals](concepts/graph-database-fundamentals.md): Nodes, relationships, graph modeling, and alternatives.
- [Relational Table Patterns](concepts/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](concepts/foreign-keys-and-indexes.md): Relational integrity and indexing, with PostgreSQL examples.
- [Flyway](migrations/flyway.md): Database migrations and SQL script tracking.

## Database Products

- [Neo4j](neo4j/index.md): A graph database, from Cypher to Java and Spring Boot.
- [PostgreSQL](postgresql/index.md): Relational fundamentals, a hands-on SQL lab, and Java/Spring Boot integration.

Use a disposable local database for experiments. For important data, plan authentication, least-privilege access, migrations, backups, and tested recovery from the beginning.