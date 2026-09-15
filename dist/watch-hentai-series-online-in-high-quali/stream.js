"use strict";Object.defineProperty(exports, "__esModule", {value: true});
function absolute(value, pageUrl) { try { return new URL(value.split(String.fromCharCode(92) + "/").join("/"), pageUrl).href; } catch { return ""; } }
function extract(html, pageUrl, cheerio) {
  const $ = cheerio.load(html); const streams = []; const frames = []; const subtitles = [];
  const add = (value) => { const u = absolute(value, pageUrl); if (u && /\.(?:m3u8|mp4|webm)(?:$|[?#])/i.test(u) && !streams.includes(u)) streams.push(u); };
  $("video,source").each((_, e) => ["src","data-src","data-url","data-file","data-video","data-hls","data-stream","data-source"].forEach(k => { const v = $(e).attr(k); if (v) add(v); }));
  $("a[href]").each((_, e) => { const v = $(e).attr("href") || ""; if (/\.(?:m3u8|mp4|webm)(?:$|[?#])/i.test(v)) add(v); });
  $("iframe[src]").each((_, e) => { const v = $(e).attr("src"); if (v) frames.push(absolute(v, pageUrl)); });
  $("track[src]").each((_, e) => { const uri = absolute($(e).attr("src") || "", pageUrl); if (!uri) return; const raw = $(e).attr("type") || "text/vtt"; const type = raw === "application/x-subrip" || raw === "application/ttml+xml" ? raw : "text/vtt"; subtitles.push({ title: $(e).attr("label") || "Subtitles", language: $(e).attr("srclang") || "en", type, uri }); });
  for (const re of [/(?:https?:)?\/\/[^\s'\"<>]+?\.(?:m3u8|mp4|webm)(?:\?[^\s'\"<>]*)?/gi, /(?:https?:)?\/\/[^\s'\"<>]+?(?:m3u8|mp4)(?:\?[^\s'\"<>]*)?/gi]) { let m; while ((m = re.exec(html)) && streams.length < 30) add(m[0]); }
  return { streams: streams.slice(0, 20), frames: [...new Set(frames)].filter(Boolean).slice(0, 6), subtitles: subtitles.slice(0, 20) };
}
const getStream = async function ({ link, providerContext, isDownload }) {
  const { axios, commonHeaders, openWebView } = providerContext; let html = ""; let headers = undefined; try { html = String((await axios.get(link, { headers: commonHeaders, timeout: 15000 })).data); } catch {}
  let result = extract(html, link, providerContext.cheerio); let found = result.streams; let subtitles = result.subtitles;
  if (!found.length) { try { const rendered = await openWebView(link, { title: "Open video page", description: "Render the player page to locate publicly available media sources." }); headers = { ...(rendered.userAgent ? { "User-Agent": rendered.userAgent } : {}), ...(rendered.cookies ? { Cookie: rendered.cookies } : {}), Referer: rendered.url || link }; result = extract(rendered.data, rendered.url || link, providerContext.cheerio); found = result.streams; subtitles = result.subtitles; if (!found.length) for (const frame of result.frames) { try { const fr = await openWebView(frame, { title: "Open embedded player", description: "Inspect the embedded player for a publicly available source." }); const nested = extract(fr.data, fr.url || frame, providerContext.cheerio); found.push(...nested.streams); subtitles.push(...nested.subtitles); if (found.length) { headers = { ...(fr.userAgent ? { "User-Agent": fr.userAgent } : {}), ...(fr.cookies ? { Cookie: fr.cookies } : {}), Referer: fr.url || frame }; break; } } catch {} } } catch {} }
  const links = [...new Set(found)].slice(0, 20); if (isDownload) links.sort((a, b) => Number(/\.mp4|\.webm/i.test(b)) - Number(/\.mp4|\.webm/i.test(a)));
  return links.map((u, i) => ({ server: "Source " + (i + 1), link: u, type: /\.m3u8(?:$|[?#])/i.test(u) ? "m3u8" : /\.webm/i.test(u) ? "webm" : "mp4", quality: /2160|4k/i.test(u) ? "2160" : /1080/i.test(u) ? "1080" : /720/i.test(u) ? "720" : "Auto", ...(subtitles.length ? { subtitles } : {}), ...(headers ? { headers } : {}) }));
}; exports.getStream = getStream;
