import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCatalog } from './prepare-catalog.mjs';

test('preserves topic entries and nested groups', () => {
	const catalog = parseCatalog(`## Catalog
### Databases
- [Database Explainers](content/databases/index.md): An overview.
#### PostgreSQL
- [PostgreSQL](content/databases/postgresql/index.md): The product overview.
- [Fundamentals](content/databases/postgresql/fundamentals.md): The basics.
#### Neo4j
- [Neo4j](content/databases/neo4j/index.md): A graph database.
### CI/CD
- [GitHub Actions](content/ci-cd/github-actions.md): CI automation.
## Website
`);

	assert.equal(catalog.length, 2);
	assert.equal(catalog[0].route, '/databases/');
	assert.equal(catalog[0].entries.length, 4);
	assert.deepEqual(catalog[0].sections.map((section) => section.name), ['PostgreSQL', 'Neo4j']);
	assert.deepEqual(catalog[0].sections[0].entries.map((entry) => entry.route), [
		'/databases/postgresql/',
		'/databases/postgresql/fundamentals/',
	]);
	assert.equal(catalog[1].sections.length, 0);
	assert.equal(catalog[1].entries[0].route, '/ci-cd/github-actions/');
});