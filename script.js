// =============================================
//  EcoCalc – Script Principal
//  Config global → alumnes, any, millora,
//  inici/fi de període personalitzable
// =============================================

// ---- FACTORS ESTACIONALS (base mensual, índex 0=Gen … 11=Des) ----
const FACTORS = {
  electricitat: [1.20, 1.15, 1.00, 0.90, 0.85, 0.80, 0.95, 1.00, 0.90, 1.00, 1.10, 1.25],
  aigua:        [0.85, 0.80, 0.90, 0.95, 1.05, 1.10, 0.30, 0.25, 1.10, 1.05, 0.90, 0.85],
  consumibles:  [0.90, 0.85, 0.95, 1.00, 1.05, 1.10, 0.15, 0.10, 1.25, 1.20, 1.00, 0.95],
  neteja:       [1.00, 0.95, 1.00, 1.00, 1.05, 1.10, 0.40, 0.35, 1.10, 1.05, 1.00, 0.95],
};

const NOMS_MESOS = ['Gen','Feb','Mar','Abr','Mai','Jun','Jul','Ago','Set','Oct','Nov','Des'];
const MESOS_LLARGS = ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'];

// ---- CONFIG GLOBAL (estat reactiu) ----
const cfg = {
  alumnes: 350,
  any: 2025,
  millora: 0,      // % reducció ja aplicada
  ini: 8,          // setembre
  fi: 5,           // juny
  mode: 'custom',  // 'custom' | 'any'
};

// Mesos del període actiu (índexs)
function getMesosPeriode() {
  if (cfg.mode === 'any') return [0,1,2,3,4,5,6,7,8,9,10,11];
  const ini = cfg.ini, fi = cfg.fi;
  const mesos = [];
  let m = ini;
  for (let i = 0; i < 12; i++) {
    mesos.push(m % 12);
    if (m % 12 === fi) break;
    m++;
  }
  return mesos;
}

// ---- SYNC CONFIG ----
function syncConfig() {
  cfg.alumnes = parseInt(document.getElementById('cfg-alumnes').value) || 350;
  cfg.any     = parseInt(document.getElementById('cfg-any').value)     || 2025;
  cfg.millora = Math.min(100, Math.max(0, parseFloat(document.getElementById('cfg-millora').value) || 0));
  cfg.ini     = parseInt(document.getElementById('cfg-ini').value);
  cfg.fi      = parseInt(document.getElementById('cfg-fi').value);

  // Actualitzar slider i bubble
  document.getElementById('cfg-slider').value = cfg.millora;
  document.getElementById('slider-bubble').textContent = cfg.millora + '%';

  // Actualitzar resum pills
  document.getElementById('cs-alumnes').textContent = cfg.alumnes;
  document.getElementById('cs-any').textContent = cfg.any;
  document.getElementById('cs-millora').textContent = cfg.millora + '%';
  document.getElementById('millora-pct-display').textContent = cfg.millora + '%';

  // Preview periode
  const mesos = getMesosPeriode();
  const labelIni = NOMS_MESOS[mesos[0]];
  const labelFi  = NOMS_MESOS[mesos[mesos.length - 1]];
  const numM = mesos.length;
  const previewText = cfg.mode === 'any'
    ? 'Any complet (12 mesos)'
    : `${labelIni} → ${labelFi} (${numM} mes${numM !== 1 ? 'os' : ''})`;
  document.getElementById('periode-preview').textContent = previewText;
  document.getElementById('cs-periode').textContent = cfg.mode === 'any'
    ? 'Any complet'
    : `${labelIni}–${labelFi} (${numM}m)`;

  // Cronograma anys
  const y = cfg.any;
  document.getElementById('crono-y1').textContent = y;
  document.getElementById('crono-y2').textContent = y + 1;
  document.getElementById('crono-y3').textContent = y + 2;
  document.getElementById('kpi-any-final').textContent = y + 2;
}

