(() => {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const mount = document.getElementById("stars-container") || document.body;

  let canvas = document.getElementById("sky");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "sky";
    mount.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  // fundo
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "0",
    pointerEvents: "none"
  });

  // Debug opcional
  const DEBUG = localStorage.getItem("MORINA_DEBUG") === "1";
  const log = (...a) => DEBUG && console.log("[MorinaSky]", ...a);

  let w = 0, h = 0;
  let stars = [];
  let tick = 0;
  let rafId = 0;
  let running = true;

  // Conexões ligam depois (pra evitar tela vazia)
  let connectionsEnabled = false;
  let connectionsTimer = 0;

  function isMobileLike() {
    return (
      (navigator.maxTouchPoints || 0) > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  }

  function getDpr() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    const dpr = getDpr();
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);

    buildStars();

    // 1ª pintura rápida (sem conexões)
    quickPaint();

    // liga conexões um pouco depois
    connectionsEnabled = false;
    clearTimeout(connectionsTimer);
    connectionsTimer = setTimeout(() => {
      connectionsEnabled = true;
      log("connections enabled");
    }, 750);
  }

  function buildStars() {
    const dpr = getDpr();

    // tua lógica de densidade, mas com limite mais gentil no mobile
    const count = Math.floor((window.innerWidth * window.innerHeight) / 6000);
    let n = Math.max(90, Math.min(230, count));

    if (isMobileLike()) n = Math.min(n, 140); // <-- acelera MUITO no telefone

    stars = Array.from({ length: n }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.5, 2.2) * dpr,
      vx: rand(-0.15, 0.15) * dpr,
      vy: rand(-0.12, 0.12) * dpr,
      a: rand(0.2, 0.8),
      phase: rand(0, Math.PI * 2),
    }));

    log("stars built", { n, w, h, dpr });
  }

  function drawInvertedSeven() {
    const dpr = getDpr();

    const cx = w * 0.70;
    const cy = h * 0.22;
    const pulse = Math.sin(tick * 0.03) * 0.2 + 0.8;

    // um pouco maior (sem exagero no mobile)
    const scale = isMobileLike() ? 1.12 : 1.18;

    const pts = [
      { x: cx - w * 0.10 * scale, y: cy },
      { x: cx + w * 0.02 * scale, y: cy + h * 0.02 * scale },
      { x: cx - w * 0.02 * scale, y: cy + h * 0.12 * scale },
      { x: cx - w * 0.02 * scale, y: cy + h * 0.24 * scale },
    ];

    ctx.save();

    ctx.shadowBlur = 16 * pulse;
    ctx.shadowColor = "rgba(185, 194, 255, 0.85)";
    ctx.strokeStyle = "rgba(185, 194, 255, 0.42)";
    ctx.lineWidth = 2 * dpr;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    for (const p of pts) {
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.globalAlpha = 0.3 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 242, 255, 0.40)";
      ctx.fill();
    }

    ctx.restore();
  }

  // pintura rápida: só estrelas fixas + 7 (sem conexões, sem movimento)
  function quickPaint() {
    ctx.clearRect(0, 0, w, h);

    // estrelas leves
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    drawInvertedSeven();
  }

  function step() {
    if (!running) return;

    tick++;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // 1) Estrelas móveis + twinkle
    for (const s of stars) {
      if (!reduceMotion) {
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < -20) s.x = w + 20;
        if (s.x > w + 20) s.x = -20;
        if (s.y < -20) s.y = h + 20;
        if (s.y > h + 20) s.y = -20;
      }

      const currentAlpha = s.a * (Math.sin(tick * 0.05 + s.phase) * 0.3 + 0.7);
      ctx.globalAlpha = currentAlpha;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // 2) Conexões (só depois do “arranque”, e mais leves no mobile)
    if (connectionsEnabled) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.8 * getDpr();

      const dpr = getDpr();
      const maxDist = (isMobileLike() ? 145 : 180) * dpr;

      // Limita número de pares no mobile para não explodir CPU
      const limitPairs = isMobileLike() ? 2200 : Infinity;
      let pairs = 0;

      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);

          if (d < maxDist) {
            ctx.globalAlpha = (1 - d / maxDist) * 0.15;
            ctx.strokeStyle = "rgba(185, 194, 255, 0.5)";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            pairs++;
            if (pairs >= limitPairs) break;
          }
        }
        if (pairs >= limitPairs) break;
      }
    }

    // 3) 7 invertido
    ctx.globalAlpha = 1;
    drawInvertedSeven();

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(resize, 250), { passive: true });

  // init: pinta rápido no primeiro frame
  resize();
  rafId = requestAnimationFrame(step);
})();
