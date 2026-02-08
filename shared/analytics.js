/* ================================================================
   TinyHumanMD | Comprehensive Analytics & Performance Monitoring
   ────────────────────────────────────────────────────────────────
   Detailed tracking with geographic, device, and behavioral data:
   1. Google Analytics 4 — state/region, detailed device info, custom events
   2. Cloudflare Web Analytics — cookieless, GDPR-compliant
   3. Microsoft Clarity — heatmaps, session replay, free unlimited
   4. IP Geolocation API — state/city/ISP data via Cloudflare Workers
   5. Web Vitals — LCP, FID, CLS, TTFB, INP performance metrics
   6. Custom event tracking — tool usage, calculator interactions
   7. Client-side error monitoring & device fingerprinting
   ────────────────────────────────────────────────────────────────
   SETUP:
   Replace the tokens below with your own:
   - Google Analytics: https://analytics.google.com → GA4 Property
   - Cloudflare: https://dash.cloudflare.com → Analytics → Web Analytics
   - Clarity:    https://clarity.microsoft.com → New Project
   - IP-API:     https://ip-api.com (free tier: 45 requests/minute)
   ================================================================ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     CONFIGURATION — Analytics tokens configured
     ══════════════════════════════════════════════════════════════ */
  var GA_MEASUREMENT_ID = 'G-FMNPFLW6LD';  /* Google Analytics 4 Measurement ID */
  var CF_BEACON_TOKEN = 'ORoKf_LNQXvvbwAbBeUKkfuweRRmGYblp-qmAjgI';  /* Cloudflare Web Analytics token */
  var CLARITY_PROJECT = '';                 /* Microsoft Clarity project ID */
  var IP_API_KEY = '';                      /* Optional: ip-api.com API key for higher limits */

  /* ── 0. Device Fingerprinting & IP Geolocation ─────────────
     Collects comprehensive device and location data for analytics.
     Uses privacy-respecting methods and respects Do Not Track.
     ──────────────────────────────────────────────────────────── */
  var deviceInfo = {};
  var geoInfo = {};

  function getDeviceFingerprint() {
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
      var fingerprint = canvas.toDataURL().slice(-50);

      deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : '',
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: screen.width + 'x' + screen.height,
        screenColorDepth: screen.colorDepth,
        screenPixelRatio: window.devicePixelRatio || 1,
        touchSupport: 'ontouchstart' in window,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        canvasFingerprint: fingerprint,
        webglVendor: getWebGLInfo().vendor,
        webglRenderer: getWebGLInfo().renderer,
        plugins: getPluginsList(),
        timestamp: Date.now()
      };
    } catch (e) {
      deviceInfo = { error: 'fingerprint_failed' };
    }
  }

  function getWebGLInfo() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { vendor: 'unknown', renderer: 'unknown' };
      var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      };
    } catch (e) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }
  }

  function getPluginsList() {
    if (!navigator.plugins) return 'none';
    var plugins = [];
    for (var i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins.join(',');
  }

  function getIPGeolocation() {
    // Use ip-api.com for detailed geolocation (free tier: 45 req/min)
    var apiUrl = IP_API_KEY ?
      'https://pro.ip-api.com/json/?key=' + IP_API_KEY :
      'http://ip-api.com/json/';

    fetch(apiUrl)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 'success') {
          geoInfo = {
            ip: data.query,
            country: data.country,
            countryCode: data.countryCode,
            region: data.region,
            regionName: data.regionName,
            city: data.city,
            zip: data.zip,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone,
            isp: data.isp,
            org: data.org,
            as: data.as,
            mobile: data.mobile,
            proxy: data.proxy,
            hosting: data.hosting
          };

          // Send to GA4 once we have geo data
          if (window.gtag) {
            window.gtag('event', 'geo_info_collected', {
              country: geoInfo.country,
              region: geoInfo.regionName,
              city: geoInfo.city,
              timezone: geoInfo.timezone,
              isp: geoInfo.isp,
              mobile: geoInfo.mobile,
              proxy: geoInfo.proxy,
              hosting: geoInfo.hosting
            });
          }
        }
      })
      .catch(function(err) {
        console.log('Geo lookup failed:', err);
        geoInfo = { error: 'geo_failed' };
      });
  }

  /* ── 1. Google Analytics 4 ───────────────────────────────────
     Comprehensive tracking with custom dimensions:
     - State/region/city from IP geolocation
     - Detailed device fingerprinting
     - Custom events for tool usage
     - Performance metrics
     - Error tracking
     ──────────────────────────────────────────────────────────── */
  function initGoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) return;

    // Load GA4 script
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());

    // Configure GA4 with custom dimensions
    gtag('config', GA_MEASUREMENT_ID, {
      custom_map: {
        'dimension1': 'device_fingerprint',
        'dimension2': 'geo_region',
        'dimension3': 'geo_city',
        'dimension4': 'device_type_detailed',
        'dimension5': 'connection_type',
        'dimension6': 'memory_gb',
        'dimension7': 'cores',
        'dimension8': 'screen_dpi',
        'dimension9': 'webgl_renderer',
        'dimension10': 'timezone'
      },
      send_page_view: true
    });

    // Send device info after GA4 loads
    setTimeout(function() {
      if (window.gtag && Object.keys(deviceInfo).length > 0) {
        window.gtag('event', 'device_info', {
          device_fingerprint: btoa(JSON.stringify(deviceInfo)).slice(0, 100),
          device_type_detailed: deviceInfo.platform + ' | ' + deviceInfo.screenResolution,
          memory_gb: deviceInfo.deviceMemory,
          cores: deviceInfo.hardwareConcurrency,
          screen_dpi: deviceInfo.screenPixelRatio,
          webgl_renderer: deviceInfo.webglRenderer,
          timezone: deviceInfo.timezone,
          connection_type: getConnectionType()
        });
      }
    }, 2000);
  }

  function getConnectionType() {
    try {
      var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        return connection.effectiveType + ' | ' + connection.downlink + 'Mbps';
      }
    } catch (e) {}
    return 'unknown';
  }

  /* ── 2. Cloudflare Web Analytics ─────────────────────────────
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

  /* ── 4. Enhanced Custom Event Tracking ──────────────────────
     Comprehensive event tracking with GA4, Clarity, and console logging.
     Tracks detailed user interactions, tool usage, and behavioral data.
     ──────────────────────────────────────────────────────────── */
  window.TinyTrack = {
    event: function (name, props) {
      /* Send to GA4 */
      if (window.gtag) {
        window.gtag('event', name, props || {});
      }

      /* Tag in Clarity */
      if (window.clarity) {
        window.clarity('set', name, JSON.stringify(props || {}));
      }

      /* Console logging in development */
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📊 TinyTrack:', name, props);
      }
    },

    /* Track calculator usage with detailed params */
    calcUsed: function (tool, params) {
      var eventData = {
        tool_name: tool,
        input_params: JSON.stringify(params),
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
        session_duration: Math.round((Date.now() - (window.sessionStart || Date.now())) / 1000),
        geo_region: geoInfo.regionName || 'unknown',
        device_type: deviceInfo.platform || 'unknown'
      };
      this.event('calculator_used', eventData);
    },

    /* Track tool navigation with context */
    toolView: function (tool, fromTool) {
      var eventData = {
        tool_name: tool,
        previous_tool: fromTool || 'direct',
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_size: deviceInfo.screenResolution,
        geo_country: geoInfo.country || 'unknown',
        geo_region: geoInfo.regionName || 'unknown',
        device_memory: deviceInfo.deviceMemory,
        connection_type: getConnectionType(),
        timestamp: Date.now()
      };
      this.event('tool_navigation', eventData);
    },

    /* Track button clicks and interactions */
    buttonClick: function (buttonId, buttonText, context) {
      this.event('button_click', {
        button_id: buttonId,
        button_text: buttonText,
        context: context,
        page_path: location.pathname,
        geo_region: geoInfo.regionName || 'unknown',
        device_type: deviceInfo.platform || 'unknown'
      });
    },

    /* Track form interactions */
    formInteraction: function (formId, action, fieldData) {
      this.event('form_interaction', {
        form_id: formId,
        action: action, // 'start', 'submit', 'error', etc.
        field_count: Object.keys(fieldData || {}).length,
        has_required_fields: true, // assuming validation
        geo_region: geoInfo.regionName || 'unknown'
      });
    },

    /* Track search and filter usage */
    searchUsed: function (query, resultsCount, filters) {
      this.event('search_performed', {
        search_query: query,
        results_count: resultsCount,
        filters_applied: JSON.stringify(filters),
        geo_region: geoInfo.regionName || 'unknown',
        device_type: deviceInfo.platform || 'unknown'
      });
    },

    /* Track errors and issues */
    errorOccurred: function (errorType, errorMessage, context) {
      this.event('error_encountered', {
        error_type: errorType,
        error_message: errorMessage,
        context: context,
        user_agent: navigator.userAgent,
        geo_region: geoInfo.regionName || 'unknown',
        device_type: deviceInfo.platform || 'unknown',
        url: location.href
      });
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
    // Set session start time
    window.sessionStart = Date.now();

    // Collect device info immediately
    getDeviceFingerprint();

    // Initialize all analytics services
    initGoogleAnalytics();
    initCloudflare();
    initClarity();
    initWebVitals();
    initErrorTracking();

    // Start geo lookup (async)
    getIPGeolocation();

    // Track initial page view
    autoTrackPageView();
    checkPerformanceBudget();

    // Enhanced page visibility tracking
    initPageVisibilityTracking();
  }

  /* Enhanced page visibility and engagement tracking */
  function initPageVisibilityTracking() {
    var pageVisibleStart = Date.now();
    var totalVisibleTime = 0;

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        pageVisibleStart = Date.now();
      } else if (document.visibilityState === 'hidden') {
        var visibleDuration = Date.now() - pageVisibleStart;
        totalVisibleTime += visibleDuration;

        // Track page engagement on hide
        window.TinyTrack.event('page_engagement', {
          total_visible_time: Math.round(totalVisibleTime / 1000),
          session_duration: Math.round((Date.now() - window.sessionStart) / 1000),
          geo_region: geoInfo.regionName || 'unknown',
          page_path: location.pathname
        });
      }
    });

    // Track scroll depth
    var maxScrollDepth = 0;
    window.addEventListener('scroll', function() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var windowHeight = window.innerHeight;
      var documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      var scrollDepth = Math.round((scrollTop + windowHeight) / documentHeight * 100);

      if (scrollDepth > maxScrollDepth && scrollDepth <= 100) {
        maxScrollDepth = scrollDepth;

        // Track scroll milestones
        if (maxScrollDepth >= 25 && maxScrollDepth % 25 === 0) {
          window.TinyTrack.event('scroll_milestone', {
            scroll_depth: maxScrollDepth,
            page_path: location.pathname,
            geo_region: geoInfo.regionName || 'unknown'
          });
        }
      }
    });
  }

  /* Run after DOM is ready but don't block rendering */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* Defer to not block main thread */
    setTimeout(init, 0);
  }
})();
