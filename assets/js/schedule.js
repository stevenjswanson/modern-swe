/* Marks past talks so the schedule stays accurate without rebuilding the site.
   Doing this client-side means a talk becomes "past" on its own, rather than
   whenever the site last happened to build.

   Progressive enhancement: with JS disabled the full schedule still renders,
   just without the past/next distinction. */
(function () {
  "use strict";

  var talks = document.querySelectorAll(".talk[data-date]");
  if (!talks.length) return;

  // Local midnight today, so a talk stops being "next" only after its day ends.
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  var nextEl = null;

  Array.prototype.forEach.call(talks, function (el) {
    var parts = el.getAttribute("data-date").split("-");
    if (parts.length !== 3) return;

    // Construct in local time; new Date("2026-09-28") would parse as UTC and
    // can land on the previous day for viewers west of Greenwich.
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (isNaN(d)) return;

    if (d < today) {
      el.classList.add("is-past");
    } else if (!nextEl) {
      nextEl = el;
    }
  });

  if (nextEl && !nextEl.querySelector(".chip--cancelled")) {
    var target = nextEl.querySelector(".talk__title, .talk__tba");
    if (target) {
      var chip = document.createElement("span");
      chip.className = "chip chip--next";
      chip.textContent = d0(nextEl) ? "Today" : "Next";
      target.appendChild(chip);
    }
  }

  function d0(el) {
    var p = el.getAttribute("data-date").split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.getTime() === today.getTime();
  }
})();
