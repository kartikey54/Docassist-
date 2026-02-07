/* ================================================================
   TinyHumanMD | Growth Chart Calculator
   WHO (0-24m), CDC (2-20y), Fenton 2025 (preterm)
   ================================================================ */
(function () {
  'use strict';

  var whoData = null;
  var cdcData = null;
  var fentonData = null;
  var chart = null;
  var currentMetric = 'weight';

  /* ── Load reference data ─────────────────────────────────── */
  function loadJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
  }

  Promise.all([
    loadJSON('../data/who-lms.json'),
    loadJSON('../data/cdc-lms.json')
  ]).then(function (results) {
    whoData = results[0];
    cdcData = results[1];
  });

  /* Load Fenton preterm data */
  loadJSON('../data/fenton-2025-lms.json')
    .then(function (d) { fentonData = d; })
    .catch(function () { fentonData = null; });

  /* ── DOM refs ────────────────────────────────────────────── */
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.from(document.querySelectorAll(s)); };

  /* ── Age calculation ─────────────────────────────────────── */
  function ageInMonths(dob, measureDate) {
    var d1 = new Date(dob);
    var d2 = new Date(measureDate);
    var months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    var dayDiff = d2.getDate() - d1.getDate();
    return months + dayDiff / 30.44;
  }

  function correctedAge(ageMonths, gaWeeks) {
    if (!gaWeeks || gaWeeks >= 40) return ageMonths;
    var correction = (40 - gaWeeks) * (30.44 / 7) / 30.44; /* weeks to months */
    return Math.max(0, ageMonths - correction);
  }

  /* ── Determine which standard to use ─────────────────────── */
  function getStandard(ageMonths) {
    if (ageMonths <= 24) return 'WHO';
    return 'CDC';
  }

  function getTable(standard, sex, metric) {
    if (standard === 'WHO') {
      if (metric === 'weight') return whoData.weightForAge[sex];
      if (metric === 'length') return whoData.lengthForAge[sex];
      if (metric === 'hc') return whoData.headCircForAge[sex];
    } else {
      if (metric === 'weight') return cdcData.weightForAge[sex];
      if (metric === 'length') return cdcData.statureForAge[sex];
      if (metric === 'hc') return null; /* CDC HC only to 36m, not included */
    }
    return null;
  }

  /* ── Calculate and display results ───────────────────────── */
  function saveMeasurementToLocal(sex, dob, measureDate, weight, length, hc, results) {
    if (typeof Storage === 'undefined' || !Storage.init) return;
    Storage.init().then(function () {
      var entry = {
        patientId: 'default',
        type: 'growth',
        date: measureDate,
        sex: sex,
        dob: dob,
        weight: weight || null,
        length: length || null,
        hc: hc || null,
        results: results.map(function (r) { return { label: r.label, z: r.z, pct: r.pct }; })
      };
      Storage.saveMeasurement(entry);
    }).catch(function () { /* storage not available */ });
  }

  function calculate() {
    var sex = $('#sex').value;
    var dob = $('#dob').value;
    var measureDate = $('#measureDate').value;
    var weight = parseFloat($('#weight').value);
    var length = parseFloat($('#length').value);
    var hc = parseFloat($('#headCirc').value);
    var isPreterm = $('#isPreterm').checked;
    var gaWeeks = isPreterm ? parseInt($('#gaWeeks').value) : null;

    if (!dob || !measureDate) {
      alert('Please enter date of birth and measurement date.');
      return;
    }

    var rawAge = ageInMonths(dob, measureDate);
    var age = isPreterm ? correctedAge(rawAge, gaWeeks) : rawAge;

    if (age < 0) {
      alert('Measurement date must be after date of birth.');
      return;
    }

    /* Determine if Fenton preterm chart applies */
    var useFenton = isPreterm && fentonData && gaWeeks && gaWeeks < 37;
    var standard;
    var fentonGaWeeks = null;
    if (useFenton) {
      /* For Fenton: age is in weeks of gestational age (GA at birth + postnatal weeks) */
      fentonGaWeeks = gaWeeks + (rawAge * 30.44 / 7);
      if (fentonGaWeeks <= 50) {
        standard = 'Fenton';
      } else {
        standard = getStandard(age);
        useFenton = false;
      }
    } else {
      standard = getStandard(age);
    }
    var results = [];

    /* Weight */
    if (!isNaN(weight) && weight > 0) {
      var wTable;
      var wAge;
      if (useFenton) {
        wTable = fentonData.weightForGA[sex];
        wAge = fentonGaWeeks;
      } else {
        wTable = getTable(standard, sex, 'weight');
        wAge = age;
      }
      if (wTable) {
        var wr = LMS.calculate(wTable, wAge, weight);
        if (wr) results.push({ label: useFenton ? 'Weight-for-GA (Fenton)' : 'Weight-for-Age', value: weight, unit: 'kg', z: wr.z, pct: wr.percentile, metric: 'weight' });
      }
    }

    /* Length/Height */
    if (!isNaN(length) && length > 0) {
      var lTable;
      var lAge;
      if (useFenton) {
        lTable = fentonData.lengthForGA[sex];
        lAge = fentonGaWeeks;
      } else {
        lTable = getTable(standard, sex, 'length');
        lAge = age;
      }
      if (lTable) {
        var lr = LMS.calculate(lTable, lAge, length);
        var lenLabel = useFenton ? 'Length-for-GA (Fenton)' : (age <= 24 ? 'Length-for-Age' : 'Height-for-Age');
        if (lr) results.push({ label: lenLabel, value: length, unit: 'cm', z: lr.z, pct: lr.percentile, metric: 'length' });
      }
    }

    /* Head Circumference */
    if (!isNaN(hc) && hc > 0) {
      var hcTable;
      var hcAge;
      if (useFenton) {
        hcTable = fentonData.headCircForGA[sex];
        hcAge = fentonGaWeeks;
      } else if (age <= 24) {
        hcTable = getTable(standard, sex, 'hc');
        hcAge = age;
      }
      if (hcTable) {
        var hr = LMS.calculate(hcTable, hcAge, hc);
        if (hr) results.push({ label: useFenton ? 'HC-for-GA (Fenton)' : 'Head Circumference', value: hc, unit: 'cm', z: hr.z, pct: hr.percentile, metric: 'hc' });
      }
    }

    if (results.length === 0) {
      alert('Please enter at least one measurement (weight, length, or head circumference).');
      return;
    }

    /* Track calculator usage */
    if (window.TinyTrack) window.TinyTrack.calcUsed('growth', { standard: standard, sex: sex, metrics: results.length });

    /* Persist measurement locally */
    saveMeasurementToLocal(sex, dob, measureDate, weight, length, hc, results);

    displayResults(results, standard, age, sex, isPreterm, rawAge, useFenton, fentonGaWeeks);
  }

  function displayResults(results, standard, age, sex, isPreterm, rawAge, useFenton, fentonGaWeeks) {
    var card = $('#resultsCard');
    card.style.display = '';
    $('#chartsSection').style.display = '';

    var ageDisplay = age < 1 ? Math.round(age * 30.44) + ' days' :
                     age < 24 ? age.toFixed(1) + ' months' :
                     (age / 12).toFixed(1) + ' years';

    $('#chartStandard').textContent = standard + ' standard | Age: ' + ageDisplay +
      (isPreterm ? ' (corrected from ' + rawAge.toFixed(1) + 'm)' : '') +
      ' | ' + (sex === 'male' ? 'Male' : 'Female');

    var grid = $('#resultsGrid');
    grid.innerHTML = results.map(function (r) {
      var pctClass = r.pct < 3 || r.pct > 97 ? 'is-danger' :
                     r.pct < 10 || r.pct > 90 ? 'is-warning' : '';
      return '<div class="result-item">' +
        '<div class="result-value ' + pctClass + '">' + r.pct + '<span style="font-size:var(--text-sm)">%</span></div>' +
        '<div class="result-label">' + r.label + '</div>' +
        '<div style="font-size:var(--text-xs);color:var(--c-text-muted);margin-top:4px">' +
          r.value + ' ' + r.unit + ' | Z: ' + r.z +
        '</div>' +
      '</div>';
    }).join('');

    /* Draw chart for first available metric */
    var firstMetric = results[0].metric;
    $$('.chart-tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.metric === firstMetric); });
    currentMetric = firstMetric;
    var chartAge = useFenton ? fentonGaWeeks : age;
    drawChart(standard, sex, chartAge, firstMetric, results, useFenton);
  }

  /* ── Chart rendering ─────────────────────────────────────── */
  function drawChart(standard, sex, age, metric, results, useFenton) {
    var table;
    if (useFenton && fentonData) {
      if (metric === 'weight') table = fentonData.weightForGA[sex];
      else if (metric === 'length') table = fentonData.lengthForGA[sex];
      else if (metric === 'hc') table = fentonData.headCircForGA[sex];
    } else {
      table = getTable(standard, sex, metric);
    }
    if (!table) return;

    var canvas = $('#growthChart');
    if (chart) chart.destroy();

    var percentiles = [3, 10, 25, 50, 75, 90, 97];
    var datasets = [];

    /* Percentile curves */
    var step = useFenton ? 0.5 : (standard === 'WHO' ? 0.5 : 3);
    percentiles.forEach(function (p) {
      var curve = LMS.percentileCurve(table, p, step);
      var label = p + 'th';
      if (p === 50) label = '50th (median)';
      datasets.push(ChartHelpers.percentileDataset(
        label,
        curve.map(function (pt) {
          var x = useFenton ? pt.age : (standard === 'WHO' ? pt.age : pt.age / 12);
          return { x: x, y: pt.value };
        }),
        p
      ));
    });

    /* Patient point */
    var measurement = results.find(function (r) { return r.metric === metric; });
    if (measurement) {
      var xVal = useFenton ? age : (standard === 'WHO' ? age : age / 12);
      datasets.push(ChartHelpers.patientPointDataset(
        'Patient',
        [{ x: xVal, y: measurement.value }]
      ));
    }

    var xLabel = useFenton ? 'Gestational Age (weeks)' : (standard === 'WHO' ? 'Age (months)' : 'Age (years)');
    var yLabels = { weight: 'Weight (kg)', length: useFenton ? 'Length (cm)' : (standard === 'WHO' ? 'Length (cm)' : 'Height (cm)'), hc: 'Head Circumference (cm)' };
    var config = ChartHelpers.baseChartConfig(xLabel, yLabels[metric] || 'Value');

    config.data = { datasets: datasets };
    config.options.scales.x.type = 'linear';
    config.options.plugins.tooltip.callbacks = {
      title: function (items) {
        var x = items[0].parsed.x;
        if (useFenton) return x.toFixed(1) + ' weeks GA';
        return standard === 'WHO' ? x.toFixed(1) + ' months' : x.toFixed(1) + ' years';
      },
      label: function (item) {
        if (item.dataset.label === 'Patient') {
          return item.parsed.y.toFixed(1) + ' ' + (yLabels[metric] || '').split(' ').pop().replace('(','').replace(')','');
        }
        return item.dataset.label + ': ' + item.parsed.y.toFixed(1);
      }
    };

    chart = new Chart(canvas, config);
  }

  /* ── Event listeners ─────────────────────────────────────── */
  function init() {
    $('#calcBtn').addEventListener('click', calculate);
    $('#clearBtn').addEventListener('click', function () {
      $('#sex').value = 'male';
      $('#dob').value = '';
      $('#measureDate').value = '';
      $('#weight').value = '';
      $('#length').value = '';
      $('#headCirc').value = '';
      $('#isPreterm').checked = false;
      $('#gaWeeks').value = '';
      $('#pretermRow').style.display = 'none';
      $('#resultsCard').style.display = 'none';
      $('#chartsSection').style.display = 'none';
      if (chart) { chart.destroy(); chart = null; }
    });

    $('#isPreterm').addEventListener('change', function () {
      $('#pretermRow').style.display = this.checked ? '' : 'none';
    });

    /* Default measurement date to today */
    var today = new Date().toISOString().split('T')[0];
    $('#measureDate').value = today;

    /* Chart metric tabs */
    $$('.chart-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.chart-tab').forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var metric = tab.dataset.metric;
        var sex = $('#sex').value;
        var dob = $('#dob').value;
        var measureDate = $('#measureDate').value;
        if (!dob || !measureDate) return;

        var rawAge = ageInMonths(dob, measureDate);
        var isPreterm = $('#isPreterm').checked;
        var gaWeeks = isPreterm ? parseInt($('#gaWeeks').value) : null;
        var age = isPreterm ? correctedAge(rawAge, gaWeeks) : rawAge;
        var standard = getStandard(age);

        var value = null;
        if (metric === 'weight') value = parseFloat($('#weight').value);
        else if (metric === 'length') value = parseFloat($('#length').value);
        else if (metric === 'hc') value = parseFloat($('#headCirc').value);

        var results = [];
        if (value && !isNaN(value)) {
          var table = getTable(standard, sex, metric);
          if (table) {
            var r = LMS.calculate(table, age, value);
            if (r) results.push({ label: metric, value: value, unit: 'kg', z: r.z, pct: r.percentile, metric: metric });
          }
        }

        drawChart(standard, sex, age, metric, results);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
