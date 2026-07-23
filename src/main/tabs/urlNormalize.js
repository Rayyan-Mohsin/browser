'use strict';

const URL_LIKE = /^(https?:\/\/|file:\/\/|about:)/i;
// A bare host/domain like "example.com" or "example.com/path".
const BARE_HOST = /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i;
const LOCALHOST = /^localhost(:\d+)?(\/.*)?$/i;

function looksLikeUrl(input) {
  const trimmed = input.trim();
  if (URL_LIKE.test(trimmed)) return true;
  if (/\s/.test(trimmed)) return false;
  if (LOCALHOST.test(trimmed)) return true;
  if (BARE_HOST.test(trimmed)) return true;
  return false;
}

function normalizeInput(input, searchEngineTemplate) {
  const trimmed = input.trim();
  if (!trimmed) return searchEngineTemplate.replace('%s', '');
  if (URL_LIKE.test(trimmed)) return trimmed;
  if (looksLikeUrl(trimmed)) return `https://${trimmed}`;
  return searchEngineTemplate.replace('%s', encodeURIComponent(trimmed));
}

module.exports = { normalizeInput, looksLikeUrl };
