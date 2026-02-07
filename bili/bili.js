/* ================================================================
   TinyHumanMD | Bilirubin Risk Calculator (AAP 2022)
   ================================================================ */
(function () {
  'use strict';

  var thresholdData = null;
  var chart = null;
  var $ = function (s) { return document.querySelector(s); };

  /* ── Load threshold data ─────────────────────────────────── */
  fetch('../data/bili-thresholds.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      thresholdData = d;
      buildRiskChecklist(d.riskFactors);
    });

  function buildRiskChecklist(factors) {
    var el = $('#riskChecklist');
    el.innerHTML = factors.map(function (f) {
      return '<label class="risk-check"><input type="checkbox" value="' + f.id + '" /> ' + f.label + '</label>';
    }).join('');
  }

  /* ── Interpolate threshold at a given age ────────────────── */
  function interpolateThreshold(curve, age) {
    if (!curve || curve.length === 0) return null;
    if (age <= curve[0].age) return curve[0].threshold;
    if (age >= curve[curve.length - 1].age) return curve[curve.length - 1].threshold;
    for (var i = 0; i < curve.length - 1; i++) {
      if (age >= curve[i].age && age <= curve[i + 1].age) {
        var frac = (age - curve[i].age) / (curve[i + 1].age - curve[i].age);
        return curve[i].threshold + frac * (curve[i + 1].threshold - curve[i].threshold);
      }
    }
    return null;
  }

  /* ── Calculate ───────────────────────────────────────────── */
  function calculate() {
    if (!thresholdData) { alert('Data still loading. Please try again.'); return; }

    var ga = $('#ga').value;
    var age = parseFloat($('#postnatalAge').value);
    var tsb = parseFloat($('#tsbLevel').value);
    var hasRisk = document.querySelectorAll('#riskChecklist input:checked').length > 0;

    if (isNaN(age) || isNaN(tsb)) {
      alert('Please enter postnatal age and bilirubin level.');
      return;
    }

    var gaKey = ga + 'wk';
    var photoSet = hasRisk ? thresholdData.phototherapy.withRiskFactors : thresholdData.phototherapy.noRiskFactors;
    var exchSet = hasRisk ? thresholdData.exchangeTransfusion.withRiskFactors : thresholdData.exchangeTransfusion.noRiskFactors;

    var photoCurve = photoSet[gaKey];
    var exchCurve = exchSet[gaKey];

    if (!photoCurve || !exchCurve) {
      alert('No threshold data for ' + ga + ' weeks. Select 35-40 weeks.');
      return;
    }

    var photoThreshold = interpolateThreshold(photoCurve, age);
    var exchThreshold = interpolateThreshold(exchCurve, age);

    if (photoThreshold === null || exchThreshold === null) {
      alert('Could not calculate thresholds for this age.');
      return;
    }

    if (window.TinyTrack) window.TinyTrack.calcUsed('bilirubin', { ga: ga, hasRisk: hasRisk });
    displayResults(tsb, photoThreshold, exchThreshold, age, ga, hasRisk, photoCurve, exchCurve);
  }

  function displayResults(tsb, photoThreshold, exchThreshold, age, ga, hasRisk, photoCurve, exchCurve) {
    var card = $('#resultsCard');
    card.style.display = '';
    $('#chartSection').style.display = '';

    /* Determine risk level */
    var level, message;
    if (tsb >= exchThreshold) {
      level = 'above-exchange';
      message = 'ABOVE EXCHANGE TRANSFUSION THRESHOLD — Immediate intervention required';
    } else if (tsb >= photoThreshold) {
      level = 'above-photo';
      message = 'ABOVE PHOTOTHERAPY THRESHOLD — Initiate phototherapy';
    } else if (tsb >= photoThreshold * 0.85) {
      level = 'approaching';
      message = 'APPROACHING PHOTOTHERAPY THRESHOLD — Close monitoring recommended';
    } else {
      level = 'low';
      message = 'Below phototherapy threshold — Continue routine monitoring';
    }

    var banner = $('#riskBanner');
    banner.className = 'risk-banner level-' + level;
    banner.textContent = message;

    var grid = $('#resultsGrid');
    grid.innerHTML =
      '<div class="result-item">' +
        '<div class="result-value">' + tsb.toFixed(1) + '</div>' +
        '<div class="result-label">TSB (mg/dL)</div>' +
      '</div>' +
      '<div class="result-item">' +
        '<div class="result-value">' + photoThreshold.toFixed(1) + '</div>' +
        '<div class="result-label">Phototherapy Threshold</div>' +
      '</div>' +
      '<div class="result-item">' +
        '<div class="result-value">' + exchThreshold.toFixed(1) + '</div>' +
        '<div class="result-label">Exchange Threshold</div>' +
      '</div>' +
      '<div class="result-item">' +
        '<div class="result-value">' + (photoThreshold - tsb).toFixed(1) + '</div>' +
        '<div class="result-label">Below Photo Threshold</div>' +
      '</div>';

    drawChart(tsb, age, ga, hasRisk, photoCurve, exchCurve);
  }

  /* ── Chart ───────────────────────────────────────────────── */
  function drawChart(tsb, age, ga, hasRisk, photoCurve, exchCurve) {
    var canvas = $('#biliChart');
    if (chart) chart.destroy();

    var config = ChartHelpers.baseChartConfig('Postnatal Age (hours)', 'Total Serum Bilirubin (mg/dL)');
    config.data = {
      datasets: [
        {
          label: 'Phototherapy Threshold',
          data: photoCurve.map(function (p) { return { x: p.age, y: p.threshold }; }),
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Exchange Transfusion',
          data: exchCurve.map(function (p) { return { x: p.age, y: p.threshold }; }),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Patient TSB',
          data: [{ x: age, y: tsb }],
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          showLine: false,
          order: -1
        }
      ]
    };

    config.options.scales.x.type = 'linear';
    config.options.scales.x.min = 0;
    config.options.scales.x.max = 100;
    config.options.scales.y.min = 0;
    config.options.plugins.legend = {
      display: true,
      position: 'bottom',
      labels: {
        font: { family: "'Inter', sans-serif", size: 12 },
        usePointStyle: true,
        padding: 16
      }
    };
    config.options.plugins.tooltip.callbacks = {
      title: function (items) { return items[0].parsed.x + ' hours'; },
      label: function (item) { return item.dataset.label + ': ' + item.parsed.y.toFixed(1) + ' mg/dL'; }
    };

    chart = new Chart(canvas, config);
  }

  /* ── Event listeners ─────────────────────────────────────── */
  function init() {
    $('#calcBtn').addEventListener('click', calculate);
    $('#clearBtn').addEventListener('click', function () {
      $('#ga').value = '38';
      $('#postnatalAge').value = '';
      $('#tsbLevel').value = '';
      document.querySelectorAll('#riskChecklist input').forEach(function (cb) { cb.checked = false; });
      $('#resultsCard').style.display = 'none';
      $('#chartSection').style.display = 'none';
      if (chart) { chart.destroy(); chart = null; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
