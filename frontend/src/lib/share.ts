export interface SharedPayload {
  url?: string;
  text?: string;
}

const URL_REGEX = /https?:\/\/\S+/;

// Web-Share-Target liefert Shares aus Instagram/TikTok/YouTube o.ä. oft als
// Freitext (title/text) statt als sauberes url-Feld — die Share-Sheets dieser
// Apps hängen Link und Caption häufig einfach zusammen. Extrahiert die erste
// URL daraus und liefert den Rest als Text/Caption zurück.
export function parseSharedPayload(params: { title?: string; text?: string; url?: string }): SharedPayload {
  const combined = [params.title, params.text, params.url].filter(Boolean).join(' ').trim();
  if (!combined) return {};

  const match = combined.match(URL_REGEX);
  if (!match || match.index === undefined) return { text: combined };

  const url = match[0].replace(/[.,;!?]+$/, '');
  const rest = (combined.slice(0, match.index) + combined.slice(match.index + match[0].length)).trim();
  return { url, text: rest || undefined };
}
