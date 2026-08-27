export function filterSessionCardsInPlace(query: string): void {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll<HTMLElement>('.session-card');
  let visibleCount = 0;
  cards.forEach((card) => {
    const title = card.querySelector('.session-card-title')?.textContent?.toLowerCase() || '';
    const preview = card.querySelector('.session-card-preview')?.textContent?.toLowerCase() || '';
    const matches = !q || title.includes(q) || preview.includes(q);
    card.style.display = matches ? '' : 'none';
    if (matches) visibleCount++;
  });
  const countSpan = document.querySelector('.section-divider span');
  if (countSpan && countSpan.textContent?.includes('SESSIONS')) {
    countSpan.textContent = `SESSIONS (${visibleCount})`;
  }
}
