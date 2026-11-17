import assert from 'node:assert/strict';
import test from 'node:test';
import { articleMetadata } from './article-metadata.mjs';

test('reads the level and estimates prose and code without references', () => {
        const prose = Array(200).fill('word').join(' ');
        const code = Array(100).fill('token').join(' ');
        const reference = Array(500).fill('reference').join(' ');
        const markdown = `---\nlevel: intermediate\n---\n${prose}\n\n\`\`\`js\n${code}\n\`\`\`\n\n## References\n${reference}`;
        assert.deepEqual(articleMetadata(markdown), { level: 'intermediate', readingMinutes: 2 });
});

test('validates levels but allows overview pages without one', () => {
        assert.throws(() => articleMetadata('# Title'), /Article level/);
        assert.throws(() => articleMetadata('---\nlevel: expert\n---\n# Title'), /Article level/);
        assert.deepEqual(articleMetadata('# Overview', { overview: true }), { level: undefined, readingMinutes: 1 });
});