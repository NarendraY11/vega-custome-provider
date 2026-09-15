import { Info, ProviderContext } from "../types";
function absolute(value: string, pageUrl: string) { try { return new URL(value, pageUrl).href; } catch { return ""; } }
function text(value: string) { return value.replace(/\s+/g, " ").trim(); }
function jsonLd(html: string) { const out: any[] = []; const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m: RegExpExecArray | null; while ((m = re.exec(html))) { try { const v = JSON.parse(m[1].trim()); if (Array.isArray(v)) out.push(...v); else if (v && Array.isArray(v["@graph"])) out.push(...v["@graph"]); else out.push(v); } catch {} } return out; }
export const getMeta = async function ({ link, providerContext }: { link: string; providerContext: ProviderContext }): Promise<Info> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext; let html = ""; try { html = String((await axios.get(link, { headers: commonHeaders, timeout: 15000 })).data); } catch {}
  const parse = (source: string) => { const $ = cheerio.load(source); const data = jsonLd(source); const media = data.find(x => /movie|tvseries|tvseason|creativework/i.test(String(x?.["@type"] || ""))) || data[0] || {};
    const title = text(String(media.name || $("meta[property=\"og:title\"]").attr("content") || $("h1").first().text() || $("title").text() || "Untitled"));
    const synopsis = text(String(media.description || $("meta[property=\"og:description\"]").attr("content") || $("meta[name=\"description\"]").attr("content") || ""));
    const rawImage = (Array.isArray(media.image) ? media.image[0] : media.image) || $("meta[property=\"og:image\"]").attr("content") || $("meta[name=\"twitter:image\"]").attr("content") || $("img").first().attr("src") || "";
    const image = absolute(String(rawImage), link); const imdbId = String(media.url || "").match(/tt\d{5,10}/)?.[0] || source.match(/\btt\d{5,10}\b/)?.[0] || "";
    const tags = Array.isArray(media.genre) ? media.genre.map(String) : media.genre ? [String(media.genre)] : []; const cast = Array.isArray(media.actor) ? media.actor.map((x: any) => String(x?.name || x)).filter(Boolean) : [];
    const anchors = $("a[href]").map((_, e) => ({ title: text($(e).attr("title") || $(e).text()), link: absolute($(e).attr("href") || "", link) })).get().filter((x: any) => x.title && x.link);
    const seasons = anchors.filter((x: any) => /\bseason\s*\d+\b/i.test(x.title) || /\/season(?:[-_\/] |\d)/i.test(x.link)).slice(0, 30);
    const episodes = anchors.filter((x: any) => /\b(?:episode|ep|e)\s*\d+\b/i.test(x.title) || /\/(?:episode|ep)(?:[-_\/] |\d)/i.test(x.link)).slice(0, 80);
    const directLinks = episodes.map((x: any) => ({ title: x.title, link: x.link, type: "series" as const })); const linkList: any[] = seasons.map((x: any) => ({ title: x.title, episodesLink: x.link })); if (!linkList.length && directLinks.length) linkList.push({ title: "Episodes", directLinks });
    const type = /tv|series|show|season|episode/i.test(String(media["@type"] || "")) || seasons.length > 0 || episodes.length > 0 ? "series" : "movie";
    return { title, synopsis, image, imdbId, type, tags, cast, linkList }; };
  let parsed = parse(html); if (!html || parsed.title === "Untitled" || (!parsed.image && !parsed.synopsis)) { try { parsed = parse((await openWebView(link, { title: "Render item", description: "Use the rendered page when normal HTTP did not expose metadata." })).data); } catch {} }
  return { title: parsed.title || "Untitled", synopsis: parsed.synopsis || "", image: parsed.image || "", imdbId: parsed.imdbId || "", type: parsed.type, tags: parsed.tags, cast: parsed.cast, linkList: parsed.linkList, webUrl: link };
};
