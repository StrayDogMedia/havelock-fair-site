/* Fairgrounds plan — lives on pages/schedule.html, beside the timeline.
 *
 * Moved off pages/directions.html on 2026-09-10 so the map and the schedule
 * work as one thing: a venue on an event row selects its pin here, a pin
 * lists what is on there for the day the schedule is showing, each of those
 * rows jumps back to its time slot, and while the fair is on, pins with
 * something happening right now carry a live ring.
 *
 * Names come from mapLocations (js/map-data.js); "what's on here" comes from
 * scheduleData by matching `venue` — neither is duplicated here.
 *
 * The page talks to this file through window.fairgroundsMap:
 *   setDay(key)        which fair day the panel describes — the schedule calls
 *                      it from its day tabs, and again every minute while a
 *                      fair day is under way so the live ring stays honest
 *   select(id, focus)  light a pin (the schedule's venue links do this)
 *   onEventPick(time)  assigned by the page: a panel row was chosen, scroll
 *                      the timeline to that slot ("allday" for the band)
 *
 * ?now=2026-09-12T13:00 drives "today" and "on now" exactly as it does on the
 * schedule, so all of this is testable before the fair. */
(function () {
  'use strict';
  var pins = document.getElementById('map-pins');
  var wrap = document.getElementById('map-wrap');
  if (!pins || !wrap) return;
  var panel = document.getElementById('plan-panel');
  var legend = document.getElementById('plan-legend');
  var selected = null;
  var panelDay = null;      /* set by setDay(); until then, the live fair day or Saturday */
  var liveVenues = {};      /* venue id → true while something is on there right now */
  var liveTime = null;      /* start time of the "on now" slot, or null */

  var STR = {
    today:    { en: "Here today",  fr: "Ici aujourd'hui", es: "Aquí hoy" },
    hereOn:   { en: "Here on {d}", fr: "Ici {d}", es: "Aquí el {d}" },
    saturday: { en: "Saturday", fr: "samedi", es: "sábado" },
    sunday:   { en: "Sunday",   fr: "dimanche", es: "domingo" },
    nothing:  { en: "Nothing scheduled here.", fr: "Rien de prévu ici.", es: "Nada programado aquí." },
    unnamed:  { en: "Not yet named", fr: "Pas encore nommé", es: "Aún sin nombre" },
    pick:     { en: "Select a location", fr: "Choisissez un lieu", es: "Elija un lugar" },
    allday:   { en: "All day", fr: "Toute la journée", es: "Todo el día" },
    onnow:    { en: "On now", fr: "En cours", es: "Ahora" },
    jump:     { en: "Show it in the schedule", fr: "Voir dans l'horaire", es: "Ver en el horario" }
  };
  /* i18n.js declares `let currentLang` at the top level of a classic script.
     That creates a GLOBAL LEXICAL binding, not a property on the window
     object — so reading it off `window` returns undefined and the whole map
     silently fell back to English while the rest of the page translated.
     Read it by bare name, guarded in case i18n.js failed to load. */
  function lang() {
    try { return currentLang || 'en'; } catch (e) { return 'en'; }
  }
  var L = function (k) { var l = lang(); return STR[k][l] || STR[k].en; };
  var name = function (id) {
    var loc = mapLocations[id];
    if (!loc) return null;
    return loc[lang()] || loc.en;
  };
  var catOf = function (id) {
    var loc = mapLocations[id];
    return loc ? mapCategories[loc.cat] : null;
  };
  var reduceMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* `venue` on an event is one pin or a list of pins — always a list here */
  function venuesOf(e) { return e.venue ? [].concat(e.venue) : []; }

  /* One artwork, one coordinate set. Kept as a function because pins and the
     zoom-reveal both need it, and a single definition is what stops the two
     from drifting apart. */
  function xy(loc) { return [loc.x, loc.y]; }

  /* ---- time ---------------------------------------------------------- */
  var mins = function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; };

  /* the ?now= override the schedule already uses, so this is testable */
  function currentDate() {
    var q = new URLSearchParams(location.search).get('now');
    if (q) { var d = new Date(q); if (!isNaN(d)) return d; }
    return new Date();
  }
  function isoOf(n) {
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }
  /* which fair day, if any, is today */
  function activeDayKey() {
    var iso = isoOf(currentDate());
    for (var k in scheduleData) if (scheduleData[k].iso === iso) return k;
    return null;
  }
  /* minutes since midnight IF now falls on that fair day, else null —
     the same rule as the schedule's nowMinutesFor() */
  function nowMinFor(dayKey) {
    var day = scheduleData[dayKey];
    if (!day || !day.iso) return null;
    var n = currentDate();
    if (isoOf(n) !== day.iso) return null;
    return n.getHours() * 60 + n.getMinutes();
  }
  /* Before the fair there is no "today", so show Saturday — an empty panel
     would read as "nothing happens here", which is not what it means. */
  function dayForPanel() { return panelDay || activeDayKey() || 'saturday'; }

  function fmt(t) {
    var l = lang();
    if (l !== 'en') return l === 'fr' ? t.replace(':', ' h ') : t;
    var p = t.split(':'), h = +p[0], h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + p[1] + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  /* ---- "on now", the schedule's rule exactly --------------------------
     The timeline marks a time slot as on-now when the clock sits between its
     start and the NEXT slot's start. A pin is live when any event in that slot
     is at its venue. Same rule, so the map and the timeline never disagree
     about what is happening. */
  function computeLive() {
    liveVenues = {}; liveTime = null;
    var key = dayForPanel();
    var day = scheduleData[key];
    var nowMin = nowMinFor(key);
    if (!day || nowMin === null) return;
    var times = {};
    day.events.forEach(function (e) { if (!e.allDay) times[e.time] = true; });
    var order = Object.keys(times).sort(function (a, b) { return mins(a) - mins(b); });
    for (var i = 0; i < order.length; i++) {
      if (mins(order[i]) <= nowMin) liveTime = order[i]; else break;
    }
    if (liveTime === null) return;
    day.events.forEach(function (e) {
      if (!e.allDay && e.time === liveTime) venuesOf(e).forEach(function (v) { liveVenues[v] = true; });
    });
  }
  function applyLive() {
    computeLive();
    pins.querySelectorAll('.hf-pin').forEach(function (b) {
      b.classList.toggle('is-live', !!liveVenues[b.dataset.loc]);
    });
  }

  function eventsAt(id) {
    var day = scheduleData[dayForPanel()];
    if (!day) return [];
    var l = lang();
    return day.events
      .filter(function (e) { return venuesOf(e).indexOf(id) !== -1; })
      .sort(function (a, b) { return (a.allDay ? -1 : mins(a.time)) - (b.allDay ? -1 : mins(b.time)); })
      .map(function (e) {
        var state = '';
        if (!e.allDay && liveTime !== null) {
          if (e.time === liveTime) state = 'now';
          else if (mins(e.time) < mins(liveTime)) state = 'done';
        }
        return { time: e.allDay ? L('allday') : fmt(e.time), slot: e.allDay ? 'allday' : e.time,
                 title: e[l] || e.en, state: state };
      });
  }

  function render(id) {
    var loc = mapLocations[id];
    var cat = catOf(id);
    if (!loc) {
      panel.innerHTML = '<div class="pp-num">' + id + '</div>' +
        '<div class="pp-name pp-unnamed">' + L('unnamed') + '</div>';
      return;
    }
    var evs = eventsAt(id);
    var l = lang();
    var key = dayForPanel();
    var heading = key === activeDayKey() ? L('today') : L('hereOn').replace('{d}', L(key));
    panel.innerHTML =
      '<div class="pp-head" style="--pl-color:' + cat.color + ';--pl-ink:' + cat.ink + '">' +
        '<span class="pp-num">' + id + '</span>' +
        '<span class="pp-cat">' + (cat[l] || cat.en) + '</span>' +
      '</div>' +
      '<div class="pp-name">' + (loc[l] || loc.en) + '</div>' +
      '<div class="pp-today">' + heading + '</div>' +
      (evs.length
        ? '<ul class="pp-events">' + evs.map(function (e) {
            return '<li' + (e.state ? ' class="is-' + e.state + '"' : '') + '>' +
              '<button type="button" class="pp-ev" data-time="' + e.slot + '" title="' + L('jump') + '">' +
                '<span class="pp-t">' + e.time + '</span>' +
                '<span>' + e.title + (e.state === 'now' ? ' <em class="pp-ev-flag">' + L('onnow') + '</em>' : '') + '</span>' +
              '</button></li>';
          }).join('') + '</ul>'
        : '<p class="pp-empty">' + L('nothing') + '</p>');
  }
  /* a panel row leads back to its time slot on the timeline */
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('.pp-ev');
    if (!b) return;
    if (typeof api.onEventPick === 'function') api.onEventPick(b.dataset.time, dayForPanel());
  });

  function select(id, focusPanel) {
    selected = id;
    pins.querySelectorAll('.hf-pin').forEach(function (b) {
      var on = b.dataset.loc === String(id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    legend.querySelectorAll('.pl-legend-item').forEach(function (b) {
      var on = b.dataset.loc === String(id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render(id);
    revealPin(id);
    if (focusPanel) panel.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, '', '#loc-' + id);
  }

  function clear() {
    selected = null;
    pins.querySelectorAll('.hf-pin').forEach(function (b) {
      b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false');
    });
    legend.querySelectorAll('.pl-legend-item').forEach(function (b) {
      b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false');
    });
    panel.innerHTML = '<p class="pp-empty">' + L('pick') + '</p>';
  }

  /* the map is far down a long page — bring it up when something else on the
     page (a venue link, a deep link) points at it */
  function scrollToMap(instant) {
    var sec = document.getElementById('fairgrounds-map') || wrap;
    sec.scrollIntoView({ behavior: (instant || reduceMotion()) ? 'auto' : 'smooth', block: 'start' });
  }

  /* Venue links on the schedule rows are `#loc-N`. They select the pin on this
     same page instead of navigating — the whole point of the map living here. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.ev-venue');
    if (!a) return;
    var m = (a.getAttribute('href') || '').match(/#loc-(\d+)$/);
    if (!m || !mapLocations[m[1]]) return;
    e.preventDefault();
    select(+m[1], e.detail === 0);
    scrollToMap();
  });

  function buildLegend() {
    var l = lang();
    var html = '';
    mapLegendOrder.forEach(function (catKey) {
      var ids = Object.keys(mapLocations).filter(function (id) { return mapLocations[id].cat === catKey; });
      if (!ids.length) return;
      var cat = mapCategories[catKey];
      html += '<div class="pl-legend-group" style="--pl-color:' + cat.color + ';--pl-ink:' + cat.ink + '">' +
        '<div class="pl-legend-h"><span class="pl-legend-dot" aria-hidden="true"></span>' + (cat[l] || cat.en) + '</div>';
      ids.sort(function (a, b) { return +a - +b; }).forEach(function (id) {
        html += '<button type="button" class="pl-legend-item" data-loc="' + id + '" aria-pressed="false">' +
          '<span class="pl-legend-n">' + id + '</span>' +
          '<span class="pl-legend-name">' + (mapLocations[id][l] || mapLocations[id].en) + '</span>' +
        '</button>';
      });
      html += '</div>';
    });
    legend.innerHTML = html;
    legend.querySelectorAll('.pl-legend-item').forEach(function (b) {
      b.addEventListener('click', function () { select(+b.dataset.loc, false); });
    });
  }

  function labelGroups() {
    pins.querySelectorAll('.hf-pin').forEach(function (b) {
      var id = +b.dataset.loc;
      var n = name(id);
      b.setAttribute('aria-label', n ? id + ' — ' + n : id + ' — ' + L('unnamed'));
    });
  }

  /* Pins are generated from mapLocations, so a location can never exist in
     the data without being on the map — the two cannot drift. */
  function buildPins() {
    var l = lang();
    pins.innerHTML = Object.keys(mapLocations).sort(function (a, b) { return +a - +b; })
      .map(function (id) {
        var loc = mapLocations[id];
        var cat = mapCategories[loc.cat];
        return '<button type="button" class="hf-pin" data-loc="' + id + '"' +
          ' style="left:' + xy(loc)[0] + '%;top:' + xy(loc)[1] + '%;--pl-ink:' + cat.ink + '"' +
          ' aria-pressed="false">' +
          '<span class="hf-pin-n">' + id + '</span>' +
          '<span class="sr-only">' + (loc[l] || loc.en) + '</span>' +
        '</button>';
      }).join('');
    pins.querySelectorAll('.hf-pin').forEach(function (b) {
      /* A <button> fires Enter/Space as a click, so the keyboard path would
         otherwise never move focus to the answer. e.detail === 0 means the
         activation did not come from a pointer. */
      b.addEventListener('click', function (e) {
        select(+b.dataset.loc, e.detail === 0);
      });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && selected !== null) {
      var b = pins.querySelector('.hf-pin[data-loc="' + selected + '"]');
      clear();
      if (b) b.focus();
    }
  });

  /* ---- zoom + pan -------------------------------------------------
     The map ALWAYS fits its container: forcing a min-width so the closest
     pins would not overlap meant side-scrolling the whole map on a phone,
     which is worse than the problem it solved. Zoom is how you separate
     crowded pins now, and the legend stays a complete alternative. */
  var zoom = 1, panX = 0, panY = 0;
  var MIN = 1, MAX = 4;
  var view = document.getElementById('map-view');

  function clampPan() {
    /* never drag the artwork away from under the frame */
    var r = wrap.getBoundingClientRect();
    var maxX = r.width * (zoom - 1) / 2;
    var maxY = r.height * (zoom - 1) / 2;
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }
  function applyZoom() {
    clampPan();
    view.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
    /* counter-scale the pins so they stay the same size on screen — and
       stay a real touch target — at every zoom level */
    pins.style.setProperty('--pin-inv', (1 / zoom).toFixed(4));
    wrap.classList.toggle('is-zoomed', zoom > 1);
  }
  function setZoom(z, ox, oy) {
    var prev = zoom;
    zoom = Math.max(MIN, Math.min(MAX, z));
    if (zoom === prev) return;
    if (zoom === 1) { panX = 0; panY = 0; }
    else if (ox !== undefined) {
      var k = zoom / prev;
      panX = ox - (ox - panX) * k;
      panY = oy - (oy - panY) * k;
    }
    applyZoom();
  }

  document.getElementById('map-zoom').addEventListener('click', function (e) {
    var b = e.target.closest('[data-zoom]');
    if (!b) return;
    if (b.dataset.zoom === 'in') setZoom(zoom * 1.6);
    else if (b.dataset.zoom === 'out') setZoom(zoom / 1.6);
    else setZoom(1);
  });

  /* drag to pan, only when there is something to pan to */
  var dragging = false, lastX = 0, lastY = 0, moved = 0;
  wrap.addEventListener('pointerdown', function (e) {
    if (zoom === 1 || e.target.closest('.hf-pin, .hf-map-zoom')) return;
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    panX += e.clientX - lastX; panY += e.clientY - lastY;
    moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    applyZoom();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    wrap.addEventListener(ev, function () { dragging = false; });
  });

  /* pinch */
  var pointers = new Map(), pinchStart = 0, zoomStart = 1;
  wrap.addEventListener('pointerdown', function (e) { pointers.set(e.pointerId, e); });
  wrap.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (pointers.size !== 2) return;
    var p = [...pointers.values()];
    var d = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
    if (!pinchStart) { pinchStart = d; zoomStart = zoom; return; }
    setZoom(zoomStart * (d / pinchStart));
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    wrap.addEventListener(ev, function (e) { pointers.delete(e.pointerId); pinchStart = 0; });
  });

  /* selecting a crowded pin should bring it into view */
  function revealPin(id) {
    if (zoom === 1) return;
    var loc = mapLocations[id];
    if (!loc) return;
    var r = wrap.getBoundingClientRect();
    var c = xy(loc);
    panX = (0.5 - c[0] / 100) * r.width * zoom;
    panY = (0.5 - c[1] / 100) * r.height * zoom;
    applyZoom();
  }

  /* ?calibrate=1 — the artwork is a picture, so pin positions are pixel
     positions. This prints the percentage under the cursor and copies it on
     click, which turns "the art was redrawn" from a chore into a few minutes. */
  function initCalibrate() {
    if (!new URLSearchParams(location.search).has('calibrate')) return;
    var cal = document.getElementById('map-cal');
    cal.hidden = false;
    wrap.classList.add('is-calibrating');
    wrap.addEventListener('mousemove', function (e) {
      var r = wrap.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
      var y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      cal.textContent = 'x: ' + x + ', y: ' + y;
      cal.style.left = (e.clientX - r.left) + 'px';
      cal.style.top = (e.clientY - r.top) + 'px';
    });
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.hf-pin')) return;
      var r = wrap.getBoundingClientRect();
      var t = 'x: ' + ((e.clientX - r.left) / r.width * 100).toFixed(1) +
              ', y: ' + ((e.clientY - r.top) / r.height * 100).toFixed(1);
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      console.log(t);
    });
  }

  function refresh() {
    buildPins(); buildLegend(); labelGroups(); applyLive();
    if (selected !== null) select(selected, false); else clear();
  }

  if (typeof setLanguage === 'function') {
    var orig = setLanguage;
    window.setLanguage = function (lang) { orig(lang); refresh(); };
  }

  var api = {
    select: function (id, focusPanel) { if (mapLocations[id]) select(+id, !!focusPanel); },
    clear: clear,
    setDay: function (key) {
      if (scheduleData[key]) panelDay = key;
      applyLive();
      if (selected !== null) render(selected);
    },
    day: dayForPanel,
    refresh: refresh,
    onEventPick: null
  };
  window.fairgroundsMap = api;

  refresh();
  initCalibrate();
  /* deep link: schedule.html#loc-10 (directions.html#loc-10 forwards here) */
  var m = (location.hash || '').match(/^#loc-(\d+)$/);
  if (m && mapLocations[m[1]]) {
    select(+m[1], false);
    window.addEventListener('load', function () { scrollToMap(true); });
  }
})();
