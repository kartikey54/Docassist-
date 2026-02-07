/* ================================================================
   TinyHumanMD | Weight-Based Dosing Calculator
   ================================================================ */
(function () {
  'use strict';

  var dosingData = null;
  var $ = function (s) { return document.querySelector(s); };

  /* ── Load reference data ─────────────────────────────────── */
  fetch('../data/dosing-reference.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { dosingData = d; });

  /* ── Calculate ───────────────────────────────────────────── */
  function calculate() {
    if (!dosingData) { alert('Data still loading. Please try again.'); return; }

    var weightInput = parseFloat($('#weight').value);
    var unit = $('#weightUnit').value;

    if (isNaN(weightInput) || weightInput <= 0) {
      alert('Please enter a valid weight.');
      return;
    }

    var weightKg = unit === 'lb' ? weightInput * 0.453592 : weightInput;
    weightKg = Math.round(weightKg * 100) / 100;

    /* Display weight */
    var display = $('#weightDisplay');
    display.style.display = '';
    var lbDisplay = unit === 'kg' ? (weightKg * 2.20462).toFixed(1) + ' lb' : weightInput.toFixed(1) + ' lb';
    display.textContent = 'Weight: ' + weightKg.toFixed(2) + ' kg (' + lbDisplay + ')';

    if (window.TinyTrack) window.TinyTrack.calcUsed('dosing', { weightKg: weightKg });

    /* Calculate all medications */
    var container = $('#medsContainer');
    container.style.display = '';
    $('#disclaimerCard').style.display = '';

    container.innerHTML = dosingData.medications.map(function (med) {
      var rawDose = weightKg * med.dosePerKg;
      var dose = Math.round(rawDose * 10) / 10;
      var isCapped = dose > med.maxSingleDose;
      if (isCapped) dose = med.maxSingleDose;

      /* Volume calculations */
      var volumes = (med.concentrations || []).map(function (c) {
        var vol;
        if (c.mgPerMl) {
          vol = dose / c.mgPerMl;
        } else if (c.mgPerTab) {
          vol = dose / c.mgPerTab;
        }
        return {
          label: c.label,
          volume: vol ? (Math.round(vol * 10) / 10) : null,
          unit: c.mgPerTab ? 'tab(s)' : 'mL'
        };
      });

      var volumeRows = volumes.map(function (v) {
        return '<tr><td>' + v.label + '</td><td>' + (v.volume !== null ? v.volume + ' ' + v.unit : 'N/A') + '</td></tr>';
      }).join('');

      return '<div class="med-card">' +
        '<div class="med-header">' +
          '<span class="med-name">' + med.name + '</span>' +
          '<span class="med-dose-summary">' + dose + ' ' + med.unit + ' <span class="med-freq">' + med.frequency + '</span></span>' +
        '</div>' +
        '<div class="med-body">' +
          '<div class="dose-result-row">' +
            '<span class="dose-result-label">Calculated dose (' + med.dosePerKg + ' ' + med.unit + '/kg)</span>' +
            '<span class="dose-result-value' + (isCapped ? ' is-capped' : '') + '">' + dose + ' ' + med.unit +
              (isCapped ? ' (capped at max ' + med.maxSingleDose + ' ' + med.unit + ')' : '') +
            '</span>' +
          '</div>' +
          '<div class="dose-result-row">' +
            '<span class="dose-result-label">Max single dose</span>' +
            '<span class="dose-result-value">' + med.maxSingleDose + ' ' + med.unit + '</span>' +
          '</div>' +
          '<div class="dose-result-row">' +
            '<span class="dose-result-label">Max daily dose</span>' +
            '<span class="dose-result-value">' + med.maxDailyDose + ' ' + med.maxDailyUnit + ' (absolute max: ' + med.maxDailyAbsolute + ' ' + med.unit + '/day)</span>' +
          '</div>' +
          '<div class="dose-result-row">' +
            '<span class="dose-result-label">Route</span>' +
            '<span class="dose-result-value">' + med.route + '</span>' +
          '</div>' +
          (med.minAge ? '<div class="dose-result-row"><span class="dose-result-label">Minimum age</span><span class="dose-result-value">' + med.minAge + '</span></div>' : '') +
          (volumes.length ? '<table class="volume-table"><thead><tr><th>Formulation</th><th>Volume per dose</th></tr></thead><tbody>' + volumeRows + '</tbody></table>' : '') +
          (med.notes ? '<div class="med-notes">' + med.notes + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Events ──────────────────────────────────────────────── */
  function init() {
    $('#calcBtn').addEventListener('click', calculate);
    $('#weight').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') calculate();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
