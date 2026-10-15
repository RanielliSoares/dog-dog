/* ==========================================================================
   Doc & Dog 24h — interações
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Título do hero: divide em palavras ---------- */
  $$('[data-split]').forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span');
            outer.className = 'split-word';
            var inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.matches('svg')) {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------- Reveal ao rolar (com stagger) ---------- */
  $$('[data-stagger]').forEach(function (group) {
    var step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
    $$('.reveal', group).forEach(function (el, idx) {
      if (!el.style.getPropertyValue('--delay')) el.style.setProperty('--delay', (idx * step).toFixed(2) + 's');
    });
  });

  var revealEls = $$('.reveal');
  // Ao terminar a entrada, libera o elemento para os efeitos de hover/tilt sem atraso
  revealEls.forEach(function (el) {
    el.addEventListener('transitionend', function done(e) {
      if (e.target !== el || e.propertyName !== 'opacity' || !el.classList.contains('in')) return;
      el.classList.remove('reveal', 'in');
      el.style.removeProperty('--delay');
      el.removeEventListener('transitionend', done);
    });
  });
  var startReveal = function () {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }
  };

  /* ---------- Preloader ---------- */
  var loaded = false;
  var finishLoading = function () {
    if (loaded) return;
    loaded = true;
    startReveal();
    var pre = $('#preloader');
    if (pre) pre.classList.add('hide');
    document.documentElement.classList.add('is-loaded');
  };
  if (document.readyState === 'complete') setTimeout(finishLoading, 300);
  else window.addEventListener('load', function () { setTimeout(finishLoading, 350); });
  setTimeout(finishLoading, 3000); // segurança caso alguma fonte demore

  /* ---------- Contadores animados ---------- */
  var animateCount = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var format = function (v) { return prefix + v.toFixed(decimals).replace('.', ',') + suffix; };
    if (reduceMotion) { el.textContent = format(target); return; }
    var duration = 1800;
    var start = null;
    var tick = function (now) {
      if (!start) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Scroll: header, progresso, voltar ao topo, parallax ---------- */
  var header = $('#site-header');
  var progress = $('#scroll-progress');
  var backTop = $('#back-to-top');
  var mobileBar = $('#mobile-bar');
  var parallaxEls = $$('[data-parallax]');
  var ticking = false;

  var onScroll = function () {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (header) header.classList.toggle('scrolled', y > 40);
    if (backTop) backTop.classList.toggle('show', y > 700);
    if (mobileBar) mobileBar.classList.toggle('show', y > 500);
    if (!reduceMotion) {
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var rect = el.parentElement.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }
    ticking = false;
  };
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (backTop) backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Link ativo no menu conforme a seção ---------- */
  var navLinks = $$('.nav-link');
  var sections = navLinks
    .map(function (a) { return $(a.getAttribute('href')); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          var active = a.getAttribute('href') === id;
          a.classList.toggle('active', active);
          if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { sio.observe(s); });
  }

  /* ---------- Menu mobile ---------- */
  var burger = $('#burger');
  var menu = $('#mobile-menu');
  var setMenu = function (open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  if (burger) burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  if (menu) $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1280) setMenu(false); });

  /* ---------- Spotlight nos cards (segue o mouse) ---------- */
  if (finePointer) {
    $$('.spotlight').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Tilt 3D ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(1000px) rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' + (px * max).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    /* Botões magnéticos */
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.3).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- Relógio do plantão ---------- */
  var clock = $('#live-clock');
  var updateClock = function () {
    if (!clock) return;
    var now = new Date();
    clock.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 15000);

  /* ---------- Ano do rodapé ---------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Modais (Termos / Privacidade) ---------- */
  $$('[data-modal]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      var dlg = document.getElementById(trigger.getAttribute('data-modal'));
      if (dlg && typeof dlg.showModal === 'function') { e.preventDefault(); dlg.showModal(); }
    });
  });
  $$('dialog.legal').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  });
})();

/* ---------- Faixa de serviços (duplica para loop contínuo) + FAQ ---------- */
(function () {
  'use strict';
  var track = document.getElementById('marquee-track');
  if (track && track.firstElementChild) track.appendChild(track.firstElementChild.cloneNode(true));

  Array.prototype.forEach.call(document.querySelectorAll('.faq-item'), function (item) {
    var btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !item.classList.contains('open');
      Array.prototype.forEach.call(document.querySelectorAll('.faq-item.open'), function (o) {
        o.classList.remove('open');
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
})();
