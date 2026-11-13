# Neo4j and Cypher: A Hands-On Lab

Research checked: 2026-11-12

Previous: [Graph Database Fundamentals](../graph-database-fundamentals.md). Next:
[Neo4j with Java and Spring Boot](neo4j-java-spring-boot.md).

This lab uses a small social network. Run the sections in order in a **fresh,
local database**. The examples target Neo4j Community `2026.10.2`; syntax and
features can vary by version or edition. You do not need Java for this lab.

## 1. Start Neo4j

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/)
or another working Docker engine. In a terminal, run:

```bash
docker run --name neo4j-lab -d \
  -p 127.0.0.1:7474:7474 -p 127.0.0.1:7687:7687 \
  -e NEO4J_AUTH=neo4j/graphpass123 \
  -v neo4j-lab-data:/data \
  neo4j:2026.10.2
```

Docker downloads the image on first use. This example password is only for a
local tutorial; use a strong secret and appropriate network security elsewhere.
The named volume persists database data even if the container is removed. An
existing volume retains its existing credentials: changing `NEO4J_AUTH` does
not reset its password. The command binds ports to your computer only.

Open [Neo4j Browser](http://localhost:7474), connect to
`bolt://localhost:7687`, and sign in as `neo4j` with `graphpass123`. Browser
uses port 7474 for its web interface and Bolt on 7687 for database access. Wait
for startup if connection initially fails; `docker logs neo4j-lab` shows status.
Paste each Cypher block separately into Browser and run it. Select the `neo4j`
database if asked. An alternative is [Neo4j Aura](https://neo4j.com/cloud/aura/),
a managed cloud service: follow its setup and use its provided URI and credentials
instead of the local ones. Service plans and limits can change.

## 2. Create the Sample Graph

First create a uniqueness constraint for the application ID. It prevents two
`Person` nodes with the same non-null `id`; it does not require every person to
have an ID. A constraint also has a backing index.

```cypher
CREATE CONSTRAINT person_id IF NOT EXISTS
FOR (person:Person) REQUIRE person.id IS UNIQUE;
```

Run the following as one statement. `MERGE` matches the specified pattern or
creates it if absent. We merge nodes by stable IDs before merging each edge, so
rerunning this seed sequentially does not create duplicates.

```cypher
MERGE (alice:Person {id: 'alice'}) SET alice.name = 'Alice'
MERGE (bob:Person {id: 'bob'}) SET bob.name = 'Bob'
MERGE (carol:Person {id: 'carol'}) SET carol.name = 'Carol'
MERGE (dana:Person {id: 'dana'}) SET dana.name = 'Dana'
MERGE (alice)-[aliceBob:FOLLOWS]->(bob) SET aliceBob.since = 2022
MERGE (bob)-[bobCarol:FOLLOWS]->(carol) SET bobCarol.since = 2023
MERGE (alice)-[aliceDana:FOLLOWS]->(dana) SET aliceDana.since = 2024
RETURN alice, bob, carol, dana;
```

The seed sets those names and years on each run. It is not a general guarantee
against duplicate relationships under concurrent writes; model and enforce
concurrency requirements separately. `CREATE` always creates a new matching
entity, while `MERGE` matches the *whole supplied pattern*, not a partial one.
Do not include mutable properties such as `name` in the identity pattern.

## 3. Read Nodes and Relationships

```cypher
MATCH (person:Person)
RETURN person.id AS id, person.name AS name
ORDER BY name;
```

Expected names: Alice, Bob, Carol, Dana. `MATCH` finds patterns; `RETURN`
selects columns; `AS` names them. Results are unordered unless `ORDER BY` is
specified. A missing property evaluates to `null`; use `IS NULL`, not `= null`.

```cypher
MATCH (alice:Person {id: 'alice'})-[follow:FOLLOWS]->(other:Person)
RETURN other.name AS name, follow.since AS since
ORDER BY name;
```

Expected: Bob / 2022 and Dana / 2024. `->` follows outgoing edges. Reverse it
with `<-` for incoming edges; `-[:FOLLOWS]-` matches either direction.

```cypher
MATCH (person:Person)
WHERE person.name STARTS WITH 'C'
RETURN person.name AS name;
```

Expected: Carol. `WHERE` filters matches; predicates also include `=`, `>`,
`AND`, `OR`, and `IN`.

## 4. Traverse Multiple Hops

```cypher
MATCH (:Person {id: 'alice'})-[:FOLLOWS]->(middle:Person)-[:FOLLOWS]->(candidate:Person)
RETURN middle.name AS via, candidate.name AS candidate
ORDER BY candidate;
```

Expected: Bob / Carol. This is a two-hop pattern, not a recommendation engine:
real recommendations may need to exclude existing follows, the starting
person, and duplicates, and rank candidates.

```cypher
MATCH path = (:Person {id: 'alice'})-[:FOLLOWS*1..2]->(person:Person)
RETURN person.name AS name, length(path) AS hops
ORDER BY hops, name;
```

Expected: Bob and Dana at one hop, Carol at two. `*1..2` is the established
variable-length relationship syntax: use a bounded range to control work.
Each matching path produces a row, so the same person can appear more than once;
`DISTINCT` removes duplicate projected values. Current Cypher also offers
quantified path patterns; consult the manual for version-specific syntax.

## 5. Aggregate and Update

```cypher
MATCH (person:Person)-[:FOLLOWS]->(other:Person)
RETURN person.name AS person, count(other) AS following
ORDER BY following DESC, person;
```

Expected: Alice / 2, Bob / 1. This `MATCH` excludes people with no outgoing
follows. `OPTIONAL MATCH` can keep them, with missing matches represented by
`null`; `count(other)` ignores nulls.

```cypher
MATCH (person:Person {id: 'dana'})
SET person.city = 'London'
RETURN person.name AS name, person.city AS city;
```

Expected: Dana / London. `SET` changes properties. `REMOVE person.city` removes
that property. The seed does not remove extra properties like `city`.

## 6. Parameters and Deletion

Parameters keep values separate from the query. In Neo4j Browser, first set a
Browser parameter, then run the query in a separate execution:

```cypher
:param personId => 'alice'
```

```cypher
MATCH (person:Person {id: $personId})
RETURN person.name AS name;
```

Expected: Alice. `:param` is a Browser command, not Cypher; applications pass
parameters through their driver. Avoid constructing queries by concatenating
untrusted input.

To delete one relationship, match it and `DELETE` it. A node with relationships
cannot be deleted with plain `DELETE`; `DETACH DELETE` removes its relationships
too. These examples change the graph, so reseed afterward to restore follows:

```cypher
MATCH (:Person {id: 'alice'})-[follow:FOLLOWS]->(:Person {id: 'dana'})
DELETE follow;
```

```cypher
MATCH (person:Person {id: 'dana'})
DETACH DELETE person;
```

`MATCH` can match multiple records, so inspect it with `RETURN` before deleting.
Never run broad deletion commands against a database containing data you need.

## 7. Explore, Stop, and Clean Up

Try finding everyone who follows Carol, changing a follow's `since`, or adding
another two-hop route to Carol and observing duplicate rows. Run `EXPLAIN` before
a query to inspect its plan without executing it; `PROFILE` executes the query,
including writes, and reports actual work. Indexes help locate starting nodes,
but relationship expansion and large result sets still have a cost.

```bash
docker stop neo4j-lab
docker start neo4j-lab
```

Stopping and starting retains data. To remove the container and **permanently
delete this lab's data and credentials**, use the following only after verifying
you no longer need them:

```bash
docker rm -f neo4j-lab
docker volume rm neo4j-lab-data
```

If ports are already in use, choose different host ports in `docker run` and
use them in Browser and your application. If a name is taken, choose a new
container name. If authentication fails with a reused volume, use its existing
credentials; changing the environment variable does not replace them.

## References

- [Neo4j in Docker](https://neo4j.com/docs/operations-manual/current/docker/introduction/)
- [Cypher Cheat Sheet](https://neo4j.com/docs/cypher-cheat-sheet/current/)
- [Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Cypher Query Tuning](https://neo4j.com/docs/cypher-manual/current/planning-and-tuning/)