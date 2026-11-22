// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

(() => {
  window.addEventListener('DOMContentLoaded', async () => {
    await mermaid.run({ querySelector: '.mermaid' });

    document.querySelectorAll('.mermaid svg').forEach((svg) => {
      // Remove Mermaid's restrictive inline max-width so zooming/panning has room
      svg.style.maxWidth = 'none';
      svg.style.width = '100%';
      svg.style.height = '500px';
      svg.style.border = '1px solid var(--table-border-color, #444)';
      svg.style.borderRadius = '6px';

      svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.5,
        maxZoom: 10,
        zoomScaleSensitivity: 0.5,
      });
    });
  });

  const darkThemes = ['ayu', 'navy', 'coal'];
  const lightThemes = ['light', 'rust'];

  const classList = document.getElementsByTagName('html')[0].classList;

  let lastThemeWasLight = true;
  for (const cssClass of classList) {
    if (darkThemes.includes(cssClass)) {
      lastThemeWasLight = false;
      break;
    }
  }

  const theme = lastThemeWasLight ? 'default' : 'dark';
  mermaid.initialize({
    startOnLoad: true,
    theme,
    sequence: { showSequenceNumbers: true },
  });

  // Simplest way to make mermaid re-render the diagrams in the new theme is via refreshing the page

  for (const darkTheme of darkThemes) {
    document
      .getElementById('mdbook-theme-' + darkTheme)
      .addEventListener('click', () => {
        if (lastThemeWasLight) {
          window.location.reload();
        }
      });
  }

  for (const lightTheme of lightThemes) {
    document
      .getElementById('mdbook-theme-' + lightTheme)
      .addEventListener('click', () => {
        if (!lastThemeWasLight) {
          window.location.reload();
        }
      });
  }
})();
