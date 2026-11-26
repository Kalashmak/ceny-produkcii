'use strict';
/* Оболочка «Цены на продукцию»: главная, разделы (цены, калькуляции, расценки цехов), общая копия, автообновление.
   Разделы — отдельные страницы во фреймах: у каждого свои данные в хранилище браузера, связь — через него же. */
const APP_VERSION = /*__VERSION__*/0;
const APP_BUILT = /*__BUILT__*/'';
const DEFAULT_UPDATE_URL = /*__UPDATE_URL__*/'';
const THEME = /*__THEME__*/'';
const TPL = /*__TPL__*/{};
const SEEDS = window.__SEEDS;

const SECTIONS = [
  {id:'home', name:'Главная', icon:'home'},
  {id:'price', name:'Цены', icon:'tag', frame:'price', tab:'prod'},
  {id:'calc', name:'Калькуляции', icon:'calc', frame:'c2', tab:'calc'},
  {id:'c1', name:'Расценки цех 1', icon:'factory', frame:'c1', tab:'rates'},
  {id:'c2', name:'Расценки цех 2', icon:'factory', frame:'c2', tab:'rates'},
];
const ICON = {
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  tag:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.6"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
  factory:'<path d="M3 21V10l6 4V10l6 4V6l6 3v12z"/><path d="M7 18h2M11 18h2M15 18h2"/>',
  save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  alert:'<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h0"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  ok:'<path d="M5 12l5 5L20 7"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  work:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const ico=(n,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=(x,d=0)=>x==null||!isFinite(x)?'—':x.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const fd=s=>s?String(s).slice(0,10).split('-').reverse().join('.'):'—';
function plural(n,a,b,c){ n=Math.abs(n)%100; const m=n%10; return n>10&&n<20?c:m>1&&m<5?b:m===1?a:c; }
const LS={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}},del:k=>{try{localStorage.removeItem(k);}catch(e){}}};

/* ---------- каркас ---------- */
document.title='Цены на продукцию';
document.head.insertAdjacentHTML('beforeend',`<style>${THEME}${SHELL_CSS()}</style>`);
document.body.innerHTML=`
<div class="top"><div class="brand"><span class="logo">₽</span><span><b>Цены на продукцию</b><small>цех 1 · цех 2 · калькуляции</small></span></div>
  <nav class="sec" id="sec"></nav>
  <div class="tools"><button class="tbtn" id="t_user" title="Пользователь">${ico('user',16)}<span id="t_username">вход…</span></button><button class="tbtn" id="t_upd" title="Обновления">${ico('up',16)}<span id="t_updt">v${APP_VERSION}</span></button>
  <button class="tbtn" onclick="backupAll()" title="Сохранить копию всех данных">${ico('save',16)}<span>Копия</span></button>
  <button class="tbtn icon" onclick="dlgSettings()" title="Настройки программы">${ico('gear',16)}</button></div></div>
<div id="notice"></div>
<section id="home" class="home"></section>
<div id="frames"></div>
<dialog id="sdlg"></dialog><div id="login" hidden></div>`;
document.getElementById('boot')?.remove();

const FR={};
function frameHtml(id){
  let h=TPL[id];
  const seed=JSON.stringify(SEEDS[id]);
  h=h.replace('/*__SEED__*/null',()=>seed);
  if(id==='c2') h=h.replace('/*__SHOP1__*/null',()=>JSON.stringify(SEEDS.c1));
  return h;
}
for(const id of ['price','c1','c2']){
  const f=document.createElement('iframe'); f.className='fr'; f.title=id; f.srcdoc=frameHtml(id); f.hidden=true;
  f.addEventListener('load',()=>{ FR[id].ready=true; refresh(); });
  document.getElementById('frames').appendChild(f); FR[id]={el:f,ready:false};
}
const api=id=>{ try{ return FR[id].ready? FR[id].el.contentWindow.__api : null; }catch(e){ return null; } };

let cur=(location.hash||'#home').slice(1); if(!SECTIONS.some(s=>s.id===cur)) cur='home';
function show(id, tab){
  cur=id; history.replaceState(null,'','#'+id);
  const s=SECTIONS.find(x=>x.id===id);
  document.getElementById('home').hidden=id!=='home'; document.getElementById('frames').hidden=id==='home';
  for(const k in FR) FR[k].el.hidden=!(s.frame===k);
  if(s.frame){ const a=api(s.frame); if(a) a.go(tab||s.tab); else FR[s.frame].el.addEventListener('load',()=>api(s.frame)?.go(tab||s.tab),{once:true}); }
  navRender(); if(id==='home') homeRender();
}
function navRender(){
  const ps=api('price')?.stats(), c1=api('c1')?.stats(), c2=api('c2')?.stats();
  const badge={price:ps?(ps.err+(ps.zpt?.n?1:0)):0, calc:c2?c2.calcErr:0, c1:c1?c1.err:0, c2:c2?c2.rateErr:0};
  document.getElementById('sec').innerHTML=SECTIONS.map(s=>`<button class="${cur===s.id?'on':''}" onclick="show('${s.id}')">${ico(s.icon,17)}<span>${s.name}</span>${badge[s.id]?`<i class="dot"></i>`:''}</button>`).join('');
}

