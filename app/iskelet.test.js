const I = require('./iskelet.js');
const p = {title:'Test', chars:[
  {id:'c1', name:'Ayşe', role:'Kahraman', tag:'utangaç eczacı', want:'kasabadan kaçmak', need:'kendine güvenmek', fear:'yalnızlık'},
  {id:'c2', name:'Ali', role:'Karşıt güç'}],
  locs:[{id:'l1', name:'ECZANE'}, {id:'l2', name:'LİMAN'}],
  episodes:[{id:'e1', title:'Kapı'}],
  details:[{id:'d1', name:'mavi anahtar', desc:'annesinden kalma', sceneIds:['s1']}],
  scenes:[
    {id:'s1', loc:'l1', ie:'İÇ', time:'GÜN', charIds:['c1','c2'], goal:'Ali eczaneye gelir ve borcunu ister', from:'güven', to:'korku', episodeId:'e1'},
    {id:'s2', loc:'l2', ie:'DIŞ', time:'GECE', charIds:['c1'], goal:'Ayşe limanda gerçeği öğrenir', from:'korku', to:'kararlılık', episodeId:'e1'}
  ]};
const l = I.logline(p); console.log('LOGLINE:', l.metin, '\n  eksik:', l.eksik);
const s = I.sinopsis(p); console.log('SİNOPSİS:\n' + s.metin, '\n  eksik:', s.eksik);
console.log('BÖLÜM:', JSON.stringify(I.bolumOzetleri(p)));
console.log('SAHNE:\n' + I.sahneTaslagi(p, p.scenes[0]).metin);
const empty = {title:'B', chars:[], locs:[], episodes:[], scenes:[], details:[]};
console.log('BOŞ LOGLINE eksik:', I.logline(empty).eksik.length, 'BOŞ SİNOPSİS:', JSON.stringify(I.sinopsis(empty)));
