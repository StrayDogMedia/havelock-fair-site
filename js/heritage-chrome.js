/* Heritage Noir shared chrome for interior pages: injects the site
   header (desktop nav + mobile menu) and footer, wires the mobile
   menu, and provides the [data-reveal] / [data-parallax] behaviors.
   Load at the end of <body>, BEFORE i18n.js — injection happens
   synchronously so i18n.js translates the chrome on DOMContentLoaded.
   The homepage keeps its own inline chrome (see index.html). */
(function () {
  'use strict';

  var inPages = location.pathname.indexOf('/pages/') !== -1;
  var HOME = inPages ? '../' : './';
  var P = inPages ? '' : 'pages/';
  var active = document.body.getAttribute('data-nav') || '';

  var LINKS = [
    { key: 'home',         href: HOME,                    i18n: 'nav_home',         label: 'Home' },
    { key: 'schedule',     href: P + 'schedule.html',     i18n: 'nav_schedule',     label: 'Schedule' },
    { key: 'directions',   href: P + 'directions.html',   i18n: 'nav_directions',   label: 'Directions' },
    { key: 'sponsors',     href: P + 'sponsors.html',     i18n: 'nav_sponsors',     label: 'Sponsors' },
    { key: 'about',        href: P + 'about.html',        i18n: 'nav_about',        label: 'About' },
    { key: 'contact',      href: P + 'contact.html',      i18n: 'nav_contact',      label: 'Contact' },
    { key: 'gallery',      href: P + 'gallery.html',      i18n: 'nav_gallery',      label: 'Photos' },
    { key: 'registration', href: P + 'registration.html', i18n: 'nav_registration', label: 'Registration' }
  ];

  function navLinks() {
    return LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.key === active ? ' class="active"' : '') +
        ' data-i18n="' + l.i18n + '">' + l.label + '</a>';
    }).join('');
  }

  var langHTML =
    '<div class="hf-lang">' +
      '<button class="lang-btn" data-lang="en">EN</button>' +
      '<button class="lang-btn" data-lang="fr">FR</button>' +
      '<button class="lang-btn" data-lang="es">ES</button>' +
    '</div>';

  var ticketsHTML = '<a href="' + P + 'registration.html" class="hf-tickets" data-i18n="nav_tickets">Tickets</a>';

  var headerHTML =
    '<header class="hf-header">' +
      '<a href="' + HOME + '" class="hf-brand">Havelock&nbsp;Fair</a>' +
      '<nav class="hf-nav" aria-label="Main navigation">' + navLinks() + '</nav>' +
      '<div class="hf-nav-side">' + langHTML + ticketsHTML + '</div>' +
      '<button class="hf-menu-btn" id="hf-menu-open" aria-expanded="false" aria-controls="hf-mobile-menu">' +
        '<span aria-hidden="true">&#8801;</span> <span data-i18n="nav_menu">Menu</span>' +
      '</button>' +
    '</header>' +
    '<div class="hf-mobile-menu" id="hf-mobile-menu">' +
      '<div class="hf-mobile-top">' +
        '<span class="hf-brand">Havelock&nbsp;Fair</span>' +
        '<button class="hf-mobile-close" id="hf-menu-close" aria-label="Close menu">&times;</button>' +
      '</div>' +
      '<nav class="hf-mobile-nav" aria-label="Mobile navigation">' + navLinks() + '</nav>' +
      '<div class="hf-mobile-foot">' + langHTML + ticketsHTML + '</div>' +
    '</div>';

  var footerHTML =
    '<footer class="hf-footer">' +
      '<div class="hf-footer-grid">' +
        '<div>' +
          '<div class="hf-footer-brand">Havelock Fair</div>' +
          '<p class="hf-footer-tagline" data-i18n="hfoot_tagline">A treasured Canadian tradition since 1871, in the heart of the Haut-Saint-Laurent.</p>' +
        '</div>' +
        '<div>' +
          '<div class="hf-footer-h" data-i18n="hfoot_explore">Explore</div>' +
          '<div class="hf-footer-links">' +
            '<a href="' + P + 'schedule.html" data-i18n="nav_schedule">Schedule</a>' +
            '<a href="' + P + 'registration.html" data-i18n="nav_registration">Registration</a>' +
            '<a href="' + P + 'sponsors.html" data-i18n="nav_sponsors">Sponsors</a>' +
            '<a href="' + P + 'about.html" data-i18n="nav_about">About</a>' +
            '<a href="' + P + 'gallery.html" data-i18n="nav_gallery">Photos</a>' +
            '<a href="' + P + 'contact.html" data-i18n="nav_contact">Contact</a>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="hf-footer-h" data-i18n="hfoot_visit">Visit</div>' +
          '<p class="hf-footer-contact">455 Route 202<br>Havelock, Qu&eacute;bec J0S 2C0<br>' +
            '<a href="tel:+14508261155">(450) 826-1155</a><br>' +
            '<a href="https://www.facebook.com/havelockfair" target="_blank" rel="noopener">facebook.com/havelockfair</a></p>' +
        '</div>' +
      '</div>' +
      '<div class="hf-footer-legal" data-i18n="hfoot_credit">&copy; 2026 Havelock Fair &middot; Foire Havelock &mdash; With the support of MAPAQ &amp; the Association des expositions agricoles du Qu&eacute;bec.</div>' +
    '</footer>';

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
  document.body.insertAdjacentHTML('beforeend', footerHTML);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------------- mobile menu ---------------- */
    var menu = document.getElementById('hf-mobile-menu');
    var openBtn = document.getElementById('hf-menu-open');
    var closeBtn = document.getElementById('hf-menu-close');
    function closeMenu() {
      menu.classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
    }
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

    /* ---------------- scroll reveal + parallax ---------------- */
    if (reduce) return;

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
  });
})();
