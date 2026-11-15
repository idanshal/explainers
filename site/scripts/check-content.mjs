import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(siteDir, '..');
const contentDir = path.join(repoDir, 'content');
const markdownLink = /\]\(([^\s)]+)(?:[^)]*)\)/g;
let articleCount = 0;
const brokenLinks = [];

async function checkLinks(absolutePath, relativePath, baseDir) {
	const lines = (await readFile(absolutePath, 'utf8')).split(/\r?\n/);
	let inFence = false;

	for (const [lineNumber, line] of lines.entries()) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		for (const match of line.matchAll(markdownLink)) {
			const href = match[1];
			if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) continue;
			const target = decodeURIComponent(href.split(/[?#]/, 1)[0]);
			if (!target.endsWith('.md')) continue;
			const targetPath = path.resolve(baseDir, path.dirname(relativePath), target);
			try {
				await readFile(targetPath);
			} catch {
				brokenLinks.push(`${relativePath}:${lineNumber + 1} -> ${href}`);
			}
		}
	}
}

async function checkDirectory(directory, relativeDirectory = '', baseDir = contentDir) {
	const entries = await readdir(directory, { withFileTypes: true });

	for (const entry of entries) {
		const relativePath = path.posix.join(relativeDirectory, entry.name);
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			await checkDirectory(absolutePath, relativePath, baseDir);
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			articleCount += 1;
			await checkLinks(absolutePath, relativePath, baseDir);
		}
	}
}

await checkLinks(path.join(repoDir, 'README.md'), 'README.md', repoDir);
await checkLinks(path.join(repoDir, 'WEBSITE.md'), 'WEBSITE.md', repoDir);
await checkLinks(path.join(siteDir, 'README.md'), 'site/README.md', repoDir);
await checkDirectory(contentDir);
await checkDirectory(path.join(repoDir, 'src/content/docs'), 'src/content/docs', repoDir);

if (brokenLinks.length) {
	console.error(`Found ${brokenLinks.length} broken local Markdown links:`);
	for (const link of brokenLinks) console.error(`  ${link}`);
	process.exitCode = 1;
} else {
	console.log(`Checked ${articleCount} explainer files and the repository index; all local article links resolve.`);
}