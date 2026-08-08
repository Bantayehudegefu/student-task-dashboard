/* ==========================================================================
   TASKIFY — Main
   Boots the app: applies saved theme/language/sound, wires DOM events to
   state actions, and re-renders whenever state changes.
   ========================================================================== */

(function () {
  const { State, I18n, Render, Animations, Sound } = window.Taskify;

  const els = {
    aboutButton: document.getElementById("about-button"),
    aboutPopover: document.getElementById("about-popover"),
    settingsButton: document.getElementById("settings-button"),
    settingsPanel: document.getElementById("settings-panel"),
    themeOptions: document.getElementById("theme-options"),
    customColorInput: document.getElementById("custom-color-input"),
    langDropdown: document.getElementById("lang-dropdown"),
    soundSelect: document.getElementById("sound-select"),
    soundVolume: document.getElementById("sound-volume"),
    chapters: document.getElementById("chapters"),
    composerForm: document.getElementById("composer-form"),
    composerInput: document.getElementById("composer-input"),
    composerTier: document.getElementById("composer-tier"),
    composerDue: document.getElementById("composer-due"),
    taskList: document.getElementById("task-list"),
    doneList: document.getElementById("done-list"),
    doneSection: document.getElementById("ledger-section"),
    statusbar: document.getElementById("statusbar"),
    pendingCount: document.getElementById("pending-count"),
  };

  /* ---------- Theme ---------- */

  function hexToRgb(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function relativeLuminance({ r, g, b }) {
    const [R, G, B] = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function shade(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    const clamp = (v) => Math.min(255, Math.max(0, v));
    return `rgb(${clamp(r + amt)}, ${clamp(g + amt)}, ${clamp(b + amt)})`;
  }

  const CUSTOM_PROPS = [
    "--color-bg",
    "--color-bg-elevated",
    "--color-accent",
    "--color-accent-soft",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-muted",
    "--color-border",
    "--color-border-strong",
  ];

  function applyTheme(state) {
    document.documentElement.setAttribute("data-theme", state.theme);

    if (state.theme === "custom" && state.customColor) {
      const rgb = hexToRgb(state.customColor);
      const isLight = relativeLuminance(rgb) > 0.5;

      document.documentElement.style.setProperty("--color-bg", state.customColor);
      document.documentElement.style.setProperty(
        "--color-bg-elevated",
        shade(state.customColor, isLight ? -8 : 12)
      );
      document.documentElement.style.setProperty(
        "--color-accent",
        isLight ? shade(state.customColor, -35) : shade(state.customColor, 25)
      );
      document.documentElement.style.setProperty(
        "--color-accent-soft",
        isLight ? shade(state.customColor, -20) : shade(state.customColor, 40)
      );
      document.documentElement.style.setProperty(
        "--color-text-primary",
        isLight ? "#2A2438" : "#F1E8D3"
      );
      document.documentElement.style.setProperty(
        "--color-text-secondary",
        isLight ? "rgba(42, 36, 56, 0.65)" : "rgba(241, 232, 211, 0.65)"
      );
      document.documentElement.style.setProperty(
        "--color-text-muted",
        isLight ? "rgba(42, 36, 56, 0.4)" : "rgba(241, 232, 211, 0.4)"
      );
      document.documentElement.style.setProperty(
        "--color-border",
        isLight ? "rgba(42, 36, 56, 0.1)" : "rgba(241, 232, 211, 0.12)"
      );
      document.documentElement.style.setProperty(
        "--color-border-strong",
        isLight ? "rgba(42, 36, 56, 0.2)" : "rgba(241, 232, 211, 0.24)"
      );
    } else {
      CUSTOM_PROPS.forEach((prop) => document.documentElement.style.removeProperty(prop));
    }

    els.themeOptions.querySelectorAll("[data-theme-option]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-theme-option") === state.theme);
    });
    els.customColorInput.classList.toggle("is-visible", state.theme === "custom");
    if (state.customColor) els.customColorInput.value = state.customColor;
  }

  /* ---------- Popovers (contact + settings) ---------- */

  function closeAllPopovers() {
    els.aboutPopover.classList.remove("is-open");
    els.settingsPanel.classList.remove("is-open");
  }

  function togglePopover(popoverEl) {
    const willOpen = !popoverEl.classList.contains("is-open");
    closeAllPopovers();
    if (willOpen) popoverEl.classList.add("is-open");
  }

  /* ---------- Render ---------- */

  function renderAll() {
    const state = State.getState();
    Render.renderChapters(state, els.chapters);
    Render.renderTasks(state, els.taskList, els.doneList, els.doneSection);
    Render.renderStats(state, els.statusbar);
    Render.renderLangMenu(els.langDropdown, state.lang, handleLangSelect);
    els.pendingCount.textContent = State.getStats().pending;
    applyTheme(state);
    bindChapterClicks();
    bindTaskListClicks(els.taskList);
    bindTaskListClicks(els.doneList);
  }

  function bindChapterClicks() {
    els.chapters.querySelectorAll("[data-chapter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        State.setActiveChapter(btn.getAttribute("data-chapter"));
      });
    });
  }

  function bindTaskListClicks(listEl) {
    listEl.querySelectorAll(".task").forEach((taskEl) => {
      const id = taskEl.getAttribute("data-id");

      const checkBtn = taskEl.querySelector('[data-action="toggle"]');
      if (checkBtn) {
        checkBtn.addEventListener("click", () => {
          const task = State.toggleTask(id);
          if (task && task.done) {
            Animations.playCast(taskEl);
            Animations.showToast(I18n.t("taskCast"));
          }
        });
      }

      const delBtn = taskEl.querySelector('[data-action="delete"]');
      if (delBtn) {
        delBtn.addEventListener("click", () => {
          taskEl.style.transition = "opacity 200ms ease, transform 200ms ease";
          taskEl.style.opacity = "0";
          taskEl.style.transform = "translateX(-12px)";
          setTimeout(() => {
            State.deleteTask(id);
            Animations.showToast(I18n.t("taskRemoved"));
          }, 180);
        });
      }
    });
  }

  function handleLangSelect(lang) {
    State.setLang(lang);
    I18n.apply(lang);
  }

  /* ---------- Events ---------- */

  function initEvents() {
    els.aboutButton.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePopover(els.aboutPopover);
    });

    els.settingsButton.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePopover(els.settingsPanel);
    });

    document.addEventListener("click", (e) => {
      if (!els.aboutPopover.contains(e.target) && e.target !== els.aboutButton) {
        els.aboutPopover.classList.remove("is-open");
      }
      if (!els.settingsPanel.contains(e.target) && e.target !== els.settingsButton) {
        els.settingsPanel.classList.remove("is-open");
      }
    });

    els.themeOptions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-option]");
      if (!btn) return;
      const theme = btn.getAttribute("data-theme-option");
      State.setTheme(theme, theme === "custom" ? els.customColorInput.value : null);
    });

    els.customColorInput.addEventListener("input", (e) => {
      State.setTheme("custom", e.target.value);
    });

    els.langDropdown.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang]");
      if (btn) handleLangSelect(btn.getAttribute("data-lang"));
    });

    els.soundSelect.addEventListener("change", (e) => {
      const type = e.target.value;
      State.setSound(type);
      Sound.play(type, els.soundVolume.value / 100);
    });

    els.soundVolume.addEventListener("input", (e) => {
      const volume = e.target.value / 100;
      State.setSoundVolume(volume);
      Sound.setVolume(volume);
    });

    els.composerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = els.composerInput.value.trim();
      if (!text) return;
      const state = State.getState();
      State.addTask({
        text,
        chapter: state.activeChapter === "all" ? "general" : state.activeChapter,
        tier: els.composerTier.value,
        dueDate: els.composerDue.value || null,
      });
      Animations.showToast(I18n.t("taskAdded"));
      els.composerInput.value = "";
      els.composerDue.value = "";
      els.composerInput.focus();
    });

    State.subscribe(renderAll);
  }

  function boot() {
    const state = State.getState();
    I18n.apply(state.lang);
    els.soundSelect.value = state.sound || "none";
    els.soundVolume.value = Math.round((state.soundVolume ?? 0.4) * 100);
    initEvents();
    renderAll();
    // Sound only starts on first user interaction with the selector, since
    // browsers block audio autoplay before any user gesture.
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
