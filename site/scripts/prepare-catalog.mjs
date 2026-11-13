import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(siteDir, '..');
const dataDir = path.join(siteDir, 'src/data');

function toRoute(contentPath) {
	if (contentPath.endsWith('/index.md')) return `/${path.posix.dirname(contentPath)}/`;
	return `/${contentPath.slice(0, -3)}/`;
}

function parseCatalog(markdown) {
	const categories = [];
	let inCatalog = false;
	let category;

	for (const line of markdown.split(/\r?\n/)) {
		if (line === '## Catalog') {
			inCatalog = true;
			continue;
		}
		if (inCatalog && line.startsWith('## ')) break;
		if (!inCatalog) continue;

		const heading = line.match(/^###\s+(.+)$/);
		if (heading) {
			category = { name: heading[1], entries: [] };
			categories.push(category);
			continue;
		}

		const entry = line.match(/^- \[([^\]]+)\]\(([^)]+)\):\s*(.+)$/);
		if (entry && category) {
			const linkedPath = entry[2].replace(/^content\//, '').replace(/\/$/, '');
			const contentPath = linkedPath.endsWith('.md') ? linkedPath : `${linkedPath}/index.md`;
			category.entries.push({
				title: entry[1],
				contentPath,
				route: toRoute(contentPath),
				description: entry[3],
			});
		}
	}

	for (const group of categories) {
		const firstPath = group.entries[0]?.contentPath ?? '';
		const directory = firstPath.split('/')[0];
		group.hasIndex = group.entries.some((entry) => entry.contentPath === `${directory}/index.md`);
			group.route = group.hasIndex ? `/${directory}/` : null;
	}

	return categories;
}

const catalogSource = await readFile(path.join(repoDir, 'README.md'), 'utf8');
const categories = parseCatalog(catalogSource);
await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, 'catalog.json'), `${JSON.stringify(categories, null, 2)}\n`);

console.log(`Prepared catalog for ${categories.reduce((total, category) => total + category.entries.length, 0)} explainers across ${categories.length} topics.`);