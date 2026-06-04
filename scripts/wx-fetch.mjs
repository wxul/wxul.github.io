const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0';

import TurndownService from 'turndown';

const RISK_MARKERS = [
  '环境异常',
  '请完成验证',
  '此内容因违规无法查看',
  '此内容已被发布者删除',
  '此账号已自主注销',
  '已被原作者删除'
];

function usageAndExit() {
  process.stderr.write('Usage: node scripts/wx-fetch.mjs <https://mp.weixin.qq.com/s/...>\n');
  process.exit(2);
}

const url = process.argv[2];
if (!url || !/^https:\/\/mp\.weixin\.qq\.com\/s\//.test(url)) {
  usageAndExit();
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractDivById(html, id) {
  const startRe = new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>`, 'i');
  const m = startRe.exec(html);
  if (!m) return null;
  const startInner = m.index + m[0].length;
  let depth = 1;
  let pos = startInner;
  while (depth > 0) {
    const openIdx = html.indexOf('<div', pos);
    const closeIdx = html.indexOf('</div>', pos);
    if (closeIdx === -1) return null;
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      pos = openIdx + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(startInner, closeIdx);
      pos = closeIdx + 6;
    }
  }
  return null;
}

function extractTitle(html) {
  const re = /<h1\b[^>]*\bid="activity-name"[^>]*>([\s\S]*?)<\/h1>/i;
  const m = re.exec(html);
  if (!m) return null;
  const text = stripTags(m[1]);
  return text || null;
}

function extractAuthor(html) {
  const reA = /<a\b[^>]*\bid="js_name"[^>]*>([\s\S]*?)<\/a>/i;
  const mA = reA.exec(html);
  if (mA) {
    const t = stripTags(mA[1]);
    if (t) return t;
  }
  const reS = /<strong\b[^>]*\bclass="[^"]*\bprofile_nickname\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i;
  const mS = reS.exec(html);
  if (mS) {
    const t = stripTags(mS[1]);
    if (t) return t;
  }
  return null;
}

function extractPublishTime(html) {
  const re = /var\s+ct\s*=\s*"(\d+)"/;
  const m = re.exec(html);
  if (!m) return null;
  const seconds = Number(m[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function toShanghaiDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let res;
try {
  res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
} catch (err) {
  process.stderr.write(`fetch error: ${err.message}\n`);
  process.exit(1);
}

if (!res.ok) {
  process.stderr.write(`HTTP ${res.status} ${res.statusText}\n`);
  process.exit(1);
}

const fullHtml = await res.text();

for (const marker of RISK_MARKERS) {
  if (fullHtml.includes(marker)) {
    process.stdout.write(JSON.stringify({ url, error: 'risk_control', marker }, null, 2) + '\n');
    process.exit(3);
  }
}

const pageContent = extractDivById(fullHtml, 'page-content');
const html = pageContent ?? fullHtml;

const title = extractTitle(html);
const publishTime = extractPublishTime(html) ?? extractPublishTime(fullHtml);
const publishDate = toShanghaiDate(publishTime);
const author = extractAuthor(html);
const contentHtml = extractDivById(html, 'js_content');

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**'
});

turndown.addRule('imgPlaceholder', {
  filter: 'img',
  replacement: (_, node) => {
    const src = node.getAttribute('data-src') || node.getAttribute('src') || '';
    return `\n<!-- image: ${src} -->\n`;
  }
});

turndown.remove(['style', 'script']);

turndown.addRule('spanText', {
  filter: 'span',
  replacement: (content) => content
});

function stripDuplicateOrderedNumbers(md) {
  return md.replace(/^(\s*\d+\.\s+)\d+\\?\.\s+/gm, '$1');
}

const contentMarkdown = contentHtml
  ? stripDuplicateOrderedNumbers(turndown.turndown(contentHtml)).trim()
  : null;

if (!title && !contentMarkdown) {
  process.stderr.write('extraction failed: no title and no content\n');
  process.exit(1);
}

if (contentMarkdown && contentMarkdown.length < 100) {
  process.stderr.write(`extraction failed: content too short (${contentMarkdown.length} chars)\n`);
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({ url, title, publishTime, publishDate, author, contentMarkdown }, null, 2) + '\n'
);
