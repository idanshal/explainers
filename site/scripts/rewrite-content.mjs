import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.resolve(siteDir, '../content');

export default function rewriteContent() {
	return (tree, file) => {
		const sourcePath = path.relative(contentDir, file.path).split(path.sep).join('/');
		const currentDirectory = path.posix.dirname(sourcePath);
		let removedTitle = false;

		function visit(node) {
			if (!node || typeof node !== 'object') return;
			if (!removedTitle && node.type === 'heading' && node.depth === 1) {
				removedTitle = true;
				return false;
			}

			if (node.type === 'link' && node.url.endsWith('.md') && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(node.url)) {
				const [targetPath, ...fragment] = node.url.split('#');
				const target = path.posix.normalize(path.posix.join(currentDirectory, targetPath));
				const sourceRoute = sourcePath.endsWith('/index.md')
					? path.posix.dirname(sourcePath)
					: sourcePath.slice(0, -3);
				const targetRoute = target.endsWith('/index.md')
					? path.posix.dirname(target)
					: target.slice(0, -3);
				const relativeRoute = path.posix.relative(sourceRoute, targetRoute) || '.';
				node.url = `${relativeRoute}/${fragment.length ? `#${fragment.join('#')}` : ''}`;
			}

			if (Array.isArray(node.children)) {
				node.children = node.children.filter((child) => visit(child) !== false);
			}
		};

		visit(tree);
	};
}