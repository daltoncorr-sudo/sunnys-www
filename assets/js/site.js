// Sunny's Bookshop: small progressive enhancements. The site works without this file.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Image slider (home). Autoplays unless the visitor prefers reduced motion; pause button for WCAG 2.2.2.
  document.querySelectorAll('.slider').forEach((root) => {
    const slides = [...root.querySelectorAll('.slide')]; const controls = root.querySelector('.slider__controls');
    if (slides.length < 2 || !controls) return;
    controls.hidden = false;
    const dots = [...root.querySelectorAll('[data-go]')]; const pause = root.querySelector('.slider__pause');
    const TIME = 7000; let i = 0; let timer = null; let userPaused = reduced; let hover = false;
    root.style.setProperty('--slide-time', TIME + 'ms');
    // Deferred slide images: swap data-srcset/data-src in just before a slide is needed
    const hydrate = (s) => { if (!s) return; s.querySelectorAll('[data-srcset]').forEach((el) => { el.srcset = el.dataset.srcset; el.removeAttribute('data-srcset'); }); s.querySelectorAll('img[data-src]').forEach((el) => { el.src = el.dataset.src; el.removeAttribute('data-src'); }); };
    addEventListener('load', () => setTimeout(() => hydrate(slides[1]), 1200), { once: true });
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      hydrate(slides[i]); hydrate(slides[(i + 1) % slides.length]);
      slides.forEach((s, k) => { const on = k === i; s.classList.toggle('is-active', on); s.inert = !on; });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
      restart();
    };
    const playing = () => !userPaused && !hover && !document.hidden;
    function restart() {
      clearTimeout(timer); root.classList.toggle('is-playing', playing());
      // restart the progress animation on the current dot
      const bar = dots[i] && dots[i].querySelector('span'); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      if (playing()) timer = setTimeout(() => show(i + 1), TIME);
    }
    dots.forEach((d) => d.addEventListener('click', () => show(Number(d.dataset.go))));
    root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(i + Number(b.dataset.step))));
    const setPaused = (p) => { userPaused = p; pause.setAttribute('aria-pressed', String(p)); pause.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow'); restart(); };
    setPaused(userPaused);
    pause.addEventListener('click', () => setPaused(!userPaused));
    root.addEventListener('focusin', () => { hover = true; restart(); });
    root.addEventListener('focusout', () => { hover = false; restart(); });
    document.addEventListener('visibilitychange', restart);
    root.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
    let x0 = null;
    root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    root.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
  });

  // Depth on the shop cards: art layers drift with scroll and follow the pointer
  const layered = [...document.querySelectorAll('.place, .store-hero__media')];
  if (layered.length && !reduced) {
    let ticking = false;
    reader.addEventListener('focusin', () => reader.classList.remove('is-tucked'));
    document.addEventListener('click', (e) => { if (reader.open && !reader.contains(e.target)) reader.open = false; });
    const onScroll = () => {
      ticking = false;
      layered.forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;  // -1 (above) .. 1 (below)
        el.style.setProperty('--sy', Math.max(-1.2, Math.min(1.2, c)).toFixed(3));
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      layered.forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
          el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0); });
      });
    }
  }

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
      if (st.theme === 'navy') root.dataset.theme = 'navy'; else delete root.dataset.theme;
      reader.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String((st.theme || 'paper') === b.dataset.themeSet)));
      reader.querySelector('[data-size-step="-1"]').disabled = (st.size || 0) <= -1;
      reader.querySelector('[data-size-step="1"]').disabled = (st.size || 0) >= 3;
      try { localStorage.setItem('sb-reader', JSON.stringify(st)); } catch (e) { /* not saved */ }
    };
    reader.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.sizeStep) st.size = Math.max(-1, Math.min(3, (st.size || 0) + Number(b.dataset.sizeStep))) || undefined;
      if (b.dataset.themeSet) st.theme = b.dataset.themeSet === 'navy' ? 'navy' : undefined;
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
        if (!reader.open && !reader.contains(document.activeElement)) reader.classList.toggle('is-tucked', y > lastY && y > 400 && p < 1);
        lastY = y;
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  }

  // Events: a page built before an event ended still hides it once it has passed
  const ups = document.querySelectorAll('.upcoming__item[data-end]');
  if (ups.length) {
    const now = Date.now(); let left = 0;
    ups.forEach((li) => { if (new Date(li.dataset.end).getTime() < now) li.hidden = true; else left += 1; });
    const none = document.querySelector('.upcoming__none'); if (none && !left) none.hidden = false;
  }

  // Native share on phones
  document.querySelectorAll('[data-share]').forEach((b) => {
    if (!navigator.share) { b.hidden = true; return; }
    b.addEventListener('click', () => navigator.share({ title: document.title, url: location.href }).catch(() => {}));
  });
})();

// Journal: the four covers. Choosing one swaps the large cover (a soft cross-fade where supported).
(() => {
  const issue = document.querySelector("[data-issue]");
  if (!issue) return;
  const ed = issue.querySelector("[data-issue-ed]");
  const btns = issue.querySelectorAll("[data-ed-set]");
  btns.forEach((b) => b.addEventListener("click", () => {
    const swap = () => {
      issue.querySelectorAll("[data-ed]").forEach((a) => { a.hidden = a.dataset.ed !== b.dataset.edSet; });
      btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      ed.textContent = b.dataset.label;
    };
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(swap); else swap();
  }));
})();

// Phone menu: Escape closes it and returns focus to the button.
(() => {
  const menu = document.querySelector(".nav details");
  if (!menu) return;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
})();
