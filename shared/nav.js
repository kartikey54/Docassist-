/* ================================================================
   TinyHumanMD | Shared Navigation Component
   Injects consistent navigation into every tool page.
   ================================================================ */
(function () {
  'use strict';

  var TOOLS = [
    { href: '/',              label: 'Schedule',   id: 'schedule' },
    { href: '/catch-up/',     label: 'Catch-Up',   id: 'catch-up' },
    { href: '/growth/',       label: 'Growth',     id: 'growth' },
    { href: '/bili/',         label: 'Bilirubin',  id: 'bili' },
    { href: '/ga-calc/',      label: 'GA Calc',    id: 'ga-calc' },
    { href: '/dosing/',       label: 'Dosing',     id: 'dosing' },
    { href: '/ckid-bp/',      label: 'CKiD U25/BP', id: 'ckid-bp' }
  ];

  var LOGO_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 6.5V12c0 5 3.4 9.3 8 10.5 4.6-1.2 8-5.5 8-10.5V6.5L12 2z" fill="var(--c-primary)" opacity=".15" stroke="var(--c-primary)" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 8.5v7M8.5 12h7" stroke="var(--c-primary)" stroke-width="2" stroke-linecap="round"/></svg>';

  function currentTool() {
    var path = window.location.pathname.replace(/\/index\.html$/, '/');
    for (var i = 0; i < TOOLS.length; i++) {
      if (path === TOOLS[i].href || path === TOOLS[i].href + 'index.html') return TOOLS[i].id;
    }
    /* fallback: check if path contains tool id */
    for (var j = 0; j < TOOLS.length; j++) {
      if (TOOLS[j].id !== 'schedule' && path.indexOf(TOOLS[j].id) !== -1) return TOOLS[j].id;
    }
    return 'schedule';
  }

  function buildNav() {
    var active = currentTool();
    var placeholder = document.getElementById('tool-nav-placeholder');
    if (!placeholder) return;

    /* --- Header --- */
    var header = document.createElement('header');
    header.className = 'tool-header';
    header.setAttribute('role', 'banner');

    var inner = document.createElement('div');
    inner.className = 'tool-header-inner container';

    /* Logo */
    var logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'tool-logo';
    logo.setAttribute('aria-label', 'TinyHumanMD home');
    logo.innerHTML = LOGO_SVG + '<span>TinyHumanMD</span>';

    /* Desktop nav */
    var nav = document.createElement('nav');
    nav.className = 'tool-nav';
    nav.setAttribute('aria-label', 'Tools navigation');
    var ul = document.createElement('ul');
    ul.className = 'tool-nav-list';
    ul.setAttribute('role', 'list');

    TOOLS.forEach(function (t) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = t.href;
      a.className = 'tool-nav-link' + (t.id === active ? ' is-active' : '');
      a.textContent = t.label;
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    /* Suggest button (top right) */
    var suggestBtn = document.createElement('button');
    suggestBtn.className = 'tool-suggest-btn';
    suggestBtn.type = 'button';
    suggestBtn.id = 'suggest-addition-btn';
    suggestBtn.textContent = 'Suggest an addition?';

    /* Mobile menu button */
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

    /* --- Mobile overlay --- */
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

    TOOLS.forEach(function (t) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = t.href;
      a.textContent = t.label;
      if (t.id === active) a.className = 'is-active';
      li.appendChild(a);
      mobileList.appendChild(li);
    });

    /* Mobile suggest button */
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

    /* Insert into DOM */
    placeholder.parentNode.insertBefore(header, placeholder);
    placeholder.parentNode.insertBefore(overlay, placeholder);
    placeholder.parentNode.removeChild(placeholder);

    /* Event listeners */
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

        // Prefer async eligibility check when available
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

      // Ensure surveys are loaded before we attempt to render
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

      // Fallback for older SDKs
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
      } catch (e) {
        /* fall through to alert */
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
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMobile();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeMobile();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }
})();
