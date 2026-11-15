---
title: "Databases"
---

# Databases

A database stores organized information and provides ways to query and change it. Database management systems also control access, concurrency, integrity, and recovery. Relational databases model tables and transactions; graph databases model nodes, relationships, and traversal. Choose a model from the application's access patterns and guarantees, not only from a product name.

See [Choosing a Database](../../../../content/databases/concepts/database-types.md) for a comparison of database
models and their use cases. Then follow a topic or product path below.

## General Concepts

- [Choosing a Database: From Tables to Graphs](../../../../content/databases/concepts/database-types.md): Database models and tradeoffs.
- [Graph Database Fundamentals](../../../../content/databases/concepts/graph-database-fundamentals.md): Nodes, relationships, graph modeling, and alternatives.
- [Relational Table Patterns](../../../../content/databases/concepts/relational-table-patterns.md): Common table roles and how they model relational data.
- [Foreign Keys and Indexes](../../../../content/databases/concepts/foreign-keys-and-indexes.md): Relational integrity and indexing, with PostgreSQL examples.
- [Flyway](../../../../content/databases/migrations/flyway.md): Database migrations and SQL script tracking.

## Database Products

- [Neo4j](neo4j/index.md): A graph database, from Cypher to Java and Spring Boot.
- [PostgreSQL](postgresql/index.md): Relational fundamentals, a hands-on SQL lab, and Java/Spring Boot integration.

For important data, plan least-privilege access, migrations, backups, and tested recovery. Local exercises should use disposable databases and credentials.