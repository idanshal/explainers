# Choosing a Database: From Tables to Graphs

Research checked: 2026-11-12

Start here if you are new to databases or want to understand where Neo4j fits.
Next: [Graph Database Fundamentals](graph-database-fundamentals.md), then the
[Neo4j and Cypher Lab](neo4j/neo4j-cypher-lab.md).

## What Is a Database?

A database stores data so that applications can retrieve and change it. A
database management system (DBMS), such as PostgreSQL or Neo4j, manages that
data and provides ways to query it, control access, and recover from failures.
The **data model** describes how the database organizes and represents data.

An online bookstore, for example, needs to store customers, books, orders, and
the connections between them. The best database depends on which questions it
must answer, how often data changes, and its operational requirements.

## Common Database Models

| Model | Organizes data as | Useful for | Examples | Common tradeoff |
| --- | --- | --- | --- | --- |
| Relational | Tables of rows and columns, related using keys | Orders, accounting, inventory, and reporting with well-defined data and transactions | PostgreSQL, MySQL, SQL Server | Many relationship hops can require complex joins |
| Document | Documents, often JSON-like, with fields and nested objects | Product catalogs, content, and evolving record shapes | MongoDB, Couchbase | Cross-document relationships and consistency still need design |
| Key-value | A value looked up by a unique key | Caching, sessions, and fast lookups | Redis, Amazon DynamoDB | Queries not based on a key may need additional indexes or modeling |
| Wide-column | Rows partitioned by key, organized for large-scale access patterns | Large, distributed workloads with predictable query patterns | Apache Cassandra, ScyllaDB | Flexible ad hoc joins and transactions may be limited |
| Graph | Nodes connected by relationships, often with properties on both | Recommendations, fraud rings, dependency maps, and identity relationships | Neo4j, Amazon Neptune, JanusGraph | Not automatically the best choice for simple lookups or tabular reporting |
| Time-series | Time-stamped measurements and events | Metrics, monitoring, and sensor readings | InfluxDB, TimescaleDB | Optimized for time-based workloads, not every data shape |
| Search | Indexed documents and terms | Full-text search, relevance ranking, and log search | Elasticsearch, OpenSearch | Often complements a primary database rather than replacing it |

These categories overlap. PostgreSQL supports relational data, JSON documents,
and full-text search; Redis has more than simple string values. A product's
capabilities, transaction guarantees, managed service options, and version
matter more than its category label. **NoSQL** is a broad umbrella for several
non-relational approaches, not a single data model or a guarantee of any
particular consistency behavior.

## The Same Question in Different Models

Suppose Alice follows Bob, and Bob follows Carol. You want to find people Alice
could meet through someone she follows.

- In a relational database, a `people` table and a `follows` table can express
  this. Join `follows` to itself to follow two relationships. SQL can handle
  graphs and recursive queries, too.
- In a document database, each person's document could list followed person
  IDs. Following those IDs may require additional lookups or aggregation; the
  exact options depend on the product.
- In a graph database, people are nodes and `FOLLOWS` relationships connect
  them. A graph query describes the two-hop pattern directly.

Graph databases are especially worth evaluating when relationship types, paths,
and multiple hops are central to the questions. This is not a promise that a
graph database is faster for every query: benchmark realistic data and access
patterns. For straightforward orders, aggregations, or existing relational
workloads, a relational database is often a simpler starting point.

## How to Choose

1. List your important questions and write examples using representative data.
2. Identify transaction, consistency, availability, latency, and scale needs.
   ACID describes transaction properties; it is not exclusive to relational
   databases, and exact guarantees depend on the product and deployment.
3. Compare modeling and query complexity, then benchmark realistic workloads.
4. Include hosting, operations, backup, security, cost, and team familiarity.
5. Consider more than one database only when the benefit justifies the extra
   synchronization, consistency, and operational work.

## References

- [PostgreSQL: JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Neo4j: Graph Database Concepts](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/)
- [MongoDB: Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/)