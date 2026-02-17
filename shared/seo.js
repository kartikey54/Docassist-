/* ================================================================
   TinyHumanMD | SEO Helpers
   FAQ accordion toggle + cross-link rendering
   ================================================================ */
(function () {
  'use strict';

  /* FAQ accordion toggle */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.faq-question');
    if (!btn) return;
    var item = btn.closest('.faq-item');
    if (item) item.classList.toggle('is-open');
  });

  /* Render related tools block */
  var TOOLS = [
    { href: '/', title: 'Immunization Schedule', desc: 'AAP-first child and adolescent schedule, birth to 18 years' },
    { href: '/growth/', title: 'Growth Charts', desc: 'WHO, CDC & Fenton percentile calculator' },
    { href: '/bili/', title: 'Bilirubin Calculator', desc: 'AAP 2022 phototherapy thresholds' },
    { href: '/ga-calc/', title: 'Gestational Age', desc: 'GA, corrected age & due date calculator' },
    { href: '/catch-up/', title: 'Catch-Up Vaccines', desc: 'AAP-endorsed catch-up framework and dose guidance' },
    { href: '/dosing/', title: 'Dosing Calculator', desc: 'Weight-based pediatric drug doses' }
  ];

  var placeholder = document.getElementById('related-tools-placeholder');
  if (placeholder) {
    var currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    var others = TOOLS.filter(function (t) {
      return t.href !== currentPath;
    });
    var html = '<section class="related-tools container"><h2>More Pediatric Tools</h2><div class="tools-grid">';
    others.forEach(function (t) {
      html += '<a href="' + t.href + '" class="tool-link-card"><h3>' + t.title + '</h3><p>' + t.desc + '</p></a>';
    });
    html += '</div></section>';
    placeholder.innerHTML = html;
  }
})();
