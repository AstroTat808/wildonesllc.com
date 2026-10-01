(() => {
  const $=(sel)=>document.querySelector(sel);
  const $$=(sel)=>[...document.querySelectorAll(sel)];
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const state=(value)=>String(value||'UNKNOWN').toUpperCase();
  const scoreClass=(value)=>value<80?'qd-score-fail':value<90?'qd-score-low':'';

  function render(data){
    const release=state(data.release?.status);
    const card=$('[data-release-card]');
    card.dataset.state=release;
    $('[data-release-status]').textContent=release;
    $('[data-certified-at]').textContent='Snapshot '+new Date(data.generatedAt).toLocaleString();

    for(const key of ['performance','accessibility','bestPractices','seo']){
      const el=$('[data-score="'+key+'"]');
      const value=data.lighthouse?.[key];
      el.textContent=Number.isFinite(value)?value:'—';
      el.className=Number.isFinite(value)?scoreClass(value):'';
    }

    $('[data-run-number]').textContent='Run '+(data.source?.runNumber??'—');
    const lanes=[
      ['Static integrity',data.release?.static],
      ['Browser QA',data.release?.browser],
      ['Visual QA',data.release?.visual],
      ['Lighthouse',data.release?.lighthouse],
      ['Regression',data.visualRegression?.status]
    ];
    $('[data-lanes]').innerHTML=lanes.map(([label,value])=>'<div class="qd-lane" data-state="'+esc(state(value))+'"><span>'+esc(label)+'</span><strong>'+esc(state(value))+'</strong></div>').join('');

    const viewports=data.visual?.viewports||[];
    $('[data-viewports]').innerHTML=viewports.map((v)=>'<span class="qd-viewport">'+esc(v.name||v.width+'px')+' · '+esc(v.width)+'px</span>').join('')||'<span class="qd-viewport">No coverage data</span>';
    $('[data-visual-routes]').textContent=data.visual?.routes??'—';
    $('[data-visual-screenshots]').textContent=data.visual?.screenshots??'—';
    $('[data-visual-failures]').textContent=data.visual?.hardFailures??'—';

    const vr=data.visualRegression||{};
    $('[data-regression]').innerHTML='<div><strong>'+esc(state(vr.status))+'</strong><small>'+esc(vr.comparedScreenshots??0)+' screenshots compared · '+esc(vr.changedScreenshots??0)+' changed</small></div><span class="qd-chip">'+esc(vr.blockingScreenshots??0)+' blocking</span>';

    $('[data-static-pages]').textContent=data.static?.htmlPages??'—';
    $('[data-broken-links]').textContent=data.static?.brokenLinks??'—';
    $('[data-static-failures]').textContent=data.static?.failures??'—';
    $('[data-browser-passed]').textContent=data.browser?.passed??'—';
    $('[data-browser-failed]').textContent=data.browser?.failed??'—';

    const rows=data.lighthouse?.pages||[];
    $('[data-page-scores]').innerHTML=rows.map((row)=>{
      const cell=(v)=>'<td class="'+scoreClass(v)+'">'+(Number.isFinite(v)?v:'—')+'</td>';
      return '<tr><td>'+esc(row.url||'/')+'</td>'+cell(row.performance)+cell(row.accessibility)+cell(row.bestPractices)+cell(row.seo)+'</tr>';
    }).join('')||'<tr><td colspan="5">No page-level Lighthouse data available.</td></tr>';

    $('[data-source-commit]').textContent='Commit '+String(data.source?.commit||'—').slice(0,12);
    const run=$('[data-run-link]');
    if(data.source?.runUrl){run.href=data.source.runUrl}else{run.removeAttribute('href')}
  }

  fetch('assets/data/site-quality.json',{cache:'no-store'})
    .then((r)=>{if(!r.ok) throw new Error('Quality data unavailable'); return r.json();})
    .then(render)
    .catch((error)=>{
      $('[data-release-status]').textContent='DATA ERROR';
      $('[data-release-card]').dataset.state='NO-GO';
      $('[data-lanes]').innerHTML='<div class="qd-error">'+esc(error.message)+'</div>';
    });
})();