/* ---------- главная ---------- */
function homeRender(){
  const h=document.getElementById('home'); if(h.hidden) return;
  const ps=api('price')?.stats(), c1=api('c1')?.stats(), c2=api('c2')?.stats();
  if(!ps||!c1||!c2){ h.innerHTML=`<div class="wrap"><div class="loading">Открываю данные…</div></div>`; return; }
  const att=[];
  if(ps.zpt&&ps.zpt.n) att.push({k:'warn',icon:'up',t:`Пересмотрите цены: ${ps.zpt.n} ${plural(ps.zpt.n,'изделие','изделия','изделий')}`,d:`Материал или калькуляция изменились больше порога из Параметров${ps.zpt.med!=null?`; себестоимость изменится в среднем на ${nf(ps.zpt.med,1)}%`:''}${ps.zpt.low?`. У ${ps.zpt.low} наценка упадёт ниже порога`:''}. Цены в изделиях не менялись.`,b:'Посмотреть',a:"show('price');api('price').openZpt()"});
  if(ps.loss) att.push({k:'err',icon:'alert',t:`Цена со скидкой ниже себестоимости: ${ps.loss} ${plural(ps.loss,'изделие','изделия','изделий')}`,d:'Каждое такое изделие продаётся в убыток.',b:'Показать',a:"show('price');api('price').filter('err')"});
  if(ps.low) att.push({k:'warn',icon:'alert',t:`Наценка ниже ${ps.minMargin}%: ${ps.low} ${plural(ps.low,'изделие','изделия','изделий')}`,d:'Цена со скидкой едва покрывает себестоимость.',b:'Показать',a:"show('price');api('price').filter('low')"});
  const rateErr=c1.err+c2.rateErr; if(rateErr) att.push({k:'err',icon:'alert',t:`Ошибки в расценках: ${rateErr}`,d:'Расценки с ошибками в калькуляции попадают неверно.',b:'Проверка',a:c1.err?"show('c1','chk')":"show('c2','chk')"});
  if(c2.calcErr) att.push({k:'err',icon:'alert',t:`Ошибки в калькуляциях: ${c2.calcErr}`,d:'Например, «?» вместо расценки или пустое количество.',b:'Проверка',a:"show('c2','chk')"});
  const work=inWorkAll(); if(work.length) att.unshift({k:'work',icon:'work',t:`В работе ${work.length} ${plural(work.length,'позиция','позиции','позиций')} — ждут подтверждения`,d:work.slice(0,3).map(w=>w.label).join(' · ')+(work.length>3?' …':''),b:'Показать',a:'dlgWork()'});
  const lb=[ps.backup,c1.backup,c2.backup].filter(Boolean).sort()[0];
  if(!LS.get('ceny.backupAll')) att.push({k:'info',icon:'save',t:'Копия данных ни разу не сохранялась',d:DESK?'Приложение само сохраняет копию раз в день в «Документы». Отдельная копия переносит данные на другой компьютер.':'Данные хранятся только в этом браузере. Копия переносит их на другой компьютер и спасает при очистке браузера.',b:'Сохранить копию',a:'backupAll()'});
  if(UPD.ready) att.unshift({k:'ok',icon:'up',t:`Готова новая версия программы: ${UPD.ready.version}`,d:UPD.ready.notes||'Ваши данные не меняются.',b:'Перезапустить',a:'location.reload()'});
  const card=(id,icon,title,lines,btn)=>`<button class="hcard" onclick="show('${id}')"><span class="hic">${ico(icon,22)}</span><b>${title}</b>${lines.map(l=>`<span class="hl">${l}</span>`).join('')}<span class="go">${btn} →</span></button>`;
  h.innerHTML=`<div class="wrap">
    <div class="hhead"><div><h1>Цены на продукцию</h1><p>Курс юаня <b>${nf(ps.cny,2)} ₽</b> · ${ps.prods} ${plural(ps.prods,'изделие','изделия','изделий')} · ${c2.calcs} калькуляций · расценки двух цехов</p></div>
      <button class="btn pri" onclick="show('price','sim')">${ico('up',16)} Что будет при новом курсе или зарплате</button></div>
    <h2>Что требует внимания</h2>
    ${att.length?`<div class="att">${att.map(x=>`<div class="ai ${x.k}"><span class="aic">${ico(x.icon,18)}</span><div><b>${esc(x.t)}</b><p>${esc(x.d)}</p></div><button class="btn sm ${x.k==='ok'||x.k==='warn'?'pri':''}" onclick="${x.a}">${x.b}</button></div>`).join('')}</div>`
      :`<div class="att"><div class="ai ok"><span class="aic">${ico('ok',18)}</span><div><b>Всё в порядке</b><p>Ошибок нет, цены материалов и калькуляций в пределах порога.</p></div></div></div>`}
    <h2>Разделы</h2>
    <div class="cards">
      ${card('price','tag','Цены на продукцию',[`${ps.prods} изделий, ${ps.mats} материалов`,`ошибок ${ps.err}, предупреждений ${ps.warn}`],'Открыть')}
      ${card('calc','calc','Калькуляции',[`${c2.calcs} артикулов: из каких работ состоят`,`привязано к расценкам ${nf(c2.linkedPct)}% работ`],'Открыть')}
      ${card('c1','factory','Расценки цех 1',[`${c1.groups} участков, ${c1.ops} позиций`,c1.last?`последнее изменение ${fd(c1.last.date)}`:'изменений не было'],'Открыть')}
      ${card('c2','factory','Расценки цех 2',[`${c2.groups} участков, ${c2.ops} позиций`,c2.last?`последнее изменение ${fd(c2.last.date)}`:'изменений не было'],'Открыть')}
    </div>
    ${recentHtml()}
    <div class="how"><b>Как всё связано.</b> Повышение окладов в расценках цехов → калькуляции артикулов пересчитываются сами. Цены материалов и ЗПТ в изделиях зафиксированы: если материал или калькуляция изменились больше порога из Параметров, программа попросит пересмотреть цену изделия.</div>
    <div class="foot">Версия ${APP_VERSION} от ${fd(APP_BUILT)} · ${esc(UPD.status)} · данные хранятся в этом браузере${LS.get('ceny.backupAll')?', копия от '+new Date(+LS.get('ceny.backupAll')).toLocaleDateString('ru-RU'):''}</div></div>`;
}
let rt=null; function refresh(){ clearTimeout(rt); rt=setTimeout(()=>{ navRender(); homeRender(); },120); }
addEventListener('storage',refresh);
addEventListener('hashchange',()=>{ const id=location.hash.slice(1); if(id!==cur&&SECTIONS.some(s=>s.id===id)) show(id); });

