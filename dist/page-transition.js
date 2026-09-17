(() => {
  // Register before the first render so incoming snapshots never capture a
  // second set of section entrances. Normal links remain browser navigations.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = window.sitePageMotion = { active: false, arriving: false };
  let currentTransition;
  window.addEventListener('pagereveal', event => {
    currentTransition = event.viewTransition;
    state.arriving = Boolean(currentTransition) && !reduced.matches;
    state.active = state.arriving;
    if (!currentTransition) return;
    if (reduced.matches) currentTransition.skipTransition();
    document.dispatchEvent(new Event('site:page-arrive'));
    const transition = currentTransition;
    transition.finished.then(() => {
      if (currentTransition !== transition) return;
      state.active = false;
      currentTransition = null;
    });
  });
  window.addEventListener('pageswap', event => {
    document.dispatchEvent(new Event('site:page-leave'));
    if (reduced.matches) event.viewTransition?.skipTransition();
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    currentTransition?.skipTransition();
    state.active = false;
  });
})();
