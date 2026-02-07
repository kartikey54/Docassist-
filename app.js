/* ================================================================
   DocAssist — Immunization Schedule Application
   ================================================================ */

(function () {
  'use strict';

  /* -------- Data -------- */
  const AGE_COLS = [
    { key: 'birth', label: 'Birth' },
    { key: '1mo',   label: '1 mo' },
    { key: '2mo',   label: '2 mos' },
    { key: '4mo',   label: '4 mos' },
    { key: '6mo',   label: '6 mos' },
    { key: '9mo',   label: '9 mos' },
    { key: '12mo',  label: '12 mos' },
    { key: '15mo',  label: '15 mos' },
    { key: '18mo',  label: '18 mos' },
    { key: '2yr',   label: '2-3 yrs' },
    { key: '4yr',   label: '4-6 yrs' },
    { key: '7yr',   label: '7-10 yrs' },
    { key: '11yr',  label: '11-12 yrs' },
    { key: '13yr',  label: '13-15 yrs' },
    { key: '16yr',  label: '16 yrs' },
    { key: '17yr',  label: '17-18 yrs' },
  ];

  // type: rec = recommended, catch = catch-up, risk = high-risk, shared = shared decision, note = see notes
  // label: short dose text shown in cell
  const VACCINES = [
    {
      id: 'hepb',
      name: 'Hepatitis B',
      abbr: 'HepB',
      doses: 3,
      description: 'Protects against hepatitis B virus infection, which can cause chronic liver disease and liver cancer.',
      notes: 'Administer monovalent HepB vaccine to all newborns within 24 hours of birth. The 2nd dose should be given at age 1 month and the 3rd dose at 6-18 months (minimum age for the 3rd dose is 24 weeks).',
      contraindications: 'Severe allergic reaction (anaphylaxis) after a previous dose or to a vaccine component.',
      schedule: {
        birth:  { type: 'rec', label: '1st' },
        '1mo':  { type: 'rec', label: '2nd' },
        '6mo':  { type: 'rec', label: '3rd' },
        '2mo':  { type: 'catch', label: '2nd' },
        '4mo':  { type: 'catch', label: '2nd-3rd' },
        '9mo':  { type: 'catch', label: '3rd' },
        '12mo': { type: 'catch', label: '3rd' },
        '15mo': { type: 'catch', label: '3rd' },
        '18mo': { type: 'catch', label: '3rd' },
      },
    },
    {
      id: 'rv',
      name: 'Rotavirus',
      abbr: 'RV',
      doses: 3,
      description: 'Prevents severe rotavirus gastroenteritis in infants and young children.',
      notes: 'RV1 is a 2-dose series at 2 and 4 months. RV5 is a 3-dose series at 2, 4, and 6 months. Do not administer after age 8 months 0 days.',
      contraindications: 'Severe allergic reaction after previous dose. History of intussusception. Severe combined immunodeficiency (SCID).',
      schedule: {
        '2mo': { type: 'rec', label: '1st' },
        '4mo': { type: 'rec', label: '2nd' },
        '6mo': { type: 'rec', label: '3rd' },
      },
    },
    {
      id: 'dtap',
      name: 'Diphtheria, Tetanus & Pertussis',
      abbr: 'DTaP',
      doses: 5,
      description: 'Protects against diphtheria, tetanus (lockjaw), and pertussis (whooping cough). For children under 7 years.',
      notes: 'The 4th dose may be given as early as 12 months if at least 6 months have elapsed since the 3rd dose. The 5th dose is not necessary if the 4th dose was administered at age 4 years or older.',
      contraindications: 'Severe allergic reaction after a previous dose. Encephalopathy within 7 days of a previous dose.',
      schedule: {
        '2mo':  { type: 'rec', label: '1st' },
        '4mo':  { type: 'rec', label: '2nd' },
        '6mo':  { type: 'rec', label: '3rd' },
        '15mo': { type: 'rec', label: '4th' },
        '18mo': { type: 'rec', label: '4th' },
        '4yr':  { type: 'rec', label: '5th' },
      },
    },
    {
      id: 'hib',
      name: 'Haemophilus influenzae type b',
      abbr: 'Hib',
      doses: 4,
      description: 'Prevents invasive Hib disease including meningitis, epiglottitis, and pneumonia.',
      notes: 'Number of doses depends on vaccine type. PRP-OMP (PedvaxHIB) requires a 2-dose primary series; all others require 3 doses plus a booster.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component. Age less than 6 weeks.',
      schedule: {
        '2mo':  { type: 'rec', label: '1st' },
        '4mo':  { type: 'rec', label: '2nd' },
        '6mo':  { type: 'note', label: 'See notes' },
        '12mo': { type: 'rec', label: '3rd/4th' },
        '15mo': { type: 'rec', label: '3rd/4th' },
      },
    },
    {
      id: 'pcv',
      name: 'Pneumococcal Conjugate',
      abbr: 'PCV',
      doses: 4,
      description: 'Protects against pneumococcal diseases including pneumonia, meningitis, and bloodstream infections.',
      notes: 'PCV15 or PCV20 may be used. 1 dose of PCV20 or 1 dose of PCV15 followed by PPSV23 is recommended for certain at-risk children aged 2-18 years.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component.',
      schedule: {
        '2mo':  { type: 'rec', label: '1st' },
        '4mo':  { type: 'rec', label: '2nd' },
        '6mo':  { type: 'rec', label: '3rd' },
        '12mo': { type: 'rec', label: '4th' },
        '15mo': { type: 'rec', label: '4th' },
      },
    },
    {
      id: 'ipv',
      name: 'Inactivated Poliovirus',
      abbr: 'IPV',
      doses: 4,
      description: 'Provides protection against poliovirus, which can cause paralysis and death.',
      notes: 'The final dose should be administered at age 4-6 years, regardless of the number of previous doses, and should be given at least 6 months after the previous dose.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component (streptomycin, polymyxin B, or neomycin).',
      schedule: {
        '2mo':  { type: 'rec', label: '1st' },
        '4mo':  { type: 'rec', label: '2nd' },
        '6mo':  { type: 'rec', label: '3rd' },
        '12mo': { type: 'catch', label: '3rd' },
        '18mo': { type: 'catch', label: '3rd' },
        '4yr':  { type: 'rec', label: '4th' },
        '7yr':  { type: 'note', label: 'See notes' },
      },
    },
    {
      id: 'flu',
      name: 'Influenza',
      abbr: 'IIV / LAIV',
      doses: null,
      description: 'Annual influenza vaccination for all persons aged 6 months and older. IIV and LAIV are available formulations.',
      notes: 'Administer annually. Children aged 6 months through 8 years who need 2 doses should receive the first dose as soon as vaccine is available. LAIV (nasal spray) is approved for ages 2 years and older.',
      contraindications: 'Severe allergic reaction to any component or after previous dose. LAIV: immunocompromised, pregnancy, children 2-4 with asthma.',
      schedule: {
        '6mo':  { type: 'rec', label: '1-2/yr' },
        '9mo':  { type: 'rec', label: '1-2/yr' },
        '12mo': { type: 'rec', label: '1-2/yr' },
        '15mo': { type: 'rec', label: '1-2/yr' },
        '18mo': { type: 'rec', label: '1-2/yr' },
        '2yr':  { type: 'rec', label: '1/yr' },
        '4yr':  { type: 'rec', label: '1/yr' },
        '7yr':  { type: 'rec', label: '1/yr' },
        '11yr': { type: 'rec', label: '1/yr' },
        '13yr': { type: 'rec', label: '1/yr' },
        '16yr': { type: 'rec', label: '1/yr' },
        '17yr': { type: 'rec', label: '1/yr' },
      },
    },
    {
      id: 'mmr',
      name: 'Measles, Mumps, Rubella',
      abbr: 'MMR',
      doses: 2,
      description: 'Protects against measles, mumps, and rubella (German measles) — all highly contagious viral diseases.',
      notes: 'Administer 1st dose at 12-15 months and 2nd dose at 4-6 years. Can be administered before age 12 months for international travel (dose before 12 months does not count toward the routine series).',
      contraindications: 'Severe allergic reaction after previous dose or to a component. Pregnancy. Known severe immunodeficiency.',
      schedule: {
        '12mo': { type: 'rec', label: '1st' },
        '15mo': { type: 'rec', label: '1st' },
        '4yr':  { type: 'rec', label: '2nd' },
        '7yr':  { type: 'catch', label: '2nd' },
      },
    },
    {
      id: 'var',
      name: 'Varicella',
      abbr: 'VAR',
      doses: 2,
      description: 'Prevents chickenpox (varicella), a highly contagious disease that causes an itchy rash and can lead to serious complications.',
      notes: 'Administer 1st dose at 12-15 months and 2nd dose at 4-6 years. The 2nd dose can be given as early as 3 months after the 1st dose.',
      contraindications: 'Severe allergic reaction after previous dose. Pregnancy. Known severe immunodeficiency.',
      schedule: {
        '12mo': { type: 'rec', label: '1st' },
        '15mo': { type: 'rec', label: '1st' },
        '4yr':  { type: 'rec', label: '2nd' },
        '7yr':  { type: 'catch', label: '2nd' },
      },
    },
    {
      id: 'hepa',
      name: 'Hepatitis A',
      abbr: 'HepA',
      doses: 2,
      description: 'Protects against hepatitis A, a liver infection caused by the hepatitis A virus. Transmitted via contaminated food or water.',
      notes: '2-dose series beginning at 12 months. The 2 doses should be separated by 6-18 months. Catch-up is recommended for anyone 2 years and older who has not been vaccinated.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component.',
      schedule: {
        '12mo': { type: 'rec', label: '1st' },
        '15mo': { type: 'rec', label: '1st' },
        '18mo': { type: 'rec', label: '2nd' },
        '2yr':  { type: 'catch', label: '1st-2nd' },
      },
    },
    {
      id: 'tdap',
      name: 'Tetanus, Diphtheria & Pertussis',
      abbr: 'Tdap',
      doses: 1,
      description: 'Booster for older children/adolescents. Replaces Td booster with added pertussis protection.',
      notes: 'Administer 1 dose of Tdap at age 11-12 years. Tdap can be administered regardless of interval since last tetanus- or diphtheria-containing vaccine.',
      contraindications: 'Severe allergic reaction after a previous dose. Encephalopathy within 7 days of a previous pertussis-containing vaccine.',
      schedule: {
        '11yr': { type: 'rec', label: '1 dose' },
        '13yr': { type: 'catch', label: '1 dose' },
      },
    },
    {
      id: 'hpv',
      name: 'Human Papillomavirus',
      abbr: 'HPV',
      doses: 2,
      description: 'Prevents HPV infections that cause cervical, anal, oropharyngeal, and other cancers, as well as genital warts.',
      notes: 'Routine vaccination at 11-12 years (can begin at age 9). If started before 15, 2-dose series (0, 6-12 months). If started at 15 or older, 3-dose series (0, 1-2, 6 months).',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component (including yeast).',
      schedule: {
        '9mo':  { type: 'shared', label: 'Can begin' },
        '11yr': { type: 'rec', label: '1st' },
        '13yr': { type: 'rec', label: '2nd' },
        '16yr': { type: 'catch', label: '1st-2nd' },
        '17yr': { type: 'catch', label: '1st-3rd' },
      },
    },
    {
      id: 'menacwy',
      name: 'Meningococcal ACWY',
      abbr: 'MenACWY',
      doses: 2,
      description: 'Protects against meningococcal serogroups A, C, W, and Y, which cause bacterial meningitis and bloodstream infections.',
      notes: 'Administer 1st dose at 11-12 years with booster at age 16. For children at increased risk, a series can begin as early as 2 months.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component.',
      schedule: {
        '2mo':  { type: 'risk', label: 'High risk' },
        '11yr': { type: 'rec', label: '1st' },
        '16yr': { type: 'rec', label: '2nd' },
      },
    },
    {
      id: 'menb',
      name: 'Meningococcal B',
      abbr: 'MenB',
      doses: 2,
      description: 'Protects against meningococcal serogroup B disease. Recommended based on shared clinical decision-making for adolescents.',
      notes: 'Based on shared clinical decision-making for 16-23 year olds (preferred age 16-18). A 2-dose series of MenB-4C or a 2- or 3-dose series of MenB-FHbp.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component.',
      schedule: {
        '16yr': { type: 'shared', label: '2-3 doses' },
        '17yr': { type: 'shared', label: '2-3 doses' },
      },
    },
    {
      id: 'rsv',
      name: 'RSV (Nirsevimab)',
      abbr: 'RSV-mAb',
      doses: 1,
      description: 'Monoclonal antibody for passive immunization against respiratory syncytial virus in infants.',
      notes: 'Administer 1 dose to infants born during or entering their first RSV season. A second season dose is recommended for children 8-19 months at increased risk.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component.',
      schedule: {
        birth:  { type: 'rec', label: '1 dose' },
        '1mo':  { type: 'rec', label: '1 dose' },
        '2mo':  { type: 'rec', label: '1 dose' },
        '4mo':  { type: 'rec', label: '1 dose' },
        '6mo':  { type: 'rec', label: '1 dose' },
        '9mo':  { type: 'risk', label: '2nd season' },
        '12mo': { type: 'risk', label: '2nd season' },
        '15mo': { type: 'risk', label: '2nd season' },
        '18mo': { type: 'risk', label: '2nd season' },
      },
    },
    {
      id: 'covid',
      name: 'COVID-19',
      abbr: 'COVID',
      doses: null,
      description: 'Protects against SARS-CoV-2 infection. Updated vaccines are recommended seasonally.',
      notes: 'See current CDC guidance for updated COVID-19 vaccine recommendations, which may change based on circulating variants. Available for ages 6 months and older.',
      contraindications: 'Severe allergic reaction after a previous dose or to a vaccine component (including PEG or polysorbate).',
      schedule: {
        '6mo':  { type: 'note', label: 'See notes' },
        '9mo':  { type: 'note', label: 'See notes' },
        '12mo': { type: 'note', label: 'See notes' },
        '15mo': { type: 'note', label: 'See notes' },
        '18mo': { type: 'note', label: 'See notes' },
        '2yr':  { type: 'note', label: 'See notes' },
        '4yr':  { type: 'note', label: 'See notes' },
        '7yr':  { type: 'note', label: 'See notes' },
        '11yr': { type: 'note', label: 'See notes' },
        '13yr': { type: 'note', label: 'See notes' },
        '16yr': { type: 'note', label: 'See notes' },
        '17yr': { type: 'note', label: 'See notes' },
      },
    },
  ];

  /* -------- Helpers -------- */
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const PILL_CLASS = { rec: 'pill-rec', catch: 'pill-catch', risk: 'pill-risk', shared: 'pill-shared', note: 'pill-note' };

  function pillHTML(cell, vaccineId) {
    if (!cell) return '';
    const cls = PILL_CLASS[cell.type] || 'pill-note';
    return `<span class="cell-pill ${cls}" data-vaccine="${vaccineId}">${cell.label}</span>`;
  }

  /* -------- Build Schedule Table -------- */
  function buildTable() {
    const head = $('#tableHead');
    const body = $('#tableBody');
    let hRow = '<tr><th>Vaccine</th>';
    AGE_COLS.forEach(c => { hRow += `<th data-age="${c.key}">${c.label}</th>`; });
    hRow += '</tr>';
    head.innerHTML = hRow;

    let bRows = '';
    VACCINES.forEach(v => {
      const ages = Object.keys(v.schedule);
      bRows += `<tr data-ages="${ages.join(',')}" data-vid="${v.id}">`;
      bRows += `<td>${v.name} <span style="opacity:.45;font-weight:400;">(${v.abbr})</span></td>`;
      AGE_COLS.forEach(c => {
        const cell = v.schedule[c.key];
        bRows += `<td data-age="${c.key}">${pillHTML(cell, v.id)}</td>`;
      });
      bRows += '</tr>';
    });
    body.innerHTML = bRows;

    // Pill click → modal
    $$('.cell-pill', body).forEach(el => {
      el.addEventListener('click', () => {
        const vid = el.dataset.vaccine;
        const vac = VACCINES.find(v => v.id === vid);
        if (vac) openModal(vac);
      });
    });
  }

  /* -------- Age Filter -------- */
  function setupAgeFilter() {
    const sel = $('#ageSelect');
    sel.addEventListener('change', () => {
      const val = sel.value;
      // Rows
      $$('#tableBody tr').forEach(tr => {
        if (val === 'all') {
          tr.classList.remove('hidden-row');
        } else {
          const ages = tr.dataset.ages.split(',');
          tr.classList.toggle('hidden-row', !ages.includes(val));
        }
      });
      // Column highlight (optional subtle bg)
      $$('#scheduleTable th, #scheduleTable td').forEach(td => {
        td.classList.remove('age-highlighted');
      });
    });
  }

  /* -------- Build Timeline -------- */
  function buildTimeline() {
    const container = $('#timelineContainer');
    // Age positions (percentage across track)
    const AGE_POS = {
      birth: 0, '1mo': 3, '2mo': 6, '4mo': 10, '6mo': 14, '9mo': 18,
      '12mo': 22, '15mo': 26, '18mo': 30, '2yr': 38, '4yr': 48,
      '7yr': 58, '11yr': 68, '13yr': 76, '16yr': 86, '17yr': 94,
    };
    const COLORS = {
      rec: 'var(--accent)', catch: 'var(--green)', risk: 'var(--purple)', shared: 'var(--orange)', note: '#aaa',
    };

    let html = '';
    VACCINES.forEach(v => {
      const entries = Object.entries(v.schedule);
      if (!entries.length) return;
      const positions = entries.map(([age]) => AGE_POS[age] ?? 0);
      const minP = Math.min(...positions);
      const maxP = Math.max(...positions);
      const mainColor = COLORS[entries[0][1].type] || COLORS.rec;

      html += `<div class="timeline-row">`;
      html += `<div class="timeline-label">${v.abbr}</div>`;
      html += `<div class="timeline-track">`;
      // Bar
      html += `<div class="timeline-bar" style="left:${minP}%;width:${maxP - minP}%;background:${mainColor};"></div>`;
      // Dots
      entries.forEach(([age, cell]) => {
        const pos = AGE_POS[age] ?? 0;
        const col = COLORS[cell.type] || COLORS.rec;
        html += `<div class="timeline-dot" style="left:${pos}%;color:${col};background:${col};" data-vaccine="${v.id}"><span class="dot-tooltip">${cell.label} — ${AGE_COLS.find(a => a.key === age)?.label || age}</span></div>`;
      });
      html += `</div></div>`;
    });

    // Axis
    html += `<div class="timeline-axis"><div class="timeline-axis-spacer"></div><div class="timeline-axis-track">`;
    const axisLabels = [
      { key: 'birth', label: 'Birth' }, { key: '2mo', label: '2m' }, { key: '4mo', label: '4m' },
      { key: '6mo', label: '6m' }, { key: '12mo', label: '1yr' }, { key: '18mo', label: '18m' },
      { key: '2yr', label: '2yr' }, { key: '4yr', label: '4yr' }, { key: '7yr', label: '7yr' },
      { key: '11yr', label: '11yr' }, { key: '13yr', label: '13yr' }, { key: '16yr', label: '16yr' },
      { key: '17yr', label: '18yr' },
    ];
    axisLabels.forEach(a => {
      const pos = AGE_POS[a.key] ?? 0;
      html += `<span class="timeline-axis-label" style="left:${pos}%">${a.label}</span>`;
    });
    html += `</div></div>`;

    container.innerHTML = html;

    // Dot click → modal
    $$('.timeline-dot', container).forEach(el => {
      el.addEventListener('click', () => {
        const vid = el.dataset.vaccine;
        const vac = VACCINES.find(v => v.id === vid);
        if (vac) openModal(vac);
      });
    });
  }

  /* -------- Build Vaccine Cards -------- */
  function buildCards() {
    const grid = $('#cardsGrid');
    let html = '';
    VACCINES.forEach(v => {
      const entries = Object.entries(v.schedule).filter(([, c]) => c.type === 'rec' || c.type === 'catch');
      html += `<div class="vaccine-card">`;
      html += `<div class="card-header"><div class="card-name">${v.name}</div><div class="card-abbr">${v.abbr}</div></div>`;
      html += `<div class="card-desc">${v.description}</div>`;
      // Dose chips
      html += `<div class="card-doses">`;
      const doseAges = Object.entries(v.schedule).filter(([, c]) => c.type === 'rec');
      if (doseAges.length) {
        doseAges.forEach(([age, cell]) => {
          const ageLabel = AGE_COLS.find(a => a.key === age)?.label || age;
          html += `<span class="dose-chip active-dose">${cell.label} &mdash; ${ageLabel}</span>`;
        });
      } else {
        html += `<span class="dose-chip">See current guidance</span>`;
      }
      html += `</div>`;
      // Toggle
      html += `<button class="card-detail-toggle" data-vid="${v.id}">More details <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
      html += `<div class="card-details" id="details-${v.id}">`;
      html += `<p><strong>Notes:</strong> ${v.notes}</p>`;
      html += `<p style="margin-top:8px"><strong>Contraindications:</strong> ${v.contraindications}</p>`;
      html += `</div>`;
      html += `</div>`;
    });
    grid.innerHTML = html;

    // Toggle handlers
    $$('.card-detail-toggle', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const details = $(`#details-${btn.dataset.vid}`);
        details.classList.toggle('show');
        btn.classList.toggle('open');
      });
    });
  }

  /* -------- Modal -------- */
  function openModal(vaccine) {
    const overlay = $('#modalOverlay');
    const content = $('#modalContent');
    const doseEntries = Object.entries(vaccine.schedule)
      .map(([age, cell]) => {
        const ageLabel = AGE_COLS.find(a => a.key === age)?.label || age;
        return `<span class="dose-chip" style="margin:2px">${cell.label} &mdash; ${ageLabel}</span>`;
      }).join('');

    content.innerHTML = `
      <h3>${vaccine.name} <span style="font-weight:400;opacity:.5;">(${vaccine.abbr})</span></h3>
      <p class="modal-sub">${vaccine.description}</p>
      <div class="modal-body">
        <p><strong>Dose schedule</strong></p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0 16px;">${doseEntries}</div>
        <p><strong>Clinical notes</strong><br/>${vaccine.notes}</p>
        <p style="margin-top:12px"><strong>Contraindications</strong><br/>${vaccine.contraindications}</p>
      </div>
    `;
    overlay.classList.add('open');
  }

  function setupModal() {
    const overlay = $('#modalOverlay');
    const closeBtn = $('#modalClose');
    const close = () => overlay.classList.remove('open');
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* -------- Smooth-scroll nav -------- */
  function setupNav() {
    $$('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  /* -------- Init -------- */
  function init() {
    buildTable();
    setupAgeFilter();
    buildTimeline();
    buildCards();
    setupModal();
    setupNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
