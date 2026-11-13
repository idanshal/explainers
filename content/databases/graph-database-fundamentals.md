# Graph Database Fundamentals

Research checked: 2026-11-12

Previous: [Choosing a Database](database-types.md). Next: [Neo4j and Cypher Lab](neo4j/neo4j-cypher-lab.md).

## The Idea

A graph represents things and the connections between them. A graph database
stores and queries that structure. Instead of asking only "which records match
these fields?", you can ask "which things are connected, how, and through which
paths?"

Consider a social network:

```text
(Alice) --FOLLOWS--> (Bob) --FOLLOWS--> (Carol)
    \------------------------------------FOLLOWS--> (Dana)
```

Alice follows Bob and Dana. Bob follows Carol. Carol is reachable from Alice in
two hops via Bob, but Alice does not necessarily follow Carol directly.
Direction matters: Alice following Bob does not imply Bob follows Alice.

## Property Graph Vocabulary

Neo4j uses a **property graph** model:

| Term | Meaning | Example |
| --- | --- | --- |
| Node | An entity or thing | Alice |
| Label | A classification on a node; a node can have multiple labels | `Person` |
| Relationship | A directed connection from one node to another, with one type | Alice `FOLLOWS` Bob |
| Property | A named value on a node or relationship | Alice's `name`, or a follow's `since` year |
| Path | A sequence of nodes connected by relationships | Alice to Bob to Carol |
| Traversal | Following relationships through the graph | Find people followed by people Alice follows |
| Pattern | A shape to find or create | `(alice)-[:FOLLOWS]->(bob)` |

A relationship always has a stored direction, but a query may ignore it. Node
labels and relationship types help describe meaning; the database does not
automatically enforce every business rule implied by their names. Neo4j
properties support scalar values and lists of supported property values, not
arbitrary nested maps stored as a single property.

In Neo4j's Cypher query language, a concrete pattern looks like this:

```cypher
(alice:Person {name: 'Alice'})-[:FOLLOWS {since: 2022}]->(bob:Person {name: 'Bob'})
```

Parentheses represent nodes, square brackets represent relationships, arrows
show direction, and braces contain properties. `alice` and `bob` are query
variables, not stored identifiers. The pattern alone illustrates syntax; use it
inside a clause such as `MATCH` or `CREATE` to execute it.

## Graphs and Relational Tables

Both models can represent the same information. A relational design might use
`person(id, name)` and `follows(follower_id, followed_id, since)`, with foreign
keys to `person`. A graph has `Person` nodes and `FOLLOWS` relationships with
a `since` property. A table join and a graph traversal are different ways to
express related-data queries; neither is inherently wrong or always faster.

An index helps find a starting person by ID; relationships then support
traversing from that person to neighbors. Indexes do not make a huge number of
possible paths free: branching, path length, filters, and result size matter.
Use constraints for identity, look at query plans, and test with realistic data.
See [Foreign Keys and Indexes](foreign-keys-and-indexes.md) for relational
integrity and indexing.

## Modeling Questions First

1. Write questions such as "Who can Alice reach in two follows?" and "When did
   Alice start following Bob?"
2. Make independently meaningful things nodes: people, products, organizations.
3. Give connections explicit meaning and direction: `FOLLOWS`, `WORKS_FOR`,
   `PURCHASED`.
4. Put simple attributes on the thing or connection they describe. Make an
   attribute a node when it has its own identity, relationships, or lifecycle.
5. Define stable application IDs and uniqueness constraints, then test the
   questions against representative data.

For example, model a purchase as a relationship if only its date matters; use
an `Order` node if the purchase has line items, payment, and its own lifecycle.
Model time explicitly when history matters: a single current `WORKS_FOR` edge
does not automatically preserve past employers.

## What Is Neo4j?

Neo4j is a graph database management system with a property graph model, ACID
transactions, and Cypher for querying. Applications use a driver over the Bolt
protocol; Neo4j Browser provides an interactive query interface. You can run it
locally, in Docker, or use the managed Neo4j Aura service. Community and
Enterprise editions differ in features and licensing; check current terms.
Cypher is Neo4j's query language, not SQL, though it uses familiar clauses such
as `WHERE` and `ORDER BY`. Compatibility with other graph products varies.

Alternatives include Amazon Neptune (managed graph service, supporting graph
query models including property graphs and RDF), JanusGraph (a distributed
graph database), and relational databases with recursive SQL. RDF triple stores
such as Apache Jena and Neptune's RDF mode use subject-predicate-object triples
and SPARQL, a different model and query language from Neo4j's property graph and
Cypher. Compare managed offerings, query languages, data needs, operational
costs, licensing, and actual workloads rather than assuming drop-in compatibility.

## References

- [Neo4j: Graph Database Concepts](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/)
- [Neo4j: Data Modeling](https://neo4j.com/docs/getting-started/data-modeling/)
- [Amazon Neptune Documentation](https://docs.aws.amazon.com/neptune/)
- [JanusGraph Documentation](https://docs.janusgraph.org/)