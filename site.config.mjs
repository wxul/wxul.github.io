const rawSiteUrl = (process.env.SITE_URL ?? '').trim();
const siteUrl = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, '') : '';
const hasSiteUrl = siteUrl.length > 0;
const fallbackSiteUrl = 'https://wxul.top';

if (!hasSiteUrl && process.env.NODE_ENV === 'production') {
  console.warn(
    '[astro-whono] SITE_URL is not set. RSS will use example.invalid; canonical/og will be omitted; sitemap will not be generated and robots will not include Sitemap.'
  );
}

export const site = {
  url: hasSiteUrl ? siteUrl : fallbackSiteUrl,
  title: "Albert's Tech Blog",
  brandTitle: "Albert's Blog",
  author: 'Albert',
  authorAvatar: 'author/avatar.webp',
  description: 'Albert 的个人技术博客，分享 AI 前沿资讯、前后端全栈开发实践与技术思考。',
};

export const PAGE_SIZE_ARCHIVE = 12;
export const PAGE_SIZE_ESSAY = 12;

export { hasSiteUrl, siteUrl };
