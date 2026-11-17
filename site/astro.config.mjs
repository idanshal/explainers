import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import catalog from './src/data/catalog.json' with { type: 'json' };
import redirects from './src/data/redirects.json' with { type: 'json' };
import { createSidebar } from './scripts/prepare-catalog.mjs';
import rewriteContent from './scripts/rewrite-content.mjs';

const base = process.env.GITHUB_ACTIONS === 'true' ? '/explainers' : '/';
const sidebar = createSidebar(catalog);

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
			components: { PageTitle: './src/components/PageTitle.astro' },
			sidebar,
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/idanshal/explainers' },
			],
		}),
	],
});