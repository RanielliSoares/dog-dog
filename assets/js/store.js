/* ==========================================================================
   Doc & Dog 24h — dados do agendamento (compartilhado entre agendamento e painel)
   Versão de demonstração: os agendamentos ficam salvos no navegador (localStorage).
   Para produção, troque as funções list/add/remove por chamadas ao backend.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'docdog_agendamentos_v1';

  var SERVICOS = [
    { id: 'consulta', nome: 'Consulta', desc: 'Clínica geral para cães e gatos.', duracao: 30, icon: 'stethoscope' },
    { id: 'retorno', nome: 'Retorno', desc: 'Acompanhamento após a consulta.', duracao: 20, icon: 'replay' },
    { id: 'geriatrica', nome: 'Avaliação geriátrica', desc: 'Check-up completo para pets idosos.', duracao: 40, icon: 'elderly', badge: 'Especialidade' }
  ];

  var PROFISSIONAIS = [
    { id: 'qualquer', nome: 'Sem preferência', curto: 'Sem preferência', cargo: 'Primeiro disponível', foto: null },
    { id: 'celso', nome: 'Dr. Celso Soares', curto: 'Dr. Celso', cargo: 'Geriatra', foto: 'assets/img/equipe/celso-soares.jpg' },
    { id: 'joao', nome: 'Dr. João Ribeiro', curto: 'Dr. João', cargo: 'Clínico', foto: 'assets/img/equipe/joao-ribeiro.jpg' },
    { id: 'neide', nome: 'Dra. Neide Miyamamoto', curto: 'Dra. Neide', cargo: 'Clínica', foto: 'assets/img/equipe/neide-miyamamoto.jpg' }
  ];

  // Mesmos horários do sistema atual da clínica
  var HORARIOS_CONSULTA = ['09:00', '10:30', '13:30', '15:00', '16:30', '18:00', '19:30'];
  var HORARIOS_RETORNO = ['10:00', '11:30', '14:30', '16:00', '17:30', '19:00', '20:30'];

  function horarios(servicoId) {
    return servicoId === 'retorno' ? HORARIOS_RETORNO : HORARIOS_CONSULTA;
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var SEMANA_LONGA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function fmtLong(iso) {
    var d = parseIso(iso);
    return SEMANA_LONGA[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES_LONGOS[d.getMonth()];
  }
  function fmtShort(iso) {
    var d = parseIso(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }

  function list() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch (e) { return false; }
  }
  function add(b) {
    var items = list();
    items.push(b);
    save(items);
    return b;
  }
  function remove(id) {
    save(list().filter(function (b) { return b.id !== id; }));
  }
  function byDate(iso) {
    return list().filter(function (b) { return b.data === iso; })
      .sort(function (a, b) { return a.hora.localeCompare(b.hora); });
  }

  // Simula a agenda já preenchida por outros tutores (determinístico por data/horário)
  function simulatedBusy(iso, hora) {
    var s = iso + hora, h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
    return h % 100 < 26;
  }

  function isTaken(iso, hora) {
    if (simulatedBusy(iso, hora)) return true;
    return list().some(function (b) { return b.data === iso && b.hora === hora; });
  }

  function isPast(iso, hora) {
    var now = new Date();
    if (iso !== isoDate(now)) return iso < isoDate(now);
    var p = hora.split(':');
    return (+p[0] * 60 + +p[1]) <= (now.getHours() * 60 + now.getMinutes() + 30);
  }

  function code() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = 'DD-';
    for (var i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  global.DocDog = {
    SERVICOS: SERVICOS,
    PROFISSIONAIS: PROFISSIONAIS,
    CLINICA_WHATS: '5515988265006',
    horarios: horarios,
    isoDate: isoDate,
    parseIso: parseIso,
    fmtLong: fmtLong,
    fmtShort: fmtShort,
    SEMANA: SEMANA,
    MESES: MESES,
    MESES_LONGOS: MESES_LONGOS,
    list: list,
    add: add,
    remove: remove,
    byDate: byDate,
    isTaken: isTaken,
    isPast: isPast,
    code: code,
    servico: function (id) { return find(SERVICOS, id); },
    profissional: function (id) { return find(PROFISSIONAIS, id); }
  };
})(window);
