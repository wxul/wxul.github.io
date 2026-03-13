const rawSiteUrl = (process.env.SITE_URL ?? '').trim();
const siteUrl = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, '') : '';
const hasSiteUrl = siteUrl.length > 0;
const fallbackSiteUrl = 'https://wxul.github.io';

if (!hasSiteUrl && process.env.NODE_ENV === 'production') {
  console.warn(
    '[astro-whono] SITE_URL is not set. RSS will use example.invalid; canonical/og will be omitted; sitemap will not be generated and robots will not include Sitemap.'
  );
}

export const site = {
  url: hasSiteUrl ? siteUrl : fallbackSiteUrl,
  title: 'Tech Blog - Albert',
  brandTitle: 'Tech Blog',
  author: 'Albert',
  authorAvatar: 'author/avatar.webp',
  description: 'A tech blog about web development, programming, and software engineering.',
};

export const PAGE_SIZE_ARCHIVE = 12;
export const PAGE_SIZE_ESSAY = 12;

export { hasSiteUrl, siteUrl };