/* ---------- сообщения разделов ---------- */
let noticeT=null;
function notice(html,kind){ const n=document.getElementById('notice'); n.innerHTML=`<div class="nt ${kind||''}">${html}<button class="x" onclick="this.parentElement.remove()" title="Закрыть">✕</button></div>`; }
addEventListener('message',e=>{ const m=e.data; if(!m||typeof m!=='object') return;
  if(m.t==='rates'){ // повышение или отмена в расценках цеха
    setTimeout(()=>{ const z=api('price')?.stats().zpt; refresh();
      notice(`<span class="aic">${ico('up',16)}</span><span><b>${esc(m.shop)}: ${esc(m.title)}.</b> Калькуляции пересчитаны${z&&z.n?` — у ${z.n} ${plural(z.n,'изделия','изделий','изделий')} изменение больше порога, пересмотрите цены`:', цены в изделиях не менялись'}.</span>${z&&z.n?`<button class="btn sm pri" onclick="show('price');api('price').openZpt();this.closest('.nt').remove()">Проверить цены</button>`:''}`,'warn'); },600); }
  if(m.t==='changed') refresh(); });

/* ---------- копия всех данных ---------- */
const KEYS={c1:'sdelnye-rascenki.v1',c2:'sdelnye-rascenki-ceh2.v1',price:'ceny-produkcii.v1'};
const DESK=window.desktop||null;   // настольное приложение (Electron) или браузер
function allData(){ const d={kind:'ceny-produkcii-backup',version:APP_VERSION,saved:new Date().toISOString(),data:{},users:USERS()};
  for(const id in KEYS){ const a=api(id); d.data[id]=a?a.state():JSON.parse(LS.get(KEYS[id])||'null'); } return d; }
function backupAll(){
  const d=allData(), name=`цены-на-продукцию-копия-${new Date().toISOString().slice(0,10)}.json`;
  if(DESK){ DESK.saveBackupAs(JSON.stringify(d),name).then(r=>{ if(r&&r.ok){ LS.set('ceny.backupAll',String(Date.now())); toastS('Копия сохранена: '+r.file); refresh(); } }); return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'})); a.download=name; a.click();
  LS.set('ceny.backupAll',String(Date.now())); refresh();
}
function restoreAll(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; f.text().then(t=>{ let d; try{ d=JSON.parse(t); }catch(e){ alert('Файл не читается.'); return; }
    if(!d||d.kind!=='ceny-produkcii-backup'||!d.data){ alert('Это не копия программы «Цены на продукцию». Копию отдельного раздела загрузите в его «Настройках».'); return; }
    const ok=(id,x)=>x&&(id==='price'?Array.isArray(x.prods)&&x.mats:Array.isArray(x.groups)&&Array.isArray(x.ops));
    const bad=Object.keys(KEYS).filter(id=>d.data[id]&&!ok(id,d.data[id])); if(bad.length){ alert('Копия повреждена ('+bad.join(', ')+') — ничего не изменено.'); return; }
    if(!confirm(`Заменить все данные копией от ${new Date(d.saved).toLocaleString('ru-RU')}?`)) return;
    for(const id in KEYS) if(d.data[id]) LS.set(KEYS[id],JSON.stringify(d.data[id]));
    if(Array.isArray(d.users)&&d.users.length) LS.set('ceny.users',JSON.stringify(d.users));
    LS.del('sdelnye-rascenki-ceh2.zpt'); location.reload(); }); };
  inp.click();
}

