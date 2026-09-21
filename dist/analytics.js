(() => {
  // Keep local previews out of the live site's visitor statistics.
  if (location.hostname !== 'yushi-wei.github.io' || window.siteStatcounterLoaded) return;
  window.siteStatcounterLoaded = true;

  window.sc_project = 13356007;
  window.sc_invisible = 1;
  window.sc_security = '5eb972d3';

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.statcounter.com/counter/counter.js';
  document.body.appendChild(script);
})();
