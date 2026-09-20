(() => {
  const root = document.documentElement;
  const controls = [...document.querySelectorAll('[data-language]')];
  if (!controls.length) return;
  const originals = [];
  const isHome = document.body.classList.contains('page-home');
  const isResearch = document.body.classList.contains('page-research');
  const isAcademic = document.body.classList.contains('page-academic');
  const isLife = document.body.classList.contains('page-life');
  const bind = (selector, chinese, html = false, attribute = null) => {
    document.querySelectorAll(selector).forEach(element => {
      originals.push({ element, chinese, html, attribute,
        english: attribute ? element.getAttribute(attribute) : html ? element.innerHTML : element.textContent });
    });
  };
  const text = (selector, chinese) => bind(selector, chinese);
  const rich = (selector, chinese) => bind(selector, chinese, true);
  const attr = (selector, name, chinese) => bind(selector, chinese, false, name);

  text('.skip-link', '跳转到正文');
  text('.site-header nav a[href="/"]', '首页');
  text('.site-header nav a[href="/research/"]', '研究');
  text('.site-header nav a[href="/academic/"]', '学术');
  text('.site-header nav a[href="/life/"]', '生活');
  attr('.site-header nav', 'aria-label', '主导航');
  attr('.language-switch', 'aria-label', '语言选择');
  attr('.wordmark', 'aria-label', '魏雨石主页');
  text('footer > span', '魏雨石 · Yushi Wei');

  if (isHome) {
    text('.hero-topline > span:first-child', '个人主页');
    text('.hero-topline .edition', '人机交互 · 扩展现实');
    rich('#name', '<span class="name-zh">魏雨石</span><span class="name-latin" lang="en">Yushi Wei</span>');
    text('.profile-role', '计算媒体与艺术 · 博士候选人（最后一年）');
    attr('.faculty-notice', 'aria-label', '教职求职信息');
    text('.faculty-notice strong', '正在寻找教职机会');
    rich('.faculty-notice a', '欢迎联系 <span aria-hidden="true">↗</span>');
    rich('.profile-bio', '<span class="zh-paragraph">魏雨石现为香港科技大学（广州）计算媒体与艺术博士候选人，处于博士学习的最后一年，导师为 <a href="https://cma.hkust-gz.edu.cn/faculty-regular/hai-ning-liang/" target="_blank" rel="noopener noreferrer" lang="en">Hai-Ning Liang</a> 和 <a href="https://cma.hkust-gz.edu.cn/faculty-regular/pan-hui-3/" target="_blank" rel="noopener noreferrer" lang="en">Pan Hui</a>。</span><span class="zh-paragraph">研究聚焦扩展现实（XR）中的人类感知与空间交互，探索如何拓展人在物理与数字世界中的感知、表达与行动能力。</span>');
    rich('.profile-actions a[href="/research/"]', '研究与论文 <span aria-hidden="true">↗</span>');
    rich('.profile-actions a[href*="scholar.google.com"]', '谷歌学术 <span aria-hidden="true">↗</span>');
    text('.art-caption-heading > span:first-child', 'XR / 空间交互');
    rich('.art-explanation', '<span>目光流转，</span><span>空间渐生。</span>');
    attr('.hero-visual img', 'alt', '一座钴蓝色抽象雕塑，由折叠的带状结构、半透明平面和围绕发光焦点的纤细空间轨迹构成。');
    text('.news-heading .section-label', '近期动态');
    rich('#news-heading', '近期动态');
    rich('.news-item:nth-child(1) p', '在大韩民国大邱举行的 <strong>IEEE VR 2026</strong> 上报告 <a href="https://doi.org/10.1109/TVCG.2026.3679883" target="_blank" rel="noopener noreferrer" lang="en">RayFlex</a> 和 <a href="https://doi.org/10.1109/TVCG.2026.3679138" target="_blank" rel="noopener noreferrer" lang="en">Reorienting with the Bare Hand</a> 两项研究。');
    rich('.news-item:nth-child(2) p', '论文 <a href="https://doi.org/10.1080/10447318.2026.2623221" target="_blank" rel="noopener noreferrer" lang="en">D-Model</a> 发表于 <em lang="en">International Journal of Human–Computer Interaction</em>，探讨 VR 移动目标选择中的预期延迟。');
    rich('.news-item:nth-child(3) p', '我们关于<a href="https://doi.org/10.1109/TVCG.2025.3616824" target="_blank" rel="noopener noreferrer">基于凝视的路径跟随</a>的论文获 IEEE ISMAR 2025 <strong>最佳论文奖荣誉提名（Honorable Mention）</strong>。');
    rich('.news-item:nth-child(4) p', '我们关于 <a href="https://doi.org/10.1145/3698129" target="_blank" rel="noopener noreferrer">VR 中徒手多目标选择</a>的论文获 ACM ISS 2024 <strong>最佳论文奖荣誉提名（Honorable Mention）</strong>。');
  }

  if (isResearch) {
    text('#research > .section-label > span:first-child', '研究与论文');
    text('#research > .section-label > span:last-child', '空间交互 · 感知 · 行为建模');
    rich('#research-heading', '<span class="zh-title-overline">探索 XR 中的</span><em>感知与交互</em>');
    rich('.research-summary', '<span class="zh-paragraph">扩展现实（XR）为人们理解信息、表达想法，以及在物理与数字世界中行动开辟了新的可能。其关键在于从人的感知与行为出发，设计能够回应不同能力与意图的交互方式。</span><span class="zh-paragraph">研究结合实证研究、交互设计与交互表现的计算建模，探索 XR 系统的基础原理与设计方法，致力于拓展人的能力，让沉浸式环境成为学习、创造与协作的新媒介。</span>');
    text('#record-heading', '发表概况');
    rich('.record-lead', '已发表或接收论文 <strong>23 篇</strong>，其中<strong>第一作者 9 篇</strong>。<span class="zh-record-detail">一作论文包括 TVCG 7 篇、IJHCI 1 篇、CHI 1 篇。</span>');
    text('.record-stats > div:nth-child(1) dt', '期刊论文');
    rich('.record-stats > div:nth-child(1) dd span', '<span class="zh-stat-line">一作 8 篇</span><span class="zh-stat-line">待刊 2 篇</span>');
    text('.record-stats > div:nth-child(2) dt', '会议论文');
    text('.record-stats > div:nth-child(2) dd span', '一作 1 篇');
    text('.record-stats > div:nth-child(3) dt', '海报论文');
    text('.record-stats > div:nth-child(3) dd span', '合作发表');
    text('#journal-route-heading', '会议期刊论文');
    rich('.journal-route-lead', '<strong>10 篇论文</strong>，其中<strong>一作 3 篇</strong>。');
    text('.journal-route-explanation', '优秀会议论文可经同行评审推荐至相关期刊发表。');
    text('.record-venues p:nth-child(1) strong', '期刊');
    text('.record-venues p:nth-child(2) strong', '会议');
    text('.record-venues p:nth-child(3) strong', '海报');
    rich('.record-classifications[data-classification="ccf"]', '<a href="https://www.ccf.org.cn/Academic_Evaluation/By_category/" target="_blank" rel="noopener noreferrer">CCF 2026</a>：期刊或会议论文共 <strong>16 篇 A 类 · 2 篇 B 类 · 2 篇 C 类</strong>；第一作者论文为 <strong>8 篇 A 类 · 1 篇 B 类</strong>。');
    rich('.record-classifications[data-classification="jcr"]', '<a href="#classification-notes">JCR 2026 发布版</a>：<strong>16 篇 Q1 期刊论文 · 其中 8 篇第一作者</strong>。');
    text('.record-note', '21 项已发表成果 · 2 篇已接收待刊的期刊论文。');
    attr('.research-quicklinks', 'aria-label', '页内导航');
    rich('.research-quicklinks a', '查看论文 <span aria-hidden="true">↓</span>');
    text('#themes-heading', '研究方向');
    text('.theme-toolbar p', '点击方向筛选下方论文，同一论文可属于多个方向。');
    text('.theme-reset', '全部方向');
    attr('.research-grid', 'aria-label', '按研究主题筛选论文');
    text('#theme-spatial-title', '空间交互设计');
    text('#theme-spatial-description', '面向 XR 中自然、高效的操作，设计与评估凝视、手部和控制器交互技术，支持目标选择、文本输入与移动导航。');
    text('[data-theme="spatial"] .topic-tags', '凝视 · 手部输入 · 移动导航');
    text('#theme-perception-title', '感知与体验');
    text('#theme-perception-description', '研究视觉反馈、伪触觉和系统特性如何影响 XR 中的感知与体验，涵盖视觉清晰度、重量感知和交互反馈。');
    text('[data-theme="perception"] .topic-tags', '视觉清晰度 · 伪触觉 · 反馈');
    text('#theme-performance-title', '交互表现与建模');
    text('#theme-performance-description', '通过实证研究与计算模型解释、预测交互行为，揭示任务要求和系统约束如何影响交互表现。');
    text('[data-theme="performance"] .topic-tags', '行为规律 · 预测模型 · 系统影响');
    rich('#publication-list-heading', '论文列表');
    text('.classification-note summary', '标签、版本与来源');
    text('.classification-note [data-note="scope"]', '论文列表中的分级标签统一采用以下版本：');
    rich('.classification-note [data-note="ccf"]', '<strong>CCF A / B / C</strong>：采用 <a href="https://www.ccf.org.cn/Academic_Evaluation/By_category/" target="_blank" rel="noopener noreferrer">CCF 2026 年推荐目录（第七版）</a>中的期刊与会议等级。');
    rich('.classification-note [data-note="jcr"]', '<strong>JCR Q1</strong>：采用 <a href="https://journalcitationreports.zendesk.com/hc/en-gb/articles/47808147130129-2026" target="_blank" rel="noopener noreferrer">2026 年发布的 JCR，所用数据年份为 2025 年</a>。分区采用出版商公布的结果或期刊所在学科中的最佳分区。');
    rich('.classification-note [data-note="sources"]', '期刊分区来源：TVCG — <a href="https://open.ieee.org/wp-content/uploads/IEEE-Title-List-August-2026.pdf" target="_blank" rel="noopener noreferrer">IEEE</a>；TOG 与 PACMHCI — <a href="https://prod-www.acm.bloomreach.cloud/media-center/2026/july/impact-factors-2026" target="_blank" rel="noopener noreferrer">ACM</a>；IJHCI — <a href="https://www.tandfonline.com/journals/hihc20/about-this-journal" target="_blank" rel="noopener noreferrer">Taylor &amp; Francis</a>。');
    rich('.classification-note [data-note="routes"]', '<strong>会议 → 期刊</strong>：表示论文通过会议对应的期刊渠道发表。');
    rich('#first-author-filter', '<span class="filter-check" aria-hidden="true">✓</span>仅看一作');
    text('#publication-empty', '暂无符合条件的论文。可更换研究方向，或取消“一作”筛选。');
    text('.publication-type[data-type="journal"]', '期刊');
    text('.publication-type[data-type="conference"]', '会议');
    text('.publication-type[data-type="poster"]', '海报');
    text('.paper-topic[data-topic="spatial"]', '空间交互设计');
    text('.paper-topic[data-topic="perception"]', '感知与体验');
    text('.paper-topic[data-topic="performance"]', '交互表现与建模');
    attr('.publication-topics', 'aria-label', '研究主题');
    attr('.publication-rankings', 'aria-label', '发表渠道分类');
    attr('.venue-ranking[data-rank="Q1"]', 'title', 'JCR 2026 发布版（2025 年数据）；具体学科与来源见页面说明。');
    text('.paper-award', '最佳论文奖荣誉提名（Honorable Mention）');
    document.querySelectorAll('.publication-status').forEach(element => {
      const original = element.textContent;
      const translated = original === 'To appear' ? '已接收，待刊' : original;
      originals.push({element, chinese: translated, english: original});
    });
  }

  if (isAcademic) {
    text('.page-intro > .section-label > span:first-child', '学术工作');
    text('.page-intro > .section-label > span:last-child', '项目 · 专利 · 学术服务');
    rich('#experience-heading', '<span class="zh-title-part">科研与</span><em class="zh-title-part">学术服务</em>');
    text('#funding-heading', '科研项目');
    rich('.funding-title', '<span>XR 交互生态系统的构建与优化：</span><span class="zh-project-subtitle">从凝视-捏合增强到 AI 驱动自适应界面</span>');
    text('.funding-details > div:nth-child(1) dt', '资助机构');
    text('.funding-details > div:nth-child(1) dd', '日本东北大学');
    text('.funding-details > div:nth-child(2) dt', '项目角色');
    text('.funding-details > div:nth-child(2) dd', '共同负责人（Co-PI）');
    text('.funding-details > div:nth-child(3) dt', '项目编号');
    text('#patents-heading', '专利');


    text('.academic-service-grid > div:first-child > h2', '学术荣誉');
    text('.academic-service-grid .timeline li[data-year="2025"] h4', '最佳论文奖荣誉提名');
    text('.academic-service-grid .timeline li[data-year="2024"] h4', '最佳论文奖荣誉提名');
    text('.academic-service-grid .timeline li[data-year="2026"] h4', '优秀审稿特别表彰');
    text('.academic-service-grid > div:last-child > h2', '教学与服务');
    text('.service-block:nth-of-type(1) .date', '教学经历');
    text('.service-block:nth-of-type(1) p', '在香港科技大学（广州）和西交利物浦大学参与设计思维、游戏开发及计算机科学相关课程的教学。');
    text('.service-block:nth-of-type(2) .date', '科研指导');
    text('.service-block:nth-of-type(2) p', '指导学生开展 XR 交互、感知与交互表现研究。');
    text('.service-block:nth-of-type(3) .date', '学术审稿');
    text('.service-block:nth-of-type(3) p', 'ACM CHI · IEEE VR · IEEE ISMAR · IEEE TVCG · IJHCI 等。');
  }

  if (isLife) {
    text('[data-life-copy="eyebrow"]', '生活 / 日常片段');
    rich('#life-title', '生活，<br><em>在细微处。</em>');
    rich('#light-heading', '循着<em>光走。</em>');
    rich('[data-life-copy="pause"]', '再多看<br><em>一会儿。</em>');
    rich('#company-heading', '小小的<em>陪伴。</em>');
    rich('[data-life-copy="company-margin"]', '陪伴，<br>不必多说。');
    rich('#together-heading', '家，<em>与同行。</em>');
    rich('[data-life-copy="closing"]', '心怀好奇，<br><em>珍惜身边。</em>');
    document.querySelectorAll('[data-photo]').forEach(link => attr(`[data-photo="${link.dataset.photo}"]`, 'aria-label', `查看照片：${link.querySelector("img").dataset.altZh}`));
    document.querySelectorAll('[data-alt-zh]').forEach(img => attr(`[data-photo="${img.closest('[data-photo]').dataset.photo}"] img`, 'alt', img.dataset.altZh));
    attr('.companion-contact-sheet', 'aria-label', '更多与小动物相伴的日常');
    attr('.photo-dialog', 'aria-label', '照片浏览');
    attr('.photo-close', 'aria-label', '关闭照片');
    attr('.photo-prev', 'aria-label', '上一张照片');
    attr('.photo-next', 'aria-label', '下一张照片');
  }

  const englishTitle = document.title;
  const description = document.querySelector('meta[name="description"]');
  const englishDescription = description?.content;
  const chineseTitle = isHome ? '首页 — 魏雨石 Yushi Wei' : isResearch ? '研究与论文 — 魏雨石 Yushi Wei' : isLife ? '生活 — 魏雨石 Yushi Wei' : '学术工作 — 魏雨石 Yushi Wei';
  const chineseDescription = isHome ? '魏雨石，香港科技大学（广州）计算媒体与艺术博士候选人，现处于博士学习的最后一年，研究人机交互与扩展现实（XR），正在寻找教职机会。' : isResearch ? '魏雨石关于 XR 空间交互、感知与交互表现的研究和论文，可按研究方向及第一作者筛选。' : isLife ? '魏雨石的生活影像：光影、小动物、家人与相伴的日常。' : '魏雨石的科研项目、专利、学术荣誉与教学服务。';
  const applyLanguage = (language, persist = false) => {
    const chinese = language === 'zh-CN';
    root.lang = chinese ? 'zh-CN' : 'en';
    originals.forEach(({element, chinese: translation, english, html, attribute}) => {
      const value = chinese ? translation : english;
      if (attribute) {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      } else if (html) element.innerHTML = value; // Only locally authored, trusted translations.
      else element.textContent = value;
    });
    document.title = chinese ? chineseTitle : englishTitle;
    if (description) description.content = chinese ? chineseDescription : englishDescription;
    controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === root.lang)));
    if (persist) {
      try { localStorage.setItem('yushi-site-language', root.lang); } catch {}
    }
    document.dispatchEvent(new CustomEvent('site:languagechange'));
  };
  let preferred = 'en';
  try { if (localStorage.getItem('yushi-site-language') === 'zh-CN') preferred = 'zh-CN'; } catch {}
  controls.forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.language, true)));
  applyLanguage(preferred);
  document.querySelectorAll('.language-switch').forEach(control => { control.hidden = false; });
})();
