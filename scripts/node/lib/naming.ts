import path from 'node:path';
import { ArcConfig } from './config.js';

export interface ParsedName {
  title: string;
  handle: string;
  color?: string;
  size?: string;
  style?: string;
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function normaliseBaseName(filePath: string): string {
  const base = path.parse(filePath).name;
  const noUnderscore = base.replace(/[_]+/g, ' ');
  const noExtraSpaces = noUnderscore.replace(/\s+/g, ' ').trim();
  return noExtraSpaces;
}

export function parseName(filePath: string, config: ArcConfig): ParsedName {
  const { naming } = config;
  const baseName = normaliseBaseName(filePath);
  const lowerBase = baseName.toLowerCase();

  let working = baseName;
  let color: string | undefined;
  let size: string | undefined;
  let style: string | undefined;

  // Capture trailing parenthetical as style marker
  const parenMatch = working.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    style = toTitleCase(parenMatch[1]);
    working = working.slice(0, parenMatch.index).trim();
  }

  for (const colourCandidate of naming.colorVocabulary) {
    if (lowerBase.endsWith(' ' + colourCandidate.toLowerCase())) {
      const withoutColour = working
        .replace(new RegExp(colourCandidate + '$', 'i'), '')
        .replace(/\s+$/, '');
      if (withoutColour.length >= 4) {
        working = withoutColour;
        color = toTitleCase(colourCandidate);
        break;
      }
    }
  }

  for (const sizeCandidate of naming.sizeVocabulary) {
    if (working.toLowerCase().endsWith(' ' + sizeCandidate.toLowerCase())) {
      const withoutSize = working
        .replace(new RegExp(sizeCandidate + '$', 'i'), '')
        .replace(/\s+$/, '');
      if (withoutSize.length >= 4) {
        working = withoutSize;
        size = toTitleCase(sizeCandidate);
        break;
      }
    }
  }

  for (const token of naming.ignoredTokens) {
    if (working.toLowerCase().endsWith(token.toLowerCase())) {
      working = working.substring(0, working.length - token.length).trim();
    }
  }

  const title = naming.titleCase ? toTitleCase(working) : working;
  const handle = slugify(title);

  return {
    title,
    handle,
    color,
    size,
    style
  };
}