function syncSlider() {
  const v = parseFloat(document.getElementById('cfg-millora').value) || 0;
  document.getElementById('cfg-slider').value = v;
  document.getElementById('slider-bubble').textContent = v + '%';
}

function syncFromSlider() {
  const v = document.getElementById('cfg-slider').value;
  document.getElementById('cfg-millora').value = v;
  document.getElementById('slider-bubble').textContent = v + '%';
  syncConfig();
}

function setMode(mode) {
  cfg.mode = mode;
  document.getElementById('tgl-custom').classList.toggle('active', mode === 'custom');
  document.getElementById('tgl-any').classList.toggle('active', mode === 'any');
  // Disable selectors when full year
  document.getElementById('cfg-ini').disabled = (mode === 'any');
  document.getElementById('cfg-fi').disabled  = (mode === 'any');
  syncConfig();
}

// ---- HELPERS ---- 
function fmt(num, dec = 0) {
  return num.toFixed(dec).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function sumArr(arr) { return arr.reduce((a,b) => a+b, 0); }

function calcValorsMensuals(tipusKey, mensual, creixement) {
  const mesos = getMesosPeriode();
  const fc = 1 + creixement / 100;
  const fMillora = 1 - cfg.millora / 100;
  // Factor per alumnes: normalitzat a base 350
  const fAlumnes = cfg.alumnes / 350;
  const factors = FACTORS[tipusKey];
  return mesos.map(m => mensual * factors[m] * fc * fMillora * fAlumnes);
}

// ---- RENDER RESULTAT ----
function renderResultat(id, num, unit, label, stats) {
  const el = document.getElementById(id);
  el.innerHTML = `
    <div class="result-inner">
      <h4>${label}</h4>
      <div class="result-big">
        <span class="result-num">${fmt(num)}</span>
        <span class="result-unit">${unit}</span>
      </div>
      <div class="result-stats">
        ${stats.map(s => `
          <div class="stat-row">
            <span class="stat-label">${s.label}</span>
            <span class="stat-val">${s.val}</span>
          </div>`).join('')}
      </div>
    </div>
  `;
  // Guardar per export
  const clau = id.replace('result-', '');
  dadesCalculades[clau] = { num, unit, label, stats };
  actualitzarEstatExport();
}

// ---- RENDER CHART ----
function renderChart(id, valors, labels) {
  const el = document.getElementById(id);
  const maxV = Math.max(...valors);
  el.innerHTML = valors.map((v, i) => `
    <div class="bar-wrap">
      <span class="bar-val">${fmt(v, 0)}</span>
      <div class="bar" style="height:${Math.max(6,(v/maxV)*85)}px"
           title="${labels[i]}: ${fmt(v)}"></div>
      <span class="bar-label">${labels[i]}</span>
    </div>`).join('');
}

// ============================================
//  CALCULADORA UNIFICADA
// ============================================
function calcular(tipus) {
  const mesos = getMesosPeriode();
  const labels = mesos.map(m => NOMS_MESOS[m]);
  const periodeLabel = cfg.mode === 'any'
    ? `Any ${cfg.any} (12 mesos)`
    : `${NOMS_MESOS[mesos[0]]}–${NOMS_MESOS[mesos[mesos.length-1]]} ${cfg.any} (${mesos.length}m)`;

  if (tipus === 'electricitat') {
    const mensual   = parseFloat(document.getElementById('elec-mensual').value)    || 0;
    const creixement= parseFloat(document.getElementById('elec-creixement').value) || 0;
    const valors    = calcValorsMensuals('electricitat', mensual, creixement);
    const total     = sumArr(valors);
    renderResultat('result-electricitat', total, 'kWh', `⚡ Electricitat · ${periodeLabel}`, [
      { label: 'Mes màxim', val: fmt(Math.max(...valors)) + ' kWh' },
      { label: 'Mes mínim', val: fmt(Math.min(...valors)) + ' kWh' },
      { label: 'Mitjana mensual', val: fmt(total / valors.length) + ' kWh' },
      { label: 'Cost (~0,18€/kWh)', val: fmt(total * 0.18) + ' €' },
      { label: `CO₂ (~0,3kg/kWh)`, val: fmt(total * 0.3 / 1000, 2) + ' t' },
      { label: 'Alumnes / personal', val: cfg.alumnes + ' persones' },
      { label: 'Millora aplicada', val: cfg.millora + '%' },
    ]);
    renderChart('chart-electricitat', valors, labels);

  } else if (tipus === 'aigua') {
    const mensual   = parseFloat(document.getElementById('aigua-mensual').value)    || 0;
    const creixement= parseFloat(document.getElementById('aigua-creixement').value) || 0;
    const valors    = calcValorsMensuals('aigua', mensual, creixement);
    const total     = sumArr(valors);
    renderResultat('result-aigua', total, 'm³', `💧 Aigua · ${periodeLabel}`, [
      { label: 'Mes màxim', val: fmt(Math.max(...valors)) + ' m³' },
      { label: 'Mes mínim', val: fmt(Math.min(...valors)) + ' m³' },
      { label: 'Mitjana mensual', val: fmt(total / valors.length) + ' m³' },
      { label: 'Cost (~2,5€/m³)', val: fmt(total * 2.5) + ' €' },
      { label: 'Litres totals', val: fmt(total * 1000) + ' L' },
      { label: 'Alumnes / personal', val: cfg.alumnes + ' persones' },
      { label: 'Millora aplicada', val: cfg.millora + '%' },
    ]);
    renderChart('chart-aigua', valors, labels);

  } else if (tipus === 'consumibles') {
    const mensual   = parseFloat(document.getElementById('cons-mensual').value)    || 0;
    const paper     = parseFloat(document.getElementById('cons-paper').value)      || 0;
    const creixement= parseFloat(document.getElementById('cons-creixement').value) || 0;
    const valors    = calcValorsMensuals('consumibles', mensual, creixement);
    const paperVal  = calcValorsMensuals('consumibles', paper, creixement);
    const total     = sumArr(valors);
    const totalPaper= sumArr(paperVal);
    renderResultat('result-consumibles', total, '€', `📄 Consumibles · ${periodeLabel}`, [
      { label: 'Mes de major activitat', val: fmt(Math.max(...valors)) + ' €' },
      { label: 'Mes de menor activitat', val: fmt(Math.min(...valors)) + ' €' },
      { label: 'Mitjana mensual', val: fmt(total / valors.length) + ' €' },
      { label: 'Resmes de paper', val: fmt(totalPaper, 1) + ' resmes' },
      { label: 'Fulls (~500/resma)', val: fmt(totalPaper * 500) + ' fulls' },
      { label: 'Alumnes / personal', val: cfg.alumnes + ' persones' },
      { label: 'Millora aplicada', val: cfg.millora + '%' },
    ]);
    renderChart('chart-consumibles', valors, labels);

  } else if (tipus === 'neteja') {
    const mensual   = parseFloat(document.getElementById('neteja-mensual').value)  || 0;
    const litres    = parseFloat(document.getElementById('neteja-litres').value)   || 0;
    const creixement= parseFloat(document.getElementById('neteja-creixement').value) || 0;
    const valors    = calcValorsMensuals('neteja', mensual, creixement);
    const litresVal = calcValorsMensuals('neteja', litres, creixement);
    const total     = sumArr(valors);
    const totalL    = sumArr(litresVal);
    renderResultat('result-neteja', total, '€', `🧹 Neteja · ${periodeLabel}`, [
      { label: 'Mes de major consum', val: fmt(Math.max(...valors)) + ' €' },
      { label: 'Mes de menor consum', val: fmt(Math.min(...valors)) + ' €' },
      { label: 'Mitjana mensual', val: fmt(total / valors.length) + ' €' },
      { label: 'Litres de producte', val: fmt(totalL, 1) + ' L' },
      { label: 'Envasos 5L (~)', val: Math.ceil(totalL / 5) + ' envasos' },
      { label: 'Alumnes / personal', val: cfg.alumnes + ' persones' },
      { label: 'Millora aplicada', val: cfg.millora + '%' },
    ]);
    renderChart('chart-neteja', valors, labels);
  }
}

// ============================================
//  CALCULADORA DE MILLORES
// ============================================
function calcularMillora() {
  const elec   = parseFloat(document.getElementById('m-elec').value)   || 0;
  const aigua  = parseFloat(document.getElementById('m-aigua').value)  || 0;
  const cons   = parseFloat(document.getElementById('m-cons').value)   || 0;
  const neteja = parseFloat(document.getElementById('m-neteja').value) || 0;

  const pct = cfg.millora / 100;
  const factor = 1 - pct;

  const elecNou   = elec   * factor;
  const aiguaNou  = aigua  * factor;
  const consNou   = cons   * factor;
  const netejaНou = neteja * factor;

  const estalviElec   = (elec   - elecNou)   * 0.18;
  const estalviAigua  = (aigua  - aiguaNou)  * 2.5;
  const estalviCons   = cons   - consNou;
  const estalviNeteja = neteja - netejaНou;
  const estalviTotal  = estalviElec + estalviAigua + estalviCons + estalviNeteja;

  const el = document.getElementById('result-millora');
  el.classList.remove('hidden');

  if (cfg.millora === 0) {
    el.innerHTML = `<h4>⚠️ La millora configurada és 0%. Ajusta el percentatge a la <a href="#configuracio" class="link-cfg">Configuració Global</a>.</h4>`;
    return;
  }

  el.innerHTML = `
    <h4>✅ Resultats amb −${cfg.millora}% de millora aplicada</h4>
    <div class="millora-grid">
      <div class="millora-item">
        <span class="millora-icon">⚡</span>
        <span class="millora-label">Electricitat</span>
        <span class="millora-before">${fmt(elec)} kWh</span>
        <span class="millora-after">${fmt(elecNou)} kWh</span>
        <span class="badge badge-green">−${fmt(elec - elecNou)} kWh</span>
      </div>
      <div class="millora-item">
        <span class="millora-icon">💧</span>
        <span class="millora-label">Aigua</span>
        <span class="millora-before">${fmt(aigua)} m³</span>
        <span class="millora-after">${fmt(aiguaNou)} m³</span>
        <span class="badge badge-green">−${fmt(aigua - aiguaNou)} m³</span>
      </div>
      <div class="millora-item">
        <span class="millora-icon">📄</span>
        <span class="millora-label">Consumibles</span>
        <span class="millora-before">${fmt(cons)} €</span>
        <span class="millora-after">${fmt(consNou)} €</span>
        <span class="badge badge-green">−${fmt(cons - consNou)} €</span>
      </div>
      <div class="millora-item">
        <span class="millora-icon">🧹</span>
        <span class="millora-label">Neteja</span>
        <span class="millora-before">${fmt(neteja)} €</span>
        <span class="millora-after">${fmt(netejaНou)} €</span>
        <span class="badge badge-green">−${fmt(neteja - netejaНou)} €</span>
      </div>
      <div class="millora-item" style="background:linear-gradient(135deg,rgba(61,186,120,0.15),rgba(168,237,207,0.25));border:1px solid rgba(61,186,120,0.3)">
        <span class="millora-icon">💰</span>
        <span class="millora-label">Estalvi econòmic</span>
        <span class="millora-before">Inversió ~${fmt(estalviTotal * 1.2)} €</span>
        <span class="millora-after">${fmt(estalviTotal)} €/any</span>
        <span class="badge badge-green">Retorn ~1 any</span>
      </div>
      <div class="millora-item" style="background:linear-gradient(135deg,rgba(91,184,245,0.15),rgba(62,207,207,0.2));border:1px solid rgba(91,184,245,0.3)">
        <span class="millora-icon">🌍</span>
        <span class="millora-label">CO₂ evitat</span>
        <span class="millora-before">Actual: ${fmt(elec * 0.3/1000, 2)} t CO₂</span>
        <span class="millora-after">${fmt(elecNou * 0.3/1000, 2)} t CO₂</span>
        <span class="badge badge-blue">−${fmt((elec-elecNou)*0.3/1000,2)} t CO₂</span>
      </div>
    </div>
  `;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
//  TABS
// ============================================
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================
//  EXPORTACIÓ
// ============================================
const dadesCalculades = { electricitat: null, aigua: null, consumibles: null, neteja: null };

function actualitzarEstatExport() {
  const n = Object.values(dadesCalculades).filter(Boolean).length;
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!dot || !text) return;
  if (n === 0)      { dot.className = 'status-dot dot-red';    text.textContent = 'Cap càlcul realitzat'; }
  else if (n < 4)   { dot.className = 'status-dot dot-orange'; text.textContent = `${n} de 4 indicadors calculats`; }
  else              { dot.className = 'status-dot dot-green';  text.textContent = 'Tots els indicadors calculats ✓'; }
}

function getDadesMensualsPer(tipus) {
  const mesos  = getMesosPeriode();
  const labels = mesos.map(m => NOMS_MESOS[m]);
  const configs = {
    electricitat: { id: 'elec-mensual',    cr: 'elec-creixement',    unit: 'kWh' },
    aigua:        { id: 'aigua-mensual',   cr: 'aigua-creixement',   unit: 'm³'  },
    consumibles:  { id: 'cons-mensual',    cr: 'cons-creixement',    unit: '€'   },
    neteja:       { id: 'neteja-mensual',  cr: 'neteja-creixement',  unit: '€'   },
  };
  const c = configs[tipus];
  const mensual    = parseFloat(document.getElementById(c.id).value) || 0;
  const creixement = parseFloat(document.getElementById(c.cr).value) || 0;
  const valors     = calcValorsMensuals(tipus, mensual, creixement);
  return { valors, labels, unit: c.unit, mesos };
}

// ---- EXPORT PDF ----
function exportarPDF() {
  const calculats = Object.entries(dadesCalculades).filter(([,v]) => v !== null);
  if (calculats.length === 0) { alert('Primer has de calcular almenys un indicador!'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ara = new Date();

  const BLAU  = [26,122,181];
  const TEAL  = [62,207,207];
  const BLANC = [255,255,255];
  const FOSC  = [26,58,82];
  const GRIS  = [100,144,168];

  const COLOR_IND = {
    electricitat:[91,184,245], aigua:[62,207,207],
    consumibles:[168,207,120], neteja:[122,167,204],
  };

  // ---- PORTADA ----
  doc.setFillColor(214,240,255); doc.rect(0,0,W,H,'F');
  doc.setFillColor(184,228,249); doc.rect(0,H*0.45,W,H*0.55,'F');
  doc.setFillColor(...TEAL); doc.setGState(new doc.GState({opacity:0.12}));
  doc.circle(175,45,65,'F');
  doc.setFillColor(...BLAU); doc.circle(15,225,75,'F');
  doc.setGState(new doc.GState({opacity:1}));

  doc.setFillColor(...TEAL); doc.roundedRect(18,32,60,9,4,4,'F');
  doc.setTextColor(...BLANC); doc.setFontSize(7); doc.setFont('helvetica','bold');
  doc.text('FASE 3 · ANÀLISI ENERGÈTICA', 48,38,{align:'center'});

  doc.setTextColor(...FOSC); doc.setFontSize(34); doc.setFont('helvetica','bold');
  doc.text('EcoCalc', 18,66);
  doc.setFontSize(15); doc.setFont('helvetica','normal');
  doc.setTextColor(...GRIS);
  doc.text('Calculadora Energètica', 18,76);
  doc.text(`Any de projecció: ${cfg.any}  ·  ${cfg.alumnes} alumnes/personal`, 18,84);

  doc.setDrawColor(...TEAL); doc.setLineWidth(0.8); doc.line(18,92,105,92);

  doc.setFontSize(9); doc.setTextColor(...GRIS);
  doc.text(`Informe generat: ${ara.toLocaleDateString('ca-ES',{day:'2-digit',month:'long',year:'numeric'})}`, 18,100);
  if (cfg.millora > 0) doc.text(`Millora aplicada: ${cfg.millora}%`, 18,107);

  // Resum indicadors
  const boxY = cfg.millora > 0 ? 114 : 107;
  doc.setFillColor(255,255,255); doc.setGState(new doc.GState({opacity:0.55}));
  doc.roundedRect(16,boxY, W-32, calculats.length*14+18,6,6,'F');
  doc.setGState(new doc.GState({opacity:1}));
  doc.setFontSize(8.5); doc.setFont('helvetica','bold'); doc.setTextColor(...FOSC);
  doc.text('INDICADORS CALCULATS', 24, boxY+10);

  calculats.forEach(([clau,dades],i) => {
    const iy = boxY+18+i*14;
    const col = COLOR_IND[clau];
    doc.setFillColor(...col); doc.setGState(new doc.GState({opacity:0.12}));
    doc.roundedRect(18,iy-4,W-36,11,3,3,'F');
    doc.setGState(new doc.GState({opacity:1}));
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...FOSC);
    doc.text(dades.label.replace(/[⚡💧📄🧹]/g,'').trim(), 24, iy+3);
    doc.setFont('helvetica','bold'); doc.setTextColor(...BLAU);
    doc.text(`${fmt(dades.num)} ${dades.unit}`, W-24, iy+3, {align:'right'});
  });

  doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS);
  doc.text('Projecte de Sostenibilitat Educativa · EcoCalc', W/2, H-14, {align:'center'});

  // ---- PÀGINES PER INDICADOR ----
  calculats.forEach(([clau,dades]) => {
    doc.addPage();
    const col = COLOR_IND[clau];
    doc.setFillColor(...col); doc.rect(0,0,W,28,'F');
    doc.setFillColor(255,255,255); doc.setGState(new doc.GState({opacity:0.12}));
    doc.circle(W-18,14,28,'F'); doc.setGState(new doc.GState({opacity:1}));
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text(clau.toUpperCase(), 14,17);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(dades.label.replace(/[⚡💧📄🧹]/g,'').trim(), 14,24);

    doc.setFillColor(255,255,255); doc.roundedRect(W-66,4,53,21,5,5,'F');
    doc.setFontSize(17); doc.setFont('helvetica','bold'); doc.setTextColor(...col);
    doc.text(fmt(dades.num), W-39.5,17,{align:'center'});
    doc.setFontSize(7); doc.setTextColor(...GRIS);
    doc.text(dades.unit, W-39.5,23,{align:'center'});

    let y = 36;
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...FOSC);
    doc.text('Estadístiques principals', 14, y); y += 5;

    doc.autoTable({
      startY: y,
      head:[['Indicador','Valor']],
      body: dades.stats.map(s=>[s.label,s.val]),
      theme:'plain',
      styles:{fontSize:8.8,cellPadding:3,textColor:FOSC},
      headStyles:{fillColor:col,textColor:BLANC,fontStyle:'bold',fontSize:8.5},
      alternateRowStyles:{fillColor:[240,250,255]},
      columnStyles:{0:{cellWidth:100},1:{cellWidth:60,halign:'right',fontStyle:'bold'}},
      margin:{left:14,right:14},
    });

    y = doc.lastAutoTable.finalY + 10;
    const mens = getDadesMensualsPer(clau);
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...FOSC);
    doc.text('Distribució mensual prevista', 14, y); y += 5;

    const total = sumArr(mens.valors);
    doc.autoTable({
      startY: y,
      head:[['Mes',`Valor (${mens.unit})','% sobre total`]],
      body: mens.valors.map((v,i)=>[mens.labels[i], fmt(v,1), ((v/total)*100).toFixed(1)+'%']),
      foot:[['TOTAL', fmt(total,1), '100%']],
      theme:'striped',
      styles:{fontSize:8.5,cellPadding:2.5,textColor:FOSC},
      headStyles:{fillColor:col,textColor:BLANC,fontStyle:'bold'},
      footStyles:{fillColor:FOSC,textColor:BLANC,fontStyle:'bold'},
      columnStyles:{0:{cellWidth:30},1:{halign:'right'},2:{halign:'right'}},
      margin:{left:14,right:14},
    });

    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS);
    doc.text('EcoCalc · Informe Energètic', 14, H-8);
    doc.text(`Pàg. ${doc.getCurrentPageInfo().pageNumber}`, W-14, H-8,{align:'right'});
    doc.setDrawColor(...col); doc.setLineWidth(0.3); doc.line(14,H-11,W-14,H-11);
  });

  doc.save(`EcoCalc_Informe_${ara.toISOString().slice(0,10)}.pdf`);
}

