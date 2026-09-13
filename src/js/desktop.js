// Homepage "desktop": pannable background, draggable windows, bubble field,
// desktop icons that open popup windows, the doodle pad, and the note form.
// Runs only on pages that include the markup below (the homepage).
(function () {
  'use strict';

  function init() {
    const viewport = document.querySelector('.desktop-viewport');
    const canvasEl = document.querySelector('.desktop-canvas');
    const layer = document.querySelector('.bubble-layer');
    if (!viewport || !canvasEl || !layer) return;

    const CANVAS_W = 2600;
    const CANVAS_H = 1500;
    const rand = (a, b) => a + Math.random() * (b - a);

    // -- build the bubble field --
    const BUBBLE_SIZES = [130, 45, 90, 30, 70, 110, 50, 25, 85, 60, 35, 75, 55, 95, 28, 65, 40, 105, 22, 58, 100, 38, 72, 48, 82, 30];
    BUBBLE_SIZES.forEach((size) => {
      const d = document.createElement('div');
      d.className = 'bubble';
      d.style.width = size + 'px';
      d.style.height = size + 'px';
      layer.appendChild(d);
    });
    const bubbles = Array.from(layer.children).map((el) => {
      const r = parseFloat(el.style.width) / 2;
      return {
        el, r,
        x: rand(r, CANVAS_W - r),
        y: rand(-CANVAS_H, CANVAS_H),
        vx: 0, vy: 0,
        riseSpeed: rand(14, 28) * (60 / (r * 2)),
        wobblePhase: rand(0, Math.PI * 2),
        wobbleFreq: rand(0.4, 0.8),
      };
    });
    const respawn = (b) => {
      b.y = CANVAS_H + b.r + rand(0, 150);
      b.x = rand(b.r, CANVAS_W - b.r);
      b.vx = 0; b.vy = 0;
    };

    // -- pan the desktop + drag individual windows (pointer events: mouse, touch, pen) --
    let viewportRect = viewport.getBoundingClientRect();
    const pan = { x: 0, y: 0 };
    const clampPan = () => {
      const vw = viewport.clientWidth, vh = viewport.clientHeight;
      const minX = Math.min(0, vw - CANVAS_W);
      const minY = Math.min(0, vh - CANVAS_H);
      pan.x = Math.max(minX, Math.min(0, pan.x));
      pan.y = Math.max(minY, Math.min(0, pan.y));
    };
    const applyPan = () => {
      canvasEl.style.transform = 'translate(' + pan.x.toFixed(1) + 'px,' + pan.y.toFixed(1) + 'px)';
    };
    const refreshRect = () => { viewportRect = viewport.getBoundingClientRect(); clampPan(); applyPan(); };
    clampPan();
    applyPan();
    window.addEventListener('resize', refreshRect);

    let zCounter = 10;
    let dragState = null;

    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.desktop-window') || e.target.closest('.desktop-icon')) return;
      dragState = { type: 'pan', startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
      viewport.classList.add('panning');
    });

    document.querySelectorAll('.desktop-window .win-bar').forEach((bar) => {
      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.win-close')) return;
        e.stopPropagation();
        const win = bar.closest('.desktop-window');
        zCounter += 1;
        win.style.zIndex = zCounter;
        dragState = {
          type: 'window', el: win, startX: e.clientX, startY: e.clientY,
          startLeft: parseFloat(win.style.left) || 0, startTop: parseFloat(win.style.top) || 0,
        };
      });
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragState) return;
      if (dragState.type === 'pan') {
        pan.x = dragState.startPanX + (e.clientX - dragState.startX);
        pan.y = dragState.startPanY + (e.clientY - dragState.startY);
        clampPan();
        applyPan();
      } else if (dragState.type === 'window') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        dragState.el.style.left = (dragState.startLeft + dx) + 'px';
        dragState.el.style.top = (dragState.startTop + dy) + 'px';
      }
    });
    window.addEventListener('pointerup', () => { dragState = null; viewport.classList.remove('panning'); });

    // -- desktop icons open popup windows; the win-close button closes them --
    document.querySelectorAll('.icon-link[data-window]').forEach((link) => {
      const open = () => {
        const win = document.querySelector(link.getAttribute('data-window'));
        if (!win) return;
        win.classList.add('is-open');
        zCounter += 1;
        win.style.zIndex = zCounter;
      };
      link.addEventListener('click', open);
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); open(); }
      });
    });
    document.querySelectorAll('.win-close').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const win = btn.closest('.desktop-window');
        if (win) win.classList.remove('is-open');
      });
    });

    // -- gallery popup: a tiny photo viewer over the gallery's placeholder tiles --
    const GALLERY_ITEMS = [
      { name: 'character_01.png', caption: 'character study — untitled', gradient: 'linear-gradient(160deg,#9fe3ff,#4aa8d8)' },
      { name: 'melt_bg_02.png', caption: 'melt, background art', gradient: 'linear-gradient(160deg,#c9f6a8,#7fbf3d)' },
      { name: 'moodboard.png', caption: 'frutiger aero moodboard', gradient: 'linear-gradient(160deg,#ffe3ac,#f0a54e)' },
      { name: 'sprite_wip.png', caption: 'visual novel sprite wip', gradient: 'linear-gradient(160deg,#d9c8ff,#8f6fe0)' },
      { name: 'color_study.png', caption: 'color study, warm palette', gradient: 'linear-gradient(160deg,#ffc7dd,#e0679c)' },
      { name: 'ui_panel.png', caption: 'ui concept, glassy panel', gradient: 'linear-gradient(160deg,#b9f3ea,#3fa7dd)' },
    ];
    let galleryIndex = 0;
    const galleryPreview = document.querySelector('.gallery-preview');
    const galleryFilename = document.querySelector('.gallery-filename');
    const galleryCaption = document.querySelector('.gallery-caption');
    const galleryThumbs = Array.from(document.querySelectorAll('.gallery-thumb'));
    const renderGallery = () => {
      const item = GALLERY_ITEMS[galleryIndex];
      if (galleryPreview) galleryPreview.style.background = item.gradient;
      if (galleryFilename) galleryFilename.textContent = item.name;
      if (galleryCaption) galleryCaption.textContent = item.caption;
      galleryThumbs.forEach((t, i) => t.classList.toggle('active', i === galleryIndex));
    };
    renderGallery();
    const galleryStep = (dir) => { galleryIndex = (galleryIndex + dir + GALLERY_ITEMS.length) % GALLERY_ITEMS.length; renderGallery(); };
    const galleryPrevBtn = document.querySelector('.gallery-prev');
    const galleryNextBtn = document.querySelector('.gallery-next');
    if (galleryPrevBtn) galleryPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); galleryStep(-1); });
    if (galleryNextBtn) galleryNextBtn.addEventListener('click', (e) => { e.stopPropagation(); galleryStep(1); });
    galleryThumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', (e) => { e.stopPropagation(); galleryIndex = i; renderGallery(); });
    });

    // -- bubble physics: rise from the bottom, pushable by the cursor/finger --
    const mouse = { clientX: -9999, clientY: -9999 };
    window.addEventListener('pointermove', (e) => { mouse.clientX = e.clientX; mouse.clientY = e.clientY; });

    const PUSH_RADIUS = 130;
    const PUSH_ACCEL = 2200;
    const DAMPING = 3.2;

    let last = null;
    const tick = (t) => {
      if (last == null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;

      const mx = mouse.clientX - viewportRect.left - pan.x;
      const my = mouse.clientY - viewportRect.top - pan.y;

      bubbles.forEach((b) => {
        b.wobblePhase += b.wobbleFreq * dt;
        const wobble = Math.sin(b.wobblePhase) * 10;

        const dx = b.x - mx;
        const dy = b.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const reach = PUSH_RADIUS + b.r;
        if (dist < reach) {
          const force = (1 - dist / reach) * PUSH_ACCEL;
          b.vx += (dx / dist) * force * dt;
          b.vy += (dy / dist) * force * dt;
        }

        b.vx += -b.vx * DAMPING * dt;
        b.vy += -b.vy * DAMPING * dt;

        b.x += (b.vx + wobble) * dt;
        b.y += (b.vy - b.riseSpeed) * dt;

        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > CANVAS_W - b.r) { b.x = CANVAS_W - b.r; b.vx = -Math.abs(b.vx) * 0.5; }

        if (b.y < -b.r * 2.2) respawn(b);

        b.el.style.transform = 'translate(' + (b.x - b.r).toFixed(1) + 'px, ' + (b.y - b.r).toFixed(1) + 'px)';
      });

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // -- shared "flash a status message, then fade" helper --
    const flashStatus = (el, text) => {
      if (!el) return;
      if (text) el.textContent = text;
      el.style.opacity = '1';
      clearTimeout(el._t);
      el._t = setTimeout(() => { el.style.opacity = '0'; }, 3200);
    };

    // -- doodle pad --
    const doodleCanvas = document.querySelector('.doodle-canvas');
    if (doodleCanvas) {
      const ctx = doodleCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
      ctx.strokeStyle = '#0f5d86';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let drawing = false, lastX = 0, lastY = 0;
      const posOf = (e) => {
        const r = doodleCanvas.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * (doodleCanvas.width / r.width),
          y: (e.clientY - r.top) * (doodleCanvas.height / r.height),
        };
      };
      doodleCanvas.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        drawing = true;
        doodleCanvas.setPointerCapture(e.pointerId);
        const p = posOf(e); lastX = p.x; lastY = p.y;
      });
      doodleCanvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        e.stopPropagation();
        const p = posOf(e);
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
        lastX = p.x; lastY = p.y;
      });
      doodleCanvas.addEventListener('pointerup', () => { drawing = false; });

      const clearBtn = document.querySelector('.doodle-clear');
      if (clearBtn) clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
      });

      const sendBtn = document.querySelector('.doodle-send');
      const doodleStatus = document.querySelector('.doodle-status');
      if (sendBtn) sendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        doodleCanvas.toBlob((blob) => {
          if (!blob) return;
          const data = new FormData();
          data.append('form-name', 'doodle-to-lily');
          data.append('doodle', blob, 'doodle.png');
          fetch('/', { method: 'POST', body: data })
            .then(() => flashStatus(doodleStatus, 'sent — thanks for the doodle!'))
            .catch(() => flashStatus(doodleStatus, "hmm, that didn't send — try again?"));
        }, 'image/png');
      });
    }

    // -- note form: real Netlify Forms submission --
    const noteForm = document.querySelector('.note-form');
    if (noteForm) {
      const noteStatus = noteForm.querySelector('.note-status');
      noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(noteForm);
        const body = new URLSearchParams();
        formData.forEach((value, key) => body.append(key, value));
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
          .then(() => {
            noteForm.reset();
            flashStatus(noteStatus, "sent — thanks, i'll read it soon!");
          })
          .catch(() => flashStatus(noteStatus, "hmm, that didn't send — try again?"));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
