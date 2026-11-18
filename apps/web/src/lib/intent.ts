'use client';

/**
 * A small note, kept in the visitor's own browser, of how they have used the site: which pages they opened and when,
 * which calculators they used, whether they compared or asked a question. It leaves the browser only when the
 * visitor sends an enquiry, as a handful of counts, so the person who follows up can tell a serious buyer from a
 * passing one. Nothing typed is recorded, and nothing is sent for visitors who never enquire.
 */
const KEY = 'site-use';
const MAX_PAGES = 60;

interface Note { pages: { p: string; d: string }[]; tools: string[]; compared: number; asked: number }
const empty = (): Note => ({ pages: [], tools: [], compared: 0, asked: 0 });

function read(): Note {
  try { const n = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Note | null; return n && Array.isArray(n.pages) ? { ...empty(), ...n } : empty(); } catch { return empty(); }
}
function write(n: Note) { try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* private window or storage full: the enquiry simply carries less */ } }
const today = () => new Date().toISOString().slice(0, 10);

/** Pages worth counting: a home, a project, a builder or an area. Not the home page, tools or account pages. */
const counted = (path: string) => /^\/property\/|^\/[a-z0-9-]+\/[a-z0-9-]+/.test(path) && !/^\/(tools|admin|builders|compare|ask|api|og)\b/.test(path);

export function notePage(path: string) {
  if (!counted(path)) return;
  const n = read(); n.pages.push({ p: path, d: today() }); n.pages = n.pages.slice(-MAX_PAGES); write(n);
}
export function noteTool(tool: 'emi' | 'afford' | 'cost') { const n = read(); if (!n.tools.includes(tool)) { n.tools.push(tool); write(n); } }
export function noteCompared() { const n = read(); n.compared++; write(n); }
export function noteAsked() { const n = read(); n.asked++; write(n); }

/** The counts sent with an enquiry made from `path`, the page being asked about. */
export function siteUse(path: string, openedAt: number) {
  const n = read();
  const here = n.pages.filter((x) => x.p === path);
  return {
    views: Math.max(here.length, 1), days: new Set(n.pages.map((x) => x.d)).size || 1, seconds: Math.round((Date.now() - openedAt) / 1000),
    pages: new Set(n.pages.filter((x) => x.p !== path).map((x) => x.p)).size, tools: n.tools, compared: n.compared, asked: n.asked,
  };
}
