import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import catalog from './src/data/catalog.json' with { type: 'json' };
import rewriteContent from './scripts/rewrite-content.mjs';

const sidebar = [
	{ label: 'Library', link: '/' },
	...catalog.map((category) => ({
		label: category.name,
		items: category.entries.map((entry) => ({ label: entry.title, link: entry.route })),
	})),
];

export default defineConfig({
	site: 'https://idanshal.github.io',
	base: process.env.GITHUB_ACTIONS === 'true' ? '/explainers' : '/',
	markdown: {
		processor: unified({ remarkPlugins: [rewriteContent] }),
	},
	integrations: [
		mermaid({ autoTheme: true }),
		starlight({
			title: 'Explainers',
			description: 'Clear mental models for software, tools, and systems.',
			customCss: ['./src/styles/site.css'],
			sidebar,
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/idanshal/explainers' },
			],
		}),
	],
});