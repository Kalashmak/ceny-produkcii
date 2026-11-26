"""Сборка «Цены на продукцию».
dist/app.js, dist/version.json — только код (уходят в публичный репозиторий, данных там нет);
«Цены на продукцию.html» — загрузчик + данные + встроенная копия кода (работает и без интернета)."""
import io, json, re, hashlib, datetime, sys, os
ROOT = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/'
SRC = ROOT + 'src/'
# данные (оклады, цены, калькуляции) лежат рядом, в папке, которая в git не попадает
DATA = os.path.abspath(ROOT + '../ceny-produkcii-dannye').replace(chr(92), '/') + '/'
VERSION = int(sys.argv[1]) if len(sys.argv) > 1 else 1
NOTES = sys.argv[2] if len(sys.argv) > 2 else ''
UPDATE_URL = 'https://kalashmak.github.io/ceny-produkcii/'
rd = lambda p: io.open(p, encoding='utf8').read()
theme = rd(SRC + 'theme.css')
common = rd(SRC + 'common.js')

def must(a, o, n, cnt=1):
    assert a.count(o) == cnt, (o[:80], a.count(o)); return a.replace(o, n)

NOTIFY = "try{ if(parent!==window) parent.postMessage({t:'rates',shop:%r,title:%s},'*'); }catch(e){}"
API_RATES = """<script>
// Связь раздела с общей программой: цифры для главной и переход по вкладкам
// какие позиции раздела отслеживаются: кто менял, статус «В работе», комментарии
function metaCollections(){ return [['groups',S.groups.map(g=>[g.id,g])],['ops',S.ops.map(o=>[o.id,o])],['calcs',(S.calcs||[]).map(c=>[c.id,c])]]; }
function metaLabel(n,o){ return n==='groups'?`участок №${o.no} ${o.name}`:n==='calcs'?`калькуляция ${o.art||o.name}`:`${o.art?o.art+' · ':''}${o.name}${o.variant&&o.variant!=='за 1 шт'?' · '+o.variant:''}`; }
metaBaseline();
window.__api={
  key:KEY, state:()=>S, go:t=>{ try{ go(t); }catch(e){} },
  inwork:k=>metaInWork(k), log:()=>S.log.slice(0,20),
  stats(){ const e=ISS.filter(i=>i.level==='error'), ev=S.events.filter(x=>x.kind!=='import').at(-1);
    const r={groups:S.groups.length,ops:S.ops.length,err:e.length,warn:ISS.length-e.length,last:ev?{date:ev.date,title:ev.title}:null,backup:S.meta&&S.meta.backup};
    if(S.calcs){ const ce=e.filter(i=>i.cid).length; let n=0,k=0; for(const c of S.calcs) for(const l of c.lines) for(const w of l.works){ n++; if(w.link) k++; }
      Object.assign(r,{calcs:S.calcs.length,calcErr:ce,rateErr:e.length-ce,linkedPct:n?k/n*100:0}); }
    return r; }
};
%s
</script>"""
C2_LISTEN = """// цех 1 поменял расценки — калькуляции, где есть его работы, пересчитываются и уходят в цены
addEventListener('storage',e=>{ if(e.key==='sdelnye-rascenki.v1'){ loadShop1(); publishZpt(); render(); } });"""
API_PRICE = """<script>
function metaCollections(){ return [['prods',S.prods.map(p=>[p.id,p])],['mats',Object.entries(S.mats)]]; }
function metaLabel(n,o){ return n==='prods'?`артикул ${o.art}`:`материал «${o.name}»`; }
metaBaseline();
window.__api={
  key:KEY, state:()=>S, go:t=>{ try{ go(t); }catch(e){} },
  inwork:k=>metaInWork(k), log:()=>S.log.slice(0,20),
  openZpt(){ go('prod'); dlgReview(); },
  filter(f){ ui.f=f; ui.lim=150; go('prod'); },
  stats(){ const e=ISS.filter(i=>i.level==='error'); let loss=0,low=0;
    for(const p of S.prods){ const m=margin(p); if(m==null) continue; if(m<0) loss++; else if(m<S.settings.minMargin) low++; }
    return {prods:S.prods.length,mats:Object.keys(S.mats).length,err:e.length,warn:ISS.length-e.length,cny:S.settings.cny,minMargin:S.settings.minMargin,
      zpt:reviewSummary(),loss,low,backup:S.meta&&S.meta.backup}; }
};
// калькуляции цеха 2 пересчитаны — свежая ЗПТ и предупреждение «пересмотрите цены»
addEventListener('storage',e=>{ if(e.key==='sdelnye-rascenki-ceh2.zpt'){ loadZpt2(); render(); } });
</script>"""

def embed(html, api):
    head = "<script>if(window.parent!==window)document.documentElement.classList.add('embed')</script><style>" + theme + "</style><script>" + common + "</script></head>"
    html = must(html, '</head>', head)
    return must(html, '</body>', api + '</body>')

def rates(html, shop, extra=''):
    html = must(html, "  S.events.push(ev);\n", "  S.events.push(ev);\n  " + (NOTIFY % (shop, 'note')) + "\n")
    html = must(html, "S.events=S.events.filter(e=>e.id!==id); save(`Отменено:", (NOTIFY % (shop, "'отменено «'+ev.title+'»'")) + " S.events=S.events.filter(e=>e.id!==id); save(`Отменено:")
    return embed(html, API_RATES % extra)

