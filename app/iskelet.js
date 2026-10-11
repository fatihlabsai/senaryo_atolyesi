/* Kural tabanlı iskelet: yapay zekâ kullanmadan, projedeki alanlardan logline, sinopsis,
   bölüm özeti ve sahne taslağı iskeleti kurar. Her çıktı, neyin eksik olduğunu da söyler. */
(function (root) {
  const ROLE_KAHRAMAN = 'Kahraman';
  const ROLE_KARSI = 'Karşıt güç';
  const trim = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const endDot = s => { s = trim(s); if (!s) return ''; return /[.!?…]$/.test(s) ? s : s + '.'; };
  const words = s => trim(s).split(' ').filter(Boolean).length;
  const cut = (s, n) => { const w = trim(s).split(' '); return w.length > n ? w.slice(0, n).join(' ') + '…' : trim(s); };
  const lc = s => String(s ?? '').toLocaleLowerCase('tr-TR');

  function kahraman(p) {
    return p.chars.find(c => c.role === ROLE_KAHRAMAN) || p.chars[0] || null;
  }
  function karsi(p, kh) {
    return p.chars.find(c => c.role === ROLE_KARSI && (!kh || c.id !== kh.id)) || null;
  }
  function locName(p, id) { const l = (p.locs || []).find(x => x.id === id); return l ? l.name : ''; }
  function sceneOrder(p) { return (p.scenes || []); }

  /* LOGLINE: [Kahraman, tanım] + [ne istiyor] + [engel] + [bedel]. */
  function logline(p) {
    const eksik = [];
    const kh = kahraman(p);
    if (!kh) eksik.push('Kahraman seçilmemiş (karakter rolünü "Kahraman" yap).');
    const ad = kh ? kh.name : '(kahraman)';
    const kim = kh && kh.tag ? `${ad}, ${lc(kh.tag).replace(/^./, c => c)}` : ad;
    const hedef = kh && kh.want ? trim(kh.want) : '';
    if (kh && !hedef) eksik.push('Kahramanın "Ne istiyor?" alanı boş.');
    const ks = karsi(p, kh);
    let engel = '';
    if (ks) engel = `ama ${ks.name} buna engel olur`;
    else if (kh && kh.fear) engel = `ama ${lc(trim(kh.fear))} yüzünden yolu tıkanır`;
    else eksik.push('Engel yok: bir "Karşıt güç" karakteri ya da kahramanın korkusu ekle.');
    let bedel = '';
    if (kh && kh.need) bedel = `ve sonunda ${lc(trim(kh.need))} ile yüzleşmek zorunda kalır`;
    else eksik.push('Kahramanın "Gerçekte neye ihtiyacı var?" alanı boş (bedel cümlesi için).');
    const parcalar = [
      `${kim}${hedef ? ', ' + lc(hedef) : ''} istiyor`,
      engel,
      bedel
    ].filter(Boolean);
    let metin = endDot(parcalar.join('; ').replace('; ve', ' ve'));
    if (!hedef) metin = endDot(`${kim} bir yol arıyor; ${engel}`.replace(/; $/, ''));
    if (words(metin) > 35) { metin = cut(metin, 35); eksik.push('Logline 35 kelimeyi aştı, kısaltıldı. Karakter alanlarını sadeleştir.'); }
    return {metin, eksik};
  }

  /* SİNOPSİS: sahnelerin amaçlarını sırayla kurulum, çatışma, sonuç olarak paragraflara ayırır. */
  function sinopsis(p) {
    const eksik = [];
    const sc = sceneOrder(p).filter(s => s.goal || s.brief || s.loc);
    if (!sc.length) return {metin: '', eksik: ['Sinopsis için en az bir sahnede amaç ya da mekan gerekli.']};
    // Her sahne tek cümle: amaç + mekan. Karakterler amaç cümlesinde zaten geçer.
    const cumle = s => {
      const yer = locName(p, s.loc);
      const amac = trim(s.goal || s.brief);
      if (!amac) eksik.push(`"${s.title || yer || 'Bir sahne'}" için amaç yazılmamış.`);
      if (!amac) return '';
      return endDot(yer ? `${amac} (${yer.toLocaleUpperCase('tr-TR')})` : amac);
    };
    const n = sc.length;
    const kurulum = sc.slice(0, Math.max(1, Math.ceil(n / 4)));
    const sonuc = sc.slice(-Math.max(1, Math.ceil(n / 4)));
    const catisma = sc.slice(kurulum.length, Math.max(kurulum.length, n - sonuc.length));
    const paragraf = (liste) => liste.map(cumle).filter(Boolean).join(' ');
    const paragraflar = [paragraf(kurulum), paragraf(catisma), paragraf(sonuc)].filter(Boolean);
    const son = sc[sc.length - 1];
    if (son && !son.to) eksik.push('Son sahnenin "Sonda duygu / durum" alanı boş: sonuç cümlesi zayıf kalır.');
    return {metin: paragraflar.join('\n\n'), eksik};
  }

  /* BÖLÜM ÖZETİ: her bölümün sahnelerinin amaçlarını birleştirir, son sahneden kanca çıkarır. */
  function bolumOzetleri(p) {
    const sonuc = [];
    (p.episodes || []).forEach((e, i) => {
      const eksik = [];
      const sc = sceneOrder(p).filter(s => s.episodeId === e.id);
      if (!sc.length) { eksik.push('Bu bölümde sahne yok.'); }
      const amaclar = sc.map(s => trim(s.goal)).filter(Boolean);
      const ozet = amaclar.length ? amaclar.slice(0, 3).map(endDot).join(' ') : '';
      if (sc.length && !amaclar.length) eksik.push('Bölümdeki sahnelerin amacı yazılmamış.');
      const ilk = sc[0], son = sc[sc.length - 1];
      const amac = ilk && trim(ilk.from) && trim(ilk.to) ? `${trim(ilk.from)} → ${trim(ilk.to)}` : '';
      const kanca = son && trim(son.to) ? `Son durum: ${trim(son.to)}` : '';
      sonuc.push({no: i + 1, baslik: e.title || '', ozet, amac, kanca, eksik});
    });
    return sonuc;
  }

  /* SAHNE TASLAĞI: başlık, eylem iskeleti, karakter konuşma yerleri, önemli detaylar. Diyalog uydurmaz. */
  function sahneTaslagi(p, s) {
    const eksik = [];
    const baslik = `${locName(p, s.loc) ? (s.ie || 'İÇ') + '. ' + locName(p, s.loc).toLocaleUpperCase('tr-TR') + ' - ' + (s.time || 'GÜN') : (s.title || 'SAHNE')}`;
    if (!s.loc) eksik.push('Mekan seçilmemiş.');
    const satirlar = [];
    if (trim(s.goal)) satirlar.push(endDot(s.goal));
    else eksik.push('Amaç yazılmamış: ne değişiyor?');
    if (trim(s.from) || trim(s.to)) satirlar.push(`(Başta: ${trim(s.from) || '-'}; sonda: ${trim(s.to) || '-'})`);
    const kisiler = (s.charIds || []).map(id => p.chars.find(c => c.id === id)).filter(Boolean);
    if (!kisiler.length) eksik.push('Sahneye karakter eklenmemiş.');
    kisiler.forEach(c => satirlar.push(`${c.name.toLocaleUpperCase('tr-TR')}: `));
    const detaylar = (p.details || []).filter(d => (d.sceneIds || []).includes(s.id));
    detaylar.forEach(d => satirlar.push(`[Detay: ${d.name}${d.desc ? ' - ' + d.desc : ''}]`));
    return {baslik, metin: [baslik, '', ...satirlar].join('\n'), eksik};
  }

  root.Iskelet = {logline, sinopsis, bolumOzetleri, sahneTaslagi};
  if (typeof module !== 'undefined') module.exports = root.Iskelet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
