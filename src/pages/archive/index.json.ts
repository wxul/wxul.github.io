import type { APIRoute } from 'astro';
import { getArchivePosts, getPostSlug } from '../../lib/content';
import { cleanMarkdownToText } from '../../utils/excerpt';

export const prerender = true;

const MAX_INDEX_TEXT = 600;

export const GET: APIRoute = async () => {
  const archiveItems = await getArchivePosts();
  const index = archiveItems.map((entry) => {
    const plain = cleanMarkdownToText(entry.body ?? '');
    const text = plain.length > MAX_INDEX_TEXT ? plain.slice(0, MAX_INDEX_TEXT) : plain;
    return {
      slug: getPostSlug(entry),
      title: entry.data.title ?? '',
      description: entry.data.description ?? '',
      tags: entry.data.tags ?? [],
      text,
      date: entry.data.date ? entry.data.date.toISOString() : null
    };
  });

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
    }
  });
};