// ---- EXPORT EXCEL ----
function exportarExcel() {
  const calculats = Object.entries(dadesCalculades).filter(([,v]) => v !== null);
  if (calculats.length === 0) { alert('Primer has de calcular almenys un indicador!'); return; }

  const wb = XLSX.utils.book_new();
  const ara = new Date();

  // Pestanya CONFIG
  const cfgData = [
    ['EcoCalc · Configuració Global'],
    [],
    ['Paràmetre','Valor'],
    ['Any de projecció', cfg.any],
    ['Alumnes / personal', cfg.alumnes],
    ['Millora aplicada (%)', cfg.millora],
    ['Mode de període', cfg.mode === 'any' ? 'Any complet' : 'Personalitzat'],
    ['Mes d\'inici', MESOS_LLARGS[cfg.ini]],
    ['Mes de fi', MESOS_LLARGS[cfg.fi]],
    ['Nombre de mesos', getMesosPeriode().length],
    [],
    ['Data de l\'informe', ara.toLocaleDateString('ca-ES')],
  ];
  const wsConfig = XLSX.utils.aoa_to_sheet(cfgData);
  wsConfig['!cols'] = [{wch:28},{wch:20}];
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configuració');

  // Pestanya RESUM
  const resumData = [
    ['EcoCalc · Resum de Resultats'],
    [`Any: ${cfg.any}  ·  Alumnes: ${cfg.alumnes}  ·  Millora: ${cfg.millora}%`],
    [],
    ['INDICADOR','TOTAL','UNITAT','MESOS'],
  ];
  calculats.forEach(([clau,dades]) => {
    resumData.push([dades.label.replace(/[⚡💧📄🧹]/g,'').trim(), parseFloat(dades.num.toFixed(2)), dades.unit, getMesosPeriode().length]);
  });
  resumData.push([],[' ESTADÍSTIQUES']);
  calculats.forEach(([,dades]) => {
    resumData.push([]);
    resumData.push([dades.label.replace(/[⚡💧📄🧹]/g,'').trim()]);
    dades.stats.forEach(s => resumData.push(['  '+s.label, s.val]));
  });
  const wsResum = XLSX.utils.aoa_to_sheet(resumData);
  wsResum['!cols'] = [{wch:40},{wch:18},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsResum, 'Resum');

  // Una pestanya per indicador
  calculats.forEach(([clau,dades]) => {
    const mens  = getDadesMensualsPer(clau);
    const total = sumArr(mens.valors);
    const maxV  = Math.max(...mens.valors);

    const wsData = [
      [dades.label.replace(/[⚡💧📄🧹]/g,'').trim()],
      [`Any: ${cfg.any}  ·  Alumnes: ${cfg.alumnes}  ·  Millora: ${cfg.millora}%`],
      [`Total: ${fmt(dades.num)} ${dades.unit}  ·  Mesos: ${mens.valors.length}`],
      [],
      ['MES',`VALOR (${mens.unit})`,'% SOBRE TOTAL','% SOBRE MÀXIM'],
      ...mens.valors.map((v,i)=>[
        mens.labels[i],
        parseFloat(v.toFixed(2)),
        parseFloat(((v/total)*100).toFixed(2)),
        parseFloat(((v/maxV)*100).toFixed(2)),
      ]),
      [],
      ['TOTAL', parseFloat(total.toFixed(2)),'100',''],
      ['MÀXIM', parseFloat(maxV.toFixed(2)),'',''],
      ['MÍNIM', parseFloat(Math.min(...mens.valors).toFixed(2)),'',''],
      ['MITJANA', parseFloat((total/mens.valors.length).toFixed(2)),'',''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:14},{wch:18},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws, clau.charAt(0).toUpperCase()+clau.slice(1));
  });

  // Pestanya millores
  const elec   = parseFloat(document.getElementById('m-elec').value)   || 0;
  const aig    = parseFloat(document.getElementById('m-aigua').value)  || 0;
  const con    = parseFloat(document.getElementById('m-cons').value)   || 0;
  const net    = parseFloat(document.getElementById('m-neteja').value) || 0;
  const pct    = cfg.millora / 100;

  const milloraData = [
    [`Pla de Reducció · Millora: ${cfg.millora}%`],
    [],
    ['INDICADOR','VALOR ACTUAL','OBJECTIU','REDUCCIÓ','ESTALVI'],
  ];
  if (elec) milloraData.push(['Electricitat (kWh)', elec, parseFloat((elec*(1-pct)).toFixed(1)), parseFloat((elec*pct).toFixed(1)), fmt(elec*pct*0.18)+' €']);
  if (aig)  milloraData.push(['Aigua (m³)', aig, parseFloat((aig*(1-pct)).toFixed(1)), parseFloat((aig*pct).toFixed(1)), fmt(aig*pct*2.5)+' €']);
  if (con)  milloraData.push(['Consumibles (€)', con, parseFloat((con*(1-pct)).toFixed(1)), parseFloat((con*pct).toFixed(1)), fmt(con*pct)+' €']);
  if (net)  milloraData.push(['Neteja (€)', net, parseFloat((net*(1-pct)).toFixed(1)), parseFloat((net*pct).toFixed(1)), fmt(net*pct)+' €']);
  milloraData.push([],['CRONOGRAMA']);
  milloraData.push([`Any 1 (${cfg.any})`,   'Diagnosi i accions immediates','Objectiu: −10%']);
  milloraData.push([`Any 2 (${cfg.any+1})`, 'Inversions i optimització',    'Objectiu: −20%']);
  milloraData.push([`Any 3 (${cfg.any+2})`, 'Consolidació economia circular','Objectiu: −30%']);

  const wsM = XLSX.utils.aoa_to_sheet(milloraData);
  wsM['!cols'] = [{wch:22},{wch:16},{wch:16},{wch:14},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsM, 'Pla Millores');

  XLSX.writeFile(wb, `EcoCalc_Dades_${ara.toISOString().slice(0,10)}.xlsx`);
}

// ============================================
//  INIT
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  syncConfig();
  // Charts inicials (factors estacionals)
  ['electricitat','aigua','consumibles','neteja'].forEach(t => {
    const labels = Array.from({length:12},(_,i)=>NOMS_MESOS[i]);
    renderChart(`chart-${t}`, FACTORS[t].map(f=>f*100), labels);
  });
  actualitzarEstatExport();
});