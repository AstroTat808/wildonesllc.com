const board = document.querySelector('[data-site-map-board]');
if (board) {
  const detailTitle = document.querySelector('[data-zone-title]');
  const detailCopy = document.querySelector('[data-zone-copy]');
  const detailTags = document.querySelector('[data-zone-tags]');
  const copy = {
    stage:['Stage','Keep the primary performance position close to backstage and load-in while preserving audience sightlines and emergency circulation.',['Sightlines','Load-in','Power','Backstage']],
    ga:['GA / Audience','The main guest field should remain as contiguous as possible, with clean egress and direct access to services around the perimeter.',['Capacity','Egress','Sightlines','Water']],
    foh:['Front of House','FOH needs a protected line of sight to the stage plus practical audio, lighting and video cable paths that do not create trip hazards.',['Audio','Lighting','Video','Cable routes']],
    vip:['VIP','A controlled premium zone should have clear entry control, nearby beverage service and a sightline that does not compromise GA capacity.',['Access control','Bar','Sightline','Security']],
    bar:['Bars','Perimeter bar placement helps protect audience space and gives staff a restocking route that does not cut through the main crowd.',['Service','Restock','Queue','Water']],
    vendors:['Vendors','Keep food, merchandise and activations visible but outside critical guest-flow and production routes.',['Food','Merch','Power','Waste']],
    restrooms:['Restrooms','Restrooms should be accessible from GA without sending queues across entrance, FOH, load-in or emergency access.',['ADA','Queues','Lighting','Service']],
    backstage:['Backstage','Artist and crew support should connect to stage and load-in while remaining controlled from public access.',['Artists','Crew','Security','Stage access']],
    parking:['Parking','Final parking counts must be measured. Separate guest, staff, artist and production parking whenever feasible.',['Guest','Staff','Artist','Overflow']],
    entrance:['Entrance','Ticket scanning, security screening and wristband operations need enough queue area to prevent backups into parking or roadways.',['Ticketing','Search','Wristbands','Queue']],
    loadin:['Load-in','Production access should support the largest approved vehicle and remain segregated from public circulation during critical move-in periods.',['Trucks','Trailers','Schedule','Stage']],
    emergency:['Emergency access','Emergency and fire access must remain continuous, clearly marked and free of temporary structures, parked vehicles and crowd queues.',['Fire lane','Egress','No-build','Response']]
  };
  const select = (type) => {
    board.querySelectorAll('.zone').forEach((z) => { const selected=z.dataset.zone===type; z.classList.toggle('selected', selected); z.setAttribute('aria-pressed', String(selected)); });
    const d = copy[type] || copy.stage;
    detailTitle.textContent = d[0]; detailCopy.textContent = d[1]; detailTags.innerHTML = d[2].map((x)=>`<span>${x}</span>`).join('');
  };
  board.addEventListener('click', (e) => { const zone=e.target.closest('[data-zone]'); if(zone) select(zone.dataset.zone); });
  board.querySelectorAll('.zone').forEach((zone) => {
    zone.tabIndex = 0;
    zone.setAttribute('role', 'button');
    zone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(zone.dataset.zone);
      }
    });
  });
  document.querySelectorAll('[data-layer-toggle]').forEach((toggle) => toggle.addEventListener('change', () => {
    board.querySelectorAll(`[data-zone="${toggle.dataset.layerToggle}"]`).forEach((z)=>z.classList.toggle('zone-hidden',!toggle.checked));
  }));
  let drag=null;
  if (window.matchMedia('(pointer: fine)').matches && window.innerWidth > 700) {
  board.querySelectorAll('.zone:not(.loadin)').forEach((zone)=>{
    zone.addEventListener('pointerdown',(e)=>{ drag={zone,x:e.clientX,y:e.clientY,left:zone.offsetLeft,top:zone.offsetTop}; zone.setPointerCapture(e.pointerId); select(zone.dataset.zone); });
    zone.addEventListener('pointermove',(e)=>{ if(!drag||drag.zone!==zone) return; const rect=board.getBoundingClientRect(); const nx=Math.max(0,Math.min(rect.width-zone.offsetWidth,drag.left+(e.clientX-drag.x))); const ny=Math.max(0,Math.min(rect.height-zone.offsetHeight,drag.top+(e.clientY-drag.y))); zone.style.left=`${(nx/rect.width)*100}%`; zone.style.top=`${(ny/rect.height)*100}%`; });
    zone.addEventListener('pointerup',()=>{drag=null;});
  });
  }
  const defaults=[...board.querySelectorAll('.zone')].map((z)=>({el:z,left:z.style.left,top:z.style.top}));
  document.querySelector('[data-map-reset]')?.addEventListener('click',()=>{ defaults.forEach((d)=>{d.el.style.left=d.left;d.el.style.top=d.top;}); localStorage.removeItem('wildOnesMapLayout'); });
  document.querySelector('[data-map-save]')?.addEventListener('click',()=>{ const rows=[...board.querySelectorAll('.zone')].map((z)=>({t:z.dataset.zone,l:z.style.left,p:z.style.top,txt:z.querySelector('strong')?.textContent||''})); localStorage.setItem('wildOnesMapLayout',JSON.stringify(rows)); });
  try { const rows=JSON.parse(localStorage.getItem('wildOnesMapLayout')||'null'); if(Array.isArray(rows)){ const zones=[...board.querySelectorAll('.zone')]; rows.forEach((row,i)=>{ if(zones[i]){ zones[i].style.left=row.l; zones[i].style.top=row.p; } }); } } catch {}
  select('stage');
}