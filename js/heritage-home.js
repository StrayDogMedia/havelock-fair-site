/* Heritage Noir homepage behavior: scroll reveals, parallax, mobile
   menu, and the "What Awaits You" spotlight modal.
   Depends on i18n.js globals (translations, currentLang) for all copy —
   load order: i18n.js → countdown.js → heritage-home.js. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------- spotlight data: images + i18n key prefixes -------- */
  var SPOT = [
    { key: 'ls', num: '01', title: 'highlights_livestock', href: 'pages/schedule.html',
      imgs: ['images/home/spotlight/ls-1.jpg', 'images/home/spotlight/ls-2.jpg', 'images/home/spotlight/ls-3.jpg'] },
    { key: 'mu', num: '02', title: 'highlights_music', href: 'pages/schedule.html',
      imgs: ['images/home/spotlight/mu-1.jpg', 'images/home/spotlight/mu-2.jpg', 'images/home/spotlight/mu-3.jpg'] },
    { key: 'tr', num: '03', title: 'highlights_antique', href: 'pages/directions.html',
      imgs: ['images/home/spotlight/tr-1.jpg', 'images/home/spotlight/tr-2.jpg', 'images/home/spotlight/tr-3.jpg'] },
    { key: 'fd', num: '04', title: 'highlights_food', href: 'pages/schedule.html',
      imgs: ['images/home/spotlight/fd-1.jpg', 'images/home/spotlight/fd-2.jpg', 'images/home/spotlight/fd-3.jpg'] },
    { key: 'kd', num: '05', title: 'highlights_kids', href: 'pages/directions.html',
      imgs: ['images/home/spotlight/kd-1.jpg', 'images/home/spotlight/kd-2.jpg', 'images/home/spotlight/kd-3.jpg'] },
    { key: 'cr', num: '06', title: 'highlights_crafts', href: 'pages/registration.html',
      imgs: ['images/home/spotlight/cr-1.jpg', 'images/home/spotlight/cr-2.jpg', 'images/home/spotlight/cr-3.jpg'] }
  ];

  function t(key) {
    var lang = (typeof currentLang !== 'undefined' && currentLang) || 'en';
    var dict = (typeof translations !== 'undefined' && translations[lang]) || {};
    return dict[key] || (translations && translations.en && translations.en[key]) || '';
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------------- mobile menu ---------------- */
    var menu = document.getElementById('hf-mobile-menu');
    var openBtn = document.getElementById('hf-menu-open');
    var closeBtn = document.getElementById('hf-menu-close');
    if (menu && openBtn && closeBtn) {
      openBtn.addEventListener('click', function () {
        menu.classList.add('open');
        openBtn.setAttribute('aria-expanded', 'true');
      });
      closeBtn.addEventListener('click', closeMenu);
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeMenu);
      });
    }
    function closeMenu() {
      menu.classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
    }

    /* ---------------- scroll reveal + parallax ---------------- */
    if (!reduce) {
      var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
      reveals.forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 1.1s cubic-bezier(.2,.6,.2,1), transform 1.1s cubic-bezier(.2,.6,.2,1)';
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'none';
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.14 });
      reveals.forEach(function (el) { io.observe(el); });

      var px = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
      if (px.length) {
        var ticking = false;
        var update = function () {
          var vh = window.innerHeight;
          px.forEach(function (img) {
            var r = img.getBoundingClientRect();
            var off = (r.top + r.height / 2) - vh / 2;
            img.style.transform = 'translate3d(0,' + (off * -0.07).toFixed(1) + 'px,0)';
          });
          ticking = false;
        };
        var onScroll = function () {
          if (!ticking) { requestAnimationFrame(update); ticking = true; }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        update();
      }
    }

    /* ---------------- spotlight modal ---------------- */
    var spot = document.getElementById('hf-spot');
    var panel = document.getElementById('hf-spot-panel');
    var closeSpotBtn = document.getElementById('hf-spot-close');
    if (!spot || !panel) return;

    var curCat = 0, curImg = 0, timer = null, lastFocus = null;
    var frameEls = [], dotEls = [];

    // wire the six cards
    document.querySelectorAll('.hf-card').forEach(function (card, i) {
      card.addEventListener('click', function () { openSpot(i); });
    });

    function render() {
      var c = SPOT[curCat];
      var k = c.key;
      panel.innerHTML =
        '<div class="hf-spot-stage">' +
          c.imgs.map(function (src, idx) {
            return '<img alt="' + esc(t('sp_' + k + '_c' + (idx + 1))) + '" src="' + src + '">';
          }).join('') +
          '<div class="hf-spot-arrows">' +
            '<button data-d="-1" aria-label="' + esc(t('sp_prev_photo')) + '">&#8249;</button>' +
            '<button data-d="1" aria-label="' + esc(t('sp_next_photo')) + '">&#8250;</button>' +
          '</div>' +
          '<div class="hf-spot-dots">' +
            c.imgs.map(function (_, idx) {
              return '<button data-i="' + idx + '" aria-label="' + (idx + 1) + '"></button>';
            }).join('') +
          '</div>' +
          '<div class="hf-spot-cap" id="hf-spot-cap"></div>' +
        '</div>' +
        '<div class="hf-spot-info">' +
          '<div class="hf-spot-num">' + c.num + '</div>' +
          '<div class="hf-spot-kicker" data-i18n="sp_kicker">' + esc(t('sp_kicker')) + '</div>' +
          '<h2 id="hf-spot-title" data-i18n="' + c.title + '">' + esc(t(c.title)) + '</h2>' +
          '<p class="hf-spot-lead" data-i18n="sp_' + k + '_lead">' + esc(t('sp_' + k + '_lead')) + '</p>' +
          '<ul class="hf-spot-facts">' +
            [1, 2, 3].map(function (n) {
              return '<li data-i18n="sp_' + k + '_f' + n + '">' + esc(t('sp_' + k + '_f' + n)) + '</li>';
            }).join('') +
          '</ul>' +
          '<a class="hf-spot-cta" href="' + c.href + '" data-i18n="sp_' + k + '_cta">' + esc(t('sp_' + k + '_cta')) + '</a>' +
        '</div>' +
        '<div class="hf-spot-nav">' +
          '<button id="hf-spot-prev">&#8592; <span data-i18n="sp_prev">' + esc(t('sp_prev')) + '</span></button>' +
          '<span class="hf-spot-count">' + (curCat + 1) + ' / ' + SPOT.length + '</span>' +
          '<button id="hf-spot-next"><span data-i18n="sp_next">' + esc(t('sp_next')) + '</span> &#8594;</button>' +
        '</div>';

      frameEls = Array.prototype.slice.call(panel.querySelectorAll('.hf-spot-stage img'));
      dotEls = Array.prototype.slice.call(panel.querySelectorAll('.hf-spot-dots button'));
      panel.querySelectorAll('.hf-spot-arrows button').forEach(function (b) {
        b.addEventListener('click', function () { step(parseInt(b.dataset.d, 10)); });
      });
      dotEls.forEach(function (d) {
        d.addEventListener('click', function () { show(parseInt(d.dataset.i, 10)); restart(); });
      });
      document.getElementById('hf-spot-prev').addEventListener('click', function () { flip(-1); });
      document.getElementById('hf-spot-next').addEventListener('click', function () { flip(1); });

      curImg = 0;
      show(0);
      restart();
    }

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function show(i) {
      var c = SPOT[curCat];
      curImg = (i + c.imgs.length) % c.imgs.length;
      frameEls.forEach(function (im, idx) { im.classList.toggle('on', idx === curImg); });
      dotEls.forEach(function (d, idx) { d.classList.toggle('on', idx === curImg); });
      var cap = document.getElementById('hf-spot-cap');
      if (cap) {
        var capKey = 'sp_' + c.key + '_c' + (curImg + 1);
        cap.setAttribute('data-i18n', capKey); // stays correct if language switches while open
        cap.textContent = t(capKey);
      }
    }

    function step(d) { show(curImg + d); restart(); }

    function restart() {
      if (timer) clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { show(curImg + 1); }, 4800);
    }

    function flip(d) {
      curCat = (curCat + d + SPOT.length) % SPOT.length;
      render();
    }

    function openSpot(i) {
      curCat = i;
      lastFocus = document.activeElement;
      spot.classList.add('open');
      document.body.style.overflow = 'hidden';
      render();
      closeSpotBtn.focus();
    }

    function closeSpot() {
      spot.classList.remove('open');
      document.body.style.overflow = '';
      if (timer) clearInterval(timer);
      if (lastFocus) lastFocus.focus();
    }

    closeSpotBtn.addEventListener('click', closeSpot);
    spot.addEventListener('click', function (e) { if (e.target === spot) closeSpot(); });
    document.addEventListener('keydown', function (e) {
      if (!spot.classList.contains('open')) return;
      if (e.key === 'Escape') closeSpot();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
  });
})();
