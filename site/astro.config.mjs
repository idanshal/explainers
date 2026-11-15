import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import catalog from './src/data/catalog.json' with { type: 'json' };
import redirects from './src/data/redirects.json' with { type: 'json' };
import rewriteContent from './scripts/rewrite-content.mjs';

const link = (entry) => ({ label: entry.title, link: entry.route });
const base = process.env.GITHUB_ACTIONS === 'true' ? '/explainers' : '/';
const sidebar = [
	{ label: 'Library', link: '/' },
	...catalog.map((category) => ({
		label: category.name,
		items: [
			...category.entries.filter((entry) => !category.sections.some((section) => section.entries.some((item) => item.contentPath === entry.contentPath))).map(link),
			...category.sections.map((section) => ({
				label: section.name,
				collapsed: true,
				items: section.entries.map(link),
			})),
		],
	})),
];

export default defineConfig({
	site: 'https://idanshal.github.io',
	base,
	redirects: Object.fromEntries(Object.entries(redirects).map(([source, destination]) => [source, `${base === '/' ? '' : base}${destination}`])),
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