import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RSS_URL = "https://medium.com/feed/@yunusmuhammad007";
const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, "../assets/data/articles.js");

function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, " "));
}

function cleanText(value) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function youtubeId(tag) {
  let decoded = tag;
  try {
    decoded = decodeURIComponent(tag);
  } catch (error) {
    decoded = tag;
  }
  const thumb =
    decoded.match(/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})/) ||
    decoded.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/) ||
    decoded.match(/youtube(?:-nocookie)?\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
  return thumb ? thumb[1] : null;
}

function cleanContent(html) {
  let out = html;
  out = out.replace(/<img[^>]*src="https:\/\/medium\.com\/_\/stat[^"]*"[^>]*>/gi, "");
  out = out.replace(/<iframe\b[^>]*\bsrc=""[^>]*>[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (tag) => {
    const id = youtubeId(tag);
    return id ? `<div class="article-youtube" data-yt-id="${id}"></div>` : "";
  });
  out = out.replace(/https?:\/\/[^"'\s<>]+?\?source=rss[^"'\s<>]*/g, (url) => url.split("?")[0]);
  return out.trim();
}

function makeExcerpt(text, max = 220) {
  if (text.length <= max) {
    return text;
  }
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 120 ? slice.slice(0, lastSpace) : slice).trim() + "…";
}

function slugFromUrl(link) {
  try {
    const path = new URL(link).pathname.replace(/\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch (error) {
    return "";
  }
}

function firstImage(html) {
  const match = String(html).match(/<img[^>]*\bsrc="([^"]+)"/i);
  return match ? decodeEntities(match[1]) : "";
}

function parseItems(xml) {
  const items = [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);

  return items
    .map((item) => {
      const titleRaw = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || "";
      const linkRaw = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
      const link = decodeEntities(linkRaw).split("?")[0].trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";
      const updated =
        (item.match(/<atom:updated>([\s\S]*?)<\/atom:updated>/) || [])[1] || "";
      const content =
        (item.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/) || [])[1] || "";
      const categories = [...item.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)]
        .map((category) => cleanText(category[1]))
        .filter(Boolean);

      const contentHtml = cleanContent(content);
      const plain = cleanText(contentHtml);
      const words = plain ? plain.split(/\s+/).length : 0;

      return {
        slug: slugFromUrl(link),
        title: cleanText(titleRaw),
        excerpt: makeExcerpt(plain),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : "",
        updatedAt: updated ? new Date(updated).toISOString() : "",
        categories: [...new Set(categories)],
        cover: firstImage(contentHtml),
        mediumUrl: link,
        readingTime: Math.max(1, Math.round(words / 200)),
        contentHtml
      };
    })
    .filter((article) => article.slug && article.title)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

const response = await fetch(RSS_URL, {
  headers: {
    "user-agent": "LangitInstrumentContentSync/1.0 (+https://github.com/Muhammad-Yunus/langit-instrument-blog)",
    accept: "application/rss+xml, application/xml, text/xml"
  }
});

if (!response.ok) {
  throw new Error(`Gagal mengambil RSS (${response.status} ${response.statusText})`);
}

const xml = await response.text();
const articles = parseItems(xml);

if (!articles.length) {
  throw new Error("RSS tidak menghasilkan artikel. Periksa format feed Medium.");
}

const payload = JSON.stringify(articles, null, 1)
  .replace(/</g, "\\u003C")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `window.LANGIT_ARTICLES = ${payload};\n`,
  "utf8"
);

console.log(`Selesai: ${articles.length} artikel ditulis ke ${outFile}`);
articles.forEach((article) => {
  console.log(`- ${article.publishedAt.slice(0, 10)}  ${article.title}`);
});
