# Neo4j

Neo4j is a graph database that stores entities as nodes, their connections as directed relationships, and attributes as properties. Its Cypher query language matches and traverses graph patterns, such as people following other people or services depending on other services.

Choose a graph model when relationship traversal is central to the workload, not merely because records have relationships. Stable identifiers, constraints, query design, access control, and backups still matter. Applications commonly connect through the Bolt protocol using an official driver or a framework integration.

New to databases? Begin with [Choosing a Database](../concepts/database-types.md), then
read these in order:

1. [Graph Database Fundamentals](../concepts/graph-database-fundamentals.md): Learn nodes, relationships, modeling, Neo4j, and alternatives.
2. [Neo4j and Cypher Lab](neo4j-cypher-lab.md): Set up Neo4j and run queries against a sample graph.
3. [Neo4j with Java and Spring Boot](neo4j-java-spring-boot.md): Connect an application using the driver and Spring Data Neo4j.

For a comparison with other data models, see [Databases](../index.md).