(() => {
  'use strict';

  const summary = document.getElementById('scholar-summary');
  if (!summary) return;

  const total = summary.querySelector('.scholar-total');
  const updated = summary.querySelector('.scholar-updated');
  const publications = [...document.querySelectorAll('.publication[data-publication-id]')];
  let snapshot = null;

  const isCount = value => Number.isSafeInteger(value) && value >= 0;
  const readDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const scholarUrl = value => {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'scholar.google.com' ||
          url.port || url.username || url.password || !/^\/(citations|scholar)\/?$/.test(url.pathname)) return null;
      return url.href;
    } catch {
      return null;
    }
  };

  function render() {
    if (!snapshot) return;
    const chinese = document.documentElement.lang === 'zh-CN';
    const locale = chinese ? 'zh-CN' : 'en-GB';
    const number = new Intl.NumberFormat(locale);
    const dateFormat = new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: chinese ? 'long' : 'short', year: 'numeric', timeZone: 'Asia/Shanghai'
    });
    const dateText = date => `${chinese ? '更新于' : 'Updated '}${dateFormat.format(date)}`;
    const snapshotDate = readDate(snapshot.updated_at);
    const hasTotal = isCount(snapshot.total_citations) && snapshotDate !== null;

    summary.classList.toggle('has-data', hasTotal);
    total.hidden = !hasTotal;
    updated.hidden = !hasTotal;
    if (hasTotal) {
      total.querySelector('strong').textContent = number.format(snapshot.total_citations);
      total.querySelector('span').textContent = chinese ? '总引用' : 'total citations';
      total.setAttribute('aria-label', chinese
        ? `Google Scholar 个人主页总引用：${number.format(snapshot.total_citations)}`
        : `${number.format(snapshot.total_citations)} total citations on the Google Scholar profile`);
      updated.dateTime = snapshotDate.toISOString();
      updated.textContent = dateText(snapshotDate);
      updated.title = chinese ? 'Google Scholar 个人主页数据 · 北京时间' : 'Google Scholar profile data · China Standard Time';
    }

    publications.forEach(publication => {
      const id = publication.dataset.publicationId;
      const paper = Object.hasOwn(snapshot.papers, id) ? snapshot.papers[id] : null;
      const date = paper && readDate(paper.updated_at);
      const href = paper && scholarUrl(paper.scholar_url);
      let row = publication.querySelector('.publication-citations');
      if (!paper || !isCount(paper.citations) || !date || !href ||
          typeof paper.scholar_id !== 'string' || !paper.scholar_id.trim()) {
        if (row) row.hidden = true;
        return;
      }
      if (!row) {
        row = document.createElement('p');
        row.className = 'publication-citations';
        const link = document.createElement('a');
        link.className = 'publication-citation-link';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const label = document.createElement('span');
        label.className = 'publication-citation-label';
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden', 'true');
        link.append(label, arrow);
        row.append(link);
        (publication.querySelector(':scope > div') || publication).append(row);
      }
      const count = number.format(paper.citations);
      const label = chinese ? `${count} 次引用` : `${count} ${paper.citations === 1 ? 'citation' : 'citations'}`;
      const link = row.querySelector('a');
      row.hidden = false;
      link.href = href;
      link.querySelector('.publication-citation-label').textContent = label;
      link.title = `Google Scholar · ${dateText(date)}`;
      link.setAttribute('aria-label', `${label} · Google Scholar · ${dateText(date)}`);
    });
  }

  document.addEventListener('site:languagechange', render);
  fetch('/data/citations.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Citation data unavailable');
      return response.json();
    })
    .then(data => {
      if (!data || data.version !== 1 || data.author_id !== 'DXJTi30AAAAJ' ||
          !data.papers || typeof data.papers !== 'object' || Array.isArray(data.papers)) return;
      snapshot = data;
      render();
    })
    .catch(() => { /* The Google Scholar profile remains available when a snapshot cannot be read. */ });
})();
