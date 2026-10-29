// Sunny's Bookshop: small progressive enhancements. The site works without this file.
(() => {
  // Ticker pause (WCAG 2.2.2)
  document.querySelectorAll('.ticker__pause').forEach((b) => b.addEventListener('click', () => {
    const t = b.closest('.ticker'); const paused = t.classList.toggle('is-paused');
    b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Play' : 'Pause';
  }));

  // Open-now status, worked out in Los Angeles time from the hours Sanaz edits
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const la = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { day: p.weekday, date: `${p.year}-${p.month}-${p.day}`, mins: (+p.hour) * 60 + (+p.minute) };
  };
  const t12 = (hm) => { let [h, m] = hm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`; };
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  function status(hours, closed) {
    const now = la(); const byDay = Object.fromEntries(hours.map((h) => [h.day, h]));
    const special = (closed || []).find((c) => c.date === now.date);
    const today = byDay[now.day];
    if (special) return { open: false, text: `Closed today${special.reason ? ': ' + special.reason : ''}` };
    if (today && !today.closed) {
      if (now.mins < toMin(today.open)) return { open: false, text: `Opens today at ${t12(today.open)}` };
      if (now.mins < toMin(today.close)) return { open: true, text: `Open today until ${t12(today.close)}` };
    }
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() + i * 864e5);
      const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' }).format(d);
      const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
      const h = byDay[name];
      if (h && !h.closed && !(closed || []).some((c) => c.date === iso)) return { open: false, text: `Closed now · opens ${i === 1 ? 'tomorrow' : name} at ${t12(h.open)}` };
    }
    return { open: false, text: 'Closed' };
  }
  document.querySelectorAll('[data-hours]').forEach((el) => {
    try {
      const s = status(JSON.parse(el.dataset.hours), JSON.parse(el.dataset.closed || '[]'));
      el.textContent = s.text; el.dataset.open = String(s.open);
    } catch (e) { /* keep the static text */ }
  });
  const today = la().day;
  document.querySelectorAll('.hours tr[data-day]').forEach((tr) => tr.classList.toggle('is-today', tr.dataset.day === today));

  // Journal reading settings (text size, light/dark) and reading progress
  const reader = document.querySelector('.reader');
  if (reader) {
    reader.hidden = false;
    const root = document.documentElement;
    let st = {};
    try { st = JSON.parse(localStorage.getItem('sb-reader') || '{}'); } catch (e) { /* private mode */ }
    const apply = () => {
      if (st.size) root.dataset.size = st.size; else delete root.dataset.size;
      if (st.theme && st.theme !== 'auto') root.dataset.theme = st.theme; else delete root.dataset.theme;
      reader.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String((st.theme || 'auto') === b.dataset.themeSet)));
      reader.querySelector('[data-size-step="-1"]').disabled = (st.size || 0) <= -1;
      reader.querySelector('[data-size-step="1"]').disabled = (st.size || 0) >= 3;
      try { localStorage.setItem('sb-reader', JSON.stringify(st)); } catch (e) { /* not saved */ }
    };
    reader.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.sizeStep) st.size = Math.max(-1, Math.min(3, (st.size || 0) + Number(b.dataset.sizeStep))) || undefined;
      if (b.dataset.themeSet) st.theme = b.dataset.themeSet === 'auto' ? undefined : b.dataset.themeSet;
      apply();
    });
    document.addEventListener('click', (e) => { if (reader.open && !reader.contains(e.target)) reader.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && reader.open) { reader.open = false; reader.querySelector('summary').focus(); } });
    apply();

    const prose = document.querySelector('.prose'); const bar = document.querySelector('.progress span');
    let lastY = scrollY; let ticking = false;
    const onScroll = () => {
      ticking = false;
      const r = prose.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      if (bar) bar.style.transform = `scaleX(${p})`;
      const y = scrollY;
      if (Math.abs(y - lastY) > 8) {
        if (!reader.open) reader.classList.toggle('is-tucked', y > lastY && y > 400 && p < 1);
        lastY = y;
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  }

  // Native share on phones
  document.querySelectorAll('[data-share]').forEach((b) => {
    if (!navigator.share) { b.hidden = true; return; }
    b.addEventListener('click', () => navigator.share({ title: document.title, url: location.href }).catch(() => {}));
  });
})();
