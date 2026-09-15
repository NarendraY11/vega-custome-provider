import { EpisodeLink, ProviderContext } from "../types";
function absolute(value: string, pageUrl: string) { try { return new URL(value, pageUrl).href; } catch { return ""; } }
function text(value: string) { return value.replace(/\s+/g, " ").trim(); }
export const getEpisodes = async function ({ url, providerContext }: { url: string; providerContext: ProviderContext }): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext; let html = ""; try { html = String((await axios.get(url, { headers: commonHeaders, timeout: 15000 })).data); } catch {}
  if (!html || !/<a\b/i.test(html)) { try { html = (await openWebView(url, { title: "Open episodes", description: "Render the season page to read episode links." })).data; } catch {} }
  const $ = cheerio.load(html); const out: EpisodeLink[] = []; const seen = new Set<string>();
  $("a[href]").each((_, e) => { const title = text($(e).attr("title") || $(e).text() || ""); const link = absolute($(e).attr("href") || "", url); const image = absolute($(e).find("img").attr("src") || $(e).find("img").attr("data-src") || "", url); const episode = /\b(?:episode|ep|e)\s*\d+\b/i.test(title) || /\/(?:episode|ep)[-_\/]?\d+/i.test(link); if (link && title && episode && !seen.has(link)) { seen.add(link); out.push({ title, link, ...(image ? { image } : {}) }); } });
  return out.slice(0, 100);
};
