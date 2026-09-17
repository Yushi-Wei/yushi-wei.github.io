(() => {
  const dialog = document.querySelector('.photo-dialog');
  if (!dialog || !dialog.showModal) return;
  const links = [...document.querySelectorAll('[data-photo]')];
  const stage = dialog.querySelector('.photo-dialog-stage');
  const viewer = stage.querySelector('img');
  const position = dialog.querySelector('.photo-position');
  const caption = dialog.querySelector('.photo-dialog-caption');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = new Map();
  const easing = 'cubic-bezier(.2,.7,.2,1)';
  const chinese = () => document.documentElement.lang === 'zh-CN';
  let active = 0;
  let displayed = -1;
  let origin;
  let phase = 'closed';
  let renderVersion = 0;
  let sessionVersion = 0;
  const setPhase = next => { phase = next; dialog.dataset.state = next; };
  const stopMotion = () => { motion.forEach(animation => animation.cancel()); motion.clear(); };
  const animate = (element, frames, duration) => {
    motion.get(element)?.cancel();
    if (reduced.matches || document.hidden || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, { duration, easing, fill: 'both' });
    motion.set(element, animation);
    return animation.finished.catch(() => {}).finally(() => {
      if (motion.get(element) === animation) motion.delete(element);
      animation.cancel();
    });
  };
  const updateCopy = () => {
    if (displayed >= 0) {
      viewer.alt = links[displayed].querySelector('img').alt;
      position.textContent = `${String(displayed + 1).padStart(2, '0')} / ${links.length}`;
    }
    caption.textContent = stage.getAttribute('aria-busy') === 'true'
      ? chinese() ? '照片加载中…' : 'Loading photograph…'
      : displayed >= 0 ? viewer.alt : '';
  };
  const show = async (index, direction = 0) => {
    if (phase === 'closed' || phase === 'closing') return;
    active = (index + links.length) % links.length;
    const requested = active;
    const version = ++renderVersion;
    stage.setAttribute('aria-busy', 'true');
    updateCopy();
    const preload = new Image();
    preload.src = links[requested].href;
    try { await preload.decode(); } catch {
      if (version !== renderVersion || !dialog.open || phase === 'closing') return;
      stage.setAttribute('aria-busy', 'false');
      caption.textContent = chinese() ? '暂时无法加载这张照片。' : 'This photograph could not be loaded.';
      return;
    }
    if (version !== renderVersion || !dialog.open || phase === 'closing') return;
    displayed = requested;
    viewer.src = preload.src;
    stage.setAttribute('aria-busy', 'false');
    updateCopy();
    await animate(viewer, [
      { opacity: 0, transform: direction ? `translateX(${direction * 14}px) scale(.985)` : 'scale(.96)' },
      { opacity: 1, transform: 'translateX(0) scale(1)' }
    ], direction ? 280 : 420);
  };
  const finishClose = () => { if (dialog.open) dialog.close(); };
  const requestClose = async () => {
    if (phase === 'closed' || phase === 'closing') return;
    const surfaceOpacity = getComputedStyle(dialog).opacity;
    const imageStyle = getComputedStyle(viewer);
    const imageStart = { opacity: imageStyle.opacity, transform: imageStyle.transform };
    setPhase('closing');
    ++renderVersion;
    stopMotion();
    await Promise.all([
      animate(dialog, [{ opacity: surfaceOpacity }, { opacity: 0 }], 260),
      animate(viewer, [imageStart, { opacity: 0, transform: 'scale(.96)' }], 260)
    ]);
    if (phase === 'closing') finishClose();
  };
  links.forEach((link, index) => link.addEventListener('click', async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (phase !== 'closed') return;
    const session = ++sessionVersion;
    origin = link;
    displayed = -1;
    position.textContent = '';
    setPhase('opening');
    dialog.showModal();
    document.body.classList.add('photo-viewing');
    await Promise.all([
      animate(dialog, [{ opacity: 0 }, { opacity: 1 }], 320),
      show(index)
    ]);
    if (session === sessionVersion && phase === 'opening') setPhase('open');
  }));
  dialog.querySelector('.photo-close').addEventListener('click', requestClose);
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  dialog.querySelector('.photo-prev').addEventListener('click', () => show(active - 1, -1));
  dialog.querySelector('.photo-next').addEventListener('click', () => show(active + 1, 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      show(active + direction, direction);
    }
  });
  dialog.addEventListener('close', () => {
    ++sessionVersion;
    ++renderVersion;
    stopMotion();
    setPhase('closed');
    stage.setAttribute('aria-busy', 'false');
    document.body.classList.remove('photo-viewing');
    viewer.removeAttribute('src');
    viewer.alt = '';
    displayed = -1;
    if (origin?.isConnected && !document.hidden) origin.focus({ preventScroll: true });
  });
  const settleMotion = () => {
    if (!reduced.matches && !document.hidden) return;
    stopMotion();
    if (phase === 'closing') finishClose();
    else if (phase === 'opening') setPhase('open');
  };
  reduced.addEventListener('change', settleMotion);
  document.addEventListener('visibilitychange', settleMotion);
  window.addEventListener('pagehide', finishClose);
  document.addEventListener('site:languagechange', () => { if (dialog.open) updateCopy(); });
})();
