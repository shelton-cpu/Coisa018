(() => {
  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);

  const S = window.MorinaState;

  const topDot = $(".topbar__dot");
  const progressLabel = $("#progressLabel");

  const letterEl = $("#letter");
  const redeemWrap = $("#redeemWrap");
  const redeemGift = $("#redeemGift");

  const WA_NUMBER = "258875349505";
  const WA_MESSAGE = "vim resgatar o meu presente e espero gostar";
  const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

  // 1) Pequeno feedback visual quando muda de "tela" (hash muda)
  function pulseTopDot() {
    if (!topDot) return;
    topDot.animate(
      [
        { transform: "scale(1)", boxShadow: getComputedStyle(topDot).boxShadow },
        { transform: "scale(1.25)", boxShadow: "0 0 28px rgba(0, 242, 255, 0.35)" },
        { transform: "scale(1)", boxShadow: getComputedStyle(topDot).boxShadow },
      ],
      { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
  }

  // 2) “Resgatar presente” pronto e sempre correto
  function ensureRedeemLink() {
    if (!redeemGift) return;
    redeemGift.href = WA_LINK;
  }

  function showRedeemNow() {
    if (!redeemWrap || !redeemGift) return;
    ensureRedeemLink();
    redeemWrap.hidden = false;
  }

  // 3) Observa quando a carta aparece (hidden -> visível)
  function watchLetter() {
    if (!letterEl) return;

    const reveal = () => {
      // garante link e mostra botão se já tiver sido aberto antes
      ensureRedeemLink();

      // Se o flow.js já abriu e salvou estado, deixa o botão aparecer também
      const st = S?.loadState ? S.loadState() : null;
      const opened = Boolean(st?.giftOpened);

      // scroll suave pra carta (não força se já estiver na área)
      try {
        const rect = letterEl.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
        if (!inView) {
          letterEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (_) {}

      // Se já estava aberto antes (recarregou a página), mostra de imediato
      if (opened) showRedeemNow();
    };

    // Se já está visível quando carrega
    if (!letterEl.hidden) reveal();

    const obs = new MutationObserver(() => {
      if (!letterEl.hidden) reveal();
    });

    obs.observe(letterEl, { attributes: true, attributeFilter: ["hidden"] });
  }

  // 4) Quando o usuário clicar em “Resgatar presente”, registra no estado (opcional)
  function hookRedeemClick() {
    if (!redeemGift) return;

    redeemGift.addEventListener("click", () => {
      // não bloqueia o redirect. Só grava um "marca d'água" no state
      if (S?.updateState) {
        S.updateState((st) => {
          st.redeemedAt = st.redeemedAt || new Date().toISOString();
          return st;
        });
      }
    });
  }

  // 5) Mantém o botão pronto mesmo que o flow.js mostre depois
  function watchRedeemWrap() {
    if (!redeemWrap) return;
    const obs = new MutationObserver(() => {
      if (redeemWrap.hidden === false) ensureRedeemLink();
    });
    obs.observe(redeemWrap, { attributes: true, attributeFilter: ["hidden"] });
  }

  // Init
  window.addEventListener("hashchange", pulseTopDot);
  window.addEventListener("popstate", pulseTopDot);

  // Se o label muda, dá um “pulse” leve também
  if (progressLabel) {
    const obs = new MutationObserver(pulseTopDot);
    obs.observe(progressLabel, { childList: true, subtree: true });
  }

  ensureRedeemLink();
  watchLetter();
  watchRedeemWrap();
  hookRedeemClick();
})();
