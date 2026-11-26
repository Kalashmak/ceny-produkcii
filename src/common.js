/* Общее для всех разделов: кто работает, кто последний менял позицию, статус «В работе», комментарии.
   Подключается отдельным скриптом перед кодом раздела; S и save() раздела видны отсюда во время вызова. */
// Текущий пользователь — его выбирает экран входа в оболочке программы
function CU(){ try{ const u=JSON.parse(localStorage.getItem('ceny.user')||'null'); if(u&&u.name) return u; }catch(e){} return {id:'',name:'не указан'}; }
const metaEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metaTime=s=>s?new Date(s).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'';

/* ---------- кто последний менял: сравнение позиций до и после сохранения ---------- */
// Служебные поля (кто менял, статус, комментарии) в сравнение не входят: подтверждение или комментарий — не правка позиции
const META_KEYS=['mod','status','statusBy','statusAt','okBy','okAt','notes'];
const META_SKIP=new Set(META_KEYS);
function metaHash(o){ const s=JSON.stringify(o,(k,v)=>META_SKIP.has(k)?undefined:v)||''; let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
let META_BASE=null, META_S=null;
function metaLists(){ return (typeof metaCollections==='function'?metaCollections():[]); }
function metaBaseline(){ META_BASE={}; META_S=(typeof S!=='undefined')?S:null; for(const [name,list] of metaLists()) for(const [id,o] of list) META_BASE[name+':'+id]=metaHash(o); }
// Вызывается из save(): изменённым и новым позициям — «изменил такой-то»; правка одной-двух позиций из карточки
// ставит их «в работу» (ждут подтверждения), массовые изменения (повышение, пересчёт) — нет
function metaStamp(){
  if(!META_BASE||(typeof S!=='undefined'&&S!==META_S)){ metaBaseline(); return []; }
  const u=CU(), now=new Date().toISOString(), changed=[], next={};
  for(const [name,list] of metaLists()) for(const [id,o] of list){ const k=name+':'+id, h=metaHash(o); next[k]=h; if(META_BASE[k]!==h) changed.push(o); }
  for(const o of changed) o.mod={by:u.name,at:now};
  if(changed.length&&changed.length<=3) for(const o of changed) if(o.status!=='work'){ o.status='work'; o.statusBy=u.name; o.statusAt=now; }
  META_BASE=next; return changed;
}

/* ---------- панель позиции в карточке: статус, кто менял, комментарии ---------- */
let META_ITEM=null, META_LABEL='';
function metaPanel(item,label){
  if(!item) return '';
  META_ITEM=item; META_LABEL=label||'';
  return `<div class="meta-p" id="metaPanel">${metaInner(item)}</div>`;
}
function metaInner(it){
  const work=it.status==='work', notes=(it.notes||[]).slice().reverse();
  return `<div class="meta-top"><span class="meta-st ${work?'w':'ok'}">${work?'В работе':it.okBy?'Подтверждено':'Без статуса'}</span>
    <span class="meta-who">${work?`с ${metaTime(it.statusAt)}, ${metaEsc(it.statusBy||'')}`:it.okBy?`${metaEsc(it.okBy)}, ${metaTime(it.okAt)}`:''}</span>
    <span class="meta-mod">${it.mod?`Последнее изменение: <b>${metaEsc(it.mod.by)}</b>, ${metaTime(it.mod.at)}`:'Изменений в программе не было'}</span>
    ${work?`<button type="button" class="btn sm pri" data-meta="ok">Подтвердить</button>`:`<button type="button" class="btn sm" data-meta="work">Взять в работу</button>`}</div>
  <div class="meta-notes">${notes.length?notes.map(n=>`<div class="meta-n"><span>${metaTime(n.at)} · <b>${metaEsc(n.by)}</b></span>${metaEsc(n.text)}</div>`).join(''):'<div class="meta-empty">Комментариев пока нет. Запишите, что поменялось и почему.</div>'}</div>
  <div class="meta-add"><textarea id="metaNote" rows="2" placeholder="Комментарий: что поменялось в процессе работы, какие изменения внесены…"></textarea><button type="button" class="btn sm" data-meta="note">Добавить</button></div>`;
}
// Кнопки панели сохраняют сразу — независимо от кнопки «Сохранить» карточки
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-meta]'); if(!b||!META_ITEM) return;
  const it=META_ITEM, u=CU(), now=new Date().toISOString(), a=b.dataset.meta, lab=META_LABEL?` «${META_LABEL}»`:'';
  if(a==='note'){ const t=(document.getElementById('metaNote').value||'').trim(); if(!t) return; (it.notes=it.notes||[]).push({by:u.name,at:now,text:t}); save(`Комментарий${lab}: ${t.slice(0,80)}`); }
  if(a==='ok'){ it.status=undefined; it.okBy=u.name; it.okAt=now; save(`Подтверждено${lab}`); }
  if(a==='work'){ it.status='work'; it.statusBy=u.name; it.statusAt=now; save(`Взято в работу${lab}`); }
  const p=document.getElementById('metaPanel'); if(p) p.innerHTML=metaInner(it);
  try{ render(); }catch(err){}
});
// для главной: позиции в работе и последние изменения
function metaInWork(kind){ const out=[]; for(const [name,list] of metaLists()) for(const [id,o] of list) if(o.status==='work') out.push({kind,list:name,id,label:typeof metaLabel==='function'?metaLabel(name,o):id,by:o.statusBy,at:o.statusAt}); return out; }
