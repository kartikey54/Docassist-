/* ================================================================
   TinyHumanMD | Calculator Engine for Rollout Pages
   Shared logic for newly scaffolded pediatric calculators.
   ================================================================ */
(function () {
  'use strict';

  function $(selector) {
    return document.querySelector(selector);
  }

  function round(value, digits) {
    var factor = Math.pow(10, typeof digits === 'number' ? digits : 1);
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function toKg(weight, unit) {
    var parsed = Number(weight);
    if (!Number.isFinite(parsed) || parsed <= 0) return NaN;
    return unit === 'lb' ? parsed * 0.45359237 : parsed;
  }

  function parseMinAgeMonths(text) {
    var value = String(text || '').toLowerCase();
    var m = value.match(/(\d+(?:\.\d+)?)\s*(month|months|mo|year|years|yr)/);
    if (!m) return 0;
    var num = Number(m[1]);
    if (!Number.isFinite(num)) return 0;
    if (m[2].indexOf('year') !== -1 || m[2].indexOf('yr') !== -1) return num * 12;
    return num;
  }

  function metric(label, value, tone) {
    return { label: label, value: value, tone: tone || '' };
  }

  var context = {
    dosingData: null
  };

  var scriptTag = document.currentScript || (function () {
    var tags = document.querySelectorAll('script[data-calc-id]');
    return tags.length ? tags[tags.length - 1] : null;
  })();

  if (!scriptTag) return;

  var calcId = scriptTag.getAttribute('data-calc-id');
  if (!calcId) return;

  var CALCULATORS = {
    'pediatric-fever-calculator': {
      title: 'Pediatric Fever Calculator',
      fields: [
        { id: 'ageMonths', label: 'Age (months)', type: 'number', min: 0, max: 216, step: 1, required: true },
        { id: 'weight', label: 'Weight', type: 'number', min: 1, max: 180, step: 0.1, required: true },
        {
          id: 'weightUnit',
          label: 'Weight unit',
          type: 'select',
          required: true,
          options: [
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' }
          ]
        },
        { id: 'tempC', label: 'Temperature (C)', type: 'number', min: 34, max: 43, step: 0.1, required: true }
      ],
      compute: function (values) {
        var ageMonths = Number(values.ageMonths);
        var weightKg = toKg(values.weight, values.weightUnit);
        var tempC = Number(values.tempC);

        if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Enter a valid weight.');
        if (!Number.isFinite(tempC) || tempC < 34 || tempC > 43) throw new Error('Enter a valid temperature in C.');

        var feverBand = 'No fever range';
        var feverTone = 'ok';
        if (tempC >= 40) {
          feverBand = 'High fever';
          feverTone = 'danger';
        } else if (tempC >= 39) {
          feverBand = 'Moderate fever';
          feverTone = 'warning';
        } else if (tempC >= 38) {
          feverBand = 'Low-grade fever';
          feverTone = 'warning';
        }

        var acetDose = Math.min(weightKg * 15, 1000);
        var ibuEligible = ageMonths >= 6;
        var ibuDose = ibuEligible ? Math.min(weightKg * 10, 400) : 0;

        var guidance = [
          'Acetaminophen: 15 mg/kg per dose every 4-6 hours (max 5 doses/24h).',
          ibuEligible
            ? 'Ibuprofen: 10 mg/kg per dose every 6-8 hours (if age >=6 months).'
            : 'Ibuprofen is not recommended under 6 months.',
          'Encourage oral hydration and reassess perfusion, urine output, and activity level.'
        ];

        var cautions = [];
        if (ageMonths < 3 && tempC >= 38) cautions.push('Age under 3 months with fever >=38C is a high-risk presentation requiring urgent evaluation.');
        if (tempC >= 40) cautions.push('Persistent fever >=40C needs prompt in-person clinical evaluation.');

        return {
          title: 'Fever Triage Summary',
          summary: 'Structured triage support with antipyretic dose checks.',
          metrics: [
            metric('Weight (kg)', round(weightKg, 2).toFixed(2), 'ok'),
            metric('Temperature', round(tempC, 1).toFixed(1) + ' C', feverTone),
            metric('Fever band', feverBand, feverTone),
            metric('Acetaminophen dose', round(acetDose, 1) + ' mg', 'ok'),
            metric('Ibuprofen dose', ibuEligible ? round(ibuDose, 1) + ' mg' : 'Not eligible', ibuEligible ? 'ok' : 'warning')
          ],
          guidance: guidance,
          cautions: cautions
        };
      }
    },

    'pediatric-antibiotic-dosing': {
      title: 'Pediatric Antibiotic Dosing Calculator',
      fields: [
        { id: 'weight', label: 'Weight', type: 'number', min: 1, max: 180, step: 0.1, required: true },
        {
          id: 'weightUnit',
          label: 'Weight unit',
          type: 'select',
          required: true,
          options: [
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' }
          ]
        },
        {
          id: 'indication',
          label: 'Clinical indication',
          type: 'select',
          required: true,
          options: [
            { value: 'aom', label: 'Acute otitis media' },
            { value: 'pneumonia', label: 'Community-acquired pneumonia' },
            { value: 'strep', label: 'Strep pharyngitis' },
            { value: 'sinusitis', label: 'Acute bacterial sinusitis' },
            { value: 'cellulitis', label: 'Cellulitis (non-purulent)' }
          ]
        }
      ],
      compute: function (values) {
        var weightKg = toKg(values.weight, values.weightUnit);
        if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Enter a valid weight.');

        var regimens = {
          aom: { label: 'Amoxicillin high-dose', mgKgDay: 90, dosesPerDay: 2, maxDaily: 3000, duration: '5-10 days by age/severity' },
          pneumonia: { label: 'Amoxicillin high-dose', mgKgDay: 90, dosesPerDay: 2, maxDaily: 4000, duration: '5-7 days (uncomplicated)' },
          strep: { label: 'Amoxicillin standard', mgKgDay: 50, dosesPerDay: 1, maxDaily: 1000, duration: '10 days' },
          sinusitis: { label: 'Amoxicillin-clavulanate high-dose', mgKgDay: 90, dosesPerDay: 2, maxDaily: 4000, duration: '10 days' },
          cellulitis: { label: 'Cephalexin', mgKgDay: 50, dosesPerDay: 4, maxDaily: 4000, duration: '5-7 days' }
        };

        var regimen = regimens[values.indication];
        if (!regimen) throw new Error('Select an indication.');

        var dailyDose = Math.min(weightKg * regimen.mgKgDay, regimen.maxDaily);
        var perDose = dailyDose / regimen.dosesPerDay;

        return {
          title: 'Antibiotic Dosing Plan',
          summary: 'Dose estimates by weight and clinical indication. Verify local resistance patterns and guideline updates.',
          metrics: [
            metric('Weight (kg)', round(weightKg, 2).toFixed(2), 'ok'),
            metric('Regimen', regimen.label, 'ok'),
            metric('Daily dose', round(dailyDose, 1) + ' mg/day', 'ok'),
            metric('Per-dose target', round(perDose, 1) + ' mg', 'ok'),
            metric('Dosing frequency', regimen.dosesPerDay + ' doses/day', 'ok')
          ],
          guidance: [
            'This tool provides a starting dose estimate; confirm exact formulation and concentration before prescribing.',
            'Reassess in 24-48 hours for non-response, worsening symptoms, or inability to tolerate oral medication.',
            'Duration estimate: ' + regimen.duration + '.'
          ],
          cautions: [
            'Adjust for severe renal impairment, recent antibiotic exposure, and allergy history.',
            'Escalate if toxic appearance, dehydration, respiratory distress, or concern for invasive infection.'
          ]
        };
      }
    },

    'pediatric-sepsis-risk-score': {
      title: 'Pediatric Sepsis Risk Score',
      fields: [
        { id: 'ageMonths', label: 'Age (months)', type: 'number', min: 0, max: 216, step: 1, required: true },
        { id: 'tempC', label: 'Temperature (C)', type: 'number', min: 30, max: 43, step: 0.1, required: true },
        { id: 'heartRate', label: 'Heart rate (bpm)', type: 'number', min: 30, max: 300, step: 1, required: true },
        { id: 'respRate', label: 'Respiratory rate (breaths/min)', type: 'number', min: 5, max: 120, step: 1, required: true },
        { id: 'capRefill', label: 'Capillary refill (seconds)', type: 'number', min: 0, max: 10, step: 0.1, required: true },
        {
          id: 'mentalStatus',
          label: 'Mental status',
          type: 'select',
          required: true,
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'altered', label: 'Altered/lethargic' }
          ]
        },
        {
          id: 'appearance',
          label: 'Overall appearance',
          type: 'select',
          required: true,
          options: [
            { value: 'well', label: 'Well-appearing' },
            { value: 'ill', label: 'Ill/toxic appearing' }
          ]
        }
      ],
      compute: function (values) {
        var ageMonths = Number(values.ageMonths);
        var tempC = Number(values.tempC);
        var heartRate = Number(values.heartRate);
        var respRate = Number(values.respRate);
        var capRefill = Number(values.capRefill);

        if (!Number.isFinite(ageMonths) || ageMonths < 0) throw new Error('Enter a valid age.');
        if (!Number.isFinite(tempC) || !Number.isFinite(heartRate) || !Number.isFinite(respRate) || !Number.isFinite(capRefill)) {
          throw new Error('Enter valid vital signs.');
        }

        var tachyHr = ageMonths < 12 ? 180 : ageMonths < 60 ? 160 : 140;
        var tachyRr = ageMonths < 12 ? 50 : ageMonths < 60 ? 40 : 30;

        var score = 0;
        if (tempC >= 38.5) score += 1;
        if (tempC < 36) score += 2;
        if (heartRate >= tachyHr) score += 1;
        if (respRate >= tachyRr) score += 1;
        if (capRefill > 2) score += 2;
        if (values.mentalStatus === 'altered') score += 2;
        if (values.appearance === 'ill') score += 2;

        var band = 'Low risk';
        var tone = 'ok';
        if (score >= 4) {
          band = 'High risk';
          tone = 'danger';
        } else if (score >= 2) {
          band = 'Intermediate risk';
          tone = 'warning';
        }

        var cautions = [];
        if (band === 'High risk') {
          cautions.push('High-risk score: urgent sepsis pathway activation and immediate physician assessment are recommended.');
        }
        if (capRefill > 3 || values.mentalStatus === 'altered') {
          cautions.push('Perfusion or neurologic compromise requires immediate escalation.');
        }

        return {
          title: 'Sepsis Risk Triage',
          summary: 'Rapid risk signal, not a diagnostic score. Use alongside full clinical assessment and labs.',
          metrics: [
            metric('Risk score', String(score), tone),
            metric('Risk band', band, tone),
            metric('Age HR threshold', '>=' + tachyHr + ' bpm', 'ok'),
            metric('Age RR threshold', '>=' + tachyRr + ' /min', 'ok')
          ],
          guidance: [
            'Obtain full vital set, perfusion assessment, and repeat trend checks over time.',
            'Consider blood cultures, lactate, CBC, and source evaluation when concern persists.',
            'Use institutional pediatric sepsis pathway for treatment bundle timing.'
          ],
          cautions: cautions
        };
      }
    },

    'pediatric-dehydration-management': {
      title: 'Pediatric Dehydration Management Calculator',
      fields: [
        { id: 'weight', label: 'Weight', type: 'number', min: 1, max: 180, step: 0.1, required: true },
        {
          id: 'weightUnit',
          label: 'Weight unit',
          type: 'select',
          required: true,
          options: [
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' }
          ]
        },
        { id: 'vomitingEpisodes', label: 'Vomiting episodes (24h)', type: 'number', min: 0, max: 30, step: 1, required: true },
        { id: 'diarrheaEpisodes', label: 'Diarrhea episodes (24h)', type: 'number', min: 0, max: 30, step: 1, required: true },
        { id: 'oralIntake', label: 'Oral intake vs baseline (%)', type: 'number', min: 0, max: 100, step: 1, required: true },
        { id: 'lowUrine', label: 'Low urine output', type: 'checkbox', required: false }
      ],
      compute: function (values) {
        var weightKg = toKg(values.weight, values.weightUnit);
        if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Enter a valid weight.');

        var vomiting = Number(values.vomitingEpisodes);
        var diarrhea = Number(values.diarrheaEpisodes);
        var oralIntake = Number(values.oralIntake);
        var lowUrine = Boolean(values.lowUrine);

        var score = 0;
        if (oralIntake < 50) score += 2;
        else if (oralIntake < 75) score += 1;
        if (vomiting >= 6) score += 1;
        if (diarrhea >= 6) score += 1;
        if (lowUrine) score += 2;

        var severity = 'Mild';
        var tone = 'ok';
        var deficitPerKg = 30;

        if (score >= 4) {
          severity = 'Severe';
          tone = 'danger';
          deficitPerKg = 100;
        } else if (score >= 2) {
          severity = 'Moderate';
          tone = 'warning';
          deficitPerKg = 60;
        }

        var maintenance = 0;
        if (weightKg <= 10) maintenance = weightKg * 100;
        else if (weightKg <= 20) maintenance = 1000 + (weightKg - 10) * 50;
        else maintenance = 1500 + (weightKg - 20) * 20;

        var deficit = weightKg * deficitPerKg;
        var bolus = severity === 'Severe' ? weightKg * 20 : 0;

        return {
          title: 'Hydration Support Plan',
          summary: 'Estimated maintenance and deficit replacement for triage support.',
          metrics: [
            metric('Estimated severity', severity, tone),
            metric('Maintenance (24h)', round(maintenance, 0) + ' mL', 'ok'),
            metric('Deficit estimate', round(deficit, 0) + ' mL', tone),
            metric('Initial bolus', bolus > 0 ? round(bolus, 0) + ' mL' : 'Not required', bolus > 0 ? 'warning' : 'ok')
          ],
          guidance: [
            'For mild dehydration, use oral rehydration therapy where tolerated.',
            'For moderate to severe dehydration, consider IV fluids and close reassessment.',
            'Track urine output, mental status, and perfusion during rehydration.'
          ],
          cautions: severity === 'Severe'
            ? ['Severe dehydration indicators require urgent physician reassessment and likely IV rehydration pathway.']
            : []
        };
      }
    },

    'pediatric-asthma-action-tool': {
      title: 'Pediatric Asthma Action Tool',
      fields: [
        { id: 'ageYears', label: 'Age (years)', type: 'number', min: 1, max: 21, step: 1, required: true },
        { id: 'daySymptoms', label: 'Daytime symptoms (days/week)', type: 'number', min: 0, max: 7, step: 1, required: true },
        { id: 'nightSymptoms', label: 'Night awakenings (per month)', type: 'number', min: 0, max: 30, step: 1, required: true },
        { id: 'sabaUse', label: 'Rescue inhaler use (days/week)', type: 'number', min: 0, max: 7, step: 1, required: true },
        { id: 'activityLimited', label: 'Activity limitation', type: 'checkbox', required: false }
      ],
      compute: function (values) {
        var day = Number(values.daySymptoms);
        var night = Number(values.nightSymptoms);
        var saba = Number(values.sabaUse);
        var limited = Boolean(values.activityLimited);

        if ([day, night, saba].some(function (v) { return !Number.isFinite(v) || v < 0; })) {
          throw new Error('Enter valid symptom counts.');
        }

        var classification = 'Intermittent';
        var tone = 'ok';
        var step = 'Step 1: SABA as needed';

        if (limited || day >= 7 || night >= 8 || saba >= 7) {
          classification = 'Severe persistent';
          tone = 'danger';
          step = 'Step 4-5: Medium/high-dose ICS-LABA and specialist co-management';
        } else if (day >= 4 || night >= 5 || saba >= 4) {
          classification = 'Moderate persistent';
          tone = 'warning';
          step = 'Step 3: Low-dose ICS-LABA or medium-dose ICS';
        } else if (day > 2 || night >= 3 || saba > 2) {
          classification = 'Mild persistent';
          tone = 'warning';
          step = 'Step 2: Daily low-dose ICS';
        }

        return {
          title: 'Asthma Control Classification',
          summary: 'Symptom-frequency triage support for asthma control and treatment-step discussion.',
          metrics: [
            metric('Control class', classification, tone),
            metric('Suggested treatment step', step, tone),
            metric('Day symptoms', String(day) + '/week', 'ok'),
            metric('Night awakenings', String(night) + '/month', 'ok')
          ],
          guidance: [
            'Confirm inhaler technique and adherence before escalating therapy.',
            'Provide written action plan with green/yellow/red zone instructions.',
            'Assess triggers, smoke exposure, and vaccination status.'
          ],
          cautions: classification === 'Severe persistent'
            ? ['Persistent severe symptoms or frequent rescue use warrants urgent specialist review.']
            : []
        };
      }
    },

    'otitis-media-treatment-pediatric': {
      title: 'Otitis Media Treatment Calculator',
      fields: [
        { id: 'ageMonths', label: 'Age (months)', type: 'number', min: 0, max: 216, step: 1, required: true },
        { id: 'weight', label: 'Weight', type: 'number', min: 1, max: 180, step: 0.1, required: true },
        {
          id: 'weightUnit',
          label: 'Weight unit',
          type: 'select',
          required: true,
          options: [
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' }
          ]
        },
        { id: 'bilateral', label: 'Bilateral otitis', type: 'checkbox', required: false },
        { id: 'severe', label: 'Severe pain or fever >=39C', type: 'checkbox', required: false },
        { id: 'otorrhea', label: 'Otorrhea present', type: 'checkbox', required: false },
        { id: 'penicillinAllergy', label: 'Penicillin allergy', type: 'checkbox', required: false }
      ],
      compute: function (values) {
        var ageMonths = Number(values.ageMonths);
        var weightKg = toKg(values.weight, values.weightUnit);

        if (!Number.isFinite(ageMonths) || ageMonths < 0) throw new Error('Enter a valid age.');
        if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Enter a valid weight.');

        var severe = Boolean(values.severe);
        var otorrhea = Boolean(values.otorrhea);
        var bilateral = Boolean(values.bilateral);
        var allergy = Boolean(values.penicillinAllergy);

        var treatNow = ageMonths < 6 || severe || otorrhea || (bilateral && ageMonths < 24);
        var plan = treatNow ? 'Treat now' : 'Watchful waiting may be reasonable';
        var tone = treatNow ? 'warning' : 'ok';

        var regimen = 'Observation with close follow-up';
        var perDose = null;
        var duration = ageMonths < 24 || severe ? '10 days' : ageMonths < 72 ? '7 days' : '5 days';

        if (treatNow) {
          if (allergy) {
            var cefdinirDaily = Math.min(weightKg * 14, 600);
            regimen = 'Cefdinir';
            perDose = round(cefdinirDaily, 1) + ' mg once daily';
          } else {
            var amoxDaily = Math.min(weightKg * 90, 3000);
            regimen = 'Amoxicillin high-dose';
            perDose = round(amoxDaily / 2, 1) + ' mg twice daily';
          }
        }

        return {
          title: 'Otitis Management Recommendation',
          summary: 'Age and severity based branch with first-line outpatient plan support.',
          metrics: [
            metric('Decision', plan, tone),
            metric('Regimen', regimen, treatNow ? 'warning' : 'ok'),
            metric('Per-dose target', perDose || 'N/A', perDose ? 'ok' : 'warning'),
            metric('Typical duration', duration, 'ok')
          ],
          guidance: [
            'Reassess within 48-72 hours if no improvement or earlier for worsening symptoms.',
            'Optimize pain control with weight-based acetaminophen or ibuprofen when age-appropriate.',
            'Document allergy history and recent antibiotic exposure before prescribing.'
          ],
          cautions: severe
            ? ['Severe symptoms should trigger immediate treatment and close follow-up.']
            : []
        };
      }
    },

    'well-child-visit-checklist': {
      title: 'Well-Child Visit Checklist',
      fields: [
        {
          id: 'ageBand',
          label: 'Visit age',
          type: 'select',
          required: true,
          options: [
            { value: 'newborn', label: 'Newborn' },
            { value: '2m', label: '2 months' },
            { value: '6m', label: '6 months' },
            { value: '12m', label: '12 months' },
            { value: '18m', label: '18 months' },
            { value: '24m', label: '24 months' },
            { value: '4y', label: '4 years' },
            { value: '11y', label: '11 years' },
            { value: '16y', label: '16 years' }
          ]
        }
      ],
      compute: function (values) {
        var checklists = {
          newborn: {
            label: 'Newborn visit',
            vaccines: 'HepB (if not given)',
            screens: 'Bilirubin risk, hearing, critical congenital heart disease follow-up',
            tasks: ['Feeding and weight check', 'Safe sleep counseling', 'Maternal mental health screening']
          },
          '2m': {
            label: '2-month visit',
            vaccines: 'DTaP, Hib, IPV, PCV, RV',
            screens: 'Developmental surveillance',
            tasks: ['Tummy time counseling', 'Fever after vaccines plan', 'Caregiver safety counseling']
          },
          '6m': {
            label: '6-month visit',
            vaccines: 'DTaP, PCV, RV (as indicated), influenza start',
            screens: 'Lead risk screen',
            tasks: ['Solid-food readiness review', 'Sleep routine review', 'Oral health guidance']
          },
          '12m': {
            label: '12-month visit',
            vaccines: 'MMR, Varicella, HepA, PCV booster',
            screens: 'Hemoglobin and lead screening',
            tasks: ['Transition from bottle', 'Dental home referral', 'Injury prevention']
          },
          '18m': {
            label: '18-month visit',
            vaccines: 'DTaP booster, HepA completion',
            screens: 'Autism screening + developmental screen',
            tasks: ['Behavior guidance', 'Language milestone review', 'Nutrition quality check']
          },
          '24m': {
            label: '24-month visit',
            vaccines: 'Catch-up as needed',
            screens: 'Autism/development + anemia/lead by risk',
            tasks: ['Toilet training readiness', 'Screen time counseling', 'Sleep and behavior coaching']
          },
          '4y': {
            label: '4-year visit',
            vaccines: 'DTaP, IPV, MMR, Varicella boosters',
            screens: 'Vision and hearing',
            tasks: ['School readiness', 'Motor/language review', 'Oral health and fluoride']
          },
          '11y': {
            label: '11-year visit',
            vaccines: 'Tdap, HPV, MenACWY',
            screens: 'Depression and social determinants screen',
            tasks: ['Puberty counseling', 'Sports safety', 'Substance use prevention']
          },
          '16y': {
            label: '16-year visit',
            vaccines: 'MenACWY booster, MenB shared decision',
            screens: 'Depression and confidential adolescent risk review',
            tasks: ['Driving safety', 'Transition planning', 'Sleep and stress management']
          }
        };

        var selected = checklists[values.ageBand];
        if (!selected) throw new Error('Select a visit age.');

        return {
          title: selected.label,
          summary: 'Preventive visit checklist for rapid rooming and encounter planning.',
          metrics: [
            metric('Visit', selected.label, 'ok'),
            metric('Vaccines to review', selected.vaccines, 'ok'),
            metric('Screenings', selected.screens, 'ok'),
            metric('Checklist items', String(selected.tasks.length), 'ok')
          ],
          guidance: selected.tasks,
          cautions: ['Use local immunization registry and documented history to confirm exact vaccine timing.']
        };
      }
    },

    'medication-safety-dosing-engine-v2': {
      title: 'Medication Safety Dosing Engine v2',
      fields: [
        { id: 'ageMonths', label: 'Age (months)', type: 'number', min: 0, max: 240, step: 1, required: true },
        { id: 'weight', label: 'Weight', type: 'number', min: 1, max: 180, step: 0.1, required: true },
        {
          id: 'weightUnit',
          label: 'Weight unit',
          type: 'select',
          required: true,
          options: [
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' }
          ]
        },
        {
          id: 'medicationId',
          label: 'Medication',
          type: 'select',
          required: true,
          optionsFromData: function (ctx) {
            var meds = (((ctx || {}).dosingData || {}).medications || []);
            if (!meds.length) return [{ value: '', label: 'Loading medications...' }];
            return meds.map(function (med) {
              return { value: med.id, label: med.name };
            });
          }
        }
      ],
      compute: function (values, ctx) {
        var data = (ctx || {}).dosingData;
        if (!data || !Array.isArray(data.medications)) {
          throw new Error('Medication data is still loading. Please retry in a moment.');
        }

        var ageMonths = Number(values.ageMonths);
        var weightKg = toKg(values.weight, values.weightUnit);

        if (!Number.isFinite(ageMonths) || ageMonths < 0) throw new Error('Enter a valid age.');
        if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Enter a valid weight.');

        var med = data.medications.find(function (item) {
          return item.id === values.medicationId;
        });
        if (!med) throw new Error('Select a medication.');

        var minAgeMonths = parseMinAgeMonths(med.minAge);
        if (minAgeMonths > 0 && ageMonths < minAgeMonths) {
          return {
            title: 'Medication Age Guardrail Triggered',
            summary: 'Selected medication is outside minimum age criteria.',
            metrics: [
              metric('Medication', med.name, 'warning'),
              metric('Patient age', ageMonths + ' months', 'warning'),
              metric('Minimum age', med.minAge, 'danger'),
              metric('Status', 'Do not calculate dose', 'danger')
            ],
            guidance: ['Select an age-appropriate alternative and verify with a pharmacist or attending physician.'],
            cautions: ['Hard stop: medication is restricted for this age range in current reference data.']
          };
        }

        var dose = Math.min(weightKg * Number(med.dosePerKg || 0), Number(med.maxSingleDose || 0));
        var firstLiquid = (med.concentrations || []).find(function (entry) { return Number(entry.mgPerMl) > 0; }) || null;
        var volume = firstLiquid ? dose / Number(firstLiquid.mgPerMl) : NaN;

        return {
          title: 'Medication Dose Output',
          summary: 'Age-gated weight-based dose estimate with safety caps.',
          metrics: [
            metric('Medication', med.name, 'ok'),
            metric('Per-dose amount', round(dose, 1) + ' ' + med.unit, 'ok'),
            metric('Frequency', med.frequency, 'ok'),
            metric('Max single dose', med.maxSingleDose + ' ' + med.unit, 'ok'),
            metric('Example volume', Number.isFinite(volume) ? round(volume, 2) + ' mL (' + firstLiquid.label + ')' : 'N/A', 'ok')
          ],
          guidance: [
            'Reconfirm concentration in hand before administration.',
            'Respect absolute max daily limits and route restrictions in the medication label.',
            med.notes || 'Follow current medication-specific pediatric references.'
          ],
          cautions: ['Double-check all dose calculations in high-risk medications and when rounding doses.']
        };
      }
    }
  };

  var calculator = CALCULATORS[calcId];
  if (!calculator) return;

  var formEl = $('#calc-form');
  var inputsRoot = $('#calc-inputs');
  var resetBtn = $('#calc-reset');
  var resultCard = $('#calc-result');
  var resultTitle = $('#calc-result-title');
  var resultSummary = $('#calc-summary');
  var resultMetrics = $('#calc-metrics');
  var resultGuidance = $('#calc-guidance');
  var resultCautions = $('#calc-cautions');

  function renderInputField(field) {
    var wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    var label = document.createElement('label');
    label.setAttribute('for', field.id);
    label.textContent = field.label;
    wrapper.appendChild(label);

    var input;
    if (field.type === 'select') {
      input = document.createElement('select');
      var options = field.optionsFromData ? field.optionsFromData(context) : field.options;
      (options || []).forEach(function (option) {
        var opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        input.appendChild(opt);
      });
    } else if (field.type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.style.width = '20px';
      input.style.height = '20px';
    } else {
      input = document.createElement('input');
      input.type = 'number';
      if (field.min !== undefined) input.min = String(field.min);
      if (field.max !== undefined) input.max = String(field.max);
      if (field.step !== undefined) input.step = String(field.step);
    }

    input.id = field.id;
    input.name = field.id;
    if (field.required) input.required = true;
    if (field.default !== undefined) {
      if (field.type === 'checkbox') input.checked = Boolean(field.default);
      else input.value = String(field.default);
    }

    wrapper.appendChild(input);

    if (field.helper) {
      var helper = document.createElement('span');
      helper.className = 'helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    return wrapper;
  }

  function renderForm() {
    if (!inputsRoot) return;
    inputsRoot.innerHTML = '';

    var fields = calculator.fields || [];
    for (var i = 0; i < fields.length; i += 2) {
      var row = document.createElement('div');
      row.className = 'form-row';
      row.appendChild(renderInputField(fields[i]));
      if (fields[i + 1]) row.appendChild(renderInputField(fields[i + 1]));
      inputsRoot.appendChild(row);
    }
  }

  function collectValues() {
    var values = {};
    var fields = calculator.fields || [];
    fields.forEach(function (field) {
      var el = document.getElementById(field.id);
      if (!el) return;

      if (field.type === 'checkbox') values[field.id] = el.checked;
      else values[field.id] = el.value;

      if (field.required && field.type !== 'checkbox' && String(values[field.id]).trim() === '') {
        throw new Error('Complete all required fields before running the calculator.');
      }
    });
    return values;
  }

  function renderResult(output) {
    if (!resultCard) return;

    resultCard.hidden = false;
    resultTitle.textContent = output.title || 'Result';
    resultSummary.textContent = output.summary || '';

    resultMetrics.innerHTML = (output.metrics || [])
      .map(function (m) {
        var toneClass = m.tone ? ' is-' + m.tone : '';
        return '<div class="result-item"><div class="result-value' + toneClass + '">' + m.value + '</div><div class="result-label">' + m.label + '</div></div>';
      })
      .join('');

    if (Array.isArray(output.guidance) && output.guidance.length) {
      resultGuidance.innerHTML = '<h4>Guidance</h4><ul>' + output.guidance.map(function (line) { return '<li>' + line + '</li>'; }).join('') + '</ul>';
    } else {
      resultGuidance.innerHTML = '<p class="calc-empty">No additional guidance available.</p>';
    }

    if (Array.isArray(output.cautions) && output.cautions.length) {
      resultCautions.innerHTML = '<h4>Cautions</h4><ul>' + output.cautions.map(function (line) { return '<li>' + line + '</li>'; }).join('') + '</ul>';
    } else {
      resultCautions.innerHTML = '';
    }
  }

  async function runCalculation(event) {
    event.preventDefault();
    var values = collectValues();
    var output = await Promise.resolve(calculator.compute(values, context));
    renderResult(output);

    if (window.TinyTrack && typeof window.TinyTrack.calcUsed === 'function') {
      window.TinyTrack.calcUsed(calcId, {
        route: window.location.pathname,
        category: calculator.title || calcId
      });
    }
  }

  function resetCalculator() {
    formEl.reset();
    if (resultCard) resultCard.hidden = true;
  }

  function loadDosingDataIfNeeded() {
    var needsData = (calculator.fields || []).some(function (field) {
      return typeof field.optionsFromData === 'function';
    });
    if (!needsData) return Promise.resolve();

    return fetch('/data/dosing-reference.json')
      .then(function (response) { return response.json(); })
      .then(function (json) {
        context.dosingData = json;
      })
      .catch(function () {
        context.dosingData = { medications: [] };
      });
  }

  function init() {
    if (!formEl || !inputsRoot) return;

    loadDosingDataIfNeeded().then(function () {
      renderForm();
      formEl.addEventListener('submit', function (event) {
        runCalculation(event).catch(function (error) {
          alert(error && error.message ? error.message : 'Unable to run calculator.');
        });
      });

      if (resetBtn) {
        resetBtn.addEventListener('click', resetCalculator);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
