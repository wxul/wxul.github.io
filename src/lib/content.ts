import {
  getCollection,
  type CollectionEntry,
  type CollectionKey
} from 'astro:content';
export { createWithBase } from '../utils/format';

type OrderBy<K extends CollectionKey> = (a: CollectionEntry<K>, b: CollectionEntry<K>) => number;

export type GetPublishedOptions<K extends CollectionKey> = {
  orderBy?: OrderBy<K>;
  includeDraft?: boolean;
};

export const isReservedSlug = (slug: string) => slug.startsWith('page/');

export const getTotalPages = (itemCount: number, pageSize: number) =>
  Math.ceil(itemCount / pageSize);

export const getPageSlice = <T>(items: T[], currentPage: number, pageSize: number) => {
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const buildPaginatedPaths = (totalPages: number) => {
  if (totalPages <= 1) return [];
  return Array.from({ length: totalPages - 1 }, (_, i) => ({
    params: { page: String(i + 2) }
  }));
};

export async function getPublished<K extends CollectionKey>(
  name: K,
  opts: GetPublishedOptions<K> = {}
) {
  const prod = import.meta.env.PROD;
  const includeDraft = opts.includeDraft ?? !prod;
  const filter = includeDraft ? undefined : ({ data }: CollectionEntry<K>) => data.draft !== true;
  const items = await getCollection(name, filter);

  if (!opts.orderBy) return items;
  return items.slice().sort(opts.orderBy);
}

export type PostEntry = CollectionEntry<'posts'>;

export const getPostSlug = (entry: PostEntry) => entry.data.slug ?? entry.id;

const orderByPostDate = (a: PostEntry, b: PostEntry) => b.data.date.valueOf() - a.data.date.valueOf();

export async function getSortedPosts() {
  return getPublished('posts', {
    orderBy: orderByPostDate
  });
}

export async function getVisiblePosts() {
  const posts = await getSortedPosts();
  return posts.filter((entry) => !isReservedSlug(getPostSlug(entry)));
}

export async function getArchivePosts() {
  const posts = await getSortedPosts();
  return posts.filter((entry) => entry.data.archive !== false && !isReservedSlug(getPostSlug(entry)));
}
