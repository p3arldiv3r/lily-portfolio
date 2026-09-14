// Homepage "desktop": draggable windows (kept fully on-screen so none can
// ever become unreachable), a bubble field, desktop icons that open popup
// windows, the doodle pad, and the note form. Runs only on pages that
// include the markup below (the homepage).
(function () {
  'use strict';

  function init() {
    const viewport = document.querySelector('.desktop-viewport');
    const canvasEl = document.querySelector('.desktop-canvas');
    const layer = document.querySelector('.bubble-layer');
    if (!viewport || !canvasEl || !layer) return;

    const rand = (a, b) => a + Math.random() * (b - a);
    let viewportRect = viewport.getBoundingClientRect();

    // -- center the welcome window in the viewport on load --
    const welcomeWin = document.getElementById('welcome-window');
    if (welcomeWin) {
      const w = welcomeWin.offsetWidth, h = welcomeWin.offsetHeight;
      welcomeWin.style.left = Math.max(0, (viewportRect.width - w) / 2) + 'px';
      welcomeWin.style.top = Math.max(0, (viewportRect.height - h) / 2) + 'px';
    }

    // -- build the bubble field --
    // Bounded to the VIEWPORT, not the much larger 2600x1500 pan canvas --
    // otherwise most bubbles sit off-screen most of the time (the pan canvas
    // is sized for "a dragged window can always be panned back into view",
    // not for how far ambient decoration should roam).
    const BUBBLE_SIZES = [
      130, 45, 90, 30, 70, 110, 50, 25, 85, 60, 35, 75, 55, 95, 28, 65, 40, 105, 22, 58, 100, 38, 72, 48, 82, 30,
      62, 27, 88, 44, 115, 33, 52, 78, 24, 96, 41, 67, 120, 29, 54, 83, 36, 108, 47, 63, 20, 92, 57, 32,
    ];
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
        x: rand(r, Math.max(r + 1, viewportRect.width - r)),
        y: rand(0, viewportRect.height),
        vx: 0, vy: 0,
        riseSpeed: rand(14, 28) * (60 / (r * 2)),
        wobblePhase: rand(0, Math.PI * 2),
        wobbleFreq: rand(0.4, 0.8),
      };
    });
    const respawn = (b) => {
      b.y = viewportRect.height + b.r + rand(0, 80);
      b.x = rand(b.r, Math.max(b.r + 1, viewportRect.width - b.r));
      b.vx = 0; b.vy = 0;
    };

    // -- drag individual windows -- pointer events: mouse, touch, pen --
    // Windows are clamped fully inside the current viewport on every move,
    // so a window (including the non-closable "welcome" anchor) can never
    // be dragged somewhere its title bar -- or close button -- is no longer
    // reachable. No panning: the viewport is the whole reachable area.
    const refreshRect = () => { viewportRect = viewport.getBoundingClientRect(); };
    window.addEventListener('resize', refreshRect);

    let zCounter = 10;
    let dragState = null;
    let clickState = null;

    // -- click feedback: a little burst of lines wherever you click the open
    // desktop, and popping any bubble caught under the click --
    const spawnClickFx = (x, y) => {
      const fx = document.createElement('div');
      fx.className = 'click-fx';
      fx.style.left = x + 'px';
      fx.style.top = y + 'px';
      const LINES = 8;
      for (let i = 0; i < LINES; i++) {
        const spoke = document.createElement('i');
        spoke.style.transform = 'rotate(' + (i * (360 / LINES)) + 'deg)';
        const mark = document.createElement('b');
        spoke.appendChild(mark);
        fx.appendChild(spoke);
      }
      viewport.appendChild(fx);
      setTimeout(() => fx.remove(), 750);
    };
    const popBubbleAt = (x, y) => {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const dx = x - b.x, dy = y - b.y;
        if (dx * dx + dy * dy <= b.r * b.r) {
          b.el.classList.add('popping');
          setTimeout(() => {
            respawn(b);
            b.el.classList.remove('popping');
          }, 220);
          return true;
        }
      }
      return false;
    };

    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.desktop-window') || e.target.closest('.desktop-icon')) return;
      clickState = { startX: e.clientX, startY: e.clientY };
    });

    document.querySelectorAll('.desktop-window .win-bar').forEach((bar) => {
      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.win-close')) return;
        e.stopPropagation();
        const win = bar.closest('.desktop-window');
        zCounter += 1;
        win.style.zIndex = zCounter;
        const rect = win.getBoundingClientRect();
        dragState = {
          el: win, startX: e.clientX, startY: e.clientY,
          startLeft: parseFloat(win.style.left) || 0, startTop: parseFloat(win.style.top) || 0,
          winW: rect.width, winH: rect.height,
        };
      });
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      // Clamp fully inside the current viewport -- never past its edges --
      // so every window (the non-closable "welcome" one included) always
      // stays fully reachable: its title bar can always be grabbed again
      // and its close button, if any, can always be clicked.
      const maxLeft = Math.max(0, viewportRect.width - dragState.winW);
      const maxTop = Math.max(0, viewportRect.height - dragState.winH);
      const left = Math.max(0, Math.min(maxLeft, dragState.startLeft + dx));
      const top = Math.max(0, Math.min(maxTop, dragState.startTop + dy));
      dragState.el.style.left = left + 'px';
      dragState.el.style.top = top + 'px';
    });
    window.addEventListener('pointerup', (e) => {
      dragState = null;
      if (clickState) {
        const dx = e.clientX - clickState.startX;
        const dy = e.clientY - clickState.startY;
        if (dx * dx + dy * dy < 36) {
          // barely moved -- treat it as a click on the open desktop
          const x = e.clientX - viewportRect.left;
          const y = e.clientY - viewportRect.top;
          spawnClickFx(x, y);
          popBubbleAt(x, y);
        }
        clickState = null;
      }
    });

    // -- desktop icons (and the note/doodle buttons in the welcome window)
    // open popup windows; the win-close button closes them --
    document.querySelectorAll('[data-window]').forEach((link) => {
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

    // -- gallery popup: a tiny photo viewer over the approved gallery pieces
    // (each thumbnail carries its own image/title/caption as data attributes,
    // set from the CMS-managed gallery collection -- nothing hardcoded here) --
    let galleryIndex = 0;
    const galleryPreview = document.querySelector('.gallery-preview');
    const galleryFilename = document.querySelector('.gallery-filename');
    const galleryCaption = document.querySelector('.gallery-caption');
    const galleryThumbs = Array.from(document.querySelectorAll('.gallery-thumb'));
    const renderGallery = () => {
      const thumb = galleryThumbs[galleryIndex];
      if (!thumb) return;
      const { image, title, caption, alt } = thumb.dataset;
      if (galleryPreview) {
        galleryPreview.src = image || '';
        galleryPreview.alt = alt || title || '';
      }
      if (galleryFilename) galleryFilename.textContent = title || '';
      if (galleryCaption) galleryCaption.textContent = caption || '';
      galleryThumbs.forEach((t, i) => t.classList.toggle('active', i === galleryIndex));
    };
    renderGallery();
    const galleryStep = (dir) => {
      if (!galleryThumbs.length) return;
      galleryIndex = (galleryIndex + dir + galleryThumbs.length) % galleryThumbs.length;
      renderGallery();
    };
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

      // Bubbles live directly in .desktop-viewport now (not inside the
      // pannable .desktop-canvas), so their coordinates are plain
      // viewport-local -- no pan offset to subtract here anymore.
      const mx = mouse.clientX - viewportRect.left;
      const my = mouse.clientY - viewportRect.top;

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
        if (b.x > viewportRect.width - b.r) { b.x = viewportRect.width - b.r; b.vx = -Math.abs(b.vx) * 0.5; }

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
          data.append('doodle', blob, 'doodle.png');
          fetch('/api/doodle', { method: 'POST', body: data })
            .then((res) => res.json())
            .then((res) => {
              if (res.ok) flashStatus(doodleStatus, 'sent — thanks for the doodle!');
              else flashStatus(doodleStatus, "hmm, that didn't send — try again?");
            })
            .catch(() => flashStatus(doodleStatus, "hmm, that didn't send — try again?"));
        }, 'image/png');
      });
    }

    // -- note form: submits to our own /api/note function (Resend under the hood) --
    const noteForm = document.querySelector('.note-form');
    if (noteForm) {
      const noteStatus = noteForm.querySelector('.note-status');
      noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(noteForm);
        fetch('/api/note', { method: 'POST', body: formData })
          .then((res) => res.json())
          .then((res) => {
            if (res.ok) {
              noteForm.reset();
              flashStatus(noteStatus, "sent — thanks, i'll read it soon!");
            } else {
              flashStatus(noteStatus, "hmm, that didn't send — try again?");
            }
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
