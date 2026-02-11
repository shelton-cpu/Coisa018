(() => {
  const screensEl = document.getElementById("screens");
  if (!screensEl) return;

  const S = window.MorinaState;

  const progressLabelEl = document.getElementById("progressLabel");
  const backBtn = document.getElementById("backBtn");
  const soundToggle = document.getElementById("soundToggle");

  const quizForm = document.getElementById("quizForm");
  const quizNextBtn = document.getElementById("quizNext");
  const miniForm = document.getElementById("miniForm");

  const giftZone = document.getElementById("giftZone");
  const openGiftBtn = document.getElementById("openGift");
  const giftHint = document.getElementById("giftHint");
  const letterEl = document.getElementById("letter");

  const redeemWrap = document.getElementById("redeemWrap");
  const redeemGift = document.getElementById("redeemGift");

  // 🎵 Música
  const bgMusic = document.getElementById("bgMusic");

  const FLOW = ["1", "2", "3", "4", "4b", "5", "6"];
  let idx = 0;

  const titles = {
    "1": "Identidade",
    "2": "Perguntas",
    "3": "O que pensam",
    "4": "O que és",
    "4b": "Morina",
    "5": "Últimas",
    "6": "Presente",
  };

  // Debug (liga: localStorage.setItem("MORINA_DEBUG","1"))
  const DEBUG = localStorage.getItem("MORINA_DEBUG") === "1";
  const log = (...args) => DEBUG && console.log("[MorinaFlow]", ...args);
  const warn = (...args) => DEBUG && console.warn("[MorinaFlow]", ...args);

  function getScreenEl(key) {
    return document.querySelector(`.screen[data-screen="${key}"]`);
  }

  function setProgress(key) {
    if (progressLabelEl) progressLabelEl.textContent = titles[key] ?? "Percurso";
  }

  function show(key, push = true) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
    const el = getScreenEl(key);
    if (el) el.classList.add("is-active");

    idx = Math.max(0, FLOW.indexOf(String(key)));
    setProgress(key);
    if (backBtn) backBtn.disabled = idx === 0;

    if (push) history.pushState({ key }, "", `#s${key}`);

    log("show()", { key, idx });
  }

  function readHash() {
    const raw = (location.hash || "").replace("#s", "");
    return FLOW.includes(raw) ? raw : null;
  }

  function next() {
    if (idx < FLOW.length - 1) show(FLOW[idx + 1]);
  }

  function back() {
    if (idx > 0) show(FLOW[idx - 1]);
  }

  function markPicked(btn) {
    document.querySelectorAll(".card").forEach((b) => b.classList.remove("is-picked"));
    btn.classList.add("is-picked");
  }

  // --- Quiz helpers (suporta q1..q6) ---
  function getQuizFieldsets() {
    if (!quizForm) return [];
    return Array.from(quizForm.querySelectorAll(".quiz__q"));
  }

  function getQuizCount() {
    const fieldsets = getQuizFieldsets();
    const nums = fieldsets
      .map((fs) => Number(fs.getAttribute("data-q")))
      .filter((n) => Number.isFinite(n) && n > 0);
    return nums.length ? Math.max(...nums) : 0;
  }

  function allQuizAnswered(st) {
    const q = st.quiz ?? {};
    const count = getQuizCount();
    if (!count) return true;

    for (let i = 1; i <= count; i++) {
      if (!q[`q${i}`]) return false;
    }
    return true;
  }

  function restoreQuizUI(st) {
    if (!quizForm) return;

    const count = getQuizCount();
    if (!count) return;

    for (let i = 1; i <= count; i++) {
      const fs = quizForm.querySelector(`.quiz__q[data-q="${i}"]`);
      if (!fs) continue;

      if (i === 1) fs.hidden = false;
      else fs.hidden = !st.quiz?.[`q${i - 1}`];

      const answered = st.quiz?.[`q${i}`];
      if (answered) {
        const btn = fs.querySelector(`.choice[data-answer="${answered}"]`);
        if (btn) {
          fs.querySelectorAll(".choice").forEach((b) => b.classList.remove("is-picked"));
          btn.classList.add("is-picked");
        }
      }
    }

    if (quizNextBtn) quizNextBtn.disabled = !allQuizAnswered(st);
    log("restoreQuizUI()", { quiz: st.quiz, count });
  }

  function setRedeemLinkAndMaybeShow(st) {
    if (!redeemWrap || !redeemGift) return;

    const number = "258875349505";
    const message = "vim resgatar o meu presente e espero gostar";
    redeemGift.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    if (st?.giftOpened) {
      redeemWrap.hidden = false;
      log("redeem visible (giftOpened state)");
    }
  }

  // Debug: checar canvas/sky
  function debugSky() {
    const canvas = document.getElementById("sky");
    if (!canvas) return warn("Canvas #sky não existe no DOM. Sem estrelas/constelações.");
    const rect = canvas.getBoundingClientRect();
    const cs = getComputedStyle(canvas);

    log("sky check", {
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      display: cs.display,
      opacity: cs.opacity,
      zIndex: cs.zIndex,
      position: cs.position,
      pointerEvents: cs.pointerEvents,
    });

    // Se o canvas estiver com 0x0, o problema é CSS/viewport/resizes
    if (rect.width < 10 || rect.height < 10) {
      warn("Canvas #sky está minúsculo (provável CSS/viewport).");
    }
    if (Number(cs.opacity) === 0) {
      warn("Canvas #sky está opacity 0 (invisível).");
    }
  }

  function init() {
    if (!S?.loadState || !S?.updateState) {
      warn("MorinaState não encontrado. State vai ficar desativado.");
    }

    const st = S?.loadState ? S.loadState() : {};

    if (S?.updateState) {
      S.updateState((x) => {
        if (!x.startedAt) x.startedAt = new Date().toISOString();
        return x;
      });
    }

    if (st.identityPick) {
      const pickedBtn = document.querySelector(`.card[data-pick="${st.identityPick}"]`);
      if (pickedBtn) markPicked(pickedBtn);
    }

    restoreQuizUI(st);

    if (miniForm) {
      const segura = miniForm.querySelector('input[name="segura"]');
      const silencio = miniForm.querySelector('input[name="silencio"]');
      if (segura) segura.value = st.mini?.segura ?? "";
      if (silencio) silencio.value = st.mini?.silencio ?? "";
    }

    if (st.giftOpened && letterEl) letterEl.hidden = false;
    setRedeemLinkAndMaybeShow(st);

    const fromHash = readHash();
    show(fromHash ?? "1", false);

    // Debug do sky depois de um tick (pra CSS/sky.js já ter aplicado)
    setTimeout(debugSky, 350);

    log("init()", st);
  }

  // Clicks globais (next/skip + identity pick)
  document.addEventListener("click", (e) => {
    const nextBtn = e.target.closest("[data-next]");
    const skipBtn = e.target.closest("[data-skip]");
    const cardBtn = e.target.closest(".card[data-pick]");

    if (cardBtn) {
      const pick = cardBtn.getAttribute("data-pick");
      markPicked(cardBtn);
      if (S?.updateState) S.updateState((st) => ((st.identityPick = pick), st));
      log("identityPick", pick);
      return;
    }

    if (nextBtn) { e.preventDefault(); next(); return; }
    if (skipBtn) { e.preventDefault(); next(); return; }
  });

  if (backBtn) backBtn.addEventListener("click", (e) => (e.preventDefault(), back()));

  window.addEventListener("popstate", (evt) => {
    const key = evt.state?.key;
    if (FLOW.includes(key)) show(key, false);
  });

  // Quiz
  if (quizForm) {
    quizForm.addEventListener("click", (e) => {
      const btn = e.target.closest(".choice[data-answer]");
      if (!btn) return;

      const qFieldset = btn.closest(".quiz__q");
      if (!qFieldset) return;

      const qNum = Number(qFieldset.getAttribute("data-q"));
      const answer = btn.getAttribute("data-answer");
      if (!qNum || !answer) return;

      qFieldset.querySelectorAll(".choice").forEach((b) => b.classList.remove("is-picked"));
      btn.classList.add("is-picked");

      btn.classList.add("is-chosen");
      setTimeout(() => btn.classList.remove("is-chosen"), 220);

      if (S?.updateState) {
        S.updateState((st) => {
          st.quiz = st.quiz ?? {};
          st.quiz[`q${qNum}`] = answer;
          return st;
        });
      }

      const nextNum = qNum + 1;
      const nextFs = quizForm.querySelector(`.quiz__q[data-q="${nextNum}"]`);
      if (nextFs) nextFs.hidden = false;

      const st = S?.loadState ? S.loadState() : {};
      if (quizNextBtn) quizNextBtn.disabled = !allQuizAnswered(st);

      log("quiz answer", { qNum, answer, nextShown: Boolean(nextFs) });
    });

    if (quizNextBtn) {
      quizNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const st = S?.loadState ? S.loadState() : {};
        if (!allQuizAnswered(st)) {
          log("quizNext blocked (not all answered)", st.quiz);
          return;
        }
        log("quizNext -> next()");
        next();
      });
    }
  }

  // Mini save
  if (miniForm) {
    const segura = miniForm.querySelector('input[name="segura"]');
    const silencio = miniForm.querySelector('input[name="silencio"]');
    const saveMini = () => {
      if (!S?.updateState) return;
      S.updateState((st) => {
        st.mini = st.mini ?? { segura: "", silencio: "" };
        st.mini.segura = segura?.value ?? "";
        st.mini.silencio = silencio?.value ?? "";
        return st;
      });
      log("mini saved");
    };
    segura?.addEventListener("input", saveMini);
    silencio?.addEventListener("input", saveMini);
  }

  // 🎵 Som (real: toca/pausa áudio no mobile)
  if (soundToggle && bgMusic) {
    soundToggle.addEventListener("click", async () => {
      try {
        const isPlaying = !bgMusic.paused;

        if (isPlaying) {
          bgMusic.pause();
          soundToggle.setAttribute("aria-pressed", "false");
          soundToggle.textContent = "Som: Off";
          log("music paused");
        } else {
          bgMusic.volume = 0.5; // suave
          await bgMusic.play(); // precisa do clique humano
          soundToggle.setAttribute("aria-pressed", "true");
          soundToggle.textContent = "Som: On";
          log("music playing");
        }
      } catch (err) {
        warn("Erro ao tocar música (normal no mobile se não houver gesto válido):", err);
      }
    });
  } else {
    if (!bgMusic) warn("bgMusic não encontrado. (Falta <audio id='bgMusic'> no HTML)");
  }

  // 🎁 Runner (foge só 4 vezes)
  let dodgesLeft = 4; // <- pedido: 4 fugas
  let isUnlocked = false;

  function moveRunner() {
    if (!giftZone || !openGiftBtn) return;

    const zone = giftZone.getBoundingClientRect();
    const btn = openGiftBtn.getBoundingClientRect();

    const pad = 22;
    const maxX = zone.width - btn.width - pad;
    const maxY = zone.height - btn.height - pad;

    const x = pad + Math.random() * Math.max(0, maxX);
    const y = pad + Math.random() * Math.max(0, maxY);

    openGiftBtn.style.left = `${(x / zone.width) * 100}%`;
    openGiftBtn.style.top = `${(y / zone.height) * 100}%`;
    openGiftBtn.style.transform = "translate(-50%, -50%) scale(0.98)";
    setTimeout(() => (openGiftBtn.style.transform = "translate(-50%, -50%) scale(1)"), 120);

    log("moveRunner()", { dodgesLeft, x: Math.round(x), y: Math.round(y) });
  }

  function unlockGift() {
    isUnlocked = true;
    if (giftHint) giftHint.textContent = "ok, ganhaste 😌";
    openGiftBtn?.classList.remove("gift--runner");
    if (openGiftBtn) {
      openGiftBtn.style.left = "50%";
      openGiftBtn.style.top = "50%";
      openGiftBtn.style.transform = "translate(-50%, -50%)";
    }
    log("unlockGift()");
  }

  if (giftZone && openGiftBtn) {
    // pointermove (mouse + touch)
    giftZone.addEventListener("pointermove", (e) => {
      if (isUnlocked) return;
      if (dodgesLeft <= 0) return unlockGift();

      const rect = openGiftBtn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        dodgesLeft--;
        moveRunner();
        if (giftHint) giftHint.textContent = `tenta apanhar 😼 (${dodgesLeft})`;
        if (dodgesLeft <= 0) unlockGift();
      }
    }, { passive: true });

    // pointerdown (toque)
    giftZone.addEventListener("pointerdown", () => {
      if (isUnlocked) return;
      dodgesLeft--;
      moveRunner();
      if (giftHint) giftHint.textContent = `tenta apanhar 😼 (${Math.max(0, dodgesLeft)})`;
      if (dodgesLeft <= 0) unlockGift();
    }, { passive: true });

    openGiftBtn.addEventListener("click", () => {
      if (!isUnlocked) {
        log("openGift click ignored (locked)");
        return;
      }
      if (!letterEl) return;

      letterEl.hidden = false;
      if (S?.updateState) S.updateState((st) => ((st.giftOpened = true), st));
      letterEl.scrollIntoView({ behavior: "smooth", block: "start" });

      log("gift opened -> letter shown");

      // Resgatar presente
      if (redeemWrap && redeemGift) {
        const number = "258875349505";
        const message = "vim resgatar o meu presente e espero gostar";
        redeemGift.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

        setTimeout(() => {
          redeemWrap.hidden = false;
          log("redeem shown");
        }, 1200);
      }
    });
  } else {
    warn("giftZone/openGift não encontrados");
  }

  init();
})();
