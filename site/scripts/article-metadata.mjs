import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

const levels = new Set(['foundations', 'intermediate', 'advanced']);

export function articleMetadata(markdown, { overview = false } = {}) {
        const { data, content } = matter(markdown);
        if (!overview && !levels.has(data.level)) {
                throw new Error('Article level must be foundations, intermediate, or advanced');
        }
        if (data.level !== undefined && !levels.has(data.level)) {
                throw new Error('Article level must be foundations, intermediate, or advanced');
        }
        if (data.technologies !== undefined && (!Array.isArray(data.technologies)
                || data.technologies.length > 4
                || data.technologies.some((technology) => typeof technology !== 'string' || !technology.trim()))) {
                throw new Error('Article technologies must be a list of up to four non-empty names');
        }

        const tree = unified().use(remarkParse).parse(content);
        let proseWords = 0;
        let codeWords = 0;
        let excluded = false;
        const count = (value) => (value.match(/\S+/g) ?? []).length;

        function visit(node) {
                if (node.type === 'code') {
                        codeWords += count(node.value);
                } else if (node.type === 'text' || node.type === 'inlineCode') {
                        proseWords += count(node.value);
                } else if (node.children) {
                        for (const child of node.children) visit(child);
                }
        }

        for (const node of tree.children) {
                if (node.type === 'heading' && node.depth === 2) {
                        const heading = node.children.map((child) => child.value ?? '').join('').trim();
                        excluded = /^(references|further reading)$/i.test(heading);
                }
                if (!excluded) visit(node);
        }

        return {
                level: data.level,
                readingMinutes: Math.max(1, Math.ceil(proseWords / 200 + codeWords / 100)),
                ...(data.technologies?.length ? { technologies: data.technologies } : {}),
        };
}