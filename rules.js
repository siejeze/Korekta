/* ============================================================
   Ostatnie Oko — silnik reguł ortotypograficznych
   Czysty JS, bez zależności. Działa w Web Workerze i w oknie.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Kategorie ---------- */
  const KATEGORIE = {
    A: 'Spacje i znaki niewidzialne',
    B: 'Cudzysłowy i apostrofy',
    C: 'Kreski: dywiz, półpauza, pauza',
    D: 'Zapis dialogów',
    E: 'Wielokropek',
    F: 'Powtórzenia i zdublowania',
    G: 'Konsekwencja nazw własnych',
    H: 'Skróty i zapis edytorski',
    I: 'Heurystyki przecinkowe'
  };

  /* ---------- Definicje reguł ---------- */
  const REGULY = {
    A1: { kat: 'A', nazwa: 'Wielokrotne spacje', pewnosc: 'pewne' },
    A2: { kat: 'A', nazwa: 'Tabulator w środku akapitu', pewnosc: 'pewne' },
    A3: { kat: 'A', nazwa: 'Spacje na końcu wiersza', pewnosc: 'pewne' },
    A4: { kat: 'A', nazwa: 'Spacja przed znakiem interpunkcyjnym', pewnosc: 'pewne' },
    A5: { kat: 'A', nazwa: 'Brak spacji po znaku interpunkcyjnym', pewnosc: 'pewne' },
    A6: { kat: 'A', nazwa: 'Spacja po nawiasie otwierającym', pewnosc: 'pewne' },
    A7: { kat: 'A', nazwa: 'Niesparowane nawiasy', pewnosc: 'pewne' },
    A8: { kat: 'A', nazwa: 'Twarda spacja (U+00A0)', pewnosc: 'pewne' },
    B1: { kat: 'B', nazwa: 'Cudzysłów niezgodny z konwencją', pewnosc: 'pewne' },
    B2: { kat: 'B', nazwa: 'Niesparowany cudzysłów w akapicie', pewnosc: 'pewne' },
    B3: { kat: 'B', nazwa: 'Cudzysłów drugiego stopnia «…»', pewnosc: 'heurystyka' },
    B4: { kat: 'B', nazwa: 'Apostrof prosty zamiast typograficznego', pewnosc: 'pewne' },
    C1: { kat: 'C', nazwa: 'Dywiz jako wtrącenie', pewnosc: 'pewne' },
    C2: { kat: 'C', nazwa: 'Dywiz w zakresie liczb', pewnosc: 'pewne' },
    C3: { kat: 'C', nazwa: 'Mieszanie pauzy i półpauzy', pewnosc: 'pewne' },
    C4: { kat: 'C', nazwa: 'Kreska na końcu wiersza (przeniesienie?)', pewnosc: 'heurystyka' },
    D1: { kat: 'D', nazwa: 'Kreska dialogowa niezgodna z konwencją', pewnosc: 'pewne' },
    D5: { kat: 'D', nazwa: 'Brak spacji po kresce dialogowej', pewnosc: 'pewne' },
    D2a: { kat: 'D', nazwa: 'Kropka przed didaskaliami', pewnosc: 'pewne' },
    D2b: { kat: 'D', nazwa: 'Didaskalia wielką literą', pewnosc: 'pewne' },
    D2c: { kat: 'D', nazwa: 'Możliwe didaskalia po kropce', pewnosc: 'heurystyka' },
    D3a: { kat: 'D', nazwa: 'Brak kropki po didaskaliach przed kontynuacją', pewnosc: 'pewne' },
    D3b: { kat: 'D', nazwa: 'Kontynuacja wypowiedzi małą literą', pewnosc: 'pewne' },
    D4: { kat: 'D', nazwa: 'Dialog w cudzysłowie przy konwencji pauzy', pewnosc: 'heurystyka' },
    E1: { kat: 'E', nazwa: 'Wielokropek niezgodny z konwencją', pewnosc: 'pewne' },
    E2: { kat: 'E', nazwa: 'Cztery i więcej kropek', pewnosc: 'pewne' },
    E3: { kat: 'E', nazwa: 'Spacja przed wielokropkiem', pewnosc: 'pewne' },
    E4: { kat: 'E', nazwa: 'Wielokropek i kropka obok siebie', pewnosc: 'pewne' },
    F1: { kat: 'F', nazwa: 'Ten sam wyraz dwa razy pod rząd', pewnosc: 'pewne' },
    F2: { kat: 'F', nazwa: 'Powtórzenie wyrazu w bliskim sąsiedztwie', pewnosc: 'heurystyka' },
    F3: { kat: 'F', nazwa: 'Zdublowane znaki interpunkcyjne', pewnosc: 'pewne' },
    G1: { kat: 'G', nazwa: 'Podobne nazwy własne (możliwa literówka)', pewnosc: 'heurystyka' },
    G2: { kat: 'G', nazwa: 'Raz wielką, raz małą literą', pewnosc: 'heurystyka' },
    H1: { kat: 'H', nazwa: 'Skrót bez kropki / zły zapis skrótu', pewnosc: 'pewne' },
    H2: { kat: 'H', nazwa: 'Brak spacji przed „r." / „w."', pewnosc: 'pewne' },
    H3: { kat: 'H', nazwa: 'Brak spacji między liczbą a jednostką', pewnosc: 'pewne' },
    H4: { kat: 'H', nazwa: 'Inicjał bez spacji po kropce', pewnosc: 'pewne' },
    I1: { kat: 'I', nazwa: 'Możliwy brak przecinka przed spójnikiem', pewnosc: 'heurystyka' },
    I2: { kat: 'I', nazwa: 'Przecinek przed „i/oraz/albo" — do decyzji autora', pewnosc: 'heurystyka' }
  };

  /* ---------- Czasowniki mówienia (formy m., ż., n., mn.) ---------- */
  const CZASOWNIKI_BAZA = [
    'powiedział', 'rzekł', 'szepnął', 'spytał', 'zapytał', 'odparł', 'mruknął',
    'krzyknął', 'dodał', 'wtrącił', 'zawołał', 'odpowiedział', 'syknął',
    'westchnął', 'bąknął', 'wykrztusił', 'powtórzył', 'wyjaśnił', 'przyznał',
    'zauważył', 'stwierdził', 'oznajmił', 'zaproponował', 'poprosił', 'jęknął',
    'warknął', 'burknął', 'wyszeptał', 'wymamrotał', 'zagadnął', 'przerwał',
    'ciągnął', 'kontynuował', 'zaczął', 'dokończył', 'uciął', 'prychnął',
    'parsknął', 'zapewnił', 'zaprotestował', 'przytaknął', 'zaperzył',
    'ponaglił', 'upierał', 'nalegał', 'zażartował', 'zadrwił', 'zakpił',
    'wycedził', 'wychrypiał', 'wydusił', 'jąkał', 'dorzucił', 'huknął',
    'ryknął', 'pisnął', 'zaskrzeczał', 'odburknął', 'odszepnął', 'zgodził'
  ];
  const CZASOWNIKI = new Set();
  for (const m of CZASOWNIKI_BAZA) {
    CZASOWNIKI.add(m);                    // rodzaj męski: powiedział
    CZASOWNIKI.add(m + 'a');              // żeński: powiedziała
    CZASOWNIKI.add(m + 'o');              // nijaki: powiedziało
    if (m.endsWith('ął')) {               // szepnął → szepnęła, szepnęli, szepnęły
      const rdzen = m.slice(0, -2);
      CZASOWNIKI.add(rdzen + 'ęła');
      CZASOWNIKI.add(rdzen + 'ęło');
      CZASOWNIKI.add(rdzen + 'ęli');
      CZASOWNIKI.add(rdzen + 'ęły');
    } else if (m.endsWith('ał') || m.endsWith('ył') || m.endsWith('ił') || m.endsWith('ął')) {
      CZASOWNIKI.add(m + 'i');            // powiedziali (rzadkie, ale nieszkodliwe)
      CZASOWNIKI.add(m + 'y');            // powiedziały
    }
  }
  // nieregularne liczby mnogie
  ['powiedzieli', 'powiedziały', 'rzekli', 'rzekły', 'odparli', 'odparły',
   'przerwali', 'przerwały', 'zaczęli', 'zaczęły', 'wtrącili', 'wtrąciły',
   'dodali', 'dodały', 'spytali', 'spytały', 'zapytali', 'zapytały',
   'odpowiedzieli', 'odpowiedziały', 'zawołali', 'zawołały'
  ].forEach(f => CZASOWNIKI.add(f));

  /* ---------- Stop-words dla F2 (wyrazy 5+ liter bez znaczenia leksykalnego) ---------- */
  const STOPWORDS = new Set([
    'ponieważ', 'jednak', 'jeszcze', 'także', 'bardzo', 'kiedy', 'który',
    'która', 'które', 'którego', 'której', 'którym', 'których', 'którzy',
    'którą', 'wszystko', 'wszyscy', 'wszystkie', 'wszystkich', 'przecież',
    'tylko', 'potem', 'teraz', 'wtedy', 'zaraz', 'dopiero', 'również',
    'właśnie', 'między', 'wśród', 'przed', 'przez', 'ponad', 'około',
    'trzeba', 'można', 'może', 'jeśli', 'jeżeli', 'żeby', 'aby',
    'byłam', 'byłem', 'byłaś', 'byłeś', 'byliśmy', 'byłyśmy', 'będzie',
    'będą', 'jestem', 'jesteś', 'jesteśmy', 'niech', 'nawet', 'wcale',
    'gdzie', 'kiedyś', 'gdzieś', 'czegoś', 'czymś', 'wobec', 'według',
    'podczas', 'chyba', 'przede', 'sobie', 'siebie', 'swoje', 'swojej',
    'swoim', 'swego', 'tamten', 'tamta', 'tamto', 'tutaj'
  ]);

  /* ---------- Pomocnicze ---------- */

  function podzielNaLinie(text) {
    const linie = [];
    let start = 0;
    for (let i = 0; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        linie.push({ start, koniec: i, tekst: text.slice(start, i) });
        start = i + 1;
      }
    }
    return linie;
  }

  function levenshtein(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const n = a.length, m = b.length;
    let prev = new Array(m + 1), cur = new Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      let best = i;
      for (let j = 1; j <= m; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      [prev, cur] = [cur, prev];
    }
    return prev[m];
  }

  const KONCOWKI = ['ami', 'ach', 'owi', 'iem', 'em', 'om', 'ie', 'ą', 'ę', 'a', 'y', 'u', 'o', 'i', 'e'];
  function zetnijKoncowke(slowo) {
    const s = slowo.toLowerCase();
    for (const k of KONCOWKI) {
      if (s.length - k.length >= 4 && s.endsWith(k)) return s.slice(0, -k.length);
    }
    return s;
  }

  const RE_LITERA = /\p{L}/u;
  const RE_WIELKA = /\p{Lu}/u;

  function jestLitera(ch) { return ch !== undefined && RE_LITERA.test(ch); }
  function jestWielka(ch) { return ch !== undefined && RE_WIELKA.test(ch); }

  /* ---------- Wykrywanie konwencji ---------- */

  function wykryjKonwencje(text) {
    const probka = text.length > 400000 ? text.slice(0, 400000) : text;

    const polskie = (probka.match(/„/g) || []).length;
    const francuskie = (probka.match(/«/g) || []).length;
    const proste = (probka.match(/"/g) || []).length;
    let cudzyslow = 'polski';
    if (francuskie > polskie && francuskie > proste) cudzyslow = 'francuski';
    else if (proste > polskie && proste > francuskie) cudzyslow = 'prosty';

    const linie = podzielNaLinie(probka);
    let dlgPauza = 0, dlgPolpauza = 0, dlgDywiz = 0;
    let wtrPauza = 0, wtrPolpauza = 0;
    for (const l of linie) {
      const m = l.tekst.match(/^[ \t]*([—–-])(?=[ \t]|\p{L})/u);
      if (m) {
        if (m[1] === '—') dlgPauza++;
        else if (m[1] === '–') dlgPolpauza++;
        else dlgDywiz++;
      }
      // wtrącenia: kreski ze spacjami w głębi wiersza
      const wnetrze = l.tekst.replace(/^[ \t]*[—–-][ \t]*/, '');
      wtrPauza += (wnetrze.match(/ — /g) || []).length;
      wtrPolpauza += (wnetrze.match(/ – /g) || []).length;
    }
    let dialog = 'brak';
    const maxDlg = Math.max(dlgPauza, dlgPolpauza, dlgDywiz);
    if (maxDlg > 0) {
      dialog = dlgPauza === maxDlg ? '—' : (dlgPolpauza === maxDlg ? '–' : '-');
    }

    const kropki3 = (probka.match(/(?<!\.)\.{3}(?!\.)/g) || []).length;
    const znakHellip = (probka.match(/…/g) || []).length;
    const wielokropek = kropki3 > znakHellip ? '...' : '…';

    let wtracenie;
    if (wtrPauza === 0 && wtrPolpauza === 0) {
      wtracenie = dialog === '—' ? '—' : '–';
    } else {
      wtracenie = wtrPauza >= wtrPolpauza ? '—' : '–';
    }

    return {
      cudzyslow, dialog, wielokropek, wtracenie,
      statystyki: {
        cudzyslowy: { polskie, francuskie, proste },
        dialogi: { pauza: dlgPauza, polpauza: dlgPolpauza, dywiz: dlgDywiz },
        wielokropki: { znak: znakHellip, kropki: kropki3 },
        wtracenia: { pauza: wtrPauza, polpauza: wtrPolpauza }
      }
    };
  }

  /* ---------- Silnik skanowania ---------- */

  const DOMYSLNE_OPCJE = { oknoF2: 25, ignorujPytajnikWykrzyknik: true };

  function skanuj(text, konw, opcje, onProgress) {
    opcje = Object.assign({}, DOMYSLNE_OPCJE, opcje || {});
    const wyniki = [];
    let seq = 0;
    const KROKI = 14;
    let krok = 0;
    function postep() { krok++; if (onProgress) onProgress(krok / KROKI); }

    function dodaj(regula, start, koniec, zamiana, opis) {
      const def = REGULY[regula];
      const od = Math.max(0, start - 40);
      const doo = Math.min(text.length, koniec + 40);
      wyniki.push({
        id: seq++,
        regula,
        nazwa: def.nazwa,
        kat: def.kat,
        katNazwa: KATEGORIE[def.kat],
        pewnosc: def.pewnosc,
        start, koniec,
        znaleziono: text.slice(start, koniec),
        zamiana: zamiana === undefined ? null : zamiana,
        opis: opis || '',
        kontekst: text.slice(od, doo),
        kontekstOd: start - od,
        kontekstDo: start - od + (koniec - start)
      });
    }

    function kazdeDopasowanie(re, cb) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        cb(m);
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }

    const linie = podzielNaLinie(text);
    const RE_DIALOG = /^[ \t]*([—–-])/;
    function liniaDialogowa(l) {
      const m = l.tekst.match(RE_DIALOG);
      return m ? m[1] : null;
    }

    /* === A. Spacje i znaki niewidzialne === */
    kazdeDopasowanie(/(?<=\S) {2,}(?=\S)/g, m =>
      dodaj('A1', m.index, m.index + m[0].length, ' ', `${m[0].length} spacje z rzędu`));
    kazdeDopasowanie(/(?<=\S)\t+(?=\S)/g, m =>
      dodaj('A2', m.index, m.index + m[0].length, ' ', 'tabulator w środku akapitu'));
    kazdeDopasowanie(/[ \t]+(?=\n)/g, m =>
      dodaj('A3', m.index, m.index + m[0].length, '', 'spacje na końcu wiersza'));
    postep();

    // spacja przed , . ; : ! ? )
    kazdeDopasowanie(/ +([,.;:!?)])/g, m => {
      const znak = m[1];
      const po = text[m.index + m[0].length];
      if (znak === '.' && (po === '.' || text[m.index + m[0].length] === undefined && false)) return; // " ..." → E3
      if (znak === '.' && po === '.') return;
      dodaj('A4', m.index, m.index + m[0].length, znak, `spacja przed „${znak}"`);
    });

    // brak spacji po , ; : ! ?
    kazdeDopasowanie(/([,;:!?])([^\s])/g, m => {
      const znak = m[1], nast = m[2];
      const przed = text[m.index - 1];
      // liczby 3,14 i godziny 12:30
      if ((znak === ',' || znak === ':') && /\d/.test(przed || '') && /\d/.test(nast)) return;
      // adresy URL (http://)
      if (znak === ':' && nast === '/' ) return;
      // zbitki interpunkcyjne, zamknięcia — nie tu
      if ('.,;:!?…)]}»”"\'’'.includes(nast)) return;
      dodaj('A5', m.index, m.index + 1, znak + ' ', `brak spacji po „${znak}"`);
    });
    postep();

    kazdeDopasowanie(/\( +/g, m =>
      dodaj('A6', m.index, m.index + m[0].length, '(', 'spacja po nawiasie otwierającym'));

    for (const l of linie) {
      const otw = (l.tekst.match(/\(/g) || []).length;
      const zam = (l.tekst.match(/\)/g) || []).length;
      if (otw !== zam) {
        dodaj('A7', l.start, Math.min(l.koniec, l.start + Math.max(1, l.tekst.length)), null,
          `nawiasy otwierające: ${otw}, zamykające: ${zam}`);
      }
    }

    kazdeDopasowanie(/ /g, m =>
      dodaj('A8', m.index, m.index + 1, null, 'twarda spacja — sprawdź, czy zamierzona'));
    postep();

    /* === B. Cudzysłowy i apostrofy === */
    const paraOtw = konw.cudzyslow === 'francuski' ? '«' : '„';
    const paraZam = konw.cudzyslow === 'francuski' ? '»' : '”';

    kazdeDopasowanie(/"/g, m => {
      const przed = text[m.index - 1];
      const otwierajacy = przed === undefined || /[\s([{—–-]/.test(przed) || przed === '„' || przed === '«';
      const zamiana = otwierajacy ? paraOtw : paraZam;
      const opis = konw.cudzyslow === 'prosty'
        ? 'cudzysłów prosty w prozie — zalecany typograficzny (zawsze zgłaszane)'
        : 'cudzysłów prosty niezgodny z konwencją';
      dodaj('B1', m.index, m.index + 1, zamiana, opis);
    });
    if (konw.cudzyslow === 'francuski') {
      kazdeDopasowanie(/„/g, m => dodaj('B1', m.index, m.index + 1, '«', 'cudzysłów polski przy konwencji francuskiej'));
      kazdeDopasowanie(/”/g, m => dodaj('B1', m.index, m.index + 1, '»', 'cudzysłów polski przy konwencji francuskiej'));
    }
    if (konw.cudzyslow === 'polski') {
      // «…» w tekście polskim = II stopień — do weryfikacji
      kazdeDopasowanie(/«[^«»\n]{0,200}»/g, m =>
        dodaj('B3', m.index, m.index + m[0].length, null, 'cudzysłów drugiego stopnia — zweryfikuj zasadność zagnieżdżenia'));
    }
    postep();

    for (const l of linie) {
      const t = l.tekst;
      const o1 = (t.match(/„/g) || []).length, z1 = (t.match(/”/g) || []).length;
      const o2 = (t.match(/«/g) || []).length, z2 = (t.match(/»/g) || []).length;
      const pr = (t.match(/"/g) || []).length;
      if (o1 !== z1 || o2 !== z2 || pr % 2 !== 0) {
        dodaj('B2', l.start, Math.min(l.koniec, l.start + Math.max(1, t.length)), null,
          `otwarcia/zamknięcia: „=${o1} ”=${z1}` + (o2 + z2 > 0 ? ` «=${o2} »=${z2}` : '') + (pr > 0 ? ` "=${pr}` : ''));
      }
    }

    kazdeDopasowanie(/(?<=\p{L})'(?=\p{L})/gu, m =>
      dodaj('B4', m.index, m.index + 1, '’', 'apostrof prosty → typograficzny'));
    postep();

    /* === C. Kreski === */
    const wtr = ` ${konw.wtracenie} `;
    kazdeDopasowanie(/ - /g, m =>
      dodaj('C1', m.index, m.index + 3, wtr, 'dywiz w funkcji wtrącenia'));
    kazdeDopasowanie(/(?<=\d)-(?=\d)/g, m =>
      dodaj('C2', m.index, m.index + 1, '–', 'zakres liczb: półpauza bez spacji'));
    postep();

    // mieszanie pauzy i półpauzy (wtrącenia w liniach narracyjnych)
    const zlaKreska = konw.wtracenie === '—' ? '–' : '—';
    for (const l of linie) {
      if (liniaDialogowa(l)) continue;
      let idx = 0;
      const wzor = ` ${zlaKreska} `;
      while ((idx = l.tekst.indexOf(wzor, idx)) !== -1) {
        dodaj('C3', l.start + idx, l.start + idx + 3, wtr,
          `w tekście dominuje ${konw.wtracenie === '—' ? 'pauza' : 'półpauza'} — tu użyto ${zlaKreska === '—' ? 'pauzy' : 'półpauzy'}`);
        idx += 3;
      }
    }

    kazdeDopasowanie(/(?<=\p{L})-(?=\n)/gu, m =>
      dodaj('C4', m.index, m.index + 1, null, 'kreska na końcu wiersza — możliwe przeniesienie z innego składu'));
    postep();

    /* === D. Dialogi === */
    const dlgKreska = konw.dialog;
    for (const l of linie) {
      const kreska = liniaDialogowa(l);
      const t = l.tekst;

      if (!kreska) {
        // D4: dialog w cudzysłowie przy konwencji pauzy
        if (dlgKreska !== 'brak' && dlgKreska !== null) {
          const pierwszy = t.trimStart()[0];
          if ((pierwszy === '„' || pierwszy === '"' || pierwszy === '«')) {
            const maCzasownik = t.split(/[^\p{L}]+/u).some(w => CZASOWNIKI.has(w.toLowerCase()));
            if (maCzasownik) {
              dodaj('D4', l.start, Math.min(l.koniec, l.start + t.length), null,
                'wygląda na dialog w cudzysłowie, a konwencją tekstu jest kreska dialogowa');
            }
          }
        }
        continue;
      }

      const posKreski = l.start + t.indexOf(kreska);

      // D1: kreska niezgodna z konwencją (dywiz zawsze błędem)
      if (dlgKreska !== 'brak') {
        if (kreska === '-') {
          const cel = dlgKreska !== '-' ? dlgKreska : '—';
          dodaj('D1', posKreski, posKreski + 1, cel, 'dywiz jako kreska dialogowa — błąd typograficzny (zawsze zgłaszane)');
        } else if (kreska !== dlgKreska) {
          dodaj('D1', posKreski, posKreski + 1, dlgKreska,
            `kreska dialogowa ${kreska} niezgodna z konwencją (${dlgKreska})`);
        }
      }

      // D5: brak spacji po kresce dialogowej
      const poKresce = text[posKreski + 1];
      if (poKresce !== undefined && poKresce !== ' ' && poKresce !== '\t' && poKresce !== '\n') {
        dodaj('D5', posKreski, posKreski + 1, kreska + ' ', 'brak spacji po kresce dialogowej');
      }

      // D2/D3: didaskalia — kreski w głębi linii
      const kreskiPoDidaskaliach = new Set();
      for (let i = 1; i < t.length; i++) {
        const ch = t[i];
        if (ch !== '—' && ch !== '–') continue;
        // wyraz po kresce
        let j = i + 1;
        while (j < t.length && t[j] === ' ') j++;
        let k = j;
        while (k < t.length && jestLitera(t[k])) k++;
        if (k === j) continue;
        const slowo = t.slice(j, k);
        const slowoLc = slowo.toLowerCase();
        // znak przed kreską (z pominięciem spacji)
        let p = i - 1;
        while (p >= 0 && t[p] === ' ') p--;
        const przedZnak = p >= 0 ? t[p] : '';
        const kropkaJestCzesciaWielokropka = przedZnak === '.' && p >= 2 && t[p - 1] === '.' && t[p - 2] === '.';

        if (CZASOWNIKI.has(slowoLc)) {
          if (przedZnak === '.' && !kropkaJestCzesciaWielokropka) {
            dodaj('D2a', l.start + p, l.start + p + 1, '',
              'przed didaskaliami nie stawia się kropki (dopuszczalne: ? ! …)');
          }
          if (jestWielka(slowo[0])) {
            dodaj('D2b', l.start + j, l.start + k, slowoLc,
              'czasownik mówienia w didaskaliach małą literą');
          }
          // D3: kontynuacja wypowiedzi po didaskaliach
          let n = k;
          let nastKreska = -1;
          while (n < t.length) {
            if (t[n] === '—' || t[n] === '–') { nastKreska = n; break; }
            n++;
          }
          if (nastKreska !== -1) {
            kreskiPoDidaskaliach.add(nastKreska);
            let q = nastKreska - 1;
            while (q >= 0 && t[q] === ' ') q--;
            const koniecDid = q >= 0 ? t[q] : '';
            let r = nastKreska + 1;
            while (r < t.length && t[r] === ' ') r++;
            const pierwszaLitera = t[r];
            if (jestLitera(pierwszaLitera)) {
              if (jestWielka(pierwszaLitera) && !'.!?…'.includes(koniecDid)) {
                dodaj('D3a', l.start + q + 1, l.start + q + 1, '.',
                  'po didaskaliach, przed kontynuacją wypowiedzi, stawiamy kropkę');
              } else if ('.!?…'.includes(koniecDid) && !jestWielka(pierwszaLitera)) {
                dodaj('D3b', l.start + r, l.start + r + 1, pierwszaLitera.toUpperCase(),
                  'kontynuacja wypowiedzi po didaskaliach zaczyna się wielką literą');
              }
            }
          }
        } else if (!kreskiPoDidaskaliach.has(i) && przedZnak === '.' && !kropkaJestCzesciaWielokropka &&
                   jestLitera(slowo[0]) && !jestWielka(slowo[0]) && slowo.length > 2) {
          dodaj('D2c', l.start + p, l.start + p + 1, null,
            `„${slowo}" wygląda na didaskalia (mała litera) — jeśli tak, kropka przed kreską jest zbędna`);
        }
      }
    }
    postep();

    /* === E. Wielokropek === */
    if (konw.wielokropek === '…') {
      kazdeDopasowanie(/(?<!\.)\.{3}(?!\.)/g, m =>
        dodaj('E1', m.index, m.index + 3, '…', 'trzy kropki → znak wielokropka (konwencja tekstu)'));
    } else {
      kazdeDopasowanie(/…/g, m =>
        dodaj('E1', m.index, m.index + 1, '...', 'znak wielokropka → trzy kropki (konwencja tekstu)'));
    }
    kazdeDopasowanie(/(?<!\.)\.{4,}(?!\.)/g, m =>
      dodaj('E2', m.index, m.index + m[0].length, konw.wielokropek, `${m[0].length} kropek z rzędu`));
    kazdeDopasowanie(/ +(…|(?<!\.)\.{3}(?!\.))/g, m =>
      dodaj('E3', m.index, m.index + m[0].length, konw.wielokropek, 'wielokropek przylega do wyrazu — bez spacji przed'));
    kazdeDopasowanie(/…\.|\.…/g, m =>
      dodaj('E4', m.index, m.index + m[0].length, '…', 'wielokropek i kropka obok siebie'));
    postep();

    /* === F. Powtórzenia === */
    kazdeDopasowanie(/(?<!\p{L})(\p{L}+)([ \t]+)\1(?!\p{L})/giu, m => {
      dodaj('F1', m.index, m.index + m[0].length, m[1], `wyraz „${m[1]}" dwa razy pod rząd`);
    });
    postep();

    // F2: okno wyrazów
    {
      const okno = opcje.oknoF2 || 25;
      const tokRe = /\p{L}+/gu;
      const ostatnie = new Map(); // lc → {poz, nrTokenu}
      let nr = 0, m;
      tokRe.lastIndex = 0;
      while ((m = tokRe.exec(text)) !== null) {
        nr++;
        const lc = m[0].toLowerCase();
        if (m[0].length >= 5 && !STOPWORDS.has(lc)) {
          const poprz = ostatnie.get(lc);
          if (poprz && nr - poprz.nr <= okno) {
            dodaj('F2', m.index, m.index + m[0].length, null,
              `„${m[0]}" powtórzone po ${nr - poprz.nr} wyrazach (okno: ${okno})`);
          }
          ostatnie.set(lc, { nr });
        }
      }
    }
    postep();

    // F3: zdublowana interpunkcja
    kazdeDopasowanie(/,{2,}/g, m => dodaj('F3', m.index, m.index + m[0].length, ',', 'zdublowany przecinek'));
    kazdeDopasowanie(/;{2,}/g, m => dodaj('F3', m.index, m.index + m[0].length, ';', 'zdublowany średnik'));
    kazdeDopasowanie(/\?{2,}/g, m => dodaj('F3', m.index, m.index + m[0].length, '?', 'zdublowany pytajnik'));
    kazdeDopasowanie(/!{2,}/g, m => dodaj('F3', m.index, m.index + m[0].length, '!', 'zdublowany wykrzyknik'));
    kazdeDopasowanie(/(?<!\.)\.\.(?!\.)/g, m => dodaj('F3', m.index, m.index + 2, '.', 'dwie kropki (nie wielokropek)'));
    if (!opcje.ignorujPytajnikWykrzyknik) {
      kazdeDopasowanie(/\?!|!\?/g, m => dodaj('F3', m.index, m.index + 2, '?', 'zbitka „?!" — do decyzji'));
    }
    postep();

    /* === G. Nazwy własne === */
    {
      // wyrazy wielką literą nie na początku zdania
      const tokRe = /\p{Lu}\p{Ll}+/gu;
      const wystapienia = new Map(); // surface → {n, pierwszaPoz}
      const maleWyrazy = new Map();  // lc → liczba wystąpień małą literą
      const wszystkieTokRe = /\p{L}+/gu;
      let m;
      wszystkieTokRe.lastIndex = 0;
      while ((m = wszystkieTokRe.exec(text)) !== null) {
        const w = m[0];
        if (!jestWielka(w[0])) {
          maleWyrazy.set(w.toLowerCase(), (maleWyrazy.get(w.toLowerCase()) || 0) + 1);
        }
      }
      tokRe.lastIndex = 0;
      while ((m = tokRe.exec(text)) !== null) {
        if (m[0].length < 3) continue;
        // czy początek zdania? cofamy się po spacjach, cudzysłowach, kreskach, nawiasach
        let p = m.index - 1;
        let poczatekZdania = false;
        while (p >= 0) {
          const ch = text[p];
          if (' \t„”«»"\'’—–-()'.includes(ch)) { p--; continue; }
          if (ch === '\n' || '.!?…'.includes(ch)) poczatekZdania = true;
          break;
        }
        if (p < 0) poczatekZdania = true;
        if (poczatekZdania) continue;
        const rek = wystapienia.get(m[0]);
        if (rek) rek.n++;
        else wystapienia.set(m[0], { n: 1, poz: m.index });
      }

      // G1: klastry Levenshteina po ściętym rdzeniu
      const slowa = [...wystapienia.keys()];
      const wiadra = new Map();
      for (const s of slowa) {
        const kl = s[0];
        if (!wiadra.has(kl)) wiadra.set(kl, []);
        wiadra.get(kl).push(s);
      }
      const zgloszone = new Set();
      let porownania = 0;
      for (const grupa of wiadra.values()) {
        for (let i = 0; i < grupa.length && porownania < 2000000; i++) {
          for (let j = i + 1; j < grupa.length; j++) {
            porownania++;
            const a = grupa[i], b = grupa[j];
            if (Math.abs(a.length - b.length) > 2) continue;
            const ra = zetnijKoncowke(a), rb = zetnijKoncowke(b);
            if (ra === rb) continue; // to samo słowo w odmianie
            const d = levenshtein(ra, rb, 2);
            if (d >= 1 && d <= 2 && Math.abs(ra.length - rb.length) <= 1 && ra.length >= 4) {
              const klucz = [a, b].sort().join('|');
              if (zgloszone.has(klucz)) continue;
              zgloszone.add(klucz);
              const wa = wystapienia.get(a), wb = wystapienia.get(b);
              const rzadsze = wa.n <= wb.n ? { s: a, w: wa } : { s: b, w: wb };
              dodaj('G1', rzadsze.w.poz, rzadsze.w.poz + rzadsze.s.length, null,
                `„${a}" (${wa.n}×) i „${b}" (${wb.n}×) — możliwa niekonsekwencja nazwy`);
            }
          }
        }
      }

      // G2: raz wielką, raz małą w środku zdania
      let zgloszonoG2 = 0;
      for (const [s, rek] of wystapienia) {
        if (zgloszonoG2 >= 40) break;
        if (s.length < 4) continue;
        const lc = s.toLowerCase();
        if (STOPWORDS.has(lc) || CZASOWNIKI.has(lc)) continue;
        const male = maleWyrazy.get(lc) || 0;
        if (male > 0) {
          zgloszonoG2++;
          dodaj('G2', rek.poz, rek.poz + s.length, null,
            `„${s}" wielką literą w środku zdania (${rek.n}×), a małą „${lc}" (${male}×) — sprawdź konsekwencję`);
        }
      }
    }
    postep();

    /* === H. Skróty === */
    kazdeDopasowanie(/(?<![\p{L}.])(np|itd|itp|tzn|tj)(?![\p{L}.’'])/gu, m =>
      dodaj('H1', m.index, m.index + m[0].length, m[1] + '.', `skrót „${m[1]}" wymaga kropki`));
    kazdeDopasowanie(/(?<![\p{L}.])ok(?![\p{L}.])(?= ?\d)/gu, m =>
      dodaj('H1', m.index, m.index + m[0].length, 'ok.', 'skrót „ok." (około) wymaga kropki'));
    kazdeDopasowanie(/(?<![\p{L}])m\. +in\./gu, m =>
      dodaj('H1', m.index, m.index + m[0].length, 'm.in.', '„m.in." piszemy łącznie'));
    kazdeDopasowanie(/(?<![\p{L}.])m\.in(?!\.)/gu, m =>
      dodaj('H1', m.index, m.index + m[0].length, 'm.in.', '„m.in." z kropką na końcu'));
    postep();

    kazdeDopasowanie(/(?<=\d)(r|w)\.(?!\p{L})/gu, m =>
      dodaj('H2', m.index, m.index + m[0].length, ' ' + m[0], `między liczbą a „${m[0]}" potrzebna spacja`));
    kazdeDopasowanie(/(?<=\d)(zł|km|kg|mln|tys|godz|proc|mm|cm|dag|ha|min|[mgl])(?![\p{L}²³])/gu, m =>
      dodaj('H3', m.index, m.index + m[0].length, ' ' + m[0], `między liczbą a „${m[0]}" potrzebna spacja`));
    kazdeDopasowanie(/(?<=(?:^|[^\p{L}])\p{Lu})\.(?=\p{Lu}(?:\p{Ll}|\.))/gu, m => {
      // wyjątek: utarte skrótowce typu S.A.
      const okolica = text.slice(Math.max(0, m.index - 1), m.index + 3);
      if (/S\.A\./.test(okolica)) return;
      dodaj('H4', m.index, m.index + 1, '. ', 'po kropce inicjału stawiamy spację');
    });
    postep();

    /* === I. Heurystyki przecinkowe === */
    const WYKLUCZ_PRZED = new Set([
      'i', 'a', 'ale', 'lecz', 'oraz', 'albo', 'lub', 'niż', 'jak', 'bo',
      'że', 'to', 'mimo', 'chyba', 'tylko', 'po', 'w', 'we', 'z', 'ze', 'za',
      'przed', 'nad', 'pod', 'o', 'do', 'od', 'dla', 'przy', 'bez', 'przez',
      'między', 'u', 'na', 'dzięki', 'wobec', 'według', 'podczas', 'poza',
      'koło', 'obok', 'około', 'spod', 'znad', 'sprzed', 'ku', 'przeciw', 'czy'
    ]);
    kazdeDopasowanie(/(\p{L}+)([ \t]+)(że|żeby|aby|ponieważ|który|która|które|którego|której|którym|których|którzy|którą)(?!\p{L})/giu, m => {
      const poprz = m[1].toLowerCase();
      if (WYKLUCZ_PRZED.has(poprz)) return;
      const startSpacji = m.index + m[1].length;
      dodaj('I1', startSpacji, startSpacji + m[2].length, ', ',
        `możliwy brak przecinka przed „${m[3]}" — oceń składnię zdania`);
    });
    kazdeDopasowanie(/,([ \t]+)(i|oraz|albo)(?!\p{L})/giu, m =>
      dodaj('I2', m.index, m.index + 1, '',
        `przecinek przed „${m[2]}" — w prostym szeregu zbędny, ale może być poprawny (wtrącenie, powtórzony spójnik); do decyzji autora`));
    postep();

    wyniki.sort((a, b) => a.start - b.start || a.koniec - b.koniec);
    return wyniki;
  }

  /* ---------- Nakładanie poprawek ---------- */

  function zastosujPoprawki(text, poprawki) {
    // poprawki: [{start, koniec, zamiana}] — nakładamy od końca, pomijamy nachodzące
    const posort = [...poprawki].sort((a, b) => b.start - a.start || b.koniec - a.koniec);
    let wynik = text;
    let granica = Infinity;
    let ile = 0;
    for (const p of posort) {
      if (p.zamiana === null || p.zamiana === undefined) continue;
      if (p.koniec > granica) continue; // nachodzi na już zastosowaną
      wynik = wynik.slice(0, p.start) + p.zamiana + wynik.slice(p.koniec);
      granica = p.start;
      ile++;
    }
    return { tekst: wynik, ile };
  }

  /* ---------- Zestaw testowy (?test=1) ---------- */

  const KONW_TEST = { cudzyslow: 'polski', dialog: '—', wielokropek: '…', wtracenie: '—' };

  const TESTY = [
    { nazwa: 'A1: podwójna spacja', tekst: 'To  jest zdanie.', oczekiwane: ['A1'] },
    { nazwa: 'A2: tabulator w akapicie', tekst: 'Słowo\tdrugie w akapicie.', oczekiwane: ['A2'] },
    { nazwa: 'A3: spacja na końcu wiersza', tekst: 'Koniec wiersza \nDalej.', oczekiwane: ['A3'] },
    { nazwa: 'A4: spacja przed pytajnikiem', tekst: 'Co teraz ?', oczekiwane: ['A4'] },
    { nazwa: 'A5: brak spacji po przecinku', tekst: 'Wziął płaszcz,kapelusz i laskę.', oczekiwane: ['A5'] },
    { nazwa: 'PUŁAPKA: godzina 12:30', tekst: 'Spotkali się o 12:30 przy studni.', oczekiwane: [] },
    { nazwa: 'PUŁAPKA: liczba 3,14', tekst: 'Liczba 3,14 to znane przybliżenie.', oczekiwane: [] },
    { nazwa: 'A6: spacja po nawiasie', tekst: 'Wszedł ( podobno) sam.', oczekiwane: ['A6'] },
    { nazwa: 'A7: niesparowany nawias', tekst: 'Otworzył nawias (i zapomniał go zamknąć.', oczekiwane: ['A7'] },
    { nazwa: 'A8: twarda spacja', tekst: 'Twarda spacja w zdaniu.', oczekiwane: ['A8'] },
    { nazwa: 'B1: cudzysłów prosty', tekst: 'Rzekła: "dość" i wyszła.', oczekiwane: ['B1'] },
    { nazwa: 'B2: niesparowany cudzysłów', tekst: 'Otworzyła „cudzysłów i nie zamknęła.', oczekiwane: ['B2'] },
    { nazwa: 'B3: cudzysłów II stopnia', tekst: 'Wspomniał: „Czytałem «Lalkę» wczoraj”.', oczekiwane: ['B3'] },
    { nazwa: 'B4: apostrof prosty', tekst: "Pod d'Artagnanem zadrżał koń.", oczekiwane: ['B4'] },
    { nazwa: 'C1: dywiz jako wtrącenie', tekst: 'Wszedł - jak zwykle - bez pukania.', oczekiwane: ['C1'] },
    { nazwa: 'C2: zakres liczb', tekst: 'Wojna trwała w latach 1914-1918.', oczekiwane: ['C2'] },
    { nazwa: 'C3: półpauza przy konwencji pauzy', tekst: 'Był tam – jak mówiono – od dawna.', oczekiwane: ['C3'] },
    { nazwa: 'C4: przeniesienie na końcu wiersza', tekst: 'Przyszedł wieczo-\nrem do domu.', oczekiwane: ['C4'] },
    { nazwa: 'D1: półpauza dialogowa', tekst: '– Nie wiem, co robić.', oczekiwane: ['D1'] },
    { nazwa: 'D1: dywiz dialogowy (zawsze błąd)', tekst: '- Wchodź szybko.', oczekiwane: ['D1'] },
    { nazwa: 'D5: brak spacji po kresce', tekst: '—Nie teraz.', oczekiwane: ['D5'] },
    { nazwa: 'D2a: kropka przed didaskaliami', tekst: '— Nie wiem. — powiedział cicho.', oczekiwane: ['D2a'] },
    { nazwa: 'D2b: didaskalia wielką literą', tekst: '— Nie wiem — Powiedział cicho.', oczekiwane: ['D2b'] },
    { nazwa: 'PUŁAPKA: poprawne didaskalia', tekst: '— Nie wiem — powiedział i spojrzał w okno.', oczekiwane: [] },
    { nazwa: 'D2c: didaskalia spoza listy czasowników', tekst: '— Nie wiem. — wybełkotał coś pod nosem.', oczekiwane: ['D2c'] },
    { nazwa: 'D3a: brak kropki przed kontynuacją', tekst: '— Zostań — poprosiła — Jutro będzie za późno.', oczekiwane: ['D3a'] },
    { nazwa: 'D3b: kontynuacja małą literą', tekst: '— Zostań — poprosiła. — jutro będzie za późno.', oczekiwane: ['D3b'] },
    { nazwa: 'PUŁAPKA: poprawna kontynuacja', tekst: '— Zostań — poprosiła. — Jutro będzie za późno.', oczekiwane: [] },
    { nazwa: 'PUŁAPKA: didaskalia ciągną się dalej', tekst: '— Nie — powiedział — i wyszedł.', oczekiwane: [] },
    { nazwa: 'PUŁAPKA: wzorcowy dialog z promptu', tekst: '— Nie wiem — powiedział. — I jeszcze jedno.', oczekiwane: [] },
    { nazwa: 'D4: dialog w cudzysłowie', tekst: '„Nie wiem” — powiedział Jan.', oczekiwane: ['D4'] },
    { nazwa: 'E1: trzy kropki przy konwencji …', tekst: 'Nie wiem... może jutro.', oczekiwane: ['E1'] },
    { nazwa: 'E2: pięć kropek', tekst: 'Czekał wciąż.....', oczekiwane: ['E2'] },
    { nazwa: 'E3: spacja przed wielokropkiem', tekst: 'Może kiedyś …', oczekiwane: ['E3'] },
    { nazwa: 'E4: wielokropek i kropka', tekst: 'To koniec….', oczekiwane: ['E4'] },
    { nazwa: 'F1: wyraz dwa razy pod rząd', tekst: 'Poszedł do do miasta.', oczekiwane: ['F1'] },
    { nazwa: 'PUŁAPKA: celowe „bardzo, bardzo"', tekst: 'Było bardzo, bardzo zimno.', oczekiwane: [] },
    { nazwa: 'F2: powtórzenie w oknie', tekst: 'Spojrzał na zegar, choć zegar dawno stanął.', oczekiwane: ['F2'] },
    { nazwa: 'F3: podwójny pytajnik', tekst: 'Co ty mówisz??', oczekiwane: ['F3'] },
    { nazwa: 'PUŁAPKA: zbitka ?! (domyślnie dozwolona)', tekst: 'Co ty mówisz?!', oczekiwane: [] },
    { nazwa: 'G1: podobne nazwy własne', tekst: 'Wtedy Katarzyna weszła pierwsza, a za nią Katażyna niosła kosz.', oczekiwane: ['G1'] },
    { nazwa: 'G2: Rynek/rynek', tekst: 'Poszli na Rynek przed południem. Cały rynek pachniał chlebem.', oczekiwane: ['G2', 'F2'] },
    { nazwa: 'H1: „np" bez kropki', tekst: 'Zabrał np mapę i kompas.', oczekiwane: ['H1'] },
    { nazwa: 'H1: „m. in." rozdzielnie', tekst: 'Kupił m. in. sól i pieprz.', oczekiwane: ['H1'] },
    { nazwa: 'H2: 1737r. bez spacji', tekst: 'Urodził się w 1737r. w Koninie.', oczekiwane: ['H2'] },
    { nazwa: 'H3: 5km bez spacji', tekst: 'Do miasta było 5km drogi.', oczekiwane: ['H3'] },
    { nazwa: 'H4: inicjał bez spacji', tekst: 'Spotkał J.Kowalskiego przy studni.', oczekiwane: ['H4'] },
    { nazwa: 'I1: brak przecinka przed „że"', tekst: 'Wiedział że nie wróci.', oczekiwane: ['I1'] },
    { nazwa: 'PUŁAPKA: „mimo że" bez przecinka w środku', tekst: 'Przyszedł mimo że padało.', oczekiwane: [] },
    { nazwa: 'PUŁAPKA: „po którym" po przecinku', tekst: 'To był dzień, po którym wszystko się zmieniło.', oczekiwane: [] },
    { nazwa: 'I2: przecinek przed „i" w szeregu', tekst: 'Kupił chleb, i masło.', oczekiwane: ['I2'] }
  ];

  function uruchomTesty() {
    const wynikiTestow = [];
    for (const t of TESTY) {
      const znalezione = skanuj(t.tekst, KONW_TEST, {});
      const zbior = [...new Set(znalezione.map(z => z.regula))].sort();
      const oczek = [...new Set(t.oczekiwane)].sort();
      const ok = zbior.length === oczek.length && zbior.every((r, i) => r === oczek[i]);
      wynikiTestow.push({
        nazwa: t.nazwa,
        tekst: t.tekst,
        oczekiwane: oczek.length ? oczek.join(', ') : '(nic)',
        wykryte: zbior.length ? zbior.join(', ') : '(nic)',
        ok
      });
    }
    return wynikiTestow;
  }

  /* ---------- Eksport ---------- */

  const OstatnieOko = {
    KATEGORIE, REGULY, TESTY,
    wykryjKonwencje, skanuj, zastosujPoprawki, uruchomTesty,
    DOMYSLNE_OPCJE
  };
  global.OstatnieOko = OstatnieOko;

  /* ---------- Tryb Web Workera ---------- */
  if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof module === 'undefined') {
    self.onmessage = function (e) {
      const d = e.data;
      try {
        if (d.cmd === 'wykryj') {
          self.postMessage({ cmd: 'konwencja', konwencja: wykryjKonwencje(d.tekst) });
        } else if (d.cmd === 'skanuj') {
          const wyniki = skanuj(d.tekst, d.konwencja, d.opcje, p =>
            self.postMessage({ cmd: 'postep', p }));
          self.postMessage({ cmd: 'wyniki', wyniki });
        } else if (d.cmd === 'testy') {
          self.postMessage({ cmd: 'testy', wyniki: uruchomTesty() });
        }
      } catch (err) {
        self.postMessage({ cmd: 'blad', komunikat: String(err && err.message || err) });
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OstatnieOko;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
