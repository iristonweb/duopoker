import type { JokerDeclaration } from '@duopoker/shared-types/index';
import { suitLabel } from './labels';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

export const formatJokerDeclaration = (
  declaration: JokerDeclaration | undefined,
  t: Translate
): string | undefined => {
  if (!declaration) return undefined;
  if (declaration === 'nominal') return t('table.jokerDeclNominal');
  if (declaration === 'senior') return t('table.jokerDeclSenior');
  if (declaration === 'minor') return t('table.jokerDeclMinor');
  const suit = suitLabel(declaration.suit, t);
  if (declaration.rankMode === 'senior') {
    return t('table.jokerDeclLeadSuit', { suit });
  }
  return t('table.jokerDeclLeadSuitLow', { suit });
};

export const formatJokerPlayLine = (
  cardLabel: string,
  declaration: JokerDeclaration | undefined,
  t: Translate
): string => {
  const decl = formatJokerDeclaration(declaration, t);
  return decl ? t('table.feedJokerPlayDeclared', { card: cardLabel, decl }) : cardLabel;
};
