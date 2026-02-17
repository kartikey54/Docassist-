/* ================================================================
   TinyHumanMD | Application
   AAP-first pediatric immunization schedule
   ================================================================ */
(function () {
  'use strict';

  /* ── Data ───────────────────────────────────────────────────── */
  var AGE_COLS = [
    {key:'birth',label:'Birth'},{key:'1mo',label:'1 mo'},{key:'2mo',label:'2 mos'},
    {key:'4mo',label:'4 mos'},{key:'6mo',label:'6 mos'},{key:'9mo',label:'9 mos'},
    {key:'12mo',label:'12 mos'},{key:'15mo',label:'15 mos'},{key:'18mo',label:'18 mos'},
    {key:'2yr',label:'2-3 yrs'},{key:'4yr',label:'4-6 yrs'},{key:'7yr',label:'7-10 yrs'},
    {key:'11yr',label:'11-12 yrs'},{key:'13yr',label:'13-15 yrs'},{key:'16yr',label:'16 yrs'},
    {key:'17yr',label:'17-18 yrs'}
  ];

  var VACCINES = [
    {id:'hepb',name:'Hepatitis B',abbr:'HepB',desc:'Protects against hepatitis B virus infection, which can cause chronic liver disease and liver cancer.',notes:'Administer monovalent HepB vaccine to all newborns within 24 hours of birth. The 2nd dose at 1 month and the 3rd at 6-18 months (min age for 3rd dose is 24 weeks).',contra:'Severe allergic reaction (anaphylaxis) after a previous dose or to a vaccine component.',schedule:{birth:{t:'rec',l:'1st'},'1mo':{t:'rec',l:'2nd'},'6mo':{t:'rec',l:'3rd'},'2mo':{t:'catch',l:'2nd'},'4mo':{t:'catch',l:'2nd-3rd'},'9mo':{t:'catch',l:'3rd'},'12mo':{t:'catch',l:'3rd'},'15mo':{t:'catch',l:'3rd'},'18mo':{t:'catch',l:'3rd'}},cu:{g:'young',min:'Birth',int:[{i:'4 weeks'},{i:'8 weeks',d:'and at least 16 weeks after first dose. Min age for final dose is 24 weeks.'}]},cuO:{g:'older',min:'N/A',int:[{i:'4 weeks'},{i:'8 weeks',d:'and at least 16 weeks after first dose.'}]}},
    {id:'rv',name:'Rotavirus',abbr:'RV',desc:'Prevents severe rotavirus gastroenteritis in infants and young children.',notes:'RV1: 2-dose series at 2 and 4 months. RV5: 3-dose series at 2, 4, and 6 months. Do not administer after 8 months 0 days.',contra:'Severe allergic reaction after previous dose. History of intussusception. SCID. Do not initiate the first dose of rotavirus vaccine at ≥15 weeks of age due to increased risk of intussusception.',schedule:{'2mo':{t:'rec',l:'1st'},'4mo':{t:'rec',l:'2nd'},'6mo':{t:'rec',l:'3rd'}},cu:{g:'young',min:'6 weeks',minD:'Max age for 1st dose is 14 weeks 6 days. Do not initiate the first dose of rotavirus vaccine at ≥15 weeks of age due to increased risk of intussusception.',int:[{i:'4 weeks'},{i:'4 weeks',d:'Max age for final dose is 8 months 0 days.'}]}},
    {id:'dtap',name:'Diphtheria, Tetanus & Pertussis',abbr:'DTaP',desc:'Protects against diphtheria, tetanus, and pertussis. For children under 7.',notes:'4th dose may be given as early as 12 months if 6+ months since 3rd dose. 5th dose not needed if 4th was at age 4+ years.',contra:'Severe allergic reaction after a previous dose. Encephalopathy within 7 days of a previous dose.',schedule:{'2mo':{t:'rec',l:'1st'},'4mo':{t:'rec',l:'2nd'},'6mo':{t:'rec',l:'3rd'},'15mo':{t:'rec',l:'4th'},'18mo':{t:'rec',l:'4th'},'4yr':{t:'rec',l:'5th'}},cu:{g:'young',min:'6 weeks',int:[{i:'4 weeks'},{i:'4 weeks'},{i:'6 months'},{i:'6 months',d:'5th dose not needed if 4th at age 4+ and 6+ months after dose 3.'}]}},
    {id:'hib',name:'Haemophilus influenzae type b',abbr:'Hib',desc:'Prevents invasive Hib disease including meningitis, epiglottitis, and pneumonia.',notes:'Number of doses depends on vaccine type. PRP-OMP requires a 2-dose primary series; others require 3 doses plus a booster.',contra:'Severe allergic reaction after a previous dose or to a vaccine component. Age less than 6 weeks.',schedule:{'2mo':{t:'rec',l:'1st'},'4mo':{t:'rec',l:'2nd'},'6mo':{t:'note',l:'See notes'},'12mo':{t:'rec',l:'3rd/4th'},'15mo':{t:'rec',l:'3rd/4th'}},cu:{g:'young',min:'6 weeks',int:[{i:'4 weeks',d:'if 1st dose before 1st birthday. 8 wks if at 12-14 mo. None if 15+ mo.'},{i:'4-8 weeks',d:'Depends on age, 1st dose age, and vaccine type.'},{i:'8 weeks',d:'Final dose. Only for 12-59 mo who got 3 doses before 1st birthday.'}]}},
    {id:'pcv',name:'Pneumococcal Conjugate',abbr:'PCV',desc:'Protects against pneumococcal diseases: pneumonia, meningitis, and bloodstream infections.',notes:'PCV15 or PCV20 may be used. Additional doses for at-risk children aged 2-18.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'2mo':{t:'rec',l:'1st'},'4mo':{t:'rec',l:'2nd'},'6mo':{t:'rec',l:'3rd'},'12mo':{t:'rec',l:'4th'},'15mo':{t:'rec',l:'4th'}},cu:{g:'young',min:'6 weeks',int:[{i:'4 weeks',d:'if 1st dose before 1st birthday. 8 wks if at/after 1st birthday.'},{i:'4-8 weeks',d:'Depends on age and prior doses.'},{i:'8 weeks',d:'Final dose for 12-59 mo who got 3 doses before 12 months.'}]}},
    {id:'ipv',name:'Inactivated Poliovirus',abbr:'IPV',desc:'Protection against poliovirus, which can cause paralysis and death.',notes:'Final dose at 4-6 years regardless of previous doses, at least 6 months after previous dose.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'2mo':{t:'rec',l:'1st'},'4mo':{t:'rec',l:'2nd'},'6mo':{t:'rec',l:'3rd'},'12mo':{t:'catch',l:'3rd'},'18mo':{t:'catch',l:'3rd'},'4yr':{t:'rec',l:'4th'},'7yr':{t:'note',l:'See notes'}},cu:{g:'young',min:'6 weeks',int:[{i:'4 weeks'},{i:'4 weeks',d:'if under 4 yrs. 6 months if 4+ yrs.'},{i:'6 months',d:'Min age 4 years for final dose.'}]},cuO:{g:'older',min:'N/A',int:[{i:'4 weeks'},{i:'6 months',d:'4th dose not needed if 3rd was at 4+ yrs and 6+ mo after previous.'}]}},
    {id:'flu',name:'Influenza',abbr:'IIV/LAIV',desc:'Annual influenza vaccination for all persons 6 months and older.',notes:'Administer annually. Children 6 mo through 8 yrs who need 2 doses should start as soon as vaccine is available. LAIV for ages 2+.',contra:'Severe allergic reaction to any component. LAIV: immunocompromised, pregnancy, children 2-4 with asthma.',schedule:{'6mo':{t:'rec',l:'1-2/yr'},'9mo':{t:'rec',l:'1-2/yr'},'12mo':{t:'rec',l:'1-2/yr'},'15mo':{t:'rec',l:'1-2/yr'},'18mo':{t:'rec',l:'1-2/yr'},'2yr':{t:'rec',l:'1/yr'},'4yr':{t:'rec',l:'1/yr'},'7yr':{t:'rec',l:'1/yr'},'11yr':{t:'rec',l:'1/yr'},'13yr':{t:'rec',l:'1/yr'},'16yr':{t:'rec',l:'1/yr'},'17yr':{t:'rec',l:'1/yr'}}},
    {id:'mmr',name:'Measles, Mumps, Rubella',abbr:'MMR',desc:'Protects against measles, mumps, and rubella, all highly contagious viral diseases.',notes:'1st dose at 12-15 months, 2nd at 4-6 years. Can give before 12 mo for international travel (does not count toward routine series).',contra:'Severe allergic reaction after previous dose. Pregnancy. Known severe immunodeficiency.',schedule:{'12mo':{t:'rec',l:'1st'},'15mo':{t:'rec',l:'1st'},'4yr':{t:'rec',l:'2nd'},'7yr':{t:'catch',l:'2nd'}},cu:{g:'young',min:'12 months',int:[{i:'4 weeks'}]},cuO:{g:'older',min:'N/A',int:[{i:'4 weeks'}]}},
    {id:'var',name:'Varicella',abbr:'VAR',desc:'Prevents chickenpox, a highly contagious disease that can lead to serious complications.',notes:'1st dose at 12-15 months, 2nd at 4-6 years. 2nd dose can be as early as 3 months after 1st.',contra:'Severe allergic reaction after previous dose. Pregnancy. Known severe immunodeficiency.',schedule:{'12mo':{t:'rec',l:'1st'},'15mo':{t:'rec',l:'1st'},'4yr':{t:'rec',l:'2nd'},'7yr':{t:'catch',l:'2nd'}},cu:{g:'young',min:'12 months',int:[{i:'3 months'}]},cuO:{g:'older',min:'N/A',int:[{i:'3 months',d:'if under 13. 4 weeks if 13+.'}]}},
    {id:'hepa',name:'Hepatitis A',abbr:'HepA',desc:'Protects against hepatitis A, a liver infection transmitted via contaminated food or water.',notes:'2-dose series starting at 12 months. Doses separated by 6-18 months. Catch-up for anyone 2+ who is unvaccinated.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'12mo':{t:'rec',l:'1st'},'15mo':{t:'rec',l:'1st'},'18mo':{t:'rec',l:'2nd'},'2yr':{t:'catch',l:'1st-2nd'}},cu:{g:'young',min:'12 months',int:[{i:'6 months'}]},cuO:{g:'older',min:'N/A',int:[{i:'6 months'}]}},
    {id:'menacwy',name:'Meningococcal ACWY',abbr:'MenACWY',desc:'Protects against meningococcal serogroups A, C, W, and Y: bacterial meningitis and bloodstream infections.',notes:'1st dose at 11-12 years, booster at 16. High-risk children can start as early as 2 months.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'2mo':{t:'risk',l:'High risk'},'11yr':{t:'rec',l:'1st'},'16yr':{t:'rec',l:'2nd'}},cu:{g:'young',min:'2 mo (CRM), 2 yr (TT)',legendTitle:'What are CRM and TT?',legendHtml:'CRM: non-toxic diphtheria protein carrier (CRM197).<br>TT: tetanus toxoid carrier protein.',int:[{i:'8 weeks'},{i:'See notes',d:'Depends on indication and age.'}]},cuO:{g:'older',min:'N/A',int:[{i:'8 weeks'}]}},
    {id:'tdap',name:'Tetanus, Diphtheria & Pertussis',abbr:'Tdap',desc:'Booster for older children and adolescents with added pertussis protection.',notes:'1 dose at 11-12 years. Can be given regardless of interval since last tetanus-containing vaccine.',contra:'Severe allergic reaction after a previous dose. Encephalopathy within 7 days of a pertussis-containing vaccine.',schedule:{'11yr':{t:'rec',l:'1 dose'},'13yr':{t:'catch',l:'1 dose'}},cuO:{g:'older',min:'7 years',int:[{i:'4 weeks'},{i:'4 weeks',d:'if 1st DTaP/DT before 1st birthday. 6 mo if at/after 1st birthday.'},{i:'6 months',d:'if 1st DTaP/DT before 1st birthday.'}]}},
    {id:'hpv',name:'Human Papillomavirus',abbr:'HPV',desc:'Prevents HPV infections causing cervical, anal, oropharyngeal cancers and genital warts.',notes:'Routine at 11-12 years (minimum age to start is 9 years, not months). Before 15: 2-dose series. At 15+: 3-dose series.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'7yr':{t:'shared',l:'Can begin'},'11yr':{t:'rec',l:'1st'},'13yr':{t:'rec',l:'2nd'},'16yr':{t:'catch',l:'1st-2nd'},'17yr':{t:'catch',l:'1st-3rd'}},cuO:{g:'older',min:'9 years',int:[{i:'Routine dosing intervals recommended.'}]}},
    {id:'menb',name:'Meningococcal B',abbr:'MenB',desc:'Protects against serogroup B meningococcal disease. Based on shared clinical decision-making.',notes:'Shared decision-making for 16-23 yr olds (preferred 16-18). 2-dose MenB-4C or 2-3 dose MenB-FHbp.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'16yr':{t:'shared',l:'2-3 doses'},'17yr':{t:'shared',l:'2-3 doses'}}},
    {id:'rsv',name:'RSV (Nirsevimab)',abbr:'RSV-mAb',desc:'Monoclonal antibody for passive immunization against respiratory syncytial virus in infants.',notes:'1 dose for infants in/entering first RSV season. 2nd season dose for 8-19 mo at increased risk.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{birth:{t:'rec',l:'1 dose'},'1mo':{t:'rec',l:'1 dose'},'2mo':{t:'rec',l:'1 dose'},'4mo':{t:'rec',l:'1 dose'},'6mo':{t:'rec',l:'1 dose'},'9mo':{t:'risk',l:'2nd season'},'12mo':{t:'risk',l:'2nd season'},'15mo':{t:'risk',l:'2nd season'},'18mo':{t:'risk',l:'2nd season'}}},
    {id:'covid',name:'COVID-19',abbr:'COVID',desc:'Protects against SARS-CoV-2 infection. Updated vaccines recommended seasonally.',notes:'See current AAP and CDC guidance. Available for ages 6 months and older.',contra:'Severe allergic reaction after a previous dose or to a vaccine component.',schedule:{'6mo':{t:'note',l:'See notes'},'9mo':{t:'note',l:'See notes'},'12mo':{t:'note',l:'See notes'},'15mo':{t:'note',l:'See notes'},'18mo':{t:'note',l:'See notes'},'2yr':{t:'note',l:'See notes'},'4yr':{t:'note',l:'See notes'},'7yr':{t:'note',l:'See notes'},'11yr':{t:'note',l:'See notes'},'13yr':{t:'note',l:'See notes'},'16yr':{t:'note',l:'See notes'},'17yr':{t:'note',l:'See notes'}}},
    {id:'dengue',name:'Dengue',abbr:'DEN4CYD',desc:'Prevents dengue in seropositive individuals in endemic areas, ages 9-16.',notes:'Only for 9-16 yr olds with lab-confirmed previous dengue in endemic areas.',contra:'Severe allergic reaction. Seronegative individuals.',schedule:{'11yr':{t:'risk',l:'Endemic'},'13yr':{t:'risk',l:'Endemic'},'16yr':{t:'risk',l:'Endemic'}},cuO:{g:'older',min:'9 years',int:[{i:'6 months'},{i:'6 months'}]}}
  ];

  /* ── Helpers ────────────────────────────────────────────────── */
  var $ = function(s,p){return (p||document).querySelector(s);};
  var $$ = function(s,p){return Array.from((p||document).querySelectorAll(s));};
  var PCLS = {rec:'pill-rec',catch:'pill-catch',risk:'pill-risk',shared:'pill-shared',note:'pill-note'};
  var AGE_DOSE_CAVEATS = {
    rv: ['Do NOT start first dose at <strong>&ge;15 weeks</strong>.', 'Final dose max age: <strong>8 months 0 days</strong>.'],
    hib: ['Any dose at <strong>&ge;15 months</strong> (healthy child) completes series.', 'Routine Hib generally ends by <strong>5 years</strong> unless high-risk.'],
    pcv: ['Dose at <strong>&ge;24 months</strong> in healthy child may complete series.', 'Routine PCV catch-up generally ends before <strong>5 years</strong>.'],
    ipv: ['Dose 3 at <strong>&ge;4 years</strong> and <strong>&ge;6 months</strong> after Dose 2 may complete series.', 'Catch-up through <strong>18 years</strong>; final dose needs <strong>&ge;6 months</strong> interval.'],
    dtap: ['Dose 4 at <strong>&ge;4 years</strong> and <strong>&ge;6 months</strong> after Dose 3 means Dose 5 not needed.', 'First tetanus dose at <strong>&ge;7 years</strong> uses Tdap/Td catch-up.'],
    tdap: ['Use DTaP for <strong>&lt;7 years</strong>; Tdap/Td for <strong>&ge;7 years</strong>.'],
    hpv: ['Start before <strong>15 years</strong>: 2-dose series.', 'Start at/after <strong>15 years</strong>: 3-dose series; routine through <strong>26 years</strong>.', 'If unvaccinated and <strong>older than 26 years</strong>, routine catch-up start is not recommended.'],
    hepb: ['Standard series is 3 doses; final dose at <strong>&ge;24 weeks</strong>.', 'Adolescents <strong>&ge;11 years</strong> may use 2-dose adult formulation (0, 6 months).'],
    mmr: ['Unvaccinated at <strong>&ge;12 months</strong>: initiate now; total 2-dose series.'],
    var: ['Unvaccinated at <strong>&ge;13 years</strong>: 2 doses, minimum 4 weeks apart.', 'Younger children: standard 2-dose schedule.']
  };

  function pill(c,vid){
    if(!c) return '';
    return '<button class="pill '+(PCLS[c.t]||'pill-note')+'" data-vid="'+vid+'" aria-label="'+c.l+', click for details">'+c.l+'</button>';
  }

  function debounce(fn,ms){var t;return function(){clearTimeout(t);var a=arguments,c=this;t=setTimeout(function(){fn.apply(c,a);},ms);};}
  function renderAgeDoseCaveat(v){
    var items=AGE_DOSE_CAVEATS[v&&v.id];
    if(!items||!items.length) return '';
    return '<details class="age-dose-caveat"><summary>Age/Dose Caveat</summary><ul>'+items.map(function(it){return '<li>'+it+'</li>';}).join('')+'</ul></details>';
  }
  function renderCatchupLegend(cu,extraClass){
    if(!cu||!cu.legendHtml) return '';
    var cls='cu-legend'+(extraClass?' '+extraClass:'');
    return '<details class="'+cls+'"><summary>'+(cu.legendTitle||'Definitions')+'</summary><div class="cu-legend-body">'+cu.legendHtml+'</div></details>';
  }

  /* ── State ──────────────────────────────────────────────────── */
  var filters = {search:'',age:'all',type:'all'};

  /* ── Schedule Table ─────────────────────────────────────────── */
  function buildTable(){
    var head=$('#tableHead'),body=$('#tableBody');
    var h='<tr><th data-col="name">Vaccine</th>';
    AGE_COLS.forEach(function(c){h+='<th data-col="'+c.key+'">'+c.label+'</th>';});
    head.innerHTML=h+'</tr>';
    var r='';
    VACCINES.forEach(function(v){
      var ages=Object.keys(v.schedule);
      r+='<tr data-ages="'+ages.join(',')+'" data-name="'+v.name.toLowerCase()+' '+v.abbr.toLowerCase()+'" data-types="'+ages.map(function(a){return v.schedule[a].t;}).join(',')+'">';
      r+='<td data-col="name">'+v.name+' <span style="opacity:.4;font-weight:400">('+v.abbr+')</span></td>';
      AGE_COLS.forEach(function(c){r+='<td data-col="'+c.key+'">'+pill(v.schedule[c.key],v.id)+'</td>';});
      r+='</tr>';
    });
    body.innerHTML=r;
    $$('.pill',body).forEach(function(el){
      el.addEventListener('click',function(){var v=VACCINES.find(function(x){return x.id===el.dataset.vid;});if(v)openModal(v);});
    });
  }

  /* ── Mobile Cards ───────────────────────────────────────────── */
  var CHIP_CLS = {rec:'mc-chip-rec',catch:'mc-chip-catch',risk:'mc-chip-risk',shared:'mc-chip-shared',note:'mc-chip-note'};
  function buildMobileCards(){
    var wrap=$('#mobileCards');
    var html='';
    VACCINES.forEach(function(v){
      var ages=Object.keys(v.schedule);
      // Show ALL dose ages, not just recommended
      var chips=Object.entries(v.schedule).map(function(e){
        var al=(AGE_COLS.find(function(a){return a.key===e[0];})||{}).label||e[0];
        return '<span class="mc-chip '+(CHIP_CLS[e[1].t]||'mc-chip-note')+'">'+e[1].l+' | '+al+'</span>';
      }).join('');
      html+='<div class="card mobile-card" data-ages="'+ages.join(',')+'" data-name="'+v.name.toLowerCase()+' '+v.abbr.toLowerCase()+'" data-types="'+ages.map(function(a){return v.schedule[a].t;}).join(',')+'" data-vid="'+v.id+'">';
      html+='<div class="card-top"><div class="card-title">'+v.name+'</div><span class="card-abbr">'+v.abbr+'</span></div>';
      html+='<div class="card-body">'+v.desc+'</div>';
      if(chips) html+='<div class="mc-chips">'+chips+'</div>';
      html+='</div>';
    });
    wrap.innerHTML=html;
    // Tap a mobile card to open modal
    $$('.mobile-card',wrap).forEach(function(c){
      c.addEventListener('click',function(){
        var v=VACCINES.find(function(x){return x.id===c.dataset.vid;});
        if(v)openModal(v);
      });
    });
  }

  /* ── Filtering ──────────────────────────────────────────────── */
  function applyFilters(){
    var s=filters.search.toLowerCase(), a=filters.age, t=filters.type;
    var anyVisible=false;

    // Desktop table rows
    $$('#tableBody tr').forEach(function(tr){
      var nameMatch=!s||tr.dataset.name.indexOf(s)!==-1;
      var ageMatch=a==='all'||tr.dataset.ages.split(',').indexOf(a)!==-1;
      var typeMatch=t==='all'||tr.dataset.types.split(',').indexOf(t)!==-1;
      var show=nameMatch&&ageMatch&&typeMatch;
      tr.classList.toggle('is-hidden',!show);
      if(show) anyVisible=true;
    });

    // Column highlighting: when an age is selected, highlight that column and dim others
    $$('#scheduleTable th, #scheduleTable td').forEach(function(cell){
      cell.classList.remove('col-highlight','col-dim');
      if(a!=='all' && cell.dataset.col){
        if(cell.dataset.col===a) cell.classList.add('col-highlight');
        else if(cell.dataset.col!=='name') cell.classList.add('col-dim');
      }
    });

    // Mobile cards
    $$('.mobile-card').forEach(function(c){
      var nameMatch=!s||c.dataset.name.indexOf(s)!==-1;
      var ageMatch=a==='all'||c.dataset.ages.split(',').indexOf(a)!==-1;
      var typeMatch=t==='all'||c.dataset.types.split(',').indexOf(t)!==-1;
      c.style.display=(nameMatch&&ageMatch&&typeMatch)?'':'none';
    });

    var empty=$('#tableEmpty');
    if(empty) empty.hidden=anyVisible;
    renderChips();
  }

  function renderChips(){
    var bar=$('#chipBar'); if(!bar) return;
    var chips=[];
    if(filters.search) chips.push({key:'search',label:'Search: "'+filters.search+'"'});
    if(filters.age!=='all'){var al=(AGE_COLS.find(function(a){return a.key===filters.age;})||{}).label||filters.age;chips.push({key:'age',label:'Age: '+al});}
    if(filters.type!=='all'){var labels={rec:'Recommended',catch:'Catch-up',risk:'High-risk',shared:'Shared decision'};chips.push({key:'type',label:labels[filters.type]||filters.type});}
    var html=chips.map(function(c){
      return '<button class="chip" data-clear="'+c.key+'" aria-label="Remove filter: '+c.label+'">'+c.label+' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    }).join('');
    if(chips.length>1) html+='<button class="chip-clear" id="clearAll">Clear all</button>';
    bar.innerHTML=html;
    $$('.chip',bar).forEach(function(ch){
      ch.addEventListener('click',function(){
        var k=ch.dataset.clear;
        if(k==='search'){filters.search='';$('#globalSearch').value='';}
        if(k==='age'){filters.age='all';$('#ageFilter').value='all';}
        if(k==='type'){filters.type='all';$('#typeFilter').value='all';}
        applyFilters();
      });
    });
    var ca=$('#clearAll',bar);
    if(ca) ca.addEventListener('click',function(){
      filters={search:'',age:'all',type:'all'};
      $('#globalSearch').value='';$('#ageFilter').value='all';$('#typeFilter').value='all';
      applyFilters();
    });
  }

  function setupFilters(){
    var searchInput=$('#globalSearch');
    var ageSelect=$('#ageFilter');
    var typeSelect=$('#typeFilter');
    searchInput.addEventListener('input',debounce(function(){filters.search=searchInput.value;applyFilters();},150));
    ageSelect.addEventListener('change',function(){filters.age=ageSelect.value;applyFilters();});
    typeSelect.addEventListener('change',function(){filters.type=typeSelect.value;applyFilters();});
  }

  /* ── Catch-up ───────────────────────────────────────────────── */
  function buildCatchup(group){
    var head=$('#catchupHead'),body=$('#catchupBody');
    var mx=group==='young'?4:3;
    var h='<tr><th>Vaccine</th><th>Min. Age</th>';
    for(var i=0;i<mx;i++) h+='<th>Dose '+(i+1)+' to '+(i+2)+'</th>';
    head.innerHTML=h+'</tr>';
    var r='';
    VACCINES.forEach(function(v){
      var cu=group==='young'?v.cu:v.cuO;if(!cu)return;
      r+='<tr><td>'+v.name+' <span style="opacity:.4;font-weight:400">('+v.abbr+')</span></td>';
      r+='<td><span class="cu-badge">'+cu.min+'</span>'+(cu.minD?'<span class="cu-muted">'+cu.minD+'</span>':'')+'</td>';
      for(var i=0;i<mx;i++){var iv=cu.int[i];
        r+=iv?'<td><span class="cu-bold">'+iv.i+'</span>'+(iv.d?'<span class="cu-muted">'+iv.d+'</span>':'')+'</td>':'<td></td>';
      }
      r+='</tr>';
    });
    body.innerHTML=r;
  }
  function setupCatchupTabs(){
    $$('.tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        $$('.tab').forEach(function(t){t.classList.remove('is-active');t.setAttribute('aria-selected','false');});
        tab.classList.add('is-active');tab.setAttribute('aria-selected','true');
        $('#catchupPanel').setAttribute('aria-labelledby',tab.id);
        buildCatchup(tab.dataset.group);
      });
    });
    buildCatchup('young');
  }

  /* ── Timeline ───────────────────────────────────────────────── */
  function buildTimeline(){
    var c=$('#timelineContainer');
    var POS={birth:0,'1mo':3,'2mo':6,'4mo':10,'6mo':14,'9mo':18,'12mo':22,'15mo':26,'18mo':30,'2yr':38,'4yr':48,'7yr':58,'11yr':68,'13yr':76,'16yr':86,'17yr':94};
    var COL={rec:'var(--c-primary)',catch:'var(--c-green)',risk:'var(--c-purple)',shared:'var(--c-amber)',note:'#bbb'};
    var html='';
    VACCINES.forEach(function(v){
      var entries=Object.entries(v.schedule);if(!entries.length)return;
      var positions=entries.map(function(e){return POS[e[0]]||0;});
      var minP=Math.min.apply(null,positions),maxP=Math.max.apply(null,positions);
      var mc=COL[entries[0][1].t]||COL.rec;
      html+='<div class="tl-row"><div class="tl-label">'+v.abbr+'</div><div class="tl-track">';
      html+='<div class="tl-bar" style="left:'+minP+'%;width:'+(maxP-minP)+'%;background:'+mc+'"></div>';
      entries.forEach(function(e){
        var pos=POS[e[0]]||0,col=COL[e[1].t]||COL.rec;
        var al=(AGE_COLS.find(function(a){return a.key===e[0];})||{}).label||e[0];
        html+='<div class="tl-dot" style="left:'+pos+'%;color:'+col+';background:'+col+'" data-vid="'+v.id+'" tabindex="0" role="button" aria-label="'+v.abbr+' '+e[1].l+' at '+al+'"><span class="tl-tooltip">'+e[1].l+' | '+al+'</span></div>';
      });
      html+='</div></div>';
    });
    html+='<div class="tl-axis"><div class="tl-axis-spacer"></div><div class="tl-axis-track">';
    [{k:'birth',l:'Birth'},{k:'2mo',l:'2m'},{k:'4mo',l:'4m'},{k:'6mo',l:'6m'},{k:'12mo',l:'1yr'},{k:'18mo',l:'18m'},{k:'2yr',l:'2yr'},{k:'4yr',l:'4yr'},{k:'7yr',l:'7yr'},{k:'11yr',l:'11yr'},{k:'13yr',l:'13yr'},{k:'16yr',l:'16yr'},{k:'17yr',l:'18yr'}].forEach(function(a){
      html+='<span class="tl-axis-label" style="left:'+(POS[a.k]||0)+'%">'+a.l+'</span>';
    });
    html+='</div></div>';
    c.innerHTML=html;
    $$('.tl-dot',c).forEach(function(el){
      function go(){var v=VACCINES.find(function(x){return x.id===el.dataset.vid;});if(v)openModal(v);}
      el.addEventListener('click',go);
      el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
    });
  }

  /* ── Vaccine Cards ──────────────────────────────────────────── */
  function buildCards(){
    var grid=$('#cardsGrid');var html='';
    VACCINES.forEach(function(v){
      var doseAges=Object.entries(v.schedule).filter(function(e){return e[1].t==='rec';});
      var chips=doseAges.length?doseAges.map(function(e){
        var al=(AGE_COLS.find(function(a){return a.key===e[0];})||{}).label||e[0];
        return '<span class="card-chip">'+e[1].l+' | '+al+'</span>';
      }).join(''):'<span class="card-chip" style="background:var(--c-border-light)">See guidance</span>';
      var cu=v.cu||v.cuO;
      html+='<div class="card"><div class="card-top"><div class="card-title">'+v.name+'</div><span class="card-abbr">'+v.abbr+'</span></div>';
      html+='<div class="card-body">'+v.desc+'</div>';
      html+='<div class="card-chips">'+chips+'</div>';
      if(cu) html+='<div class="card-chips"><span class="card-chip card-chip-green">Catch-up: min age '+cu.min+'</span></div>';
      html+='<button class="card-toggle" data-vid="'+v.id+'" aria-expanded="false">More details <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      html+='<div class="card-detail" id="det-'+v.id+'"><p><strong>Notes:</strong> '+v.notes+'</p><p style="margin-top:8px"><strong>Contraindications:</strong> '+v.contra+'</p>'+renderAgeDoseCaveat(v);
      if(cu&&cu.int.length){html+='<p style="margin-top:8px"><strong>Catch-up intervals:</strong></p><ul>';cu.int.forEach(function(iv,i){html+='<li>Dose '+(i+1)+' to '+(i+2)+': <strong>'+iv.i+'</strong>'+(iv.d?' <span style="color:var(--c-text-secondary)">'+iv.d+'</span>':'')+'</li>';});html+='</ul>';}
      if(cu) html+=renderCatchupLegend(cu,'cu-legend-card');
      html+='</div></div>';
    });
    grid.innerHTML=html;
    $$('.card-toggle',grid).forEach(function(btn){
      btn.addEventListener('click',function(){
        var det=$('#det-'+btn.dataset.vid);
        var open=det.classList.toggle('is-open');
        btn.classList.toggle('is-open',open);
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });
  }

  /* ── Adult, Pregnancy, Travel, Mpox ─────────────────────────── */
  function buildAdult(){
    var grid=$('#adultGrid');if(!grid)return;
    var items=[
      {b:'Annual',bc:'badge-blue',n:'Influenza (Flu)',d:'One dose every flu season for all adults. High-dose or adjuvanted for 65+.'},
      {b:'Seasonal',bc:'badge-blue',n:'COVID-19',d:'Updated vaccine recommended for all adults per current ACIP/CDC guidance.'},
      {b:'Every 10 yrs',bc:'badge-neutral',n:'Td / Tdap',d:'Td booster every 10 years. One dose should be Tdap. Especially important around newborns.'},
      {b:'50+',bc:'badge-purple',n:'Shingles (Zoster)',d:'Shingrix: 2-dose series for adults 50+, or 19+ if immunocompromised. Doses 2-6 months apart.'},
      {b:'65+',bc:'badge-purple',n:'Pneumococcal',d:'PCV20 (single dose) or PCV15+PPSV23 for 65+, or younger with risk factors.'},
      {b:'At risk',bc:'badge-amber',n:'Hepatitis B',d:'Recommended for all adults 19-59. Adults 60+ with risk factors should also be vaccinated.'},
      {b:'At risk',bc:'badge-amber',n:'Hepatitis A',d:'2-dose series for adults with risk factors: travel, chronic liver disease, MSM, injection drug use.'},
      {b:'If not immune',bc:'badge-neutral',n:'MMR',d:'Adults born 1957+ without immunity need at least 1 dose. HCWs and travelers may need 2.'},
      {b:'If not immune',bc:'badge-neutral',n:'Varicella',d:'2-dose series for adults without evidence of chickenpox immunity. 4-8 weeks apart.'},
      {b:'60+',bc:'badge-purple',n:'RSV',d:'Single dose for adults 75+, or 60-74 at increased risk. Shared clinical decision-making.'}
    ];
    grid.innerHTML=items.map(function(i){
      return '<div class="card"><span class="badge '+i.bc+'" style="margin-bottom:12px">'+i.b+'</span><div class="card-title" style="margin-bottom:6px">'+i.n+'</div><div class="card-body" style="margin-bottom:0">'+i.d+'</div></div>';
    }).join('');
  }

  function buildPregnancy(){
    var grid=$('#pregGrid');if(!grid)return;
    var rec=[{n:'Tdap',d:'One dose each pregnancy, weeks 27-36. Passes whooping cough antibodies to baby.'},{n:'Influenza',d:'Inactivated flu vaccine safe any trimester. Protects mother and newborn.'},{n:'COVID-19',d:'Updated vaccine recommended. Can be given any point during pregnancy.'},{n:'RSV (Abrysvo)',d:'Single dose weeks 32-36 (Sep-Jan). Protects infant from severe RSV.'}];
    var avoid=[{n:'MMR',d:'Live vaccine. Vaccinate at least 4 weeks before becoming pregnant.'},{n:'Varicella',d:'Live vaccine. Complete series before pregnancy.'},{n:'LAIV (Nasal Spray)',d:'Live vaccine. Use inactivated injectable flu vaccine instead.'},{n:'Shingrix',d:'Insufficient pregnancy safety data. Defer until after delivery.'}];
    function col(title,items,cls){
      var h='<div class="preg-col '+cls+'"><h3 class="preg-col-title">'+title+'</h3>';
      items.forEach(function(i){h+='<div class="preg-item"><div class="preg-name">'+i.n+'</div><div class="preg-desc">'+i.d+'</div></div>';});
      return h+'</div>';
    }
    grid.innerHTML=col('Recommended During Pregnancy',rec,'preg-col-rec')+col('Avoid During Pregnancy',avoid,'preg-col-avoid');
  }

  function buildTravel(){
    var grid=$('#travelGrid');if(!grid)return;
    var items=[
      {n:'Hepatitis A',d:'Contaminated food/water. Most international destinations. 2-dose series.'},
      {n:'Hepatitis B',d:'Blood/body fluids. Medical procedures, tattoos, or sexual contact abroad. 3 doses.'},
      {n:'Typhoid',d:'South Asia, Africa, Latin America. Oral (4-dose) or injectable (1 dose). 2 weeks before travel.'},
      {n:'Yellow Fever',d:'Required for certain African/South American countries. Single dose, lifelong. Authorized centers only.'},
      {n:'Japanese Encephalitis',d:'Rural Asia and Western Pacific. 2-dose series, 1 week before travel.'},
      {n:'Rabies',d:'Developing countries with animal contact risk. Pre-exposure 2-dose series.'},
      {n:'Cholera',d:'Unsafe water/sanitation areas. Single oral dose (Vaxchora). 10 days before travel.'},
      {n:'Meningococcal',d:'Sub-Saharan Africa "meningitis belt" and Hajj pilgrimage. MenACWY.'},
      {n:'Polio',d:'Countries with active poliovirus. One lifetime adult booster if previously vaccinated.'},
      {n:'Tick-borne Encephalitis',d:'Forested areas of Europe and Asia. 3-dose series for hikers/campers.'}
    ];
    grid.innerHTML=items.map(function(i){
      return '<div class="card" style="border-left:3px solid var(--c-primary)"><div class="card-title" style="margin-bottom:6px">'+i.n+'</div><div class="card-body" style="margin-bottom:0">'+i.d+'</div></div>';
    }).join('');
  }

  function buildMpox(){
    var grid=$('#mpoxGrid');if(!grid)return;
    grid.innerHTML=
      '<div class="card"><div class="card-title" style="margin-bottom:8px">Vaccine: JYNNEOS</div><div class="card-body" style="margin-bottom:0">Live, attenuated, non-replicating orthopoxvirus vaccine. Approved for monkeypox and smallpox prevention. Commercially available in the U.S. since April 2024.</div></div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:8px">Schedule</div><div class="mpox-schedule"><div class="mpox-dose"><span class="mpox-dose-num">Dose 1</span><span class="mpox-dose-sub">0.5 mL subcut</span></div><div class="mpox-arrow">28 days</div><div class="mpox-dose"><span class="mpox-dose-num">Dose 2</span><span class="mpox-dose-sub">0.5 mL subcut</span></div></div><p style="margin-top:12px;font-size:13px;color:var(--c-text-secondary)">Alternative intradermal (0.1 mL) available for 18+ under EUA. Regimens interchangeable.</p></div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:8px">Who Should Be Vaccinated</div><ul class="card-detail" style="display:block;border:none;padding:0;margin:0 0 0 16px;color:var(--c-text)"><li>MSM, transgender/nonbinary people with recent sexual risk factors</li><li>Sexual partners of the above</li><li>People anticipating the above risk factors</li><li>Lab personnel working with orthopoxviruses</li><li>Travelers to affected countries with anticipated sexual contact risk</li></ul><p style="margin-top:8px;font-size:13px;color:var(--c-text-secondary)">Routine vaccination is <strong>not</strong> recommended for the general public.</p></div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:8px">Effectiveness</div><div class="mpox-stats"><div><span class="mpox-stat-num">75%</span><span class="mpox-stat-label">After 1 dose</span></div><div><span class="mpox-stat-num">86%</span><span class="mpox-stat-label">After 2 doses</span></div></div><p style="font-size:13px;color:var(--c-text-secondary)">Breakthrough after 2 doses: &lt;1%, typically milder. Peak immunity 14 days after dose 2. No waning observed for 5+ years.</p></div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:8px">Post-Exposure Prophylaxis</div><div class="card-body" style="margin-bottom:0">Ideally within <strong>4 days</strong> of exposure. 4-14 days may still help. No boosters recommended for the general population.</div></div>'
    + '<div class="card"><div class="card-title" style="margin-bottom:8px">Special Populations</div><ul class="card-detail" style="display:block;border:none;padding:0;margin:0 0 0 16px;color:var(--c-text)"><li><strong>Under 18:</strong> EUA, subcutaneous only</li><li><strong>Pregnant/breastfeeding:</strong> Shared clinical decision-making</li><li><strong>Immunocompromised:</strong> Standard 2-dose subcut series</li><li><strong>Prior smallpox vaccine:</strong> Still recommended</li></ul></div>';
  }

  /* ── Modal ──────────────────────────────────────────────────── */
  function openModal(v){
    var ov=$('#modalOverlay'),ct=$('#modalContent');
    var doses=Object.entries(v.schedule).map(function(e){
      var al=(AGE_COLS.find(function(a){return a.key===e[0];})||{}).label||e[0];
      return '<span class="card-chip" style="margin:2px">'+e[1].l+' | '+al+'</span>';
    }).join('');
    var cu=v.cu||v.cuO;var cuH='';
    if(cu){
      cuH='<p style="margin-top:16px"><strong>Catch-up guidance</strong></p><p style="margin-top:4px">Min age: <strong>'+cu.min+'</strong>'+(cu.minD?' ('+cu.minD+')':'')+'</p>'+renderCatchupLegend(cu,'cu-legend-modal')+'<ul style="margin:6px 0 0 16px">';
      cu.int.forEach(function(iv,i){cuH+='<li>Dose '+(i+1)+' to '+(i+2)+': <strong>'+iv.i+'</strong>'+(iv.d?' <span style="color:var(--c-text-secondary)">'+iv.d+'</span>':'')+'</li>';});
      cuH+='</ul>';
    }
    ct.innerHTML='<h3>'+v.name+' <span style="font-weight:400;opacity:.5">('+v.abbr+')</span></h3><p class="modal-sub">'+v.desc+'</p><div class="modal-body"><p><strong>Dose schedule</strong></p><div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0 16px">'+doses+'</div><p><strong>Clinical notes</strong><br>'+v.notes+'</p><p style="margin-top:12px"><strong>Contraindications</strong><br>'+v.contra+'</p>'+renderAgeDoseCaveat(v)+cuH+'</div>';
    ov.classList.add('is-open');ov.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    $('#modalClose').focus();
  }
  function closeModal(){
    var ov=$('#modalOverlay');ov.classList.remove('is-open');ov.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  function setupModal(){
    $('#modalClose').addEventListener('click',closeModal);
    $('#modalOverlay').addEventListener('click',function(e){if(e.target===this)closeModal();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
  }

  /* ── Navigation ─────────────────────────────────────────────── */
  function setupNav(){
    // Desktop dropdown — hover is handled by CSS, but also handle click on trigger
    var ddParent=$('#navDropdown');
    var ddTrigger=$('#navDdTrigger');
    if(ddTrigger){
      ddTrigger.addEventListener('click',function(e){
        e.preventDefault();
        var target=document.querySelector('#schedule');
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
    // Desktop dropdown links — smooth scroll to section
    $$('.nav-dd-link').forEach(function(link){
      link.addEventListener('click',function(e){
        e.preventDefault();
        if(ddParent) ddParent.classList.remove('is-open');
        var target=document.querySelector(link.getAttribute('href'));
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
    // Desktop tool links — normal <a> navigation, no JS needed

    // Mobile menu
    var overlay=$('#mobileNavOverlay');
    function closeMobileNav(){
      overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');
      $('#mobileMenuBtn').setAttribute('aria-expanded','false');document.body.style.overflow='';
    }
    $('#mobileMenuBtn').addEventListener('click',function(){
      overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');
      this.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';
    });
    $('#mobileNavClose').addEventListener('click',closeMobileNav);
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeMobileNav();});

    // Mobile anchor links (vaccine sections) — scroll + close
    $$('.mobile-nav-sub-grid a').forEach(function(link){
      link.addEventListener('click',function(e){
        var href=link.getAttribute('href');
        if(href && href.charAt(0)==='#'){
          e.preventDefault();closeMobileNav();
          var target=document.querySelector(href);
          if(target) setTimeout(function(){target.scrollIntoView({behavior:'smooth',block:'start'});},300);
        }
      });
    });
    // Mobile page links — just close the menu, let browser navigate
    $$('#mobileNavList > li > a').forEach(function(link){
      link.addEventListener('click',function(){closeMobileNav();});
    });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init(){
    buildTable();buildMobileCards();setupFilters();setupCatchupTabs();
    buildTimeline();buildCards();buildAdult();buildPregnancy();buildTravel();buildMpox();
    setupModal();setupNav();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
