/* ================================================================
   TinyHumanMD | SEO Helpers
   FAQ accordion toggle + registry-driven related tool links
   ================================================================ */
(function () {
  'use strict';

  function normalizePath(pathname) {
    var path = String(pathname || '/').replace(/\/index\.html$/, '/');
    if (!path.startsWith('/')) path = '/' + path;
    if (!path.endsWith('/')) path += '/';
    return path;
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.faq-question');
    if (!button) return;
    var item = button.closest('.faq-item');
    if (item) item.classList.toggle('is-open');
  });

  var FALLBACK_TOOLS = [
    { href: '/', title: 'Immunization Schedule', desc: 'AAP-first child and adolescent schedule, birth to 18 years' },
    { href: '/growth/', title: 'Growth Charts', desc: 'WHO, CDC, and Fenton percentile calculator' },
    { href: '/bili/', title: 'Bilirubin Calculator', desc: 'AAP 2022 phototherapy thresholds' },
    { href: '/ga-calc/', title: 'Gestational Age', desc: 'GA, corrected age, and due date support' },
    { href: '/catch-up/', title: 'Catch-Up Vaccines', desc: 'AAP-endorsed catch-up framework and dose guidance' },
    { href: '/dosing/', title: 'Dosing Calculator', desc: 'Weight-based pediatric medication doses' }
  ];

  function renderRelatedCards(items) {
    var placeholder = document.getElementById('related-tools-placeholder');
    if (!placeholder) return;

    var html = '<section class="related-tools container"><h2>More Pediatric Tools</h2><div class="tools-grid">';
    items.forEach(function (item) {
      html += '<a href="' + item.href + '" class="tool-link-card"><h3>' + item.title + '</h3><p>' + item.desc + '</p></a>';
    });
    html += '</div></section>';
    placeholder.innerHTML = html;
  }

  function toCard(tool) {
    return {
      href: normalizePath(tool.route || '/'),
      title: tool.title || 'Tool',
      desc: tool.description || ''
    };
  }

  function buildFallbackCards(currentPath) {
    return FALLBACK_TOOLS.filter(function (item) {
      return normalizePath(item.href) !== currentPath;
    }).slice(0, 6);
  }

  function indexTools(tools) {
    var byId = {};
    var byRoute = {};
    tools.forEach(function (tool) {
      byId[tool.id] = tool;
      byRoute[normalizePath(tool.route)] = tool;
    });
    return { byId: byId, byRoute: byRoute };
  }

  function pickRelatedFromRegistry(currentPath, registry, linksDoc) {
    var tools = Array.isArray(registry.tools) ? registry.tools : [];
    var indexed = indexTools(tools);
    var current = indexed.byRoute[currentPath] || null;

    var related = [];

    if (linksDoc && linksDoc.by_route && Array.isArray(linksDoc.by_route[currentPath])) {
      linksDoc.by_route[currentPath].forEach(function (route) {
        var tool = indexed.byRoute[normalizePath(route)];
        if (tool) related.push(tool);
      });
    }

    if (related.length < 6 && current) {
      var sameCategory = tools.filter(function (tool) {
        return tool.id !== current.id && tool.category_slug && tool.category_slug === current.category_slug;
      });
      related = related.concat(sameCategory);
    }

    if (related.length < 6) {
      var featured = tools.filter(function (tool) {
        return tool.type === 'core' || tool.type === 'calculator';
      });
      related = related.concat(featured);
    }

    var deDuped = [];
    var seen = {};
    for (var i = 0; i < related.length; i++) {
      var tool = related[i];
      var route = normalizePath(tool.route);
      if (route === currentPath) continue;
      if (seen[tool.id]) continue;
      seen[tool.id] = true;
      deDuped.push(toCard(tool));
      if (deDuped.length >= 6) break;
    }

    return deDuped;
  }

  function loadRegistryRelated(currentPath) {
    return Promise.all([
      fetch('/data/calculators/registry.json', { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('registry fetch failed');
        return response.json();
      }),
      fetch('/data/calculators/internal-links.json', { cache: 'no-store' }).then(function (response) {
        if (!response.ok) return null;
        return response.json();
      }).catch(function () { return null; })
    ]).then(function (responses) {
      return pickRelatedFromRegistry(currentPath, responses[0], responses[1]);
    });
  }

  var currentPath = normalizePath(window.location.pathname);

  if (document.getElementById('related-tools-placeholder')) {
    loadRegistryRelated(currentPath)
      .then(function (cards) {
        if (!cards || !cards.length) {
          renderRelatedCards(buildFallbackCards(currentPath));
          return;
        }
        renderRelatedCards(cards);
      })
      .catch(function () {
        renderRelatedCards(buildFallbackCards(currentPath));
      });
  }
})();
