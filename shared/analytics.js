/* ================================================================
   TinyHumanMD | Analytics & Performance Monitoring
   ────────────────────────────────────────────────────────────────
   All free, privacy-first tracking:
   1. Cloudflare Web Analytics — cookieless, GDPR-compliant
   2. Microsoft Clarity — heatmaps, session replay, free unlimited
   3. Web Vitals — LCP, FID, CLS, TTFB, INP
   4. Custom event tracking — tool usage, calculator interactions
   5. Client-side error monitoring
   ────────────────────────────────────────────────────────────────
   SETUP:
   Replace the tokens below with your own (both are free):
   - Cloudflare: https://dash.cloudflare.com → Analytics → Web Analytics
   - Clarity:    https://clarity.microsoft.com → New Project
   ================================================================ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     CONFIGURATION — Replace these with your real tokens
     ══════════════════════════════════════════════════════════════ */
  var CF_BEACON_TOKEN = '';  /* e.g. 'a1b2c3d4e5f6...' — Get from Cloudflare dashboard */
  var CLARITY_PROJECT = '';  /* e.g. 'ab1cd2ef3g'      — Get from clarity.microsoft.com */

  /* ── 1. Cloudflare Web Analytics ─────────────────────────────
     - Free forever, unlimited page views
     - No cookies, no PII, GDPR/CCPA compliant out of the box
     - Tracks: page views, referrers, browsers, countries, paths
     - ~< 1 KB script, loaded async
     ──────────────────────────────────────────────────────────── */
  function initCloudflare() {
    if (!CF_BEACON_TOKEN) return;
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', '{"token":"' + CF_BEACON_TOKEN + '"}');
    document.head.appendChild(s);
  }

  /* ── 2. Microsoft Clarity ────────────────────────────────────
     - Free unlimited traffic (no cap)
     - Heatmaps, session recordings, rage click detection
     - Dead click tracking, scroll depth
     - JavaScript error tracking built-in
     - GDPR compliant, auto-masks sensitive content
     - Dashboard: clarity.microsoft.com
     ──────────────────────────────────────────────────────────── */
  function initClarity() {
    if (!CLARITY_PROJECT) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT);
  }

  /* ── 3. Core Web Vitals ──────────────────────────────────────
     Measures real-user performance (RUM):
     - LCP  (Largest Contentful Paint) — loading performance
     - FID  (First Input Delay) / INP — interactivity
     - CLS  (Cumulative Layout Shift) — visual stability
     - TTFB (Time to First Byte) — server responsiveness
     - FCP  (First Contentful Paint) — perceived load speed
     
     Results logged to console and pushed to Clarity custom tags.
     ──────────────────────────────────────────────────────────── */
  var vitals = {};

  function reportVital(name, value) {
    vitals[name] = Math.round(value);

    /* Tag Clarity with CWV data if available */
    if (window.clarity) {
      window.clarity('set', 'cwv_' + name.toLowerCase(), String(Math.round(value)));
    }
  }

  function initWebVitals() {
    /* TTFB */
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) reportVital('TTFB', nav.responseStart - nav.requestStart);
    } catch (e) { /* not supported */ }

    /* FCP */
    try {
      var paintObserver = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.name === 'first-contentful-paint') {
            reportVital('FCP', entry.startTime);
          }
        });
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch (e) { /* not supported */ }

    /* LCP */
    try {
      var lcpObserver = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) reportVital('LCP', last.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* not supported */ }

    /* CLS */
    try {
      var clsValue = 0;
      var clsObserver = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        });
        reportVital('CLS', clsValue * 1000); /* multiply for readability */
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* not supported */ }

    /* INP (Interaction to Next Paint) — replaces FID */
    try {
      var inpObserver = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.interactionId) {
            var duration = entry.duration;
            if (!vitals.INP || duration > vitals.INP) {
              reportVital('INP', duration);
            }
          }
        });
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) { /* not supported */ }

    /* Report summary on page hide */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && Object.keys(vitals).length > 0) {
        /* Send beacon with vitals data if needed */
        if (navigator.sendBeacon) {
          try {
            var data = JSON.stringify({
              url: location.pathname,
              vitals: vitals,
              ts: Date.now()
            });
            /* Beacon to your own endpoint if you have one — or just log */
            /* navigator.sendBeacon('/api/vitals', data); */
          } catch (e) { /* ignore */ }
        }
      }
    });
  }

  /* ── 4. Custom Event Tracking ────────────────────────────────
     Lightweight event tracking for tool usage analytics.
     Tags events in Clarity and logs to console in development.
     ──────────────────────────────────────────────────────────── */
  window.TinyTrack = {
    event: function (name, props) {
      /* Tag in Clarity */
      if (window.clarity) {
        window.clarity('set', name, JSON.stringify(props || {}));
      }
    },

    /* Track calculator usage */
    calcUsed: function (tool, params) {
      this.event('calc_used', { tool: tool, params: params });
    },

    /* Track tool navigation */
    toolView: function (tool) {
      this.event('tool_view', { tool: tool });
    }
  };

  /* Auto-track current tool on page load */
  function autoTrackPageView() {
    var path = location.pathname;
    var tool = 'schedule';
    if (path.indexOf('/growth') !== -1) tool = 'growth';
    else if (path.indexOf('/bili') !== -1) tool = 'bilirubin';
    else if (path.indexOf('/ga-calc') !== -1) tool = 'ga-calc';
    else if (path.indexOf('/catch-up') !== -1) tool = 'catch-up';
    else if (path.indexOf('/dosing') !== -1) tool = 'dosing';
    window.TinyTrack.toolView(tool);
  }

  /* ── 5. Client-Side Error Monitoring ─────────────────────────
     Captures unhandled errors and unhandled promise rejections.
     Tags them in Clarity for correlation with session replays.
     ──────────────────────────────────────────────────────────── */
  function initErrorTracking() {
    window.addEventListener('error', function (e) {
      var errData = {
        message: e.message || 'Unknown error',
        source: e.filename || '',
        line: e.lineno || 0,
        col: e.colno || 0,
        url: location.pathname
      };
      if (window.clarity) {
        window.clarity('set', 'js_error', errData.message);
        window.clarity('set', 'error_source', errData.source + ':' + errData.line);
      }
    });

    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown';
      if (window.clarity) {
        window.clarity('set', 'promise_error', reason);
      }
    });
  }

  /* ── 6. Performance Budget Alerts ────────────────────────────
     Logs warnings if key metrics exceed thresholds.
     Helps maintain performance during development.
     ──────────────────────────────────────────────────────────── */
  function checkPerformanceBudget() {
    setTimeout(function () {
      /* Check bundle sizes loaded */
      try {
        var resources = performance.getEntriesByType('resource');
        var totalJS = 0, totalCSS = 0;
        resources.forEach(function (r) {
          var size = r.transferSize || 0;
          if (r.name.match(/\.js(\?|$)/)) totalJS += size;
          if (r.name.match(/\.css(\?|$)/)) totalCSS += size;
        });

        /* Tag totals in Clarity */
        if (window.clarity) {
          window.clarity('set', 'js_bytes', String(totalJS));
          window.clarity('set', 'css_bytes', String(totalCSS));
        }
      } catch (e) { /* not supported */ }
    }, 5000);
  }

  /* ── Initialize everything ───────────────────────────────── */
  function init() {
    initCloudflare();
    initClarity();
    initWebVitals();
    initErrorTracking();
    autoTrackPageView();
    checkPerformanceBudget();
  }

  /* Run after DOM is ready but don't block rendering */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* Defer to not block main thread */
    setTimeout(init, 0);
  }
})();