tpl = {
    'c1': rates(rd(SRC + 'tpl_c1.html'), 'Цех 1'),
    'c2': rates(rd(SRC + 'tpl_c2.html'), 'Цех 2', C2_LISTEN),
    'price': embed(rd(SRC + 'tpl_price.html'), API_PRICE),
}
import subprocess, tempfile
# каждый скрипт каждого раздела — через node --check: ошибка синтаксиса роняет раздел целиком, ловим её до выпуска
for k, h in tpl.items():
    assert h.count('/*__SEED__*/null') == 1, k
    for i, s in enumerate(re.findall(r'<script>(.*?)</script>', h.replace('/*__SEED__*/null', 'null').replace('/*__SHOP1__*/null', 'null'), re.S)):
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf8') as t: t.write(s)
        r = subprocess.run(['node', '--check', t.name], capture_output=True, text=True, encoding='utf8'); os.unlink(t.name)
        assert r.returncode == 0, f'{k}, скрипт {i}: {r.stderr[-300:]}'
built = datetime.date.today().isoformat()
shell = rd(SRC + 'shell.js')
shell = must(shell, '/*__VERSION__*/0', str(VERSION))
shell = must(shell, "/*__BUILT__*/''", json.dumps(built))
shell = must(shell, "/*__UPDATE_URL__*/''", json.dumps(UPDATE_URL))
shell = must(shell, "/*__THEME__*/''", json.dumps(theme, ensure_ascii=False))
shell = must(shell, '/*__TPL__*/{}', json.dumps(tpl, ensure_ascii=False))
# код кладётся внутрь <script>: «</» в строках экранируем, чтобы браузер не закрыл тег раньше времени
app = re.sub(r'</(script)', r'<\\/\1', shell, flags=re.I)
assert not re.search(r'</script', app, re.I)

# проверка: в коде нет данных (окладов, цен) — только программа
seeds = {k: json.loads(rd(DATA + f'seed_{k}.json')) for k in ('c1', 'c2', 'price')}
for probe in ['75904', '81700.38', '74178', '"monthly":', '1007/36', 'Комплект файлов для визитницы']:
    assert probe not in app, f'в коде найдены данные: {probe}'

# app.js и version.json — в корне репозитория, их раздаёт GitHub Pages
io.open(ROOT + 'app.js', 'w', encoding='utf8', newline='\n').write(app)
sha = hashlib.sha256(app.encode('utf8')).hexdigest()
json.dump({'version': VERSION, 'file': 'app.js', 'sha256': sha, 'built': built, 'notes': NOTES}, io.open(ROOT + 'version.json', 'w', encoding='utf8'), ensure_ascii=False)

seeds_js = json.dumps(seeds, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
LOADER = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Цены на продукцию</title>
<style>body{margin:0;background:#f3f5f9;font:15px "Segoe UI",system-ui,sans-serif;color:#152033}#boot{display:grid;place-items:center;height:100vh;color:#64708a}</style>
</head>
<body>
<div id="boot">Загрузка программы…</div>
<script id="seeds" type="application/json">%s</script>
<script id="app-code" type="text/plain">%s</script>
<script>
/* Загрузчик. Код программы — встроенный в файл или более новый, скачанный с GitHub (хранится в браузере).
   Если скачанная версия не запустилась, откатываемся на встроенную. */
(function(){
  var BUNDLED=%d, code=null, v=0;
  try{ v=+localStorage.getItem('ceny.code.v')||0; if(v>BUNDLED&&localStorage.getItem('ceny.bad')!==String(v)) code=localStorage.getItem('ceny.code'); }catch(e){}
  window.__SEEDS=JSON.parse(document.getElementById('seeds').textContent);
  var fromCache=!!code;
  window.addEventListener('error',function(){ if(fromCache&&!window.__APP_OK){ try{ localStorage.setItem('ceny.bad',String(v)); }catch(e){} location.reload(); } });
  var s=document.createElement('script'); s.textContent=code||document.getElementById('app-code').textContent; document.body.appendChild(s);
})();
</script>
</body>
</html>
"""
html = LOADER % (seeds_js, app, VERSION)
io.open(DATA + 'Цены на продукцию.html', 'w', encoding='utf8').write(html)
# настольное приложение: тот же код рядом со стартовой страницей, номер встроенной версии — в её заголовке
io.open(ROOT + 'desktop/app/app.js', 'w', encoding='utf8', newline='\n').write(app)
ix = rd(ROOT + 'desktop/app/index.html')
ix = re.sub(r'<meta name="app-version" content="\d+">', f'<meta name="app-version" content="{VERSION}">', ix)
io.open(ROOT + 'desktop/app/index.html', 'w', encoding='utf8', newline='\n').write(ix)
# файл данных для первого запуска приложения — только в папке данных, в git не попадает
json.dump({'kind': 'ceny-produkcii-backup', 'version': VERSION, 'saved': datetime.datetime.now().isoformat(), 'data': seeds},
          io.open(DATA + 'Данные для программы.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('версия', VERSION, 'код', len(app), 'файл', len(html), 'sha', sha[:12])
