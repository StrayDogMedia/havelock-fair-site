/* Hero background rotator — crossfades through several fair photos.
   Adds a second layer beneath the gradient overlay and fades between them.
   Respects prefers-reduced-motion (shows a single static image). */
(function () {
  var HERO_IMAGES = [
    'images/hero/hero-1.jpg',
    'images/hero/hero-2.jpg',
    'images/hero/hero-3.jpg',
    'images/hero/hero-4.jpg',
    'images/hero/hero-5.jpg'
  ];
  var INTERVAL = 6000; // time each image is shown (ms)
  var FADE = 1400;     // crossfade duration (ms)

  document.addEventListener('DOMContentLoaded', function () {
    var base = document.querySelector('.hero-img');
    if (!base || HERO_IMAGES.length < 2) return;

    // Always show the first image immediately.
    base.style.backgroundImage = "url('" + HERO_IMAGES[0] + "')";

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // honour reduced-motion: no rotation

    // Preload the rest so crossfades are smooth.
    HERO_IMAGES.forEach(function (src) { var i = new Image(); i.src = src; });

    // Second layer, inserted right after .hero-img so it stays BELOW the
    // gradient overlay (.hero-bg) and the hero content.
    var layer = base.cloneNode(false);
    layer.style.opacity = '0';
    layer.style.backgroundImage = "url('" + HERO_IMAGES[0] + "')";
    base.style.transition = 'opacity ' + FADE + 'ms ease-in-out';
    layer.style.transition = 'opacity ' + FADE + 'ms ease-in-out';
    base.insertAdjacentElement('afterend', layer);

    var layers = [base, layer];
    var visible = 0;  // which layer is currently shown
    var imgIndex = 0; // which HERO_IMAGES entry is shown

    setInterval(function () {
      if (document.hidden) return; // don't advance on a background tab
      imgIndex = (imgIndex + 1) % HERO_IMAGES.length;
      var hidden = layers[1 - visible];
      var shown = layers[visible];
      hidden.style.backgroundImage = "url('" + HERO_IMAGES[imgIndex] + "')";
      hidden.style.opacity = '1';
      shown.style.opacity = '0';
      visible = 1 - visible;
    }, INTERVAL);
  });
})();
