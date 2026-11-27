/* Копирование и вставка во всех справочниках и карточках.
   В окне программы (Electron) нет меню правой кнопки, а строки таблиц открывают карточку по щелчку —
   поэтому выделить мышью и скопировать артикул или название было нельзя. Здесь: своё меню правой кнопки
   и защита выделения от щелчка по строке. Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A работают как обычно. */
(function(){
  if(window.__clip) return; window.__clip=1;
  const css=`.clip-m{position:fixed;inset:auto;margin:0;padding:4px;min-width:200px;max-width:360px;background:#fff;border:1px solid #d9dfea;border-radius:10px;box-shadow:0 10px 30px rgba(20,32,60,.18);font:13.5px/1.3 "Segoe UI",system-ui,sans-serif;color:#152033;z-index:2147483647}
.clip-m button{display:flex;justify-content:space-between;gap:18px;width:100%;padding:7px 10px;border:0;background:none;border-radius:7px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.clip-m button:hover,.clip-m button:focus-visible{background:#eef2fc;outline:none}.clip-m button:disabled{color:#a6aebf;background:none;cursor:default}
.clip-m kbd{font:inherit;color:#8a93a6}.clip-m hr{border:0;border-top:1px solid #e3e7ef;margin:4px 2px}
.clip-t{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#152033;color:#fff;padding:8px 14px;border-radius:9px;font:13px "Segoe UI",system-ui,sans-serif;z-index:2147483647;pointer-events:none}
tbody td,.hint,h3,.dlg-h,.card{-webkit-user-select:text;user-select:text}`;
  const st=document.createElement('style'); st.textContent=css; (document.head||document.documentElement).appendChild(st);

  /* ---------- выделение в строке таблицы не открывает карточку ---------- */
  // Протянули мышью по тексту строки — это выделение, а не щелчок. Простой щелчок открывает карточку как раньше.
  let down=null;
  document.addEventListener('mousedown',e=>{ down={x:e.clientX,y:e.clientY}; },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('input,textarea,select,button,a,label')) return;
    const moved=down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4, s=getSelection();
    if((moved||e.detail>1)&&s&&!s.isCollapsed&&String(s).trim()){ e.stopPropagation(); e.preventDefault(); }
  },true);

  /* ---------- буфер обмена ---------- */
  const host=()=>[...document.querySelectorAll('dialog[open]')].pop()||document.body;
  function toast(t){ const d=document.createElement('div'); d.className='clip-t'; d.textContent=t; host().appendChild(d); setTimeout(()=>d.remove(),1600); }
  async function put(text){
    try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
    const t=document.createElement('textarea'); t.value=text; t.style.cssText='position:fixed;left:-9999px;top:0'; host().appendChild(t); t.select();
    let ok=false; try{ ok=document.execCommand('copy'); }catch(e){} t.remove(); return ok;
  }
  async function take(){ try{ return await navigator.clipboard.readText(); }catch(e){ return null; } }
  const editable=el=>el&&(el.isContentEditable||el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&/^(text|search|number|email|tel|url|password|)$/i.test(el.type)&&!el.readOnly&&!el.disabled);
  const flat=t=>String(t||'').replace(/\s*\n\s*/g,' ').trim();
  // подписи «изменил такой-то», «сейчас …» и кнопки в копию ячейки не попадают
  const cellText=el=>{ if(!el.querySelector('.hint,button,.pill,select')) return flat(el.innerText);
    const c=el.cloneNode(true); c.querySelectorAll('.hint,button,.pill,select').forEach(x=>x.remove()); return flat(c.textContent); };
  // строка и таблица — через табуляцию: вставляются в Excel по ячейкам
  const rowText=tr=>[...tr.children].map(cellText).join('\t');
  const tableText=tb=>[...tb.querySelectorAll('tr')].filter(tr=>tr.offsetParent!==null).map(rowText).join('\n');

  /* ---------- меню правой кнопки ---------- */
  let menu=null;
  function hide(){ if(menu){ menu.remove(); menu=null; } }
  document.addEventListener('contextmenu',e=>{
    hide();
    const tg=e.target instanceof Element?e.target:e.target.parentElement; if(!tg) return;
    const ed=editable(tg)?tg:null, sel=getSelection(), selText=ed?ed.value!=null?ed.value.slice(ed.selectionStart,ed.selectionEnd):String(sel):String(sel);
    const td=tg.closest('td,th'), tr=tg.closest('tr'), tb=tg.closest('table');
    // что копировать без выделения: ближайший к курсору элемент с коротким текстом (ячейка, заголовок, подпись)
    let own=null; if(!ed&&!selText.trim()) for(let el=tg,i=0;el&&el!==document.body&&i<4;el=el.parentElement,i++){ const t=flat(el.innerText); if(t){ if(t.length<=300) own=el; break; } if(el.matches('td,th')) break; }
    const ownText=own?(own.matches('td,th')?cellText(own):flat(own.innerText)):'';
    const items=[];
    if(ed){
      items.push(['Вырезать','Ctrl+X',!selText,()=>{ ed.focus(); document.execCommand('cut'); }]);
      items.push(['Копировать','Ctrl+C',!selText,()=>{ ed.focus(); document.execCommand('copy'); }]);
      items.push(['Вставить','Ctrl+V',false,async()=>{ const t=await take(); ed.focus();
        if(t==null){ if(!document.execCommand('paste')) toast('Вставьте сочетанием Ctrl+V'); return; }
        document.execCommand('insertText',false,t); }]);
      items.push(null,['Выделить всё','Ctrl+A',!(ed.value||ed.textContent),()=>{ ed.focus(); ed.select?ed.select():document.execCommand('selectAll'); }]);
    } else {
      if(selText.trim()) items.push(['Копировать','Ctrl+C',false,async()=>{ if(!document.execCommand('copy')) await put(selText); toast('Скопировано'); }]);
      else if(ownText) items.push([`Копировать «${ownText.length>40?ownText.slice(0,40)+'…':ownText}»`,'',false,async()=>{ await put(ownText); toast('Скопировано'); }]);
      if(tr&&tr.closest('tbody')&&tr.children.length>1) items.push(['Копировать строку','',false,async()=>{ await put(rowText(tr)); toast('Строка скопирована — вставляется в Excel по ячейкам'); }]);
      if(tb) items.push(['Копировать таблицу','',false,async()=>{ await put(tableText(tb)); toast('Таблица скопирована — вставляется в Excel'); }]);
      if(!items.length) return; // пустое место — меню не нужно
    }
    e.preventDefault();
    menu=document.createElement('div'); menu.className='clip-m'; menu.setAttribute('role','menu');
    for(const it of items){ if(!it){ menu.appendChild(document.createElement('hr')); continue; }
      const [t,k,dis,fn]=it, b=document.createElement('button'); b.type='button'; b.disabled=dis; b.innerHTML='<span></span><kbd></kbd>'; b.firstChild.textContent=t; b.lastChild.textContent=k;
      // mousedown не даём: иначе поле теряет фокус и выделение до выполнения команды
      b.addEventListener('mousedown',ev=>ev.preventDefault());
      b.onclick=ev=>{ ev.stopPropagation(); hide(); fn(); }; menu.appendChild(b); }
    // при открытой карточке всё вне окна <dialog> недоступно для мыши — меню кладём внутрь самого окна
    host().appendChild(menu);
    const w=menu.offsetWidth, h=menu.offsetHeight;
    menu.style.left=Math.max(4,Math.min(e.clientX,innerWidth-w-4))+'px'; menu.style.top=Math.max(4,Math.min(e.clientY,innerHeight-h-4))+'px';
  },true);
  document.addEventListener('mousedown',e=>{ if(menu&&!menu.contains(e.target)) hide(); },true);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&menu){ hide(); e.stopPropagation(); e.preventDefault(); } },true);
  addEventListener('blur',hide); addEventListener('scroll',hide,true); addEventListener('resize',hide);
})();
