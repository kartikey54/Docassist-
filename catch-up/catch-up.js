/* ================================================================
   TinyHumanMD | Catch-Up Immunization Calculator
   Simplified CDSi-inspired evaluation and forecasting
   ================================================================ */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var MS_PER_DAY = 86400000;

  /* ── Vaccine series definitions (simplified CDSi) ────────── */
  var SERIES = [
    {
      id: 'hepb', name: 'Hepatitis B', abbr: 'HepB', totalDoses: 3,
      minAge: [0, 28, 168],  /* days: birth, 4 wks, 24 wks */
      minInterval: [28, 56], /* days between dose 1->2, 2->3 */
      recAge: [0, 30, 180],  /* recommended: birth, 1m, 6m */
      notes: 'Min age for dose 3: 24 weeks. Min interval dose 1->3: 16 weeks.'
    },
    {
      id: 'rv', name: 'Rotavirus', abbr: 'RV', totalDoses: 3,
      minAge: [42, 70, 98],  /* 6wk, 10wk, 14wk */
      minInterval: [28, 28],
      recAge: [60, 120, 180], /* 2m, 4m, 6m */
      maxAge: 244, /* 8m 0d — cannot give after this age */
      maxFirstDose: 104, /* 14w6d */
      notes: 'Max age for dose 1: 14 weeks 6 days. Do not initiate the first dose of rotavirus vaccine at ≥15 weeks of age due to increased risk of intussusception. Max age for final dose: 8 months 0 days.'
    },
    {
      id: 'dtap', name: 'DTaP', abbr: 'DTaP', totalDoses: 5,
      minAge: [42, 70, 98, 365, 1461],
      minInterval: [28, 28, 180, 180],
      recAge: [60, 120, 180, 455, 1461], /* 2m, 4m, 6m, 15m, 4yr */
      notes: '5th dose not needed if 4th given at age >= 4 years.'
    },
    {
      id: 'hib', name: 'Hib', abbr: 'Hib', totalDoses: 4,
      minAge: [42, 70, 98, 365],
      minInterval: [28, 28, 56],
      recAge: [60, 120, 180, 395], /* 2m, 4m, 6m, 12-15m */
      notes: 'Dose count depends on vaccine type. If PRP-OMP: 2 primary doses + booster.'
    },
    {
      id: 'pcv', name: 'Pneumococcal (PCV)', abbr: 'PCV', totalDoses: 4,
      minAge: [42, 70, 98, 365],
      minInterval: [28, 28, 56],
      recAge: [60, 120, 180, 395],
      notes: 'Additional doses for high-risk children.'
    },
    {
      id: 'ipv', name: 'Polio (IPV)', abbr: 'IPV', totalDoses: 4,
      minAge: [42, 70, 98, 1461],
      minInterval: [28, 28, 180],
      recAge: [60, 120, 365, 1461], /* 2m, 4m, 6-18m, 4-6yr */
      notes: 'Final dose on or after 4th birthday and >= 6 months after previous dose.'
    },
    {
      id: 'mmr', name: 'MMR', abbr: 'MMR', totalDoses: 2,
      minAge: [365, 1461],
      minInterval: [28],
      recAge: [395, 1461], /* 12-15m, 4-6yr */
      liveVaccine: true,
      notes: 'Live vaccine. If 2 live vaccines not given same day, space 28+ days apart.'
    },
    {
      id: 'var', name: 'Varicella', abbr: 'VAR', totalDoses: 2,
      minAge: [365, 1461],
      minInterval: [90],
      recAge: [395, 1461],
      liveVaccine: true,
      notes: 'Min interval: 3 months if under 13, 4 weeks if 13+.'
    },
    {
      id: 'hepa', name: 'Hepatitis A', abbr: 'HepA', totalDoses: 2,
      minAge: [365, 547],
      minInterval: [180],
      recAge: [365, 547], /* 12m, 18m */
      notes: '2-dose series. Min interval 6 months.'
    },
    {
      id: 'menacwy', name: 'Meningococcal ACWY', abbr: 'MenACWY', totalDoses: 2,
      minAge: [3653, 5844],
      minInterval: [56],
      recAge: [4018, 5844], /* 11yr, 16yr */
      notes: 'Routine at 11-12 with booster at 16. High-risk may start earlier.'
    },
    {
      id: 'tdap', name: 'Tdap', abbr: 'Tdap', totalDoses: 1,
      minAge: [2557],
      minInterval: [],
      recAge: [4018], /* 11yr */
      notes: 'Single dose at 11-12 years. Can give regardless of interval since last Td.'
    },
    {
      id: 'hpv', name: 'HPV', abbr: 'HPV', totalDoses: 2,
      minAge: [3287, 3653],
      minInterval: [150],
      recAge: [4018, 4200], /* 11yr, ~11.5yr */
      notes: 'Minimum age is 9 years (not months). 2 doses if started before 15. 3 doses if started at 15+. Min interval: 5 months (2-dose) or 0/1-2/6m (3-dose).'
    }
  ];

  /* ── Build vaccine history form ──────────────────────────── */
  function buildHistoryForm() {
    var container = $('#vaccineHistory');
    container.innerHTML = SERIES.map(function (s) {
      var doses = '';
      for (var i = 0; i < s.totalDoses; i++) {
        doses += '<div class="dose-row">' +
          '<label class="dose-check">' +
            '<input type="checkbox" data-vaccine="' + s.id + '" data-dose="' + (i + 1) + '" />' +
            ' Dose ' + (i + 1) +
          '</label>' +
        '</div>';
      }
      return '<div class="vaccine-group">' +
        '<div class="vaccine-group-header">' +
          '<span class="vaccine-group-name">' + s.name + '</span>' +
          '<span class="vaccine-group-abbr">' + s.abbr + '</span>' +
        '</div>' + doses +
      '</div>';
    }).join('');
  }

  /* ── Calculate age and update display ────────────────────── */
  function updateAge() {
    var dob = $('#dob').value;
    var today = $('#todayDate').value;
    if (!dob || !today) { $('#ageDisplay').style.display = 'none'; return; }
    var d1 = new Date(dob + 'T00:00:00');
    var d2 = new Date(today + 'T00:00:00');
    var days = Math.round((d2 - d1) / MS_PER_DAY);
    if (days < 0) { $('#ageDisplay').style.display = 'none'; return; }

    var display;
    if (days < 30) display = days + ' days old';
    else if (days < 365) display = Math.floor(days / 30.44) + ' months old (' + days + ' days)';
    else display = (days / 365.25).toFixed(1) + ' years old (' + Math.floor(days / 30.44) + ' months)';

    var el = $('#ageDisplay');
    el.textContent = 'Child is ' + display;
    el.style.display = '';
  }

  /* ── Generate catch-up plan ──────────────────────────────── */
  function calculate() {
    var dob = $('#dob').value;
    var today = $('#todayDate').value;
    if (!dob || !today) { alert('Please enter date of birth and today\'s date.'); return; }

    var d1 = new Date(dob + 'T00:00:00');
    var d2 = new Date(today + 'T00:00:00');
    var ageDays = Math.round((d2 - d1) / MS_PER_DAY);
    if (ageDays < 0) { alert('Today\'s date must be after date of birth.'); return; }

    var checks = document.querySelectorAll('#vaccineHistory input[type="checkbox"]');
    var received = {};
    checks.forEach(function (cb) {
      if (cb.checked) {
        var vId = cb.dataset.vaccine;
        if (!received[vId]) received[vId] = 0;
        received[vId]++;
      }
    });

    var plan = [];
    var totalDue = 0;
    var totalComplete = 0;

    SERIES.forEach(function (s) {
      var dosesGiven = received[s.id] || 0;
      var dosesNeeded = s.totalDoses - dosesGiven;

      /* Check if too old to start (e.g., Rotavirus) */
      if (dosesGiven === 0 && s.maxFirstDose && ageDays > s.maxFirstDose) {
        var startLimitMsg = 'Too old to start this series (max first dose age exceeded).';
        if (s.id === 'rv') {
          startLimitMsg = 'Do not initiate the first dose of rotavirus vaccine at ≥15 weeks of age due to increased risk of intussusception (max first dose age is 14 weeks 6 days).';
        }
        plan.push({
          vaccine: s, status: 'aged-out', dosesGiven: 0, dosesNeeded: 0,
          message: startLimitMsg
        });
        return;
      }
      if (s.maxAge && ageDays > s.maxAge && dosesGiven < s.totalDoses) {
        var maxAgeMsg = 'Past maximum age for this vaccine.';
        if (s.id === 'rv') {
          maxAgeMsg = 'Past maximum age for rotavirus dosing (8 months 0 days).';
        }
        plan.push({
          vaccine: s, status: 'aged-out', dosesGiven: dosesGiven, dosesNeeded: 0,
          message: maxAgeMsg
        });
        return;
      }

      /* Check if age-appropriate (skip vaccines not yet due) */
      var firstRecAge = s.recAge[0];
      if (dosesGiven === 0 && ageDays < s.minAge[0]) {
        /* Not yet old enough */
        return;
      }

      if (dosesNeeded <= 0) {
        plan.push({ vaccine: s, status: 'complete', dosesGiven: dosesGiven, dosesNeeded: 0 });
        totalComplete++;
        return;
      }

      /* Calculate remaining doses needed */
      var nextDoses = [];
      for (var i = dosesGiven; i < s.totalDoses; i++) {
        var minAgeDays = s.minAge[i] || 0;
        var minIntervalDays = (i > 0 && s.minInterval[i - 1]) ? s.minInterval[i - 1] : 0;
        var recAgeDays = s.recAge[i] || 0;

        var earliestByAge = minAgeDays;
        /* The earliest date is the later of min age and min interval from previous dose */
        var earliest = Math.max(earliestByAge, ageDays);

        nextDoses.push({
          doseNum: i + 1,
          minAge: minAgeDays,
          minInterval: minIntervalDays,
          recAge: recAgeDays,
          isOverdue: ageDays > recAgeDays + 30
        });
      }

      totalDue += dosesNeeded;
      plan.push({
        vaccine: s, status: 'due', dosesGiven: dosesGiven,
        dosesNeeded: dosesNeeded, nextDoses: nextDoses
      });
    });

    if (window.TinyTrack) window.TinyTrack.calcUsed('catch-up', { totalDue: totalDue, totalComplete: totalComplete });
    displayPlan(plan, totalDue, totalComplete, ageDays);
  }

  function formatDays(days) {
    if (days < 28) return days + ' days';
    if (days < 365) return Math.round(days / 7) + ' weeks';
    return (days / 365.25).toFixed(1) + ' years';
  }

  function displayPlan(plan, totalDue, totalComplete, ageDays) {
    $('#resultsCard').style.display = '';
    var summary = $('#planSummary');
    var details = $('#planDetails');

    if (totalDue === 0) {
      summary.className = 'plan-summary all-caught-up';
      summary.textContent = 'All caught up! No additional vaccines needed at this time.';
      details.innerHTML = '';
      return;
    }

    summary.className = 'plan-summary needs-catchup';
    summary.innerHTML = '<strong>' + totalDue + ' dose' + (totalDue > 1 ? 's' : '') + ' needed</strong> across ' +
      plan.filter(function (p) { return p.status === 'due'; }).length + ' vaccine' +
      (plan.filter(function (p) { return p.status === 'due'; }).length > 1 ? ' series' : '') + '. ' +
      totalComplete + ' series complete. ' +
      '<br><span style="font-size:var(--text-xs);color:var(--c-text-secondary)">A series never needs to be restarted, regardless of time elapsed between doses.</span>';

    details.innerHTML = plan.map(function (p) {
      if (p.status === 'complete') {
        return '<div class="plan-vaccine">' +
          '<div class="plan-vaccine-header">' +
            '<span class="plan-vaccine-name">' + p.vaccine.name + ' (' + p.vaccine.abbr + ')</span>' +
            '<span class="plan-vaccine-status status-complete">Complete</span>' +
          '</div>' +
          '<div style="font-size:var(--text-sm);color:var(--c-text-secondary)">' + p.dosesGiven + '/' + p.vaccine.totalDoses + ' doses received</div>' +
        '</div>';
      }
      if (p.status === 'aged-out') {
        return '<div class="plan-vaccine" style="opacity:.6">' +
          '<div class="plan-vaccine-header">' +
            '<span class="plan-vaccine-name">' + p.vaccine.name + ' (' + p.vaccine.abbr + ')</span>' +
            '<span class="plan-vaccine-status" style="background:var(--c-border-light);color:var(--c-text-muted)">N/A</span>' +
          '</div>' +
          '<div style="font-size:var(--text-sm);color:var(--c-text-muted)">' + p.message + '</div>' +
        '</div>';
      }
      if (p.status === 'due') {
        var doseItems = (p.nextDoses || []).map(function (d) {
          return '<div class="plan-dose-item">' +
            '<span class="plan-dose-num">Dose ' + d.doseNum + '</span>' +
            '<span class="plan-dose-info">' +
              'Min age: <strong>' + formatDays(d.minAge) + '</strong>' +
              (d.minInterval ? ' | Min interval from prev: <strong>' + formatDays(d.minInterval) + '</strong>' : '') +
              (d.isOverdue ? ' <span style="color:var(--c-red);font-weight:600">(OVERDUE)</span>' : '') +
            '</span>' +
          '</div>';
        }).join('');

        return '<div class="plan-vaccine">' +
          '<div class="plan-vaccine-header">' +
            '<span class="plan-vaccine-name">' + p.vaccine.name + ' (' + p.vaccine.abbr + ')</span>' +
            '<span class="plan-vaccine-status status-due">' + p.dosesNeeded + ' dose' + (p.dosesNeeded > 1 ? 's' : '') + ' needed</span>' +
          '</div>' +
          '<div style="font-size:var(--text-sm);color:var(--c-text-secondary);margin-bottom:var(--s-2)">' +
            p.dosesGiven + '/' + p.vaccine.totalDoses + ' received' +
          '</div>' +
          '<div class="plan-dose-list">' + doseItems + '</div>' +
          (p.vaccine.notes ? '<div style="font-size:var(--text-xs);color:var(--c-text-muted);margin-top:var(--s-2);padding-top:var(--s-2);border-top:1px solid var(--c-border-light)">' + p.vaccine.notes + '</div>' : '') +
        '</div>';
      }
      return '';
    }).join('');
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    var today = new Date().toISOString().split('T')[0];
    $('#todayDate').value = today;
    buildHistoryForm();

    $('#dob').addEventListener('change', updateAge);
    $('#todayDate').addEventListener('change', updateAge);
    $('#calcBtn').addEventListener('click', calculate);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
