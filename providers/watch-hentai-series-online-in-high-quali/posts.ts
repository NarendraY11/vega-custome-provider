import { Post, ProviderContext } from "../types";

const BASE = "https://hentai.pro";
const SEARCH = {"action":"https://hentai.pro/","method":"get","input":"q"};
const HINTS = {"categoryUrls":["https://hentai.pro/series/uncensored","https://hentai.pro/series/yuri","https://hentai.pro/series/yaoi","https://hentai.pro/series/netorare","https://hentai.pro/series/fantasy","https://hentai.pro/series/romance","https://hentai.pro/series/manga","https://hentai.pro/series/subbed-hentai","https://hentai.pro/series/harem","https://hentai.pro/series/censored","https://hentai.pro/series/housewives","https://hentai.pro/series/comedy","https://hentai.pro/series/action","https://hentai.pro/series/magic"],"detailUrls":["https://hentai.pro/series/uncensored","https://hentai.pro/series/yuri","https://hentai.pro/series/yaoi","https://hentai.pro/series/netorare","https://hentai.pro/series/fantasy","https://hentai.pro/series/romance","https://hentai.pro/series/manga","https://hentai.pro/series/subbed-hentai","https://hentai.pro/series/harem","https://hentai.pro/series/censored","https://hentai.pro/series/housewives","https://hentai.pro/series/comedy"],"apiHints":[]};

function absolute(value: string, pageUrl: string) { try { return new URL(value, pageUrl).href; } catch { return ""; } }
function text(value: string) { return value.replace(/\s+/g, " ").trim(); }
function jsonLd(html: string) {
  const out: any[] = []; const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(html))) { try { const v = JSON.parse(m[1].trim()); if (Array.isArray(v)) out.push(...v); else if (v && Array.isArray(v["@graph"])) out.push(...v["@graph"]); else out.push(v); } catch {} }
  return out;
}
function imageFrom(el: any, pageUrl: string) {
  const raw = el.attr("src") || el.attr("data-src") || el.attr("data-lazy-src") || el.attr("data-original") || el.attr("data-image") || el.attr("data-poster") || el.attr("poster") || el.attr("srcset")?.split(",")[0]?.trim().split(" ")[0] || "";
  return absolute(raw, pageUrl);
}
function parsePosts(html: string, pageUrl: string, cheerio: ProviderContext["cheerio"]): Post[] {
  const $ = cheerio.load(html); const out: Post[] = []; const seen = new Set<string>();
  const add = (title: string, link: string, image: string) => { title = text(title); if (!link || !image || !title || title.length < 2 || title.length > 180 || link === pageUrl || seen.has(link)) return; seen.add(link); out.push({ title, link, image }); };
  $("article a[href], .item a[href], .card a[href], .film a[href], .movie a[href], .show a[href], .poster a[href], .post a[href], a[href]").each((_, el) => {
    const link = absolute($(el).attr("href") || $(el).attr("data-href") || "", pageUrl); const img = $(el).find("img").first();
    const title = img.attr("alt") || $(el).attr("title") || $(el).attr("aria-label") || $(el).find(".title,[class*=title],h2,h3,h4").first().text() || $(el).text();
    add(title, link, imageFrom(img, pageUrl));
  });
  if (out.length < 3) for (const item of jsonLd(html)) for (const entry of item?.itemListElement || []) { const v = entry?.item || entry; add(v?.name || entry?.name || "", absolute(v?.url || entry?.url || "", pageUrl), absolute(Array.isArray(v?.image) ? v.image[0] : v?.image || "", pageUrl)); }
  return out.slice(0, 60);
}
async function fetchHtml(url: string, providerContext: ProviderContext) {
  const { axios, commonHeaders, openWebView } = providerContext;
  try { const r = await axios.get(url, { headers: commonHeaders, timeout: 15000 }); const html = String(r.data); if (html && (/<main\b|<article\b|application\/ld\+json/i.test(html) || parsePosts(html, url, providerContext.cheerio).length >= 2)) return html; } catch {}
  try { return (await openWebView(url, { title: "Render website", description: "The site may load its catalog with JavaScript." })).data; } catch { return ""; }
}
function pageUrl(url: string, page: number) { if (page <= 1) return url; try { const u = new URL(url); if (/\/page\/\d+\/?$/i.test(u.pathname)) u.pathname = u.pathname.replace(/\/page\/\d+\/?$/i, "/page/" + page + "/"); else u.searchParams.set("page", String(page)); return u.href; } catch { return url; } }

export const getPosts = async function ({ filter, page, providerContext }: { filter: string; page: number; providerValue: string; signal: AbortSignal; providerContext: ProviderContext }): Promise<Post[]> {
  const url = filter.startsWith("http") ? filter : new URL(filter || "/", BASE).href; let target = pageUrl(url, page); let html = await fetchHtml(target, providerContext); let posts = parsePosts(html, target, providerContext.cheerio);
  if (posts.length < 2 && target !== url) { target = url; html = await fetchHtml(target, providerContext); posts = parsePosts(html, target, providerContext.cheerio); }
  return posts;
};

export const getSearchPosts = async function ({ searchQuery, page, providerContext }: { searchQuery: string; page: number; providerValue: string; signal: AbortSignal; providerContext: ProviderContext }): Promise<Post[]> {
  let url = BASE;
  try {
    if (SEARCH) { const target = new URL(SEARCH.action, BASE); if (SEARCH.method === "post") { const r = await providerContext.axios.post(target.href, new URLSearchParams({ [SEARCH.input || "q"]: searchQuery, page: String(page) }), { headers: { ...providerContext.commonHeaders, "content-type": "application/x-www-form-urlencoded" }, timeout: 15000 }); const posts = parsePosts(String(r.data), target.href, providerContext.cheerio); if (posts.length) return posts; } else { target.searchParams.set(SEARCH.input || "q", searchQuery); if (page > 1) target.searchParams.set("page", String(page)); url = target.href; } }
  } catch {}
  const posts = parsePosts(await fetchHtml(url, providerContext), url, providerContext.cheerio);
  return SEARCH ? posts : posts.filter(x => x.title.toLowerCase().includes(searchQuery.toLowerCase()));
};
