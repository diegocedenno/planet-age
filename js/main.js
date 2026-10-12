/* Fechas con validación amable, tarjetas (que son también la vista accesible),
   orden, selección de mundo, mandos de la escena y persistencia. */
(function () {
  "use strict";

  var App = window.PlanetAge;
  var ages = App.ages;
  var node = App.worlds.node;
  var WORLDS = ages.WORLDS;
  var STORE_KEY = "planet-age:v1";
  var MIN_DAY = ages.parse(ages.LIMITS.min);
  var MAX_DAY = ages.parse(ages.LIMITS.max);
  var SPEEDS = [10, 30, 120];
  var DEFAULT_HINT = "escribe tu fecha de nacimiento";

  var els = {
    layout: document.getElementById("layout"),
    status: document.getElementById("status"),
    form: document.getElementById("dates"),
    birth: document.getElementById("birth"),
    ref: document.getElementById("ref"),
    today: document.getElementById("today"),
    hint: document.getElementById("hint"),
    clear: document.getElementById("clear"),
    transport: document.getElementById("transport"),
    still: document.getElementById("still"),
    play: document.getElementById("play"),
    playLabel: document.getElementById("play-label"),
    rewind: document.getElementById("rewind"),
    speeds: document.querySelectorAll('input[name="speed"]'),
    sorts: document.querySelectorAll('input[name="sort"]'),
    hudLapse: document.getElementById("hud-lapse"),
    sceneDesc: document.getElementById("scene-desc"),
    title: document.getElementById("worlds-title"),
    cards: document.getElementById("cards"),
  };

  var today = ages.today();

  function defaults() {
    return {
      birth: null, // nº de día, o null si aún no se ha escrito
      ref: today,
      live: true, // la referencia sigue al "hoy" real mientras no se elija otra fecha
      sort: "sun",
      speed: 30,
      paused: false,
      selected: null,
    };
  }

  var state = defaults();
  var model = { ok: false, why: "empty" };
  var issue = null; // { field, text }: lo tecleado no vale; se conserva el último dato bueno
  var sceneKey = "";
  var ready = false; // hasta que la página arranca no se anima nada

  /* ---------- persistencia ---------- */

  // La fecha de nacimiento es un dato personal: vive solo en este navegador.
  function load() {
    try {
      var data = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null");
      if (!data || typeof data !== "object") return;
      var birth = ages.parse(data.birth);
      if (birth != null && birth >= MIN_DAY && birth <= today) state.birth = birth;
      if (data.sort === "sun" || data.sort === "next") state.sort = data.sort;
      if (SPEEDS.indexOf(data.speed) !== -1) state.speed = data.speed;
      if (typeof data.paused === "boolean") state.paused = data.paused;
      if (ages.byId(data.selected)) state.selected = data.selected;
    } catch (err) {
      /* sin almacenamiento o dato corrupto: valen los valores iniciales */
    }
  }

  function save() {
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          birth: state.birth == null ? null : ages.key(state.birth),
          sort: state.sort,
          speed: state.speed,
          paused: state.paused,
          selected: state.selected,
        })
      );
    } catch (err) {
      /* almacenamiento no disponible: la página sigue funcionando */
    }
  }

  function forget() {
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch (err) {
      /* nada que borrar */
    }
  }

  /* ---------- tarjetas ---------- */

  function make(tag, cls, parent, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }

  // Órbita en miniatura: la marca del cumpleaños arriba y el mundo avanzando en
  // sentido antihorario, igual que en la escena.
  function makeRing(parent) {
    var svg = node("svg", { viewBox: "0 0 46 46", focusable: "false" }, parent);
    node("circle", { class: "orbit-dashed ring-track", cx: 23, cy: 23, r: 19 }, svg);
    var arc = node(
      "circle",
      { class: "ring-arc", cx: 23, cy: 23, r: 19, pathLength: 100, "stroke-dasharray": "0 100", transform: "translate(46 0) scale(-1 1) rotate(-90 23 23)" },
      svg
    );
    node("path", { class: "ring-mark", d: "M23 0.5V7.5" }, svg);
    var dot = node("circle", { class: "ring-dot", r: 3 }, svg);
    return {
      set: function (progress) {
        var angle = progress * Math.PI * 2;
        arc.setAttribute("stroke-dasharray", (progress * 100).toFixed(2) + " 100");
        dot.setAttribute("cx", (23 - 19 * Math.sin(angle)).toFixed(2));
        dot.setAttribute("cy", (23 - 19 * Math.cos(angle)).toFixed(2));
      },
    };
  }

  var cards = {};

  WORLDS.forEach(function (world) {
    var el = make("li", "card", els.cards);
    el.dataset.world = world.id;

    var top = make("div", "card-top", el);
    var head = make("div", "card-head", top);
    make("span", "card-disc", head).appendChild(App.worlds.disc(world.id));
    var pick = make("button", "card-pick", head, world.name);
    pick.type = "button";
    pick.setAttribute("aria-pressed", "false");

    var agePara = make("p", "card-age", top);
    var age = make("b", "mono", agePara);
    agePara.append(" ");
    var unit = make("span", "", agePara);
    var ringBox = make("div", "card-ring", top);
    ringBox.setAttribute("aria-hidden", "true");
    var ring = makeRing(ringBox);
    var pct = make("span", "mono", ringBox);
    var laps = make("p", "card-laps", top);

    var next = make("div", "card-next", el);
    var label = make("p", "card-next-label", next);
    var date = make("time", "", make("p", "card-next-date mono", next));
    var foot = make("p", "card-next-foot", next);
    var left = make("span", "card-next-left mono", foot);
    var tag = make("span", "card-tag mono", foot);

    cards[world.id] = { world: world, length: ages.yearLength(world), el: el, pick: pick, age: age, unit: unit, laps: laps, ring: ring, pct: pct, label: label, tag: tag, date: date, left: left };
  });

  function lapsText(item) {
    if (item.todayCount && item.todayCount === item.laps) return "hoy cumples " + ages.plural(item.laps, "vuelta", "vueltas");
    if (item.laps === 0) return "aún no cumples 1\u00a0año";
    return ages.plural(item.laps, "vuelta completa", "vueltas completas");
  }

  function leftText(item) {
    if (item.daysLeft === 0) return "es hoy";
    if (item.daysLeft === 1) return "mañana";
    return "en " + ages.plural(item.daysLeft, "día", "días");
  }

  function fillCard(card, item) {
    card.el.classList.toggle("is-empty", !item);
    card.el.classList.toggle("is-nearest", Boolean(item) && model.nearest === item.id);
    card.el.classList.toggle("is-today", Boolean(item) && item.todayCount > 0);

    if (!item) {
      // Sin fecha, la tarjeta cuenta lo que dura un año en ese mundo.
      card.age.textContent = card.length.value;
      card.unit.textContent = card.length.unit;
      card.laps.textContent = "dura un año aquí";
      return;
    }

    var percent = Math.floor(item.progress * 100);
    card.age.textContent = ages.fmt(item.age, 2);
    card.unit.textContent = "años";
    card.laps.textContent = lapsText(item);
    make("span", "sr-only", card.laps, ", " + percent + " % de la vuelta actual");
    card.ring.set(item.progress);
    card.pct.textContent = percent + "\u00a0%";

    var name = ages.ordinal(item.nextCount) + " cumpleaños";
    card.label.textContent = item.beyond ? "tu " + name + " sería el" : name;
    card.tag.textContent = model.nearest === item.id && item.daysLeft > 0 ? "más cercano" : "";
    card.date.textContent = ages.longDate(item.nextDay);
    card.date.setAttribute("datetime", ages.key(item.nextDay));
    card.left.textContent = leftText(item);
    card.left.dataset.days = String(item.daysLeft);
  }

  // Reordena las tarjetas en el DOM (así el orden de tabulación acompaña al visual)
  // y, si se pide, anima el cambio: cada una se desliza desde donde estaba.
  function reorder(animate) {
    var ids = ages.order(model, state.sort);
    var current = Array.prototype.map.call(els.cards.children, function (el) {
      return el.dataset.world;
    });
    if (ids.join() === current.join()) return;

    var still = window.Pluton.reducedMotion();
    var before = {};
    if (animate && !still) {
      ids.forEach(function (id) {
        before[id] = cards[id].el.getBoundingClientRect();
      });
    }
    ids.forEach(function (id) {
      els.cards.appendChild(cards[id].el);
    });
    if (!animate || !els.cards.animate) return;

    if (still) {
      els.cards.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      return;
    }
    ids.forEach(function (id) {
      var after = cards[id].el.getBoundingClientRect();
      var dx = before[id].left - after.left;
      var dy = before[id].top - after.top;
      if (!dx && !dy) return;
      cards[id].el.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "translate(0,0)" }], {
        duration: 460,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    });
  }

  /* ---------- vista ---------- */

  function setStatus(label, text, isError) {
    els.status.innerHTML = "";
    els.status.append(label + ": ");
    make("b", "", els.status, text);
    els.status.classList.toggle("is-error", Boolean(isError));
  }

  function setHint(text, isError) {
    if (els.hint.textContent !== text) els.hint.textContent = text;
    els.hint.classList.toggle("is-error", Boolean(isError));
  }

  function renderNotes() {
    var problem = issue ? issue.text : null;
    if (!problem && model.why === "before") problem = "el " + ages.shortDate(state.ref) + " aún no habías nacido";

    els.birth.setAttribute("aria-invalid", issue && issue.field === "birth" ? "true" : "false");
    els.ref.setAttribute("aria-invalid", (issue && issue.field === "ref") || model.why === "before" ? "true" : "false");

    if (problem) {
      setHint(problem, true);
      setStatus("error", "revisa la fecha", true);
      return;
    }
    if (!model.ok) {
      setHint(DEFAULT_HINT, false);
      setStatus("status", "esperando tu fecha");
      return;
    }

    var days = ages.plural(model.days, "día vivido", "días vividos");
    setStatus("status", state.ref === today ? days : ages.plural(model.days, "día", "días") + " · " + ages.shortDate(state.ref));
    setHint(highlight(), false);
  }

  // La frase bajo las fechas: qué día se mira y cuál es el cumpleaños más cercano.
  function highlight() {
    if (model.days === 0) return "ese día naciste: todo empieza en cero";
    var nearest = model.worlds[0];
    model.worlds.forEach(function (item) {
      if (item.id === model.nearest) nearest = item;
    });
    var world = ages.byId(nearest.id);
    var lead = state.ref === today ? "" : "edad que " + (state.ref > today ? "tendrás" : "tenías") + " el " + ages.shortDate(state.ref) + " · ";
    if (nearest.daysLeft === 0) return lead + (state.ref === today ? "hoy cumples años " : "ese día cumples años ") + world.at;
    return lead + "próximo cumpleaños: " + world.name + ", " + leftText(nearest);
  }

  function describe() {
    var labels = {};
    if (!model.ok) {
      WORLDS.forEach(function (world) {
        var card = cards[world.id];
        labels[world.id] = world.name + ": un año dura " + card.length.value + " " + card.length.unit;
      });
      els.sceneDesc.textContent = "El Sol en el centro y nueve órbitas punteadas, con cada mundo en su posición aproximada. Al escribir tu fecha de nacimiento, una marca señala en cada órbita dónde estaba ese mundo el día que naciste.";
      return labels;
    }

    model.worlds.forEach(function (item) {
      var card = cards[item.id];
      labels[item.id] =
        card.world.name + ": " + ages.fmt(item.age, 2) + " años de " + card.length.value + " " + card.length.unit + ", próximo cumpleaños " + leftText(item);
    });
    els.sceneDesc.textContent =
      "El Sol en el centro y nueve órbitas punteadas. En cada una, una marca señala dónde estaba el mundo el día que naciste, y el mundo aparece donde está en la fecha de referencia: lo que le falta para volver a la marca es lo que falta para tu cumpleaños allí.";
    return labels;
  }

  function renderSelection() {
    WORLDS.forEach(function (world) {
      var on = world.id === state.selected;
      cards[world.id].el.classList.toggle("is-selected", on);
      cards[world.id].pick.setAttribute("aria-pressed", on ? "true" : "false");
    });
    scene.select(state.selected);
  }

  function render(fade) {
    model = ages.compute(state.birth, state.ref, today);

    WORLDS.forEach(function (world, i) {
      fillCard(cards[world.id], model.ok ? model.worlds[i] : null);
    });
    reorder(Boolean(fade) && ready);

    els.layout.classList.toggle("is-empty", !model.ok);
    els.title.textContent = model.ok ? "tu edad en nueve mundos" : "un año en nueve mundos";
    els.clear.hidden = state.birth == null;
    renderNotes();

    scene.setLabels(describe());

    // La escena solo se recoloca si cambian las fechas: elegir un mundo o reordenar
    // no debe devolver el reloj a la fecha de referencia.
    var key = state.ref + "|" + (model.ok ? state.birth : "");
    if (key !== sceneKey) {
      scene.update({ ref: state.ref, birth: model.ok ? state.birth : null }, Boolean(fade) && ready);
      sceneKey = key;
    }
  }

  function renderTransport() {
    var still = window.Pluton.reducedMotion();
    els.transport.hidden = still;
    els.still.hidden = !still;
    els.hudLapse.hidden = still;
    els.play.classList.toggle("is-paused", state.paused);
    els.play.setAttribute("aria-label", state.paused ? "Reanudar la escena" : "Pausar la escena");
    els.playLabel.textContent = state.paused ? "seguir" : "pausa";
    for (var i = 0; i < els.speeds.length; i++) els.speeds[i].checked = Number(els.speeds[i].value) === state.speed;
    for (var k = 0; k < els.sorts.length; k++) els.sorts[k].checked = els.sorts[k].value === state.sort;
  }

  function syncFields() {
    els.birth.value = state.birth == null ? "" : ages.key(state.birth);
    els.birth.max = ages.key(today);
    els.ref.value = ages.key(state.ref);
  }

  /* ---------- fechas ---------- */

  // Devuelve el nº de día, o un motivo: "typing" (a medias), "empty" o "range".
  function read(input) {
    var raw = input.value;
    if (!raw) return input.validity && input.validity.badInput ? "typing" : "empty";
    var day = ages.parse(raw);
    // Al teclear el año, el campo pasa por 0002, 0020, 0200...: todavía no es una fecha.
    if (day == null || Number(raw.slice(0, 4)) < 1000) return "typing";
    return day;
  }

  function clearIssue(field) {
    if (issue && issue.field === field) issue = null;
  }

  function onBirthInput() {
    var value = read(els.birth);
    if (value === "typing") return;
    clearIssue("birth");

    if (value === "empty") {
      state.birth = null;
    } else if (value < MIN_DAY) {
      issue = { field: "birth", text: "la fecha más antigua es el " + ages.shortDate(MIN_DAY) };
    } else if (value > today) {
      issue = { field: "birth", text: "¿aún no has nacido? elige una fecha hasta hoy" };
    } else {
      state.birth = value;
    }

    if (issue) {
      renderNotes();
      return;
    }
    save();
    render(true);
  }

  function onRefInput() {
    var value = read(els.ref);
    if (value === "typing" || value === "empty") return;
    clearIssue("ref");

    if (value < MIN_DAY || value > MAX_DAY) {
      issue = { field: "ref", text: "la fecha de referencia va de 1900 a 2299" };
      renderNotes();
      return;
    }
    state.ref = value;
    state.live = value === today;
    render(true);
  }

  // Al salir del campo, lo que no valía vuelve al último dato bueno.
  function onCommit(field) {
    var input = els[field];
    var value = read(input);
    var broken = (issue && issue.field === field) || value === "typing" || (field === "ref" && value === "empty");
    if (!broken) return;
    clearIssue(field);
    syncFields();
    renderNotes();
  }

  els.birth.addEventListener("input", onBirthInput);
  els.ref.addEventListener("input", onRefInput);
  els.birth.addEventListener("blur", function () {
    onCommit("birth");
  });
  els.ref.addEventListener("blur", function () {
    onCommit("ref");
  });

  els.form.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  els.today.addEventListener("click", function () {
    today = ages.today();
    clearIssue("ref");
    state.ref = today;
    state.live = true;
    syncFields();
    render(true);
  });

  els.clear.addEventListener("click", function () {
    forget();
    today = ages.today();
    state = defaults();
    issue = null;
    syncFields();
    renderTransport();
    scene.setSpeed(state.speed);
    scene.setPaused(state.paused);
    render(true);
    renderSelection();
    // El botón desaparece con el dato: el foco pasa al campo que toca rellenar.
    els.birth.focus();
  });

  /* ---------- orden y selección ---------- */

  for (var s = 0; s < els.sorts.length; s++) {
    els.sorts[s].addEventListener("change", function (event) {
      state.sort = event.target.value === "next" ? "next" : "sun";
      save();
      reorder(true);
    });
  }

  // Elegir un mundo lo resalta en su tarjeta y en la escena; elegirlo otra vez lo suelta.
  function select(id) {
    state.selected = state.selected === id ? null : id;
    save();
    renderSelection();
  }

  els.cards.addEventListener("click", function (event) {
    var pick = event.target instanceof Element ? event.target.closest(".card-pick") : null;
    if (pick) select(pick.closest(".card").dataset.world);
  });

  /* ---------- mandos de la escena ---------- */

  els.play.addEventListener("click", function () {
    state.paused = !state.paused;
    scene.setPaused(state.paused);
    save();
    renderTransport();
  });

  els.rewind.addEventListener("click", function () {
    scene.rewind();
  });

  for (var v = 0; v < els.speeds.length; v++) {
    els.speeds[v].addEventListener("change", function (event) {
      var speed = Number(event.target.value);
      if (SPEEDS.indexOf(speed) === -1) return;
      state.speed = speed;
      scene.setSpeed(speed);
      save();
    });
  }

  /* ---------- arranque ---------- */

  var scene = App.createScene({
    stage: document.getElementById("stage"),
    svg: document.getElementById("sky"),
    hudDate: document.getElementById("hud-date"),
    hudLapse: els.hudLapse,
    onSelect: select,
    onMotionChange: renderTransport,
  });

  load();
  syncFields();
  renderTransport();
  scene.setSpeed(state.speed);
  scene.setPaused(state.paused);
  render(false);
  renderSelection();
  ready = true;

  // El día cambia a medianoche: "hoy" y su límite se ponen al día solos.
  function tick() {
    if (document.hidden) return;
    var now = ages.today();
    if (now === today) return;
    today = now;
    if (state.live) state.ref = today;
    syncFields();
    render(false);
  }

  window.setInterval(tick, 60000);
  document.addEventListener("visibilitychange", tick);
})();
