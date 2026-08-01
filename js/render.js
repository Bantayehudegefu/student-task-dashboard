/* ==========================================================================
   GRIMOIRE — Render
   Pure-ish functions that turn state into DOM. No framework — just small
   template functions and targeted re-renders on state change.
   ========================================================================== */

window.Grimoire = window.Grimoire || {};

Grimoire.Render = (function () {
  const ICONS = {
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 4v13a3 3 0 0 0 3 3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12l5 5L20 6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2c1 3-2 4-2 7a4 4 0 1 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 2 1-3-1-4-3-7z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>',
  };

  function icon(name, extraClass) {
    return `<span class="icon ${extraClass || ""}" aria-hidden="true">${ICONS[name] || ""}</span>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDue(dateStr, lang) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(lang, { month: "short", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  }

  function isOverdue(dateStr, done) {
    if (!dateStr || done) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateStr < today;
  }

  function renderChapters(state, container) {
    const t = Grimoire.I18n.t;
    const chapters = [{ id: "all", labelKey: "chapterAll" }, ...state.chapters];
    container.innerHTML = chapters
      .map((ch) => {
        const pressed = state.activeChapter === ch.id;
        return `<button class="chip" data-chapter="${ch.id}" aria-pressed="${pressed}">${escapeHtml(
          t(ch.labelKey)
        )}</button>`;
      })
      .join("");
  }

  function taskTemplate(task, lang) {
    const t = Grimoire.I18n.t;
    const overdue = isOverdue(task.dueDate, task.done);
    return `
      <li class="task ${task.done ? "is-done" : ""}" data-id="${task.id}">
        <button class="task-check" data-action="toggle" aria-label="${escapeHtml(t("complete"))}">
          ${task.done ? icon("check") : ""}
        </button>
        <div class="task-body">
          <p class="task-title">${escapeHtml(task.text)}</p>
          <div class="task-meta">
            <span class="tier-dot" data-tier="${task.tier}" title="${escapeHtml(t("tier" + capitalize(task.tier)))}"></span>
            ${
              task.dueDate
                ? `<span class="task-due ${overdue ? "is-overdue" : ""}">${
                    overdue ? escapeHtml(t("overdue")) : escapeHtml(t("due"))
                  } ${formatDue(task.dueDate, lang)}</span>`
                : ""
            }
          </div>
        </div>
        <div class="task-actions">
          <button class="task-delete" data-action="delete" aria-label="${escapeHtml(t("delete"))}">
            ${icon("trash")}
          </button>
        </div>
      </li>`;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderTasks(state, pendingEl, doneEl, doneSection) {
    const t = Grimoire.I18n.t;
    const { pending, done } = Grimoire.State.getVisibleTasks();
    const lang = state.lang;

    if (pending.length === 0) {
      pendingEl.innerHTML = `
        <li class="empty-state">
          ${icon("sparkles", "empty-state-icon")}
          <strong>${escapeHtml(t("emptyTitle"))}</strong>
          <span>${escapeHtml(t("emptySubtitle"))}</span>
        </li>`;
    } else {
      pendingEl.innerHTML = pending.map((task) => taskTemplate(task, lang)).join("");
    }

    if (done.length === 0) {
      doneSection.style.display = "none";
    } else {
      doneSection.style.display = "";
      doneEl.innerHTML = done
        .slice()
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
        .map((task) => taskTemplate(task, lang))
        .join("");
    }
  }

  function renderStats(state, container) {
    const t = Grimoire.I18n.t;
    const stats = Grimoire.State.getStats();
    container.innerHTML = `
      <span class="statusbar-counts">
        ${stats.pending} ${escapeHtml(t("statsPending"))} · ${stats.done} ${escapeHtml(t("statsDone"))}
      </span>
      <span class="streak-badge">${icon("flame")} ${stats.streak} ${escapeHtml(t("streak"))}</span>
    `;
  }

  function renderLangMenu(container, currentLang, onSelect) {
    const names = Grimoire.I18n.languageNames;
    container.innerHTML = Grimoire.I18n.availableLanguages
      .map(
        (code) =>
          `<button class="lang-option" data-lang="${code}" aria-current="${code === currentLang}">${escapeHtml(
            names[code]
          )}</button>`
      )
      .join("");
  }

  return { renderChapters, renderTasks, renderStats, renderLangMenu, icon };
})();
