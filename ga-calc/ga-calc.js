/* ================================================================
   TinyHumanMD | Gestational Age Calculator
   ================================================================ */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var MS_PER_DAY = 86400000;

  /* Set current date default */
  var today = new Date().toISOString().split('T')[0];
  $('#currentDate').value = today;

  /* ── Date helpers ─────────────────────────────────────────── */
  function daysBetween(d1, d2) {
    return Math.round((d2.getTime() - d1.getTime()) / MS_PER_DAY);
  }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDate(d) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function formatWeeksDays(totalDays) {
    var weeks = Math.floor(totalDays / 7);
    var days = totalDays % 7;
    return weeks + 'w ' + days + 'd';
  }

  function formatAge(totalDays) {
    if (totalDays < 0) return 'Not yet born';
    if (totalDays < 28) return totalDays + ' days';
    if (totalDays < 365) {
      var months = Math.floor(totalDays / 30.44);
      var remDays = Math.round(totalDays - months * 30.44);
      return months + ' month' + (months !== 1 ? 's' : '') + ', ' + remDays + ' day' + (remDays !== 1 ? 's' : '');
    }
    var years = Math.floor(totalDays / 365.25);
    var remMonths = Math.floor((totalDays - years * 365.25) / 30.44);
    return years + ' year' + (years !== 1 ? 's' : '') + ', ' + remMonths + ' month' + (remMonths !== 1 ? 's' : '');
  }

  /* ── Calculate ───────────────────────────────────────────── */
  function calculate() {
    var lmpVal = $('#lmp').value;
    var eddVal = $('#edd').value;
    var birthVal = $('#birthDate').value;
    var gaWeeksVal = parseInt($('#gaWeeks').value);
    var gaDaysVal = parseInt($('#gaDays').value) || 0;
    var currentVal = $('#currentDate').value;

    var lmp = lmpVal ? new Date(lmpVal + 'T00:00:00') : null;
    var edd = eddVal ? new Date(eddVal + 'T00:00:00') : null;
    var birth = birthVal ? new Date(birthVal + 'T00:00:00') : null;
    var gaAtBirthDays = !isNaN(gaWeeksVal) ? gaWeeksVal * 7 + gaDaysVal : null;
    var current = currentVal ? new Date(currentVal + 'T00:00:00') : new Date();

    /* Derive missing values */
    /* LMP -> EDD: EDD = LMP + 280 days */
    if (lmp && !edd) {
      edd = addDays(lmp, 280);
      $('#edd').value = edd.toISOString().split('T')[0];
    }
    /* EDD -> LMP: LMP = EDD - 280 days */
    if (edd && !lmp) {
      lmp = addDays(edd, -280);
      $('#lmp').value = lmp.toISOString().split('T')[0];
    }
    /* GA at birth + birth date -> LMP */
    if (gaAtBirthDays && birth && !lmp) {
      lmp = addDays(birth, -gaAtBirthDays);
      edd = addDays(lmp, 280);
      $('#lmp').value = lmp.toISOString().split('T')[0];
      $('#edd').value = edd.toISOString().split('T')[0];
    }
    /* LMP + birth date -> GA at birth */
    if (lmp && birth && !gaAtBirthDays) {
      gaAtBirthDays = daysBetween(lmp, birth);
      var w = Math.floor(gaAtBirthDays / 7);
      var d = gaAtBirthDays % 7;
      $('#gaWeeks').value = w;
      $('#gaDays').value = d;
    }

    if (!lmp && !edd && !birth) {
      alert('Please enter at least one date (LMP, EDD, or birth date with GA).');
      return;
    }

    /* Build results */
    var results = [];
    var extraRows = [];

    if (lmp) {
      extraRows.push({ label: 'LMP', value: formatDate(lmp) });
    }
    if (edd) {
      extraRows.push({ label: 'Estimated Due Date', value: formatDate(edd) });
    }

    /* Current GA (if not yet born or at birth) */
    if (lmp) {
      var currentGaDays = daysBetween(lmp, current);
      if (currentGaDays >= 0) {
        results.push({ label: 'Current GA', value: formatWeeksDays(currentGaDays) });
        var trimester = currentGaDays < 98 ? '1st' : currentGaDays < 196 ? '2nd' : '3rd';
        extraRows.push({ label: 'Trimester', value: trimester + ' trimester' });
        if (edd) {
          var daysToEdd = daysBetween(current, edd);
          extraRows.push({ label: 'Days to EDD', value: daysToEdd > 0 ? daysToEdd + ' days' : 'Past due by ' + Math.abs(daysToEdd) + ' days' });
        }
      }
    }

    /* GA at birth */
    if (gaAtBirthDays) {
      results.push({ label: 'GA at Birth', value: formatWeeksDays(gaAtBirthDays) });
      var termStatus = gaAtBirthDays < 259 ? 'Preterm' : gaAtBirthDays < 280 ? 'Early term' : gaAtBirthDays < 294 ? 'Full term' : gaAtBirthDays < 301 ? 'Late term' : 'Post-term';
      extraRows.push({ label: 'Term Status', value: termStatus });
    }

    /* Chronological age */
    if (birth) {
      var chronDays = daysBetween(birth, current);
      if (chronDays >= 0) {
        results.push({ label: 'Chronological Age', value: formatAge(chronDays) });
      }
      extraRows.push({ label: 'Date of Birth', value: formatDate(birth) });

      /* Corrected age (if preterm) */
      if (gaAtBirthDays && gaAtBirthDays < 259) { /* < 37 weeks */
        var correctionDays = 280 - gaAtBirthDays;
        var correctedDays = chronDays - correctionDays;
        if (correctedDays >= 0) {
          results.push({ label: 'Corrected Age', value: formatAge(correctedDays) });
        } else {
          results.push({ label: 'Corrected Age', value: 'Not yet at term equivalent' });
        }
        extraRows.push({ label: 'Prematurity Correction', value: formatWeeksDays(correctionDays) + ' (' + Math.round(correctionDays / 7) + ' weeks)' });

        /* When to stop correcting */
        var stopCorrecting24m = addDays(birth, Math.round(24 * 30.44) + correctionDays);
        extraRows.push({ label: 'Stop Correcting At', value: formatDate(stopCorrecting24m) + ' (24 months corrected)' });
      }
    }

    if (window.TinyTrack) window.TinyTrack.calcUsed('ga-calc', { hasPreterm: !!gaAtBirthDays && gaAtBirthDays < 259 });
    displayResults(results, extraRows);
  }

  function displayResults(results, extraRows) {
    $('#resultsCard').style.display = '';
    var grid = $('#resultsGrid');
    grid.innerHTML = results.map(function (r) {
      return '<div class="result-item">' +
        '<div class="result-value" style="font-size:var(--text-xl)">' + r.value + '</div>' +
        '<div class="result-label">' + r.label + '</div>' +
      '</div>';
    }).join('');

    var extra = $('#extraInfo');
    extra.innerHTML = extraRows.map(function (r) {
      return '<div class="info-row"><span class="info-label">' + r.label + '</span><span class="info-value">' + r.value + '</span></div>';
    }).join('');

    /* Copy button */
    var copyText = results.map(function (r) { return r.label + ': ' + r.value; }).join('\n') +
      '\n' + extraRows.map(function (r) { return r.label + ': ' + r.value; }).join('\n');
    extra.innerHTML += '<button class="copy-btn" id="copyBtn">Copy to clipboard</button>';
    $('#copyBtn').addEventListener('click', function () {
      navigator.clipboard.writeText(copyText).then(function () {
        $('#copyBtn').textContent = 'Copied!';
        setTimeout(function () { $('#copyBtn').textContent = 'Copy to clipboard'; }, 2000);
      });
    });
  }

  /* ── Events ──────────────────────────────────────────────── */
  function init() {
    $('#calcBtn').addEventListener('click', calculate);
    $('#clearBtn').addEventListener('click', function () {
      ['#lmp','#edd','#birthDate','#gaWeeks','#gaDays'].forEach(function (s) { $(s).value = ''; });
      $('#currentDate').value = new Date().toISOString().split('T')[0];
      $('#resultsCard').style.display = 'none';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
