/* ================================================================
   TinyHumanMD | Shared Navigation Component
   Injects consistent navigation into every tool page.
   ================================================================ */
(function () {
  'use strict';

  var PRIMARY_TOOLS = [
    { href: '/', label: 'Schedule', id: 'schedule' },
    { href: '/catch-up/', label: 'Catch-Up', id: 'catch-up' },
    { href: '/growth/', label: 'Growth', id: 'growth' },
    { href: '/bili/', label: 'Bilirubin', id: 'bili' },
    { href: '/ga-calc/', label: 'GA Calc', id: 'ga-calc' },
    { href: '/dosing/', label: 'Dosing', id: 'dosing' }
  ];

  var CATEGORY_LINKS = [
    { href: '/categories/medication-safety-dosing/', label: 'Medication Safety', id: 'medication-safety-dosing' },
    { href: '/categories/pediatric-infectious-disease/', label: 'Infectious Disease', id: 'pediatric-infectious-disease' },
    { href: '/categories/growth-preventive-care/', label: 'Growth and Prevention', id: 'growth-preventive-care' },
    { href: '/categories/respiratory-asthma/', label: 'Respiratory and Asthma', id: 'respiratory-asthma' },
    { href: '/categories/emergency-acute-care/', label: 'Emergency and Acute', id: 'emergency-acute-care' }
  ];

  var CALCULATOR_LINKS = [
    { href: '/calculators/pediatric-fever-calculator/', label: 'Fever', id: 'pediatric-fever-calculator' },
    { href: '/calculators/pediatric-antibiotic-dosing/', label: 'Antibiotic Dosing', id: 'pediatric-antibiotic-dosing' },
    { href: '/calculators/pediatric-sepsis-risk-score/', label: 'Sepsis Risk', id: 'pediatric-sepsis-risk-score' },
    { href: '/calculators/pediatric-dehydration-management/', label: 'Dehydration', id: 'pediatric-dehydration-management' },
    { href: '/calculators/pediatric-asthma-action-tool/', label: 'Asthma Action', id: 'pediatric-asthma-action-tool' },
    { href: '/calculators/otitis-media-treatment-pediatric/', label: 'Otitis Treatment', id: 'otitis-media-treatment-pediatric' },
    { href: '/calculators/well-child-visit-checklist/', label: 'Well-Child Checklist', id: 'well-child-visit-checklist' },
    { href: '/calculators/medication-safety-dosing-engine-v2/', label: 'Dosing Engine v2', id: 'medication-safety-dosing-engine-v2' }
  ];

  var NAV_LINKS = PRIMARY_TOOLS.concat(CATEGORY_LINKS).concat(CALCULATOR_LINKS);

  var LOGO_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 6.5V12c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V6.5L12 2z" fill="var(--c-primary)" opacity=".15" stroke="var(--c-primary)" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 8.5v7M8.5 12h7" stroke="var(--c-primary)" stroke-width="2" stroke-linecap="round"/></svg>';

  function normalizePath(pathname) {
    var path = String(pathname || '/').replace(/\/index\.html$/, '/');
    if (!path.endsWith('/')) path += '/';
    return path;
  }

  function currentToolId() {
    var path = normalizePath(window.location.pathname);

    for (var i = 0; i < NAV_LINKS.length; i++) {
      if (normalizePath(NAV_LINKS[i].href) === path) return NAV_LINKS[i].id;
    }

    for (var j = 0; j < NAV_LINKS.length; j++) {
      if (path.indexOf(NAV_LINKS[j].id) !== -1) return NAV_LINKS[j].id;
    }

    return 'schedule';
  }

  function appendSectionLinks(listEl, links, active) {
    links.forEach(function (link) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = link.href;
      a.className = 'tool-nav-link' + (link.id === active ? ' is-active' : '');
      a.textContent = link.label;
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  function appendMobileSection(listEl, title, links, active) {
    var heading = document.createElement('li');
    heading.className = 'tool-mobile-label';
    heading.textContent = title;
    listEl.appendChild(heading);

    links.forEach(function (link) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      if (link.id === active) a.className = 'is-active';
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  function buildNav() {
    var active = currentToolId();
    var placeholder = document.getElementById('tool-nav-placeholder');
    if (!placeholder) return;

    var header = document.createElement('header');
    header.className = 'tool-header';
    header.setAttribute('role', 'banner');

    var inner = document.createElement('div');
    inner.className = 'tool-header-inner container';

    var logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'tool-logo';
    logo.setAttribute('aria-label', 'TinyHumanMD home');
    logo.innerHTML = LOGO_SVG + '<span>TinyHumanMD</span>';

    var nav = document.createElement('nav');
    nav.className = 'tool-nav';
    nav.setAttribute('aria-label', 'Tools navigation');
    var ul = document.createElement('ul');
    ul.className = 'tool-nav-list';
    ul.setAttribute('role', 'list');

    appendSectionLinks(ul, PRIMARY_TOOLS, active);
    appendSectionLinks(ul, CATEGORY_LINKS, active);

    nav.appendChild(ul);

    var suggestBtn = document.createElement('button');
    suggestBtn.className = 'tool-suggest-btn';
    suggestBtn.type = 'button';
    suggestBtn.id = 'suggest-addition-btn';
    suggestBtn.textContent = 'Suggest an addition?';

    var mobileBtn = document.createElement('button');
    mobileBtn.className = 'tool-mobile-btn';
    mobileBtn.setAttribute('aria-label', 'Open menu');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

    inner.appendChild(logo);
    inner.appendChild(nav);
    inner.appendChild(suggestBtn);
    inner.appendChild(mobileBtn);
    header.appendChild(inner);

    var overlay = document.createElement('div');
    overlay.className = 'tool-mobile-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    var panel = document.createElement('div');
    panel.className = 'tool-mobile-panel';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'tool-mobile-close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    var mobileList = document.createElement('ul');
    mobileList.className = 'tool-mobile-list';
    mobileList.setAttribute('role', 'list');

    appendMobileSection(mobileList, 'Core Tools', PRIMARY_TOOLS, active);
    appendMobileSection(mobileList, 'Categories', CATEGORY_LINKS, active);
    appendMobileSection(mobileList, 'New Calculators', CALCULATOR_LINKS, active);

    var suggestLi = document.createElement('li');
    var suggestLink = document.createElement('button');
    suggestLink.className = 'tool-mobile-suggest';
    suggestLink.type = 'button';
    suggestLink.textContent = 'Suggest an addition?';
    suggestLi.appendChild(suggestLink);
    mobileList.appendChild(suggestLi);

    panel.appendChild(closeBtn);
    panel.appendChild(mobileList);
    overlay.appendChild(panel);

    placeholder.parentNode.insertBefore(header, placeholder);
    placeholder.parentNode.insertBefore(overlay, placeholder);
    placeholder.parentNode.removeChild(placeholder);

    function openSurvey() {
      if (!window.posthog) {
        alert('Survey is not ready yet. Please try again in a moment.');
        return;
      }

      function renderFirstSurvey(surveys) {
        if (!surveys || !surveys.length) {
          alert('No survey is available right now. Please check back later.');
          return;
        }
        var survey = surveys[0];

        if (window.posthog.canRenderSurveyAsync) {
          window.posthog.canRenderSurveyAsync(survey.id).then(function (canRender) {
            if (canRender && window.posthog.renderSurvey) {
              window.posthog.renderSurvey(survey.id);
            } else {
              alert('Survey is not available right now. Please check back later.');
            }
          });
          return;
        }

        if (window.posthog.canRenderSurvey && !window.posthog.canRenderSurvey(survey.id)) {
          alert('Survey is not available right now. Please check back later.');
          return;
        }

        if (window.posthog.renderSurvey) {
          window.posthog.renderSurvey(survey.id);
        } else {
          alert('Survey is not available yet. Please try again in a moment.');
        }
      }

      if (window.posthog.onSurveysLoaded) {
        window.posthog.onSurveysLoaded(function (surveys, context) {
          if (context && context.error) {
            alert('Survey failed to load. Please try again later.');
            return;
          }
          renderFirstSurvey(surveys);
        });
        return;
      }

      try {
        if (window.posthog.getActiveMatchingSurveys) {
          var res = window.posthog.getActiveMatchingSurveys(renderFirstSurvey);
          if (res && typeof res.then === 'function') res.then(renderFirstSurvey);
          return;
        }
        if (window.posthog.getSurveys) {
          var resAll = window.posthog.getSurveys(renderFirstSurvey);
          if (resAll && typeof resAll.then === 'function') resAll.then(renderFirstSurvey);
          return;
        }
      } catch (error) {
        /* ignored: fallback alert shown below */
      }

      alert('Survey is not available yet. Please try again later.');
    }

    function openMobile() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      mobileBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMobile() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      mobileBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    mobileBtn.addEventListener('click', openMobile);
    closeBtn.addEventListener('click', closeMobile);

    suggestBtn.addEventListener('click', function () {
      if (window.TinyTrack) window.TinyTrack.event('suggest_addition_click', { location: 'header' });
      openSurvey();
    });

    suggestLink.addEventListener('click', function () {
      if (window.TinyTrack) window.TinyTrack.event('suggest_addition_click', { location: 'mobile_menu' });
      closeMobile();
      openSurvey();
    });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeMobile();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeMobile();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }
})();
