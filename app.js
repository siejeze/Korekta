/* ============================================================
   Ostatnie Oko — interfejs
   ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const OO = window.OstatnieOko;

  const stan = {
    tekst: '',
    konwencja: null,
    znaleziska: [],
    filtryKat: {},
    pokaz: 'wszystkie',      // 'wszystkie' | 'pewne'
    limity: {},              // ile pozycji renderować per kategoria
    zastosowanych: 0
  };
  for (const k of Object.keys(OO.KATEGORIE)) stan.filtryKat[k] = true;

  /* ---------- Motyw jasny/ciemny ---------- */
  function ustawMotyw(m) {
    document.documentElement.dataset.motyw = m;
    $('btn-motyw').textContent = m === 'ciemny' ? '☀️' : '🌙';
    try { localStorage.setItem('oo-motyw', m); } catch (e) { /* prywatny tryb */ }
  }
  (function () {
    let m = null;
    try { m = localStorage.getItem('oo-motyw'); } catch (e) { }
    if (!m) m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny';
    ustawMotyw(m);
  })();
  $('btn-motyw').addEventListener('click', () =>
    ustawMotyw(document.documentElement.dataset.motyw === 'ciemny' ? 'jasny' : 'ciemny'));

  /* ---------- Worker (z awaryjnym trybem synchronicznym) ---------- */
  let worker = null;
  let workerZepsuty = false;
  const odbiorcy = {};

  function zapewnijWorker() {
    if (worker || workerZepsuty) return worker;
    try {
      worker = new Worker('rules.js');
      worker.onmessage = e => {
        const d = e.data;
        if (d.cmd === 'postep' && odbiorcy.postep) odbiorcy.postep(d.p);
        else if (d.cmd === 'konwencja' && odbiorcy.konwencja) odbiorcy.konwencja(d.konwencja);
        else if (d.cmd === 'wyniki' && odbiorcy.wyniki) odbiorcy.wyniki(d.wyniki);
        else if (d.cmd === 'testy' && odbiorcy.testy) odbiorcy.testy(d.wyniki);
        else if (d.cmd === 'blad') alert('Błąd silnika reguł: ' + d.komunikat);
      };
      worker.onerror = () => {
        // np. otwarcie z dysku (file://) — przechodzimy na tryb synchroniczny
        workerZepsuty = true;
        try { worker.terminate(); } catch (e) { }
        worker = null;
      };
    } catch (e) {
      workerZepsuty = true;
      worker = null;
    }
    return worker;
  }

  function wykryjKonwencjeAsync(tekst, cb) {
    const w = zapewnijWorker();
    if (w) {
      odbiorcy.konwencja = k => { odbiorcy.konwencja = null; cb(k); };
      w.postMessage({ cmd: 'wykryj', tekst });
      // awaria workera w trakcie → tryb synchroniczny
      setTimeout(() => {
        if (workerZepsuty && odbiorcy.konwencja) { odbiorcy.konwencja = null; cb(OO.wykryjKonwencje(tekst)); }
      }, 400);
    } else {
      setTimeout(() => cb(OO.wykryjKonwencje(tekst)), 10);
    }
  }

  function skanujAsync(tekst, konwencja, opcje, onPostep, cb) {
    const w = zapewnijWorker();
    if (w) {
      odbiorcy.postep = onPostep;
      odbiorcy.wyniki = wy => { odbiorcy.wyniki = null; odbiorcy.postep = null; cb(wy); };
      w.postMessage({ cmd: 'skanuj', tekst, konwencja, opcje });
      setTimeout(() => {
        if (workerZepsuty && odbiorcy.wyniki) {
          odbiorcy.wyniki = null; odbiorcy.postep = null;
          setTimeout(() => cb(OO.skanuj(tekst, konwencja, opcje, onPostep)), 10);
        }
      }, 400);
    } else {
      setTimeout(() => cb(OO.skanuj(tekst, konwencja, opcje, onPostep)), 10);
    }
  }

  /* ---------- Liczniki ---------- */
  let licznikTimer = null;
  function odswiezLicznik() {
    const t = $('tekst').value;
    const slowa = (t.match(/\p{L}+/gu) || []).length;
    $('licznik').textContent = `${t.length.toLocaleString('pl-PL')} znaków · ${slowa.toLocaleString('pl-PL')} słów`;
  }
  $('tekst').addEventListener('input', () => {
    clearTimeout(licznikTimer);
    licznikTimer = setTimeout(odswiezLicznik, 350);
  });

  /* ---------- Wczytywanie plików ---------- */
  $('plik').addEventListener('change', async e => {
    const plik = e.target.files[0];
    if (!plik) return;
    $('nazwa-pliku').textContent = 'Wczytywanie…';
    try {
      if (/\.docx$/i.test(plik.name)) {
        if (!window.mammoth) throw new Error('Biblioteka do odczytu .docx jeszcze się nie załadowała (wymaga internetu przy pierwszym otwarciu). Spróbuj za chwilę.');
        const bufor = await plik.arrayBuffer();
        const wynik = await window.mammoth.extractRawText({ arrayBuffer: bufor });
        $('tekst').value = wynik.value;
      } else {
        $('tekst').value = await plik.text();
      }
      $('nazwa-pliku').textContent = plik.name;
      odswiezLicznik();
    } catch (err) {
      $('nazwa-pliku').textContent = '';
      alert('Nie udało się wczytać pliku: ' + err.message);
    }
    e.target.value = '';
  });

  /* ---------- Krok: karta konwencji ---------- */
  function opiszStatystyki(k) {
    const s = k.statystyki;
    $('stat-cudzyslow').textContent = `w tekście: „…” ×${s.cudzyslowy.polskie}, «…» ×${s.cudzyslowy.francuskie}, "…" ×${s.cudzyslowy.proste}`;
    $('stat-dialog').textContent = `linie dialogowe: — ×${s.dialogi.pauza}, – ×${s.dialogi.polpauza}, - ×${s.dialogi.dywiz}`;
    $('stat-wielokropek').textContent = `w tekście: … ×${s.wielokropki.znak}, ... ×${s.wielokropki.kropki}`;
    $('stat-wtracenie').textContent = `kreski ze spacjami: — ×${s.wtracenia.pauza}, – ×${s.wtracenia.polpauza}`;
  }

  $('btn-konwencja').addEventListener('click', () => {
    const t = $('tekst').value;
    if (!t.trim()) { alert('Najpierw wklej lub wczytaj tekst.'); return; }
    stan.tekst = t;
    $('btn-konwencja').disabled = true;
    $('btn-konwencja').textContent = 'Analizowanie konwencji…';
    wykryjKonwencjeAsync(t, k => {
      $('btn-konwencja').disabled = false;
      $('btn-konwencja').textContent = 'Dalej: wykryj konwencję tekstu →';
      $('konw-cudzyslow').value = k.cudzyslow;
      $('konw-dialog').value = k.dialog;
      $('konw-wielokropek').value = k.wielokropek;
      $('konw-wtracenie').value = k.wtracenie;
      opiszStatystyki(k);
      $('sekcja-wejscie').classList.add('ukryte');
      $('sekcja-konwencja').classList.remove('ukryte');
      $('sekcja-wyniki').classList.add('ukryte');
      window.scrollTo({ top: 0 });
    });
  });

  $('btn-wstecz').addEventListener('click', () => {
    $('sekcja-konwencja').classList.add('ukryte');
    $('sekcja-wejscie').classList.remove('ukryte');
  });

  /* ---------- Krok: skanowanie ---------- */
  function aktualneOpcje() {
    return {
      oknoF2: parseInt($('opcja-okno').value, 10),
      ignorujPytajnikWykrzyknik: $('opcja-pytajnik').checked
    };
  }

  function uruchomSkan() {
    $('sekcja-konwencja').classList.add('ukryte');
    $('sekcja-wyniki').classList.add('ukryte');
    $('sekcja-postep').classList.remove('ukryte');
    $('postep-wypelnienie').style.width = '2%';
    skanujAsync(stan.tekst, stan.konwencja, aktualneOpcje(),
      p => { $('postep-wypelnienie').style.width = Math.round(p * 100) + '%'; },
      wyniki => {
        stan.znaleziska = wyniki.map(w => Object.assign(w, { status: 'otwarte' }));
        stan.limity = {};
        $('sekcja-postep').classList.add('ukryte');
        $('sekcja-wyniki').classList.remove('ukryte');
        odswiezPodglad();
        renderujFiltry();
        renderujListe();
      });
  }

  $('btn-skanuj').addEventListener('click', () => {
    stan.konwencja = {
      cudzyslow: $('konw-cudzyslow').value,
      dialog: $('konw-dialog').value,
      wielokropek: $('konw-wielokropek').value,
      wtracenie: $('konw-wtracenie').value
    };
    uruchomSkan();
  });

  $('btn-rescan').addEventListener('click', uruchomSkan);
  $('opcja-okno').addEventListener('change', () => { if (stan.konwencja) uruchomSkan(); });
  $('opcja-pytajnik').addEventListener('change', () => { if (stan.konwencja) uruchomSkan(); });

  /* ---------- Nakładanie poprawek z przesuwaniem pozycji ---------- */
  function zastosujZnaleziska(lista) {
    // wybieramy niekolidujące, od końca
    const doZrobienia = lista
      .filter(z => z.zamiana !== null && z.status === 'otwarte')
      .sort((a, b) => a.start - b.start || a.koniec - b.koniec);
    const zastosowane = [];
    let ostatniKoniec = -1;
    for (const z of doZrobienia) {
      if (z.start < ostatniKoniec) continue; // koliduje z poprzednią
      zastosowane.push(z);
      ostatniKoniec = z.koniec;
    }
    if (!zastosowane.length) return 0;

    // budowa nowego tekstu jednym przebiegiem
    let czesci = [];
    let poz = 0;
    for (const z of zastosowane) {
      czesci.push(stan.tekst.slice(poz, z.start), z.zamiana);
      poz = z.koniec;
    }
    czesci.push(stan.tekst.slice(poz));
    stan.tekst = czesci.join('');

    // przesunięcia pozostałych znalezisk
    const delty = zastosowane.map(z => ({ start: z.start, koniec: z.koniec, d: z.zamiana.length - (z.koniec - z.start) }));
    for (const z of stan.znaleziska) {
      if (z.status !== 'otwarte' && z.status !== 'odrzucone' && z.status !== 'zalatwione') continue;
      let przesuniecie = 0;
      let kolizja = false;
      for (const dl of delty) {
        if (dl.koniec <= z.start) przesuniecie += dl.d;
        else if (dl.start < z.koniec) { kolizja = true; break; }
        else break; // delty posortowane — dalsze są za znaleziskiem
      }
      if (kolizja) { if (z.status === 'otwarte') z.status = 'nieaktualne'; continue; }
      z.start += przesuniecie;
      z.koniec += przesuniecie;
    }
    for (const z of zastosowane) z.status = 'zaakceptowane';
    stan.zastosowanych += zastosowane.length;

    $('tekst').value = stan.tekst;
    odswiezLicznik();
    odswiezPodglad();
    return zastosowane.length;
  }

  /* ---------- Podgląd ---------- */
  function odswiezPodglad(znalezisko) {
    const pre = $('podglad');
    pre.textContent = '';
    if (!znalezisko) {
      pre.appendChild(document.createTextNode(stan.tekst));
      return;
    }
    const przed = document.createTextNode(stan.tekst.slice(0, znalezisko.start));
    const mark = document.createElement('mark');
    mark.textContent = stan.tekst.slice(znalezisko.start, znalezisko.koniec) || '⌖';
    const po = document.createTextNode(stan.tekst.slice(znalezisko.koniec));
    pre.appendChild(przed); pre.appendChild(mark); pre.appendChild(po);
    mark.scrollIntoView({ block: 'center' });
  }

  /* ---------- Filtry ---------- */
  function renderujFiltry() {
    const kont = $('filtry-kategorie');
    kont.textContent = '';
    const liczby = {};
    for (const z of stan.znaleziska) liczby[z.kat] = (liczby[z.kat] || 0) + 1;
    for (const [kat, nazwa] of Object.entries(OO.KATEGORIE)) {
      if (!liczby[kat]) continue;
      const label = document.createElement('label');
      label.className = 'filtr-kat';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = stan.filtryKat[kat];
      cb.addEventListener('change', () => { stan.filtryKat[kat] = cb.checked; renderujListe(); });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${kat}. ${nazwa} (${liczby[kat]})`));
      kont.appendChild(label);
    }
  }
  document.querySelectorAll('input[name="pewnosc"]').forEach(r =>
    r.addEventListener('change', () => { stan.pokaz = r.value; renderujListe(); }));

  /* ---------- Lista znalezisk ---------- */
  function widoczne() {
    return stan.znaleziska.filter(z =>
      stan.filtryKat[z.kat] &&
      (stan.pokaz === 'wszystkie' || z.pewnosc === 'pewne') &&
      z.status !== 'nieaktualne');
  }

  function iloscDoHurtu() {
    return widoczne().filter(z => z.status === 'otwarte' && z.pewnosc === 'pewne' && z.zamiana !== null).length;
  }

  function pokazZamiane(s) {
    if (s === '') return '(usuń)';
    return s.replace(/ /g, '␣').replace(/\n/g, '⏎');
  }

  function elementZnaleziska(z) {
    const div = document.createElement('div');
    div.className = 'znalezisko' + (z.pewnosc === 'heurystyka' ? ' heurystyka' : '') +
      (z.status !== 'otwarte' ? ' zalatwione' : '');

    const nag = document.createElement('div');
    nag.className = 'znalezisko-naglowek';
    const nazwa = document.createElement('span');
    nazwa.className = 'znalezisko-nazwa';
    nazwa.textContent = `${z.regula} · ${z.nazwa}`;
    const badge = document.createElement('span');
    badge.className = 'badge ' + (z.pewnosc === 'pewne' ? 'badge-pewne' : 'badge-heur');
    badge.textContent = z.pewnosc;
    nag.appendChild(nazwa); nag.appendChild(badge);
    if (z.status !== 'otwarte') {
      const st = document.createElement('span');
      st.className = 'badge badge-status';
      st.textContent = z.status === 'zaakceptowane' ? '✓ zastosowano' :
        z.status === 'odrzucone' ? 'odrzucono' :
        z.status === 'zalatwione' ? '✓ załatwione ręcznie' : 'nieaktualne';
      nag.appendChild(st);
    }
    div.appendChild(nag);

    if (z.opis) {
      const op = document.createElement('div');
      op.className = 'znalezisko-opis';
      op.textContent = z.opis;
      div.appendChild(op);
    }

    const ctx = document.createElement('div');
    ctx.className = 'znalezisko-kontekst';
    ctx.title = 'Kliknij, aby zobaczyć miejsce w podglądzie tekstu';
    ctx.appendChild(document.createTextNode('…' + z.kontekst.slice(0, z.kontekstOd)));
    const m = document.createElement('mark');
    m.textContent = z.kontekst.slice(z.kontekstOd, z.kontekstDo) || '⌖';
    ctx.appendChild(m);
    ctx.appendChild(document.createTextNode(z.kontekst.slice(z.kontekstDo) + '…'));
    ctx.addEventListener('click', () => odswiezPodglad(z.status === 'otwarte' || z.status === 'odrzucone' || z.status === 'zalatwione' ? z : null));
    div.appendChild(ctx);

    if (z.zamiana !== null) {
      const zw = document.createElement('div');
      zw.className = 'zamiana-wiersz';
      const c1 = document.createElement('code');
      c1.textContent = pokazZamiane(z.znaleziono);
      const c2 = document.createElement('code');
      c2.textContent = pokazZamiane(z.zamiana);
      zw.appendChild(c1);
      zw.appendChild(document.createTextNode(' → '));
      zw.appendChild(c2);
      div.appendChild(zw);
    }

    if (z.status === 'otwarte') {
      if (z.zamiana === null) {
        const nota = document.createElement('div');
        nota.className = 'znalezisko-nota';
        nota.textContent = 'Program tylko wskazuje miejsce — poprawkę (jeśli trzeba) nanieś ręcznie w tekście.';
        div.appendChild(nota);
      }
      const prz = document.createElement('div');
      prz.className = 'znalezisko-przyciski';
      if (z.zamiana !== null) {
        const ba = document.createElement('button');
        ba.className = 'btn-maly btn-akceptuj';
        ba.textContent = 'Akceptuj';
        ba.addEventListener('click', () => { zastosujZnaleziska([z]); renderujListe(); });
        prz.appendChild(ba);
      } else {
        const bz = document.createElement('button');
        bz.className = 'btn-maly btn-zalatwione';
        bz.textContent = '✓ Załatwione';
        bz.title = 'Poprawione ręcznie w tekście — zdejmij z listy';
        bz.addEventListener('click', () => { z.status = 'zalatwione'; renderujListe(); });
        prz.appendChild(bz);
      }
      const bo = document.createElement('button');
      bo.className = 'btn-maly btn-odrzuc';
      bo.textContent = 'Odrzuć';
      bo.addEventListener('click', () => { z.status = 'odrzucone'; renderujListe(); });
      prz.appendChild(bo);
      div.appendChild(prz);
    }
    return div;
  }

  function renderujListe() {
    const kont = $('lista-znalezisk');
    kont.textContent = '';
    const wid = widoczne();
    const otwarte = wid.filter(z => z.status === 'otwarte').length;
    $('suma-znalezisk').textContent =
      ` — ${wid.length.toLocaleString('pl-PL')} widocznych · ${otwarte.toLocaleString('pl-PL')} do decyzji · ${stan.zastosowanych.toLocaleString('pl-PL')} zastosowanych`;
    $('btn-hurt').textContent = `Zastosuj wszystkie pewne (${iloscDoHurtu().toLocaleString('pl-PL')})`;
    $('btn-hurt').disabled = iloscDoHurtu() === 0;

    const wgKat = {};
    for (const z of wid) (wgKat[z.kat] = wgKat[z.kat] || []).push(z);

    for (const kat of Object.keys(OO.KATEGORIE)) {
      const grupa = wgKat[kat];
      if (!grupa || !grupa.length) continue;
      const det = document.createElement('details');
      det.className = 'grupa-kat';
      det.open = grupa.length <= 400;
      const sum = document.createElement('summary');
      sum.textContent = `${kat}. ${OO.KATEGORIE[kat]} `;
      const ile = document.createElement('span');
      ile.className = 'ile';
      const otwGr = grupa.filter(z => z.status === 'otwarte').length;
      ile.textContent = `— ${grupa.length} znalezisk, ${otwGr} do decyzji`;
      sum.appendChild(ile);
      det.appendChild(sum);

      const limit = stan.limity[kat] || 150;
      grupa.slice(0, limit).forEach(z => det.appendChild(elementZnaleziska(z)));
      if (grupa.length > limit) {
        const bw = document.createElement('button');
        bw.className = 'btn btn-drugi btn-wiecej';
        bw.textContent = `Pokaż więcej (pozostało ${(grupa.length - limit).toLocaleString('pl-PL')})`;
        bw.addEventListener('click', () => { stan.limity[kat] = limit + 300; renderujListe(); });
        det.appendChild(bw);
      }
      kont.appendChild(det);
    }
    if (!wid.length) {
      const p = document.createElement('p');
      p.className = 'objasnienie';
      p.textContent = 'Brak znalezisk przy obecnych filtrach. To dobrze — albo czas poluzować filtry.';
      kont.appendChild(p);
    }
  }

  /* ---------- Hurtowe poprawki ---------- */
  $('btn-hurt').addEventListener('click', () => {
    const doHurtu = widoczne().filter(z => z.status === 'otwarte' && z.pewnosc === 'pewne' && z.zamiana !== null);
    const ile = zastosujZnaleziska(doHurtu);
    renderujListe();
    if (ile) $('btn-hurt').textContent = `Zastosowano ${ile} poprawek ✓`;
  });

  /* ---------- Eksport ---------- */
  function pobierz(nazwa, tresc, typ) {
    const blob = new Blob([tresc], { type: typ });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nazwa;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $('btn-kopiuj').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(stan.tekst);
      $('btn-kopiuj').textContent = '✓ Skopiowano';
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = stan.tekst;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      $('btn-kopiuj').textContent = '✓ Skopiowano';
    }
    setTimeout(() => { $('btn-kopiuj').textContent = '📋 Kopiuj poprawiony tekst'; }, 2000);
  });

  $('btn-pobierz-txt').addEventListener('click', () =>
    pobierz('tekst-po-korekcie.txt', stan.tekst, 'text/plain;charset=utf-8'));

  $('btn-pobierz-raport').addEventListener('click', () => {
    const data = new Date().toLocaleString('pl-PL');
    const slowa = (stan.tekst.match(/\p{L}+/gu) || []).length;
    const k = stan.konwencja;
    const w = [];
    w.push('# Ostatnie Oko — raport korekty');
    w.push('');
    w.push(`- Data: ${data}`);
    w.push(`- Objętość: ${stan.tekst.length.toLocaleString('pl-PL')} znaków, ${slowa.toLocaleString('pl-PL')} słów`);
    w.push(`- Konwencja: cudzysłów ${k.cudzyslow}, kreska dialogowa ${k.dialog}, wielokropek ${k.wielokropek}, wtrącenia „ ${k.wtracenie} ”`);
    w.push('');
    w.push('## Statystyki');
    w.push('');
    w.push('| Kategoria | Znaleziska | Zastosowane | Załatwione ręcznie | Odrzucone |');
    w.push('|---|---|---|---|---|');
    const wgKat = {};
    for (const z of stan.znaleziska) (wgKat[z.kat] = wgKat[z.kat] || []).push(z);
    for (const kat of Object.keys(OO.KATEGORIE)) {
      const g = wgKat[kat] || [];
      if (!g.length) continue;
      const zast = g.filter(z => z.status === 'zaakceptowane').length;
      const zal = g.filter(z => z.status === 'zalatwione').length;
      const odrz = g.filter(z => z.status === 'odrzucone').length;
      w.push(`| ${kat}. ${OO.KATEGORIE[kat]} | ${g.length} | ${zast} | ${zal} | ${odrz} |`);
    }
    w.push('');
    const LIMIT = 1500;
    for (const kat of Object.keys(OO.KATEGORIE)) {
      const g = wgKat[kat] || [];
      if (!g.length) continue;
      w.push(`## ${kat}. ${OO.KATEGORIE[kat]}`);
      w.push('');
      for (const z of g.slice(0, LIMIT)) {
        const status = z.status === 'zaakceptowane' ? 'zastosowano' :
          z.status === 'odrzucone' ? 'odrzucono' :
          z.status === 'zalatwione' ? 'załatwione ręcznie' :
          z.status === 'nieaktualne' ? 'nieaktualne' : 'bez decyzji';
        const zamiana = z.zamiana !== null ? ` — \`${z.znaleziono || '∅'}\` → \`${z.zamiana || '∅'}\`` : '';
        const opis = z.opis ? ` (${z.opis})` : '';
        w.push(`- **${z.regula} ${z.nazwa}** [${z.pewnosc}]${zamiana}${opis} — _${status}_`);
      }
      if (g.length > LIMIT) w.push(`- …oraz ${g.length - LIMIT} kolejnych znalezisk w tej kategorii.`);
      w.push('');
    }
    w.push('---');
    w.push('_Ostatnie Oko sprawdza mechanikę zapisu. Nie widzi literówek zmieniających znaczenie (morze/może), błędnej odmiany ani stylu — te warstwy wymagają korekty rozumiejącej tekst._');
    pobierz('ostatnie-oko-raport.md', w.join('\n'), 'text/markdown;charset=utf-8');
  });

  /* ---------- Tryb testowy ---------- */
  if (new URLSearchParams(location.search).get('test') === '1') {
    $('sekcja-testy').classList.remove('ukryte');
    const cb = wyniki => {
      const tbody = $('tabela-testow').querySelector('tbody');
      tbody.textContent = '';
      let ok = 0;
      for (const t of wyniki) {
        if (t.ok) ok++;
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = t.nazwa;
        const zd = document.createElement('span');
        zd.className = 'zdanie';
        zd.textContent = t.tekst;
        td1.appendChild(zd);
        const td2 = document.createElement('td'); td2.textContent = t.oczekiwane;
        const td3 = document.createElement('td'); td3.textContent = t.wykryte;
        const td4 = document.createElement('td');
        td4.textContent = t.ok ? 'OK' : 'FAIL';
        td4.className = t.ok ? 'ok' : 'fail';
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
        tbody.appendChild(tr);
      }
      $('testy-podsumowanie').textContent = `Wynik: ${ok}/${wyniki.length} testów OK` + (ok === wyniki.length ? ' ✓' : ' — są porażki!');
    };
    const w = zapewnijWorker();
    if (w) {
      odbiorcy.testy = cb;
      w.postMessage({ cmd: 'testy' });
      setTimeout(() => { if (workerZepsuty && odbiorcy.testy) { odbiorcy.testy = null; cb(OO.uruchomTesty()); } }, 500);
    } else {
      cb(OO.uruchomTesty());
    }
  }

  odswiezLicznik();
})();
