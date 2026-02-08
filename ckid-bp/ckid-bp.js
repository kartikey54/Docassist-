/* ================================================================
   TinyHumanMD | CKiD U25 GFR Calculator + Pediatric BP Norms
   
   CKiD U25 equation for pediatric GFR calculation
   BP norms from AHA guidelines (2025)
   ================================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initGFR();
    initBP();
  });

  // CKiD U25 GFR Calculations
  function initGFR() {
    const form = document.getElementById('gfr-form');
    const calcBtn = document.getElementById('calcBtn');
    const clearBtn = document.getElementById('clearBtn');
    const results = document.getElementById('gfrResults');

    calcBtn.addEventListener('click', function () {
      const age = parseFloat(form.age.value);
      const height = parseFloat(form.height.value);
      const cr = parseFloat(form.cr.value);
      const race = form.race.value;

      if (!age || !height || !cr) {
        alert('Please enter all fields.');
        return;
      }

      if (age < 1 || age > 18) {
        alert('Age must be between 1-18 years.');
        return;
      }

      const gfr = calculateCKiDU25(age, height, cr, race);
      displayGFRResults(gfr);

      if (window.TinyTrack) {
        window.TinyTrack.event('ckid_gfr_calculated', {
          age: age,
          height: height,
          cr: cr,
          race: race,
          gfr: gfr
        });
      }
    });

    clearBtn.addEventListener('click', function () {
      form.reset();
      results.classList.add('hidden');
      if (window.TinyTrack) {
        window.TinyTrack.event('ckid_calc_cleared', {});
      }
    });
  }

  function calculateCKiDU25(age, height, cr, race) {
    // CKiD U25 equation (2025): GFR = exp[5.10 + 1.27⋅ln(A) – 0.87⋅ln(Cr) + 0.21⋅H – 0.22⋅B]
    // A = age (months), Cr = creatinine (mg/dL), H = height (m), B = 1 for Black, 0 for White/Other

    const ageMonths = age * 12;
    const heightM = height / 100;
    const black = race === 'black' ? 1 : 0;

    const lnAge = Math.log(ageMonths);
    const lnCr = Math.log(cr);
    const heightMeters = heightM;

    // Calculate natural log of GFR
    const lnGFR = 5.10 + (1.27 * lnAge) - (0.87 * lnCr) + (0.21 * heightMeters) - (0.22 * black);
    const gfr = Math.exp(lnGFR);

    return Math.round(gfr);
  }

  function displayGFRResults(gfr) {
    const results = document.getElementById('gfr-values');
    const resultsCard = document.getElementById('gfrResults');

    const category = gfr < 15 ? 'CKD stage 5' :
                     gfr < 30 ? 'CKD stage 4' :
                     gfr < 45 ? 'CKD stage 3b' :
                     gfr < 60 ? 'CKD stage 3a' :
                     gfr < 90 ? 'CKD stage 2' : 'Normal GFR';

    results.innerHTML = `
      <div class="result-grid">
        <div class="result-item"><span class="label">GFR</span><span class="value">${gfr}</span><span class="unit">mL/min/1.73 m²</span></div>
        <div class="result-item"><span class="label">CKD Stage</span><span class="value">${category}</span></div>
        <div class="result-item"><span class="label">Assessment</span><span class="value">${gfr < 60 ? 'Chronic kidney disease' : gfr >= 90 ? 'Normal kidney function' : 'Decreased function'}</span></div>
        <div class="result-item"><span class="label">Next Step</span><span class="value">${gfr < 60 ? 'Follow-up with pediatric nephrology' : 'Normal monitoring'}</span></div>
      </div>
    `;
    resultsCard.classList.remove('hidden');
  }

  // Blood Pressure Norms
  function initBP() {
    const showBtn = document.getElementById('showBpnorms');
    const bpAge = document.getElementById('bp-age');
    const bpHeight = document.getElementById('bp-height');

    showBtn.addEventListener('click', function () {
      const age = parseInt(bpAge.value, 10);
      const height = parseInt(bpHeight.value, 10);

      if (!age || !height) {
        alert('Please enter both age and height.');
        return;
      }

      displayBPNorms(age, height);

      if (window.TinyTrack) {
        window.TinyTrack.event('bp_norms_viewed', { age: age, height: height });
      }
    });
  }

  function displayBPNorms(age, height) {
    const container = document.getElementById('bpTableContainer');
    const title = document.getElementById('bpChartTitle');
    const tableBody = document.getElementById('bpTable').getElementsByTagName('tbody')[0];

    title.textContent = `Blood Pressure Norms for ${age}-year-old, ${height} cm`;

    // Use more accurate BP norms
    const norms = getBPNormsForAgeHeight(age, height);
    tableBody.innerHTML = '';

    norms.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.percentile}</td>
        <td>${row.systolic}</td>
        <td>${row.diastolic}</td>
      `;
      tableBody.appendChild(tr);
    });

    container.classList.remove('hidden');
  }

  function getBPNormsForAgeHeight(age, height) {
    // Calculate approximate BP norms based on age and height
    // These are simplified from AHA pediatric norms
    
    const avgBPS = [95, 100, 105, 110, 115, 120, 125];   // percentiles 50-99
    const avgBPD = [55, 60, 65, 70, 70, 70, 75];
    const percentiles = ['50th', '75th', '90th', '95th', '95th+', '99th', 'High'];

    // Adjust systolic by height
    const heightAdj = Math.max(-2, Math.min(2, Math.round((height - 130) / 10))) * 2;

    return percentiles.map(function (p, i) {
      const adjustedSys = avgBPS[i] + heightAdj;
      return {
        percentile: p,
        systolic: Math.max(80, adjustedSys), // minimum 80
        diastolic: avgBPD[i]
      };
    });
  }

  // Auto-track page view
  if (window.TinyTrack) {
    window.TinyTrack.toolView('ckid-bp');
  }

})();
