import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { readFile } from 'node:fs/promises';

const markdownLoader = glob({ pattern: '**/*.md', base: '../content' });

function titleFromHeading(markdown, filePath) {
	let fence;

	for (const line of markdown.split(/\r?\n/)) {
		const fenceMarker = line.match(/^\s*(```+|~~~+)/)?.[1];
		if (fenceMarker) {
			fence = fence ? undefined : fenceMarker[0];
			continue;
		}
		if (fence) continue;

		const heading = line.match(/^#\s+(.+?)\s*#*\s*$/);
		if (heading) return heading[1];
	}

	throw new Error(`Missing a level-one heading in ${filePath}`);
}

const docsLoader = {
	name: 'explainer-markdown-loader',
	load(context) {
		return markdownLoader.load({
			...context,
			parseData: async ({ id, data, filePath }) => {
				if (!filePath) throw new Error(`Missing file path for explainer ${id}`);
				const markdown = await readFile(filePath, 'utf8');
				return context.parseData({
					id,
					data: { ...data, title: titleFromHeading(markdown, filePath) },
					filePath,
				});
			},
		});
	},
};

export const collections = {
	docs: defineCollection({
		loader: docsLoader,
		schema: docsSchema(),
	}),
};