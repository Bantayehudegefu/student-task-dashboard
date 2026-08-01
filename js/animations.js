/* ==========================================================================
   GRIMOIRE — Animations
   The "cast" effect: a short burst of particles + a settle-to-gold moment
   that plays when a task is completed. This is the one signature visual
   the whole app is built around — kept deliberately restrained elsewhere.
   ========================================================================== */

window.Grimoire = window.Grimoire || {};

Grimoire.Animations = (function () {
  const PARTICLE_COUNT = 14;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function playCast(taskEl) {
    if (!taskEl) return;
    taskEl.classList.add("is-casting");
    setTimeout(() => taskEl.classList.remove("is-casting"), 900);

    if (reduceMotion) return; // skip particles, keep the class toggle only

    const burst = document.createElement("div");
    burst.className = "cast-burst";
    taskEl.appendChild(burst);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement("span");
      p.className = "cast-particle";
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3;
      const distance = 40 + Math.random() * 50;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      p.style.setProperty("--dx", dx + "px");
      p.style.setProperty("--dy", dy + "px");
      p.style.left = 20 + Math.random() * 20 + "px";
      p.style.top = "50%";
      p.style.animationDelay = Math.random() * 80 + "ms";
      burst.appendChild(p);
    }

    setTimeout(() => burst.remove(), 1000);
  }

  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  return { playCast, showToast };
})();
