/* ==========================================================================
   GRIMOIRE — State
   Simple pub/sub store backed by localStorage. No build tools, no modules —
   everything hangs off the global `Grimoire` namespace so files can be
   opened directly (file://) with zero server setup.
   ========================================================================== */

window.Grimoire = window.Grimoire || {};

Grimoire.State = (function () {
  const STORAGE_KEY = "grimoire-todo-state-v1";

  const DEFAULT_CHAPTERS = [
    { id: "general", labelKey: "chapterGeneral", icon: "sparkles" },
    { id: "work", labelKey: "chapterWork", icon: "briefcase" },
    { id: "home", labelKey: "chapterHome", icon: "home" },
    { id: "study", labelKey: "chapterStudy", icon: "book" },
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign(defaultState(), parsed);
      }
    } catch (e) {
      console.warn("Grimoire: could not read saved state, starting fresh.", e);
    }
    return defaultState();
  }

  function defaultState() {
    return {
      tasks: [],
      chapters: DEFAULT_CHAPTERS,
      activeChapter: "all",
      theme: "dark",
      customColor: "#8B5CF6",
      lang: "en",
      sound: "none",
      soundVolume: 0.4,
      streak: { count: 0, lastCompletedDate: null },
    };
  }

  let state = loadState();
  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Grimoire: could not persist state.", e);
    }
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function commit() {
    persist();
    notify();
  }

  function uid() {
    return "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function updateStreakOnComplete() {
    const today = todayISO();
    const streak = state.streak;
    if (streak.lastCompletedDate === today) return; // already counted today
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streak.lastCompletedDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastCompletedDate = today;
  }

  return {
    getState() {
      return state;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    addTask({ text, chapter, tier, dueDate }) {
      const task = {
        id: uid(),
        text: text.trim(),
        chapter: chapter || "general",
        tier: tier || "minor",
        dueDate: dueDate || null,
        done: false,
        createdAt: Date.now(),
        completedAt: null,
      };
      state.tasks.unshift(task);
      commit();
      return task;
    },

    toggleTask(id) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return null;
      task.done = !task.done;
      task.completedAt = task.done ? Date.now() : null;
      if (task.done) updateStreakOnComplete();
      commit();
      return task;
    },

    deleteTask(id) {
      state.tasks = state.tasks.filter((t) => t.id !== id);
      commit();
    },

    editTask(id, changes) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, changes);
      commit();
      return task;
    },

    reorderTasks(orderedIds) {
      const map = new Map(state.tasks.map((t) => [t.id, t]));
      state.tasks = orderedIds.map((id) => map.get(id)).filter(Boolean);
      commit();
    },

    setActiveChapter(chapterId) {
      state.activeChapter = chapterId;
      commit();
    },

    setTheme(theme, customColor) {
      state.theme = theme;
      if (theme === "custom" && customColor) {
        state.customColor = customColor;
      }
      commit();
    },

    setLang(lang) {
      state.lang = lang;
      commit();
    },

    setSound(type) {
      state.sound = type;
      commit();
    },

    setSoundVolume(volume) {
      state.soundVolume = volume;
      commit();
    },

    getVisibleTasks() {
      const { tasks, activeChapter } = state;
      const filtered =
        activeChapter === "all" ? tasks : tasks.filter((t) => t.chapter === activeChapter);
      return {
        pending: filtered.filter((t) => !t.done),
        done: filtered.filter((t) => t.done),
      };
    },

    getStats() {
      const total = state.tasks.length;
      const done = state.tasks.filter((t) => t.done).length;
      return { total, done, pending: total - done, streak: state.streak.count };
    },
  };
})();
