// js/escape.js
// ============================================================
// Helpers for putting Firestore data into innerHTML templates.
// Anything a member, guest or admin typed (names, titles, comments,
// links, ...) must go through one of these before it is interpolated
// into HTML, or it can run script in someone else's session.
// ============================================================

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for use in HTML content or a quoted attribute value. */
export function escapeHtml(value) {
  return value == null ? '' : String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Returns the URL only if it is http(s), mailto or blob, else ''.
 * Blocks javascript: and data: URLs. The result is NOT HTML-escaped;
 * use attrUrl() inside templates.
 */
export function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(String(url), window.location.href);
    if (['http:', 'https:', 'mailto:', 'blob:'].includes(u.protocol)) return u.href;
  } catch (_) { /* not a valid absolute/relative URL */ }
  return '';
}

/** safeUrl() escaped for use inside an href="..." / src="..." template. */
export function attrUrl(url) {
  return escapeHtml(safeUrl(url));
}

/** Escapes a value for a single-quoted JS string inside an onclick="..." attribute. */
export function jsAttr(value) {
  return escapeHtml(JSON.stringify(value == null ? '' : String(value)).slice(1, -1).replace(/'/g, "\\'"));
}

/** Returns a plain CSS color (hex, name, rgb/rgba/hsl) or the fallback, so it can't break out of a style="". */
export function safeColor(value, fallback = '') {
  const v = String(value == null ? '' : value).trim();
  return /^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|rgba|hsl|hsla)\([\d\s.,%]+\))$/i.test(v) ? v : fallback;
}

/** safeUrl() for use inside a CSS url('...') within a style="" attribute. */
export function cssUrl(url) {
  return escapeHtml(safeUrl(url).replace(/['"()\\\s]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')));
}
