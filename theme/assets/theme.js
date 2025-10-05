document.addEventListener('DOMContentLoaded', () => {
  const mutedBadges = document.querySelectorAll('[data-video-muted]');
  mutedBadges.forEach((element) => {
    const badge = document.createElement('span');
    badge.className = 'video-muted-badge';
    badge.textContent = 'Muted';
    element.appendChild(badge);
  });
});
