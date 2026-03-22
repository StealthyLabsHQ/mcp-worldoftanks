const MASTERY_LABELS: Record<number, string> = {
  0: '\u2014',
  1: '\ud83e\udd49 3rd',
  2: '\ud83e\udd48 2nd',
  3: '\ud83e\udd47 1st',
  4: '\ud83c\udfc6 Ace',
};

export function getMasteryLabel(mark: number | null | undefined): string {
  return MASTERY_LABELS[mark ?? 0] ?? '\u2014';
}
