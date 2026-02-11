(() => {
  const STORAGE_KEY = "morina_site_state_v1";

  const defaultState = {
    startedAt: null,
    identityPick: null,
    quiz: { q1: null, q2: null, q3: null },
    mini: { segura: "", silencio: "" },
    giftOpened: false
  };

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v && typeof v === "object" ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? safeParse(raw, defaultState) : deepClone(defaultState);
    s.quiz = s.quiz ?? deepClone(defaultState.quiz);
    s.mini = s.mini ?? deepClone(defaultState.mini);
    return s;
  }

  function saveState(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateState(patchFn) {
    const current = loadState();
    const copy = deepClone(current);
    const next = patchFn(copy) ?? copy;
    saveState(next);
    return next;
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.MorinaState = { loadState, saveState, updateState, resetState };
})();
