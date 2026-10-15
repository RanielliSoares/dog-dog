/* ==========================================================================
   Doc & Dog 24h — assistente de agendamento
   ========================================================================== */
(function () {
  'use strict';

  var D = window.DocDog;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { step: 0, servico: null, profissional: 'qualquer', data: null, hora: null, dados: null };
  var DIAS = 30;

  /* ---------- Parâmetros da URL (ex.: ?servico=geriatrica&profissional=celso) ---------- */
  var params = new URLSearchParams(location.search);
  if (D.servico(params.get('servico'))) state.servico = params.get('servico');
  if (D.profissional(params.get('profissional'))) state.profissional = params.get('profissional');
  if (state.profissional === 'celso' && !state.servico) state.servico = 'geriatrica';

  /* ---------- Passo 1: serviços e profissionais ---------- */
  function renderServicos() {
    var wrap = $('#service-list');
    wrap.innerHTML = '';
    D.SERVICOS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.servico === s.id ? 'true' : 'false');
      b.innerHTML =
        '<span class="opt-tick"><span class="material-symbols-outlined">check</span></span>' +
        '<span class="opt-icon"><span class="material-symbols-outlined">' + s.icon + '</span></span>' +
        '<span class="block font-bold text-primary">' + s.nome + '</span>' +
        '<span class="block text-body-sm text-on-surface-variant mt-0.5">' + s.desc + '</span>' +
        '<span class="flex items-center gap-1 text-label-md text-on-surface-variant mt-2"><span class="material-symbols-outlined text-[16px]">timer</span>' + s.duracao + ' min</span>' +
        (s.badge ? '<span class="opt-badge">' + s.badge + '</span>' : '');
      b.addEventListener('click', function () {
        if (state.servico !== s.id) { state.hora = null; }
        state.servico = s.id;
        renderServicos();
        updateSummary('servico');
        updateNext();
      });
      wrap.appendChild(b);
    });
  }

  function renderProfissionais() {
    var wrap = $('#pro-list');
    wrap.innerHTML = '';
    D.PROFISSIONAIS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt pro';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.profissional === p.id ? 'true' : 'false');
      b.innerHTML =
        '<span class="opt-tick"><span class="material-symbols-outlined">check</span></span>' +
        '<span class="pro-avatar">' + (p.foto ? '<img src="' + p.foto + '" alt="" loading="lazy">' : '<span class="material-symbols-outlined">groups</span>') + '</span>' +
        '<span class="block font-bold text-primary text-label-lg leading-tight">' + p.curto + '</span>' +
        '<span class="block text-[12px] text-on-surface-variant mt-0.5">' + p.cargo + '</span>';
      b.addEventListener('click', function () {
        state.profissional = p.id;
        renderProfissionais();
        updateSummary('profissional');
      });
      wrap.appendChild(b);
    });
  }

  /* ---------- Passo 2: dias e horários ---------- */
  function freeSlots(iso) {
    return D.horarios(state.servico).filter(function (h) { return !D.isTaken(iso, h) && !D.isPast(iso, h); });
  }

  function renderDias() {
    var strip = $('#day-strip');
    strip.innerHTML = '';
    var hoje = new Date();
    for (var i = 0; i < DIAS; i++) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      var iso = D.isoDate(d);
      var livres = freeSlots(iso).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.dataset.iso = iso;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.data === iso ? 'true' : 'false');
      b.setAttribute('aria-label', D.fmtLong(iso) + ', ' + livres + ' horários livres');
      b.disabled = livres === 0;
      if (b.disabled) b.style.opacity = '.45';
      b.innerHTML =
        '<span class="d-week">' + (i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : D.SEMANA[d.getDay()]) + '</span>' +
        '<span class="d-num">' + d.getDate() + '</span>' +
        '<span class="d-month">' + D.MESES[d.getMonth()] + '</span>' +
        (livres ? '<span class="d-free' + (livres <= 2 ? ' few' : '') + '"></span>' : '');
      b.addEventListener('click', onDay);
      strip.appendChild(b);
    }
    // Seleciona automaticamente o primeiro dia com vaga
    if (!state.data) {
      var first = $$('.day', strip).filter(function (x) { return !x.disabled; })[0];
      if (first) selectDay(first.dataset.iso, false);
    } else {
      renderSlots();
      var sel = $('.day[aria-checked="true"]', strip);
      if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function onDay(e) { selectDay(e.currentTarget.dataset.iso, true); }

  function selectDay(iso, user) {
    state.data = iso;
    if (state.hora && (D.isTaken(iso, state.hora) || D.isPast(iso, state.hora))) state.hora = null;
    $$('#day-strip .day').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.iso === iso ? 'true' : 'false'); });
    var d = D.parseIso(iso);
    $('#month-label').textContent = D.MESES_LONGOS[d.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' de ' + d.getFullYear() + ' · até 30 dias de antecedência';
    renderSlots();
    updateSummary('data');
    updateSummary('hora');
    updateNext();
    if (user) { var b = $('#day-strip .day[data-iso="' + iso + '"]'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
  }

  function renderSlots() {
    var wrap = $('#slot-groups');
    wrap.innerHTML = '';
    if (!state.data) return;
    var all = D.horarios(state.servico);
    var grupos = [
      { nome: 'Manhã', icon: 'wb_twilight', test: function (h) { return h < '12:00'; } },
      { nome: 'Tarde', icon: 'light_mode', test: function (h) { return h >= '12:00' && h < '18:00'; } },
      { nome: 'Noite', icon: 'dark_mode', test: function (h) { return h >= '18:00'; } }
    ];
    var livres = 0, idx = 0;
    grupos.forEach(function (g) {
      var hs = all.filter(g.test);
      if (!hs.length) return;
      var sec = document.createElement('div');
      sec.innerHTML = '<p class="slot-group-title"><span class="material-symbols-outlined">' + g.icon + '</span>' + g.nome + '</p>';
      var grid = document.createElement('div');
      grid.className = 'slots';
      grid.setAttribute('role', 'radiogroup');
      hs.forEach(function (h) {
        var off = D.isTaken(state.data, h) || D.isPast(state.data, h);
        if (!off) livres++;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slot';
        b.textContent = h;
        b.disabled = off;
        b.style.setProperty('--i', idx++);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', state.hora === h ? 'true' : 'false');
        b.setAttribute('aria-label', h + (off ? ' indisponível' : ' disponível'));
        b.addEventListener('click', function () {
          state.hora = h;
          $$('.slot', wrap).forEach(function (x) { x.setAttribute('aria-checked', x.textContent === h ? 'true' : 'false'); });
          updateSummary('hora');
          updateNext();
        });
        grid.appendChild(b);
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    $('#slot-info').textContent = livres
      ? livres + (livres === 1 ? ' horário livre' : ' horários livres') + ' em ' + D.fmtLong(state.data)
      : 'Sem horários livres neste dia. Escolha outra data.';
    if (!livres) wrap.innerHTML = '<div class="slots-empty">Todos os horários deste dia já foram reservados. Tente outro dia ou fale com a gente no WhatsApp.</div>';
  }

  $$('.day-nav').forEach(function (b) {
    b.addEventListener('click', function () {
      var strip = $('#day-strip');
      strip.scrollBy({ left: +b.dataset.dir * strip.clientWidth * 0.8, behavior: 'smooth' });
    });
  });

  /* ---------- Passo 3: formulário ---------- */
  var form = $('#form-dados');
  var tel = $('#f-tel');

  function maskPhone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  tel.addEventListener('input', function () { tel.value = maskPhone(tel.value); });

  var checks = {
    'f-tutor': function (v) { return v.trim().length >= 2; },
    'f-tel': function (v) { var n = v.replace(/\D/g, '').length; return n === 10 || n === 11; },
    'f-pet': function (v) { return v.trim().length >= 1; }
  };

  function setFieldState(el, ok, show) {
    var f = el.closest('.field');
    if (!f) return;
    f.classList.toggle('invalid', show && !ok);
    f.classList.toggle('valid', ok);
  }

  Object.keys(checks).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () { setFieldState(el, checks[id](el.value), el.value !== ''); });
    el.addEventListener('input', function () {
      var f = el.closest('.field');
      if (f.classList.contains('invalid')) setFieldState(el, checks[id](el.value), true);
      else setFieldState(el, checks[id](el.value), false);
      updateSummary('pet');
    });
  });
  $$('input[type="radio"]', form).forEach(function (r) {
    r.addEventListener('change', function () { r.closest('.field').classList.remove('invalid'); updateSummary('pet'); });
  });
  $('#f-lgpd').addEventListener('change', function () { $('#lgpd-wrap').classList.remove('invalid'); });

  function validateForm() {
    var ok = true, firstBad = null;
    Object.keys(checks).forEach(function (id) {
      var el = document.getElementById(id);
      var good = checks[id](el.value);
      setFieldState(el, good, true);
      if (!good) { ok = false; firstBad = firstBad || el; }
    });
    ['especie', 'sexo'].forEach(function (name) {
      var picked = $('input[name="' + name + '"]:checked', form);
      var fs = $('#fs-' + name);
      fs.classList.toggle('invalid', !picked);
      if (!picked) { ok = false; firstBad = firstBad || $('input[name="' + name + '"]', form); }
    });
    var lgpd = $('#f-lgpd');
    if (!lgpd.checked) { ok = false; $('#lgpd-wrap').classList.add('invalid'); firstBad = firstBad || lgpd; }
    if (firstBad) firstBad.focus({ preventScroll: false });
    return ok;
  }

  function readForm() {
    return {
      tutor: $('#f-tutor').value.trim(),
      telefone: $('#f-tel').value.trim(),
      pet: $('#f-pet').value.trim(),
      idade: $('#f-idade').value,
      especie: ($('input[name="especie"]:checked', form) || {}).value || '',
      sexo: ($('input[name="sexo"]:checked', form) || {}).value || '',
      obs: $('#f-obs').value.trim()
    };
  }

  /* ---------- Passo 4: revisão ---------- */
  function renderReview() {
    var s = D.servico(state.servico), p = D.profissional(state.profissional), d = state.dados;
    var rows = [
      ['Serviço', s.nome + ' · ' + s.duracao + ' min', 0],
      ['Profissional', p.nome, 0],
      ['Data', D.fmtLong(state.data), 1],
      ['Horário', state.hora, 1],
      ['Tutor(a)', d.tutor + ' · ' + d.telefone, 2],
      ['Pet', d.pet + ' (' + (d.especie === 'Canina' ? 'cão' : 'gato') + ', ' + d.sexo.toLowerCase() + (d.idade ? ', ' + d.idade.toLowerCase() : '') + ')', 2]
    ];
    if (d.obs) rows.push(['Motivo', d.obs, 2]);
    var dl = $('#review');
    dl.innerHTML = '';
    rows.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'review-row';
      div.innerHTML = '<dt>' + r[0] + '</dt><dd></dd><button type="button" class="review-edit">Editar</button>';
      div.querySelector('dd').textContent = r[1];
      div.querySelector('button').addEventListener('click', function () { go(r[2]); });
      dl.appendChild(div);
    });
  }

  /* ---------- Resumo lateral ---------- */
  function setSum(key, value) {
    var row = $('.sum-row[data-sum="' + key + '"]');
    if (!row) return;
    var v = row.querySelector('.sum-v');
    var text = value || '—';
    if (v.textContent === text) return;
    v.textContent = text;
    row.classList.toggle('filled', !!value);
    row.classList.remove('pop');
    void row.offsetWidth;
    row.classList.add('pop');
  }
  function updateSummary(which) {
    var s = D.servico(state.servico);
    if (!which || which === 'servico') setSum('servico', s ? s.nome + ' · ' + s.duracao + ' min' : '');
    if (!which || which === 'profissional') setSum('profissional', D.profissional(state.profissional).nome);
    if (!which || which === 'data') setSum('data', state.data ? D.fmtLong(state.data) : '');
    if (!which || which === 'hora') setSum('hora', state.hora || '');
    if (!which || which === 'pet') {
      var pet = $('#f-pet').value.trim();
      var esp = ($('input[name="especie"]:checked', form) || {}).value;
      setSum('pet', pet ? pet + (esp ? (esp === 'Canina' ? ' 🐶' : ' 🐱') : '') : '');
    }
  }

  /* ---------- Navegação entre passos ---------- */
  var btnNext = $('#btn-next'), btnBack = $('#btn-back');

  function canAdvance() {
    if (state.step === 0) return !!state.servico;
    if (state.step === 1) return !!(state.data && state.hora);
    return true;
  }
  function updateNext() {
    btnNext.disabled = !canAdvance();
    var last = state.step === 3;
    $('#btn-next-label').textContent = last ? 'Confirmar agendamento' : 'Continuar';
    $('#btn-next-icon').textContent = last ? 'check_circle' : 'arrow_forward';
  }

  function go(step) {
    var back = step < state.step;
    state.step = step;
    $$('.bk-panel').forEach(function (p) {
      var show = +p.dataset.panel === step;
      p.hidden = !show;
      if (show) { p.classList.toggle('back', back); p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
    });
    $$('.step').forEach(function (s) {
      var i = +s.dataset.step;
      s.classList.toggle('active', i === step);
      s.classList.toggle('done', i < step);
      if (i === step) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
    $('#stepper-fill').style.width = (Math.min(step, 3) / 3 * 100) + '%';
    $('#bk-actions').hidden = step === 4;
    btnBack.hidden = step === 0 || step === 4;
    if (step === 1) renderDias();
    if (step === 3) renderReview();
    updateNext();
    var top = $('#wizard').getBoundingClientRect().top + window.scrollY - 140;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  btnBack.addEventListener('click', function () { go(state.step - 1); });
  btnNext.addEventListener('click', function () {
    if (state.step === 2) {
      if (!validateForm()) { toast('Confira os campos destacados'); return; }
      state.dados = readForm();
    }
    if (state.step === 3) { confirmar(); return; }
    if (canAdvance()) go(state.step + 1);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); btnNext.click(); });

  /* ---------- Confirmação ---------- */
  var ultimo = null;

  function confirmar() {
    if (D.isTaken(state.data, state.hora)) {
      toast('Esse horário acabou de ser reservado. Escolha outro.');
      state.hora = null;
      go(1);
      return;
    }
    btnNext.disabled = true;
    $('#btn-next-label').textContent = 'Confirmando...';
    $('#btn-next-icon').textContent = 'progress_activity';
    setTimeout(function () {
      var d = state.dados;
      ultimo = D.add({
        id: D.code(),
        servico: state.servico,
        profissional: state.profissional,
        data: state.data,
        hora: state.hora,
        tutor: d.tutor,
        telefone: d.telefone,
        pet: d.pet,
        especie: d.especie,
        sexo: d.sexo,
        idade: d.idade,
        obs: d.obs,
        criadoEm: new Date().toISOString()
      });
      showSuccess(ultimo);
    }, 900);
  }

  function showSuccess(b) {
    var s = D.servico(b.servico), p = D.profissional(b.profissional);
    $('#success-text').textContent = s.nome + ' para ' + b.pet + ' em ' + D.fmtLong(b.data) + ', às ' + b.hora + '.';
    $('#success-code').textContent = b.id;

    var msg = 'Olá! Acabei de agendar pelo site da Doc & Dog 24h:\n\n' +
      '• Serviço: ' + s.nome + '\n' +
      '• Profissional: ' + p.nome + '\n' +
      '• Data: ' + D.fmtLong(b.data) + ' às ' + b.hora + '\n' +
      '• Pet: ' + b.pet + ' (' + (b.especie === 'Canina' ? 'cão' : 'gato') + ', ' + b.sexo.toLowerCase() + ')\n' +
      '• Tutor(a): ' + b.tutor + '\n' +
      (b.obs ? '• Motivo: ' + b.obs + '\n' : '') +
      '\nCódigo: ' + b.id;
    $('#btn-wa').href = 'https://wa.me/' + D.CLINICA_WHATS + '?text=' + encodeURIComponent(msg);

    var start = b.data.replace(/-/g, '') + 'T' + b.hora.replace(':', '') + '00';
    var endDate = new Date(D.parseIso(b.data).getTime());
    var hp = b.hora.split(':');
    endDate.setHours(+hp[0], +hp[1] + s.duracao);
    var end = D.isoDate(endDate).replace(/-/g, '') + 'T' + String(endDate.getHours()).padStart(2, '0') + String(endDate.getMinutes()).padStart(2, '0') + '00';
    var title = s.nome + ' - ' + b.pet + ' (Doc & Dog 24h)';
    var local = 'R. Cel. Nogueira Padilha, 834 - Vila Hortência, Sorocaba - SP';
    $('#btn-gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
      '&dates=' + start + '/' + end + '&ctz=America/Sao_Paulo&location=' + encodeURIComponent(local) +
      '&details=' + encodeURIComponent('Código ' + b.id + ' · ' + p.nome + ' · Tel. (15) 3035-5006');
    $('#btn-ics').onclick = function () {
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Doc & Dog 24h//Agendamento//PT-BR', 'BEGIN:VEVENT',
        'UID:' + b.id + '@docdog', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'DTSTART;TZID=America/Sao_Paulo:' + start, 'DTEND;TZID=America/Sao_Paulo:' + end,
        'SUMMARY:' + title, 'LOCATION:' + local.replace(/,/g, '\\,'), 'DESCRIPTION:Código ' + b.id + ' - ' + p.nome,
        'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete Doc & Dog', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'agendamento-docdog-' + b.id + '.ics';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Arquivo de agenda baixado');
    };

    go(4);
    confetti();
  }

  $('#btn-new').addEventListener('click', function () {
    state = { step: 0, servico: null, profissional: 'qualquer', data: null, hora: null, dados: null };
    form.reset();
    $$('.field', form).forEach(function (f) { f.classList.remove('valid', 'invalid'); });
    renderServicos();
    renderProfissionais();
    updateSummary();
    go(0);
  });

  /* ---------- Efeitos ---------- */
  function confetti() {
    if (reduceMotion) return;
    var emojis = ['🐾', '💚', '🐶', '🐱', '✨'];
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = emojis[i % emojis.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = (2.2 + Math.random() * 2) + 's';
      s.style.animationDelay = (Math.random() * .6) + 's';
      s.style.fontSize = (16 + Math.random() * 16) + 'px';
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }, 5000, s);
    }
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- Início ---------- */
  renderServicos();
  renderProfissionais();
  updateSummary();
  go(0);
  if (state.servico && params.get('servico')) setTimeout(function () { go(1); }, 350);
})();
