document.addEventListener('DOMContentLoaded', () => {
  const target = document.querySelector('#mdbook-menu-bar .right-buttons');
  if (!target) return;

  const links = [{ label: 'API', href: '/apidocs/' }];

  for (const item of links) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    a.className = 'custom-nav-link';
    a.rel = 'noopener noreferrer';
    target.prepend(a);
  }
});
