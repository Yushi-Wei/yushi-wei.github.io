(() => {
  const isChinese = () => document.documentElement.lang === 'zh-CN';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const animations = new Map();
  const revealed = new WeakSet();
  const entranceDelay = index => Math.min(index, 3) * 55;

  // The document stays visible by default. Entrance effects exist only while playing.
  const cancelEntrance = element => animations.get(element)?.cancel();
  const enter = (element, delay = 0, distance = 14) => {
    cancelEntrance(element);
    if (document.hidden || reducedMotion.matches || window.sitePageMotion?.active || !element.animate || element.closest('[hidden]') || element.matches(':focus-within')) return;
    // The artwork fades without competing with its pointer-driven position.
    const frames = element.matches('.hero-visual')
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'translateY(0)' }];
    const animation = element.animate(frames, { duration: 620, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    animations.set(element, animation);
    const forget = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    animation.onfinish = forget;
    animation.oncancel = forget;
  };
  const stopEntrances = () => {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  };

  const entranceElements = [...document.querySelectorAll([
    '.hero-topline', '.hero-copy', '.hero-visual',
    '.page-intro > .section-label', '.page-intro > .page-title', '.research-introduction > .page-title',
    '.research-summary', '.publication-record', '.research-quicklinks', '.theme-toolbar', '.research-grid > .theme-card',
    '.news-heading', '.news-item', '.publication-intro',
    '.year-heading', '.publication', '.experience-grid > div',
    '.academic-contributions > section', '.life-opening-copy', '.life-opening-art',
    '.life-chapter-heading', '.life-chapter .life-photo', '.life-pause', '.life-closing'
  ].join(','))];
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.closest('[hidden]')) return;
        observer.unobserve(entry.target);
        if (revealed.has(entry.target)) return;
        revealed.add(entry.target);
        enter(entry.target, entranceDelay(order++));
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 32px 0px' });
    entranceElements.forEach(element => observer.observe(element));
  }
  const settleVisibleEntrances = () => {
    stopEntrances();
    entranceElements.forEach(element => {
      const box = element.getBoundingClientRect();
      if (box.top < window.innerHeight + 32 && box.bottom > 0) {
        observer?.unobserve(element);
        revealed.add(element);
      }
    });
  };
  // The whole-page arrival already reveals the first viewport. Keep later
  // scroll entrances, but do not replay an entrance after a slow script load.
  if (window.sitePageMotion?.arriving) settleVisibleEntrances();
  document.addEventListener('site:page-arrive', () => {
    if (window.sitePageMotion?.arriving) settleVisibleEntrances();
  });
  document.addEventListener('site:page-leave', stopEntrances);
  // Tabbing into an arriving block must reveal the focused link immediately.
  document.addEventListener('focusin', event => {
    animations.forEach((animation, element) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stopEntrances();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopEntrances();
  });
  window.addEventListener('pagehide', stopEntrances);
  document.addEventListener('site:languagechange', () => {
    // Translated text may change block heights. Settle everything now in view
    // so the resulting layout change does not trigger fresh entrance effects.
    settleVisibleEntrances();
  });

  const visual = document.querySelector('.hero-visual');
  const region = document.querySelector('.hero-composition');
  if (visual && region) {
    let inView = true;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      visual.style.setProperty('--move-x', '0px');
      visual.style.setProperty('--move-y', '0px');
    };
    const syncArtwork = () => {
      const stopped = reducedMotion.matches || document.hidden || !inView;
      visual.classList.toggle('art-paused', stopped);
      if (stopped) reset();
    };
    region.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches || document.hidden || !inView) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = region.getBoundingClientRect();
        visual.style.setProperty('--move-x', ((event.clientX - box.left) / box.width - 0.5) * 10 + 'px');
        visual.style.setProperty('--move-y', ((event.clientY - box.top) / box.height - 0.5) * 8 + 'px');
      });
    });
    region.addEventListener('pointerleave', reset);
    finePointer.addEventListener('change', reset);
    reducedMotion.addEventListener('change', syncArtwork);
    document.addEventListener('visibilitychange', syncArtwork);
    window.addEventListener('pagehide', reset);
    window.addEventListener('pageshow', syncArtwork);
    if ('IntersectionObserver' in window) {
      const artObserver = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        syncArtwork();
      });
      artObserver.observe(visual);
    }
    syncArtwork();
    // Ambient motion follows visibility and the visitor's system preference.
    visual.classList.add('art-animated');
  }

  const filter = document.querySelector('#first-author-filter');
  const list = document.querySelector('#publication-list');
  const count = document.querySelector('#publication-count');
  if (!filter || !list || !count) return;
  const groups = [...list.querySelectorAll('.publication-group')];
  // First-author papers lead each year; keep the order within both sets stable.
  groups.forEach(group => {
    const container = group.querySelector('.year-papers');
    const entries = [...container.querySelectorAll('.publication')];
    const ordered = [
      ...entries.filter(paper => paper.dataset.firstAuthor === 'true'),
      ...entries.filter(paper => paper.dataset.firstAuthor !== 'true')
    ];
    if (ordered.some((paper, index) => paper !== entries[index])) container.append(...ordered);
  });
  const papers = [...list.querySelectorAll('.publication')];
  const themeButtons = [...document.querySelectorAll('[data-theme]')];
  const cards = themeButtons.filter(button => button.dataset.theme !== 'all');
  const empty = document.querySelector('#publication-empty');
  let activeTheme = 'all';
  let firstAuthorOnly = false;
  const hasTheme = (paper, theme) => (paper.dataset.themes || '').split(' ').includes(theme);

  const updatePublications = (animate = true) => {
    filter.setAttribute('aria-pressed', String(firstAuthorOnly));
    list.dataset.activeTheme = activeTheme;
    themeButtons.forEach(button => {
      const selected = button.dataset.theme === activeTheme;
      button.setAttribute('aria-pressed', String(selected));
      const mark = button.querySelector('.theme-mark');
      if (mark) mark.textContent = selected ? '✓' : '+';
    });
    // Each topic count includes overlapping papers and respects the author filter.
    cards.forEach(card => {
      const n = papers.filter(paper => hasTheme(paper, card.dataset.theme) && (!firstAuthorOnly || paper.dataset.firstAuthor === 'true')).length;
      card.querySelector('.theme-count').textContent = isChinese() ? `${n} 篇${firstAuthorOnly ? '一作' : '论文'}` : `${n} ${firstAuthorOnly ? 'first-author ' : ''}${n === 1 ? 'paper' : 'papers'}`;
    });
    let total = 0;
    const visiblePapers = [];
    groups.forEach(group => {
      let visible = 0;
      group.querySelectorAll('.publication').forEach(paper => {
        cancelEntrance(paper);
        const matchesAuthor = !firstAuthorOnly || paper.dataset.firstAuthor === 'true';
        const matchesTheme = activeTheme === 'all' || hasTheme(paper, activeTheme);
        paper.hidden = !matchesAuthor || !matchesTheme;
        if (!paper.hidden) {
          visible++;
          visiblePapers.push(paper);
        }
      });
      group.hidden = visible === 0;
      group.querySelector('.year-count').textContent = isChinese() ? `${visible} 篇` : `${visible} ${visible === 1 ? 'publication' : 'publications'}`;
      total += visible;
    });
    const themeLabel = cards.find(card => card.dataset.theme === activeTheme)?.querySelector('.theme-title').textContent;
    count.textContent = isChinese() ? `共 ${total} 篇${firstAuthorOnly ? '一作' : '论文'} · ${themeLabel || '全部方向'}` : `${total} ${firstAuthorOnly ? 'first-author ' : ''}${total === 1 ? 'publication' : 'publications'}${themeLabel ? ` · ${themeLabel}` : ' · All topics'}`;
    if (empty) empty.hidden = total !== 0;
    if (!animate) return;
    // Filter state changes immediately. Only on-screen entries receive a short flourish.
    const onScreen = visiblePapers.filter(paper => {
      const box = paper.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > 0;
    });
    onScreen.forEach((paper, index) => {
      observer?.unobserve(paper);
      revealed.add(paper);
      enter(paper, entranceDelay(index), 9);
    });
  };
  filter.addEventListener('click', () => {
    firstAuthorOnly = !firstAuthorOnly;
    updatePublications();
  });
  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Pressing the selected card again restores all topics.
      activeTheme = activeTheme === button.dataset.theme ? 'all' : button.dataset.theme;
      updatePublications();
    });
    button.disabled = false;
    button.hidden = false;
  });
  updatePublications(false);
  document.addEventListener('site:languagechange', () => updatePublications(false));
  filter.hidden = false;
})();
