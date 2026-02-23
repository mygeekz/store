// utils/search/processQuery.ts
import { normalizeFaQuery } from './faNormalize';
import { correctQueryTokens } from './faSpell';
import { expandSynonyms } from './synonyms';

export type ProcessedQuery = {
  raw: string;
  normalized: string;
  final: string;
  suggestion?: string;
  expanded?: string;
};

export function processQuery(input: string): ProcessedQuery {
  const raw = input ?? '';
  const normalized = normalizeFaQuery(raw);
  const tokens = normalized.split(' ').filter(Boolean);

  const { corrected, changed } = correctQueryTokens(tokens);
  const correctedStr = corrected.join(' ');

  const final = changed ? correctedStr : normalized;
  const expanded = expandSynonyms(corrected).join(' ');

  return { raw, normalized, final, suggestion: changed ? correctedStr : undefined, expanded };
}
