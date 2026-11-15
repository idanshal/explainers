import assert from 'node:assert/strict';
import test from 'node:test';
import { createSidebar, parseCatalog } from './prepare-catalog.mjs';

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

test('sidebar applies explicit labels and ordering without changing catalog titles or routes', () => {
	const catalog = parseCatalog(`## Catalog
### Databases
- [Choosing a Database](content/databases/choosing.md): Compare databases.
- [Database Explainers](content/databases/index.md): An overview. <!-- sidebar: {"label":"Overview","order":0} -->
#### PostgreSQL
- [Fundamentals](content/databases/postgresql/fundamentals.md): The basics.
- [PostgreSQL](content/databases/postgresql/index.md): The product overview. <!-- sidebar: {"label":"Overview","order":0} -->
#### Concepts
- [Indexes](content/databases/concepts/indexes.md): Index basics.
### Command-Line Tools
- [jq](content/command-line-tools/jq.md): Query JSON.
## Website
`);
	const original = structuredClone(catalog);
	const sidebar = createSidebar(catalog);
	assert.equal(catalog[0].entries[1].description, 'An overview.');
	assert.deepEqual(catalog[0].entries[1].sidebar, { label: 'Overview', order: 0 });
	assert.deepEqual(sidebar[0], { label: 'Library', link: '/' });
	assert.deepEqual(sidebar[1].items[0], { label: 'Overview', link: '/databases/' });
	assert.deepEqual(sidebar[1].items[1], { label: 'Choosing a Database', link: '/databases/choosing/' });
	assert.deepEqual(sidebar[1].items[2].items, [
		{ label: 'Overview', link: '/databases/postgresql/' },
		{ label: 'Fundamentals', link: '/databases/postgresql/fundamentals/' },
	]);
	assert.deepEqual(sidebar[1].items[3].items, [
		{ label: 'Indexes', link: '/databases/concepts/indexes/' },
	]);
	assert.deepEqual(sidebar[2].items, [{ label: 'jq', link: '/command-line-tools/jq/' }]);
	assert.deepEqual(catalog, original);
	for (const category of sidebar.slice(1)) {
		assert.equal(category.collapsed, true);
		for (const item of category.items.filter((entry) => entry.items)) {
			assert.equal(item.collapsed, true);
		}
	}
});

test('sidebar defaults to catalog titles and order regardless of filenames', () => {
	const catalog = parseCatalog(`## Catalog
### Docker
- [Image Builds](content/docker/builds.md): Build images.
- [A Developer Guide](content/docker/index.md): Start here.
- [Networking](content/docker/networking.md): Connect services.
## Website
`);
	assert.deepEqual(createSidebar(catalog)[1].items, [
		{ label: 'Image Builds', link: '/docker/builds/' },
		{ label: 'A Developer Guide', link: '/docker/' },
		{ label: 'Networking', link: '/docker/networking/' },
	]);
});

test('sidebar supports independent overrides and preserves catalog order for ties', () => {
	const catalog = parseCatalog(`## Catalog
### Docker
- [Networking](content/docker/networking.md): Connect services.
- [Image Builds](content/docker/builds.md): Build images. <!-- sidebar: {"order":20} -->
- [Runtime](content/docker/runtime.md): Run containers. <!-- sidebar: {"order":20} -->
- [Introduction](content/docker/introduction.md): Start here. <!-- sidebar: {"label":"Getting Started","order":0} -->
- [Storage Details](content/docker/storage.md): Store data. <!-- sidebar: {"label":"Storage"} -->
## Website
`);
	assert.deepEqual(createSidebar(catalog)[1].items, [
		{ label: 'Getting Started', link: '/docker/introduction/' },
		{ label: 'Image Builds', link: '/docker/builds/' },
		{ label: 'Runtime', link: '/docker/runtime/' },
		{ label: 'Networking', link: '/docker/networking/' },
		{ label: 'Storage', link: '/docker/storage/' },
	]);
});

test('catalog rejects invalid sidebar metadata', () => {
	for (const sidebar of [null, [], 'Overview', { label: '' }, { label: ' ' }, { label: 1 }, { order: 'first' }, { order: null }, { title: 'Overview' }, { landing: true }]) {
		assert.throws(() => parseCatalog(`## Catalog
### Docker
- [Introduction](content/docker/index.md): Start here. <!-- sidebar: ${JSON.stringify(sidebar)} -->
`), /Invalid sidebar metadata for docker\/index.md/);
	}
	assert.throws(() => parseCatalog(`## Catalog
### Docker
- [Introduction](content/docker/index.md): Start here. <!-- sidebar: {invalid} -->
`), SyntaxError);
});

test('overview pages are explicit child links under expansion-only headings', () => {
	const catalog = parseCatalog(`## Catalog
### AI
- [AI](content/ai/introduction.md): Models and tools. <!-- sidebar: {"label":"Overview","order":0} -->
- [Concepts](content/ai/index.md): Terminology.
#### Agents
- [Agent Introduction](content/ai/agents/start.md): Execution. <!-- sidebar: {"label":"Overview","order":0} -->
- [Tools](content/ai/agents/tools.md): Capabilities.
`);
	const category = createSidebar(catalog)[1];
	assert.equal(category.link, undefined);
	assert.deepEqual(category.items[0], { label: 'Overview', link: '/ai/introduction/' });
	assert.deepEqual(category.items[1], { label: 'Concepts', link: '/ai/' });
	assert.equal(category.items[2].link, undefined);
	assert.deepEqual(category.items[2].items[0], { label: 'Overview', link: '/ai/agents/start/' });
});