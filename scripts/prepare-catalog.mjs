import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(rootDir, 'src/content/docs');
const dataDir = path.join(rootDir, 'src/data');

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
			const linkedPath = entry[2].replace(/^src\/content\/docs\//, '').replace(/\/$/, '');
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
		group.route = `/${directory}/`;
		group.hasIndex = group.entries.some((entry) => entry.contentPath === `${directory}/index.md`);
	}

	return categories;
}

const catalogSource = await readFile(path.join(rootDir, 'README.md'), 'utf8');
const categories = parseCatalog(catalogSource);
await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, 'catalog.json'), `${JSON.stringify(categories, null, 2)}\n`);

for (const category of categories.filter((group) => !group.hasIndex)) {
	const directory = category.route.replace(/^\//, '').replace(/\/$/, '');
	const indexPath = path.join(docsDir, directory, 'index.md');
	const entries = category.entries.map((entry) => {
		const href = path.posix.relative(directory, entry.contentPath);
		return `- [${entry.title}](${href}): ${entry.description}`;
	});
	const frontmatter = ['---', `title: ${JSON.stringify(category.name)}`, '---', ''].join('\n');
	await mkdir(path.dirname(indexPath), { recursive: true });
	await writeFile(indexPath, `${frontmatter}${entries.join('\n')}\n`);
}

console.log(`Prepared catalog for ${categories.reduce((total, category) => total + category.entries.length, 0)} explainers across ${categories.length} topics.`);