/* ---------- автообновление с GitHub ---------- */
// В репозитории — только код (app.js и version.json). Данные из этого файла и браузера туда не уходят.
const UPD={status:'обновления не проверялись',ready:null};
function updUrl(){ let u=LS.get('ceny.updateUrl')||DEFAULT_UPDATE_URL; if(u&&!u.endsWith('/')) u+='/'; return u; }
async function sha256(t){ if(!(crypto&&crypto.subtle)) return null; const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function setUpd(s,ready){ UPD.status=s; if(ready!==undefined) UPD.ready=ready; const e=document.getElementById('t_updt'); if(e) e.textContent=UPD.ready?`v${UPD.ready.version} готова`:`v${APP_VERSION}`; document.getElementById('t_upd').classList.toggle('hot',!!UPD.ready); refresh(); }
async function checkUpdate(manual){
  const base=updUrl(); if(!base){ setUpd('адрес обновлений не задан'); if(manual) dlgSettings(); return; }
  setUpd('проверяю обновления…');
  try{
    const v=await (await fetch(base+'version.json?t='+Date.now(),{cache:'no-store'})).json();
    LS.set('ceny.updChecked',String(Date.now()));
    const have=Math.max(APP_VERSION,+LS.get('ceny.code.v')||0);
    if(!(v.version>have)){ setUpd(UPD.ready?UPD.status:`последняя версия, проверено ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`); if(manual&&!UPD.ready) toastS('У вас последняя версия'); return; }
    const t=await (await fetch(base+(v.file||'app.js')+'?v='+v.version,{cache:'no-store'})).text();
    const h=await sha256(t); if(h&&v.sha256&&h!==v.sha256) throw new Error('файл обновления повреждён');
    if(/<\/script/i.test(t)) throw new Error('файл обновления в неверном формате');
    if(!LS.set('ceny.code',t)) throw new Error('не хватило места в браузере');
    LS.set('ceny.code.v',String(v.version)); LS.del('ceny.bad');
    setUpd(`версия ${v.version} загружена`,{version:v.version,notes:v.notes});
    notice(`<span class="aic">${ico('up',16)}</span><span><b>Готова новая версия программы (${v.version}).</b> ${esc(v.notes||'')} Данные не меняются.</span><button class="btn sm pri" onclick="location.reload()">Перезапустить</button>`,'ok');
  }catch(e){ setUpd('нет связи с сервером обновлений'+(e&&e.message&&!/fetch|JSON|Unexpected/i.test(e.message)?': '+e.message:'')); if(manual) toastS('Не удалось проверить обновления: '+(e.message||e)); }
}
function toastS(t){ const d=document.createElement('div'); d.className='stoast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2800); }
document.getElementById('t_upd').onclick=()=>checkUpdate(true);
function dlgSettings(){
  const d=document.getElementById('sdlg');
  d.innerHTML=`<div class="sd-h"><b>Настройки программы</b><button class="tbtn icon" onclick="sdlg.close()">✕</button></div>
  <div class="sd-b"><label><span>Адрес обновлений (GitHub Pages)</span><input type="text" id="u_url" value="${esc(updUrl())}" placeholder="https://имя.github.io/репозиторий/"></label>
    <p class="muted">Программа раз в несколько часов смотрит, нет ли там новой версии, и скачивает только код. Оклады, цены и калькуляции остаются в этом браузере.</p>
    <p>Версия ${APP_VERSION} от ${fd(APP_BUILT)}${+LS.get('ceny.code.v')>APP_VERSION?`, работает обновление ${LS.get('ceny.code.v')}`:''}. Статус: ${esc(UPD.status)}.</p>
    <div class="row"><button class="btn" id="u_chk">Проверить сейчас</button>${+LS.get('ceny.code.v')>APP_VERSION?'<button class="btn" id="u_reset">Вернуть версию из файла</button>':''}</div>
    ${DESK?`<hr><b>Приложение</b><p class="muted" id="d_info">…</p><div class="row"><button class="btn" id="d_chk">Проверить обновление приложения</button><button class="btn" onclick="DESK.openBackups()">Открыть папку автокопий</button></div>`:''}
    <hr><b>Данные</b><p class="muted">Копия сохраняет все три раздела одним файлом.${DESK?' Кроме того, приложение само сохраняет копию раз в день, если данные менялись (хранятся 60 последних).':''}</p>
    <div class="row"><button class="btn pri" onclick="backupAll()">Сохранить копию</button><button class="btn" onclick="restoreAll()">Загрузить копию</button></div></div>
  <div class="sd-f"><button class="btn" onclick="sdlg.close()">Закрыть</button><button class="btn pri" id="u_save">Сохранить</button></div>`;
  d.showModal();
  if(DESK){ const st={idle:'не проверялось',checking:'проверяю…',latest:'установлена последняя версия',downloading:'скачиваю обновление',ready:'обновление загружено, установится при закрытии',error:'ошибка проверки',dev:'режим разработки'};
    DESK.info().then(i=>{ const s=deskUpd||{}; document.getElementById('d_info').innerHTML=`Версия приложения ${esc(i.version)} · ${esc(st[s.state]||'')}${s.version?' '+esc(s.version):''}${s.error?' ('+esc(s.error)+')':''}.<br>Данные: ${esc(i.userData)}<br>Автокопии: ${esc(i.backups)}`; });
    document.getElementById('d_chk').onclick=()=>{ DESK.checkUpdate().then(()=>toastS('Проверяю обновление приложения…')).catch(()=>toastS('Проверка доступна в установленной программе')); }; }
  u_chk.onclick=()=>{ LS.set('ceny.updateUrl',u_url.value.trim()); checkUpdate(true); };
  u_save.onclick=()=>{ const v=u_url.value.trim(); if(v&&!/^https:\/\/[^\s]+$/.test(v)){ alert('Адрес должен начинаться с https://'); return; } LS.set('ceny.updateUrl',v); d.close(); toastS('Сохранено'); };
  const r=document.getElementById('u_reset'); if(r) r.onclick=()=>{ if(!confirm('Вернуть версию программы, встроенную в файл?')) return; LS.del('ceny.code'); LS.del('ceny.code.v'); location.reload(); };
}

/* ---------- пользователи ---------- */
// Два пользователя на этом компьютере: каждый входит под собой, его имя ставится на все изменения.
// Пароль хранится хешем; это защита от путаницы «кто менял», а не от злоумышленника с доступом к компьютеру.
function USERS(){ try{ return JSON.parse(LS.get('ceny.users')||'[]'); }catch(e){ return []; } }
function ME(){ try{ return JSON.parse(LS.get('ceny.user')||'null'); }catch(e){ return null; } }
async function pwHash(salt,pw){ const h=await sha256(salt+':'+pw); if(h) return h; let x=0; const s=salt+':'+pw; for(let i=0;i<s.length;i++) x=(x*31+s.charCodeAt(i))|0; return 'x'+x; }
const mkSalt=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
function startLogin(){ LS.del('ceny.user'); document.getElementById('t_username').textContent='вход…'; loginScreen(); }
function setMe(u){ LS.set('ceny.user',JSON.stringify({id:u.id,name:u.name})); document.getElementById('t_username').textContent=u.name; document.getElementById('login').hidden=true; refresh(); }
function loginScreen(err){
  const L=document.getElementById('login'), us=USERS(); L.hidden=false;
  if(us.length<2){
    L.innerHTML=`<div class="lg"><div class="lgbox"><div class="logo big">₽</div><h1>Пользователи программы</h1><p>Программой пользуются два человека. Каждый входит под собой — так у каждой позиции видно, кто её менял последним.</p>
      ${[0,1].map(i=>`<div class="lgrow"><b>Пользователь ${i+1}</b><input type="text" id="un${i}" placeholder="Имя, например «Ирина»" value="${esc((us[i]||{}).name||'')}"><input type="password" id="up${i}" placeholder="Пароль, не короче 4 символов"></div>`).join('')}
      <div class="lgerr" id="lgerr">${esc(err||'')}</div><button class="btn pri wide" id="lg_go">Создать и войти первым</button></div></div>`;
    document.getElementById('lg_go').onclick=async()=>{ const E=document.getElementById('lgerr');
      const rows=[0,1].map(i=>({name:document.getElementById('un'+i).value.trim(),pw:document.getElementById('up'+i).value}));
      if(rows.some(r=>!r.name)) return E.textContent='Укажите имена обоих пользователей.';
      if(rows[0].name.toLowerCase()===rows[1].name.toLowerCase()) return E.textContent='Имена должны различаться.';
      if(rows.some(r=>r.pw.length<4)) return E.textContent='Пароль — не короче 4 символов.';
      const list=[]; for(const r of rows){ const s=mkSalt(); list.push({id:'u'+Math.random().toString(36).slice(2,8),name:r.name,salt:s,hash:await pwHash(s,r.pw)}); }
      LS.set('ceny.users',JSON.stringify(list)); setMe(list[0]); };
    return;
  }
  let sel=null;
  L.innerHTML=`<div class="lg"><div class="lgbox"><div class="logo big">₽</div><h1>Кто работает?</h1><p>Выберите себя и введите пароль.</p>
    <div class="lgusers">${us.map(u=>`<button class="lgu" data-u="${u.id}">${ico('user',22)}<span>${esc(u.name)}</span></button>`).join('')}</div>
    <input type="password" id="lg_pw" placeholder="Пароль" disabled><div class="lgerr" id="lgerr">${esc(err||'')}</div>
    <button class="btn pri wide" id="lg_go" disabled>Войти</button></div></div>`;
  const pw=document.getElementById('lg_pw'), btn=document.getElementById('lg_go');
  L.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{ sel=us.find(u=>u.id===b.dataset.u); L.querySelectorAll('.lgu').forEach(x=>x.classList.toggle('on',x===b)); pw.disabled=false; btn.disabled=false; pw.focus(); });
  const go=async()=>{ if(!sel) return; if(await pwHash(sel.salt,pw.value)!==sel.hash){ document.getElementById('lgerr').textContent='Неверный пароль.'; pw.select(); return; } setMe(sel); };
  btn.onclick=go; pw.onkeydown=e=>{ if(e.key==='Enter') go(); };
}
document.getElementById('t_user').onclick=()=>{ const me=ME(); if(!me){ loginScreen(); return; } const d=document.getElementById('sdlg');
  d.innerHTML=`<div class="sd-h"><b>${esc(me.name)}</b><button class="tbtn icon" onclick="sdlg.close()">✕</button></div>
  <div class="sd-b"><div class="row"><button class="btn pri" id="us_sw">Сменить пользователя</button></div><hr>
    <b>Сменить пароль</b><label style="margin-top:8px;display:block"><span>Текущий пароль</span><input type="password" id="us_old"></label><label style="margin-top:8px;display:block"><span>Новый пароль</span><input type="password" id="us_new"></label>
    <div class="row" style="margin-top:8px"><button class="btn" id="us_pw">Сохранить пароль</button></div>
    <hr><b>Переименовать</b><label style="margin-top:8px;display:block"><span>Имя</span><input type="text" id="us_name" value="${esc(me.name)}"></label><div class="row" style="margin-top:8px"><button class="btn" id="us_rn">Сохранить имя</button></div>
    <div class="lgerr" id="us_err"></div></div>`;
  d.showModal();
  const $=id=>document.getElementById(id);
  $('us_sw').onclick=()=>{ d.close(); startLogin(); };
  $('us_pw').onclick=async()=>{ const list=USERS(), u=list.find(x=>x.id===me.id); if(!u) return;
    if(await pwHash(u.salt,$('us_old').value)!==u.hash) return $('us_err').textContent='Текущий пароль неверный.';
    if($('us_new').value.length<4) return $('us_err').textContent='Новый пароль — не короче 4 символов.';
    u.salt=mkSalt(); u.hash=await pwHash(u.salt,$('us_new').value); LS.set('ceny.users',JSON.stringify(list)); d.close(); toastS('Пароль изменён'); };
  $('us_rn').onclick=()=>{ const list=USERS(), u=list.find(x=>x.id===me.id), n=$('us_name').value.trim(); if(!u||!n) return;
    if(list.some(x=>x!==u&&x.name.toLowerCase()===n.toLowerCase())) return $('us_err').textContent='Такое имя уже есть.';
    u.name=n; LS.set('ceny.users',JSON.stringify(list)); setMe(u); d.close(); toastS('Имя изменено'); };
};

/* ---------- «в работе» и последние изменения по всем справочникам ---------- */
const SECNAME={price:'Цены и материалы',c1:'Расценки цех 1',c2:'Цех 2 и калькуляции'};
function inWorkAll(){ const out=[]; for(const k of ['price','c1','c2']){ const a=api(k); if(a&&a.inwork) out.push(...a.inwork(k)); } return out.sort((a,b)=>(b.at||'').localeCompare(a.at||'')); }
function dlgWork(){ const list=inWorkAll(), d=document.getElementById('sdlg');
  const tab=w=>w.list==='calcs'?['c2','calc']:w.list==='mats'?['price','mat']:w.kind==='price'?['price','prod']:[w.kind,'rates'];
  d.innerHTML=`<div class="sd-h"><b>В работе — ждут подтверждения</b><button class="tbtn icon" onclick="sdlg.close()">✕</button></div>
  <div class="sd-b"><p class="muted">Позиция попадает сюда, когда её изменили в карточке или взяли в работу. Подтверждают в карточке позиции.</p>
  ${list.length?`<div class="wl">${list.map(w=>{ const t=tab(w); return `<div class="wi"><div><b>${esc(w.label)}</b><span>${esc(SECNAME[w.kind])} · ${esc(w.by||'')}${w.at?', '+new Date(w.at).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):''}</span></div><button class="btn sm" onclick="sdlg.close();show('${t[0]==='c2'&&t[1]==='calc'?'calc':t[0]}','${t[1]}')">Открыть раздел</button></div>`; }).join('')}</div>`:'<p>Ничего нет.</p>'}</div>`;
  d.showModal(); }
function recentHtml(){ const all=[];
  for(const k of ['price','c1','c2']){ const a=api(k); if(a&&a.log) for(const l of a.log()) all.push({...l,k}); }
  all.sort((a,b)=>(b.ts||'').localeCompare(a.ts||'')); const top=all.slice(0,10); if(!top.length) return '';
  return `<h2>Последние изменения</h2><div class="recent">${top.map(l=>`<div class="ri"><span class="rt">${new Date(l.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span><span class="rb">${esc(l.by||'—')}</span><span class="rs">${esc(SECNAME[l.k])}</span><span class="rx">${esc(l.text)}</span></div>`).join('')}</div>`; }

function SHELL_CSS(){ return `
html,body{height:100%}body{margin:0;background:var(--bg);overflow:hidden;display:flex;flex-direction:column}
.top{flex:none;display:flex;align-items:center;gap:18px;padding:0 18px;height:60px;background:#101a2e;color:#fff;z-index:3}
.brand{display:flex;align-items:center;gap:10px;white-space:nowrap}.brand b{display:block;font-size:15px}.brand small{display:block;font-size:11px;color:#9fb0d1}
.logo{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#5b8cff,#2f5bd8);font-weight:700;font-size:18px;box-shadow:0 4px 12px rgba(47,91,216,.45)}
.sec{display:flex;gap:4px;overflow-x:auto;flex:1;scrollbar-width:none}.sec::-webkit-scrollbar{display:none}
.sec button{display:flex;align-items:center;gap:7px;border:0;background:none;color:#b8c4dc;padding:8px 12px;border-radius:10px;cursor:pointer;white-space:nowrap;font:inherit;position:relative}
.sec button:hover{background:rgba(255,255,255,.07);color:#fff}.sec button.on{background:rgba(91,140,255,.2);color:#fff}
.sec .dot{position:absolute;top:7px;right:6px;width:7px;height:7px;border-radius:50%;background:#ff8a3d}
.tools{display:flex;gap:6px}.tbtn{display:flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#dbe3f3;border-radius:9px;padding:6px 10px;cursor:pointer;font:inherit;font-size:13px}
.tbtn:hover{background:rgba(255,255,255,.12)}.tbtn.icon{padding:6px 8px}.tbtn.hot{background:#16a34a;border-color:#16a34a;color:#fff}
#sdlg .tbtn{color:var(--ink);border-color:var(--line);background:var(--panel)}
#notice:empty{display:none}.nt{display:flex;align-items:center;gap:10px;padding:9px 18px;background:var(--warn-soft);color:#7a4300;border-bottom:1px solid #f1d39f;font-size:13px}
.nt.ok{background:var(--ok-soft);color:var(--ok);border-color:#bfe3c9}.nt .x{margin-left:auto;border:0;background:none;cursor:pointer;color:inherit;font-size:14px}
#frames{flex:1;position:relative;min-height:0}#frames[hidden]{display:none}.fr{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--bg)}.fr[hidden]{display:none}
.home{flex:1;overflow:auto}.home[hidden]{display:none}.wrap{max-width:1180px;margin:0 auto;padding:28px 22px 40px}
.hhead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:8px}
.hhead h1{margin:0;font-size:26px;letter-spacing:-.02em}.hhead p{margin:4px 0 0;color:var(--muted)}
.home h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:26px 0 10px}
.att{display:grid;gap:10px}.ai{display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:13px 16px}
.ai.warn{border-left-color:#f59e0b}.ai.err{border-left-color:var(--err)}.ai.ok{border-left-color:#16a34a}.ai.info{border-left-color:#64748b}
.ai div{flex:1}.ai p{margin:2px 0 0;color:var(--muted);font-size:13px}.ai .btn{flex:none}
.aic{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent)}
.ai.warn .aic,.nt .aic{background:#ffedc7;color:#a35a00}.ai.err .aic{background:var(--err-soft);color:var(--err)}.ai.ok .aic,.nt.ok .aic{background:var(--ok-soft);color:var(--ok)}.nt .aic{width:26px;height:26px;border-radius:8px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.hcard{text-align:left;display:flex;flex-direction:column;gap:3px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;font:inherit;color:inherit;transition:transform .15s,box-shadow .15s,border-color .15s}
.hcard:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(20,32,60,.1);border-color:#cdd6ea}
.hcard b{font-size:16px;margin:8px 0 4px}.hl{color:var(--muted);font-size:13px}.go{margin-top:12px;color:var(--accent);font-weight:600;font-size:13px}
.hic{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--accent-soft);color:var(--accent)}
.how{margin-top:22px;padding:14px 16px;border-radius:12px;background:#eef2fb;color:#34425e;font-size:13px}
.foot{margin-top:18px;color:var(--muted);font-size:12px}.loading{padding:60px;text-align:center;color:var(--muted)}
#sdlg{border:0;border-radius:16px;padding:0;width:min(560px,94vw)}.sd-h,.sd-f{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 18px;border-bottom:1px solid var(--line)}.sd-f{border:0;border-top:1px solid var(--line);justify-content:flex-end}
.sd-b{padding:16px 18px}.sd-b label span{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}.sd-b input{width:100%;border:1px solid #d4d9e3;border-radius:9px;padding:8px 10px;font:inherit;box-sizing:border-box}
.sd-b hr{border:0;border-top:1px solid var(--line);margin:16px 0}.muted{color:var(--muted);font-size:13px}.row{display:flex;gap:8px;flex-wrap:wrap}
.btn{border:1px solid var(--line);background:var(--panel);padding:7px 12px;border-radius:10px;cursor:pointer;white-space:nowrap;font:inherit;color:inherit;display:inline-flex;align-items:center;gap:6px}
.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}.btn.sm{padding:5px 10px;font-size:13px}
.ai.work{border-left-color:#c9826f}.ai.work .aic{background:#F0DAD5;color:#7a2e1d}
#login{position:fixed;inset:0;z-index:40;background:radial-gradient(1100px 520px at 15% -10%,#dfe8ff 0,transparent 60%),var(--bg);overflow:auto}#login[hidden]{display:none}
.lg{min-height:100%;display:grid;place-items:center;padding:24px;box-sizing:border-box}.lgbox{width:min(480px,94vw);background:#fff;border:1px solid var(--line);border-radius:20px;padding:30px;box-shadow:0 24px 60px rgba(20,32,60,.12)}
.lgbox h1{margin:12px 0 6px;font-size:23px}.lgbox p{color:var(--muted);margin:0 0 16px}.logo.big{width:52px;height:52px;font-size:26px;color:#fff}
.lgrow{display:grid;gap:6px;margin-bottom:14px}.lgbox input{width:100%;box-sizing:border-box;border:1px solid #d4d9e3;border-radius:10px;padding:10px 12px;font:inherit}
.lgusers{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.lgu{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;border:1px solid var(--line);border-radius:14px;background:#fff;cursor:pointer;font:inherit;color:inherit}
.lgu:hover{border-color:#c4cfe6}.lgu.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
.lgerr{color:var(--err);font-size:13px;min-height:18px;margin:6px 0}.btn.wide{width:100%;justify-content:center;padding:11px}
.recent{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ri{display:grid;grid-template-columns:110px 120px 170px 1fr;gap:10px;padding:9px 14px;border-bottom:1px solid var(--line);font-size:13px}.ri:last-child{border:0}
.rt{color:var(--muted)}.rb{font-weight:600}.rs{color:var(--muted)}
.wl{display:grid;gap:8px}.wi{display:flex;align-items:center;gap:10px;background:#F0DAD5;border-radius:10px;padding:9px 12px}.wi div{flex:1}.wi span{display:block;font-size:12px;color:#6b3a2e}
@media (max-width:760px){.ri{grid-template-columns:1fr;gap:2px}}
.stoast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#101a2e;color:#fff;padding:10px 16px;border-radius:10px;z-index:50;font-size:13px}
@media (max-width:760px){.top{gap:10px;padding:0 10px}.brand span:last-child{display:none}.sec button span{display:none}.sec button{padding:8px 10px}.tools .tbtn span{display:none}.hhead h1{font-size:21px}}
`; }

/* ---------- приложение: автокопии и обновление самой программы ---------- */
let deskUpd=null;
if(DESK){
  // раз в час: если данные изменились — копия дня в «Документы\Цены на продукцию\Резервные копии»
  const autoBackup=()=>{ if(!['price','c1','c2'].every(k=>FR[k].ready)) return; const s=JSON.stringify(allData().data); let h=0; for(let i=0;i<s.length;i+=7) h=(h*31+s.charCodeAt(i))|0;
    if(String(h)===LS.get('ceny.autoHash')&&LS.get('ceny.autoDay')===new Date().toISOString().slice(0,10)) return;
    DESK.autoBackup(JSON.stringify({...allData(),auto:true})).then(()=>{ LS.set('ceny.autoHash',String(h)); LS.set('ceny.autoDay',new Date().toISOString().slice(0,10)); LS.set('ceny.backupAll',String(Date.now())); refresh(); }).catch(()=>{}); };
  setTimeout(autoBackup,20000); setInterval(autoBackup,3600e3); addEventListener('beforeunload',autoBackup);
  const onUpd=s=>{ deskUpd=s; if(s&&s.state==='ready') notice(`<span class="aic">${ico('up',16)}</span><span><b>Загружена новая версия приложения ${esc(s.version)}.</b> Установится при закрытии программы, данные сохранятся.</span><button class="btn sm pri" onclick="DESK.installUpdate()">Перезапустить сейчас</button>`,'ok'); };
  DESK.onUpdate(onUpd); DESK.updateState().then(onUpd).catch(()=>{});
}

show(cur);
window.__APP_OK=true;
startLogin();
setTimeout(()=>{ const last=+LS.get('ceny.updChecked')||0; if(Date.now()-last>3*3600e3) checkUpdate(false); else setUpd('последняя версия, проверено '+new Date(last).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'})); },2500);
setInterval(()=>checkUpdate(false),6*3600e3);
