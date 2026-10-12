/* Escena: el Sol, nueve órbitas punteadas y los mundos girando a su ritmo real.
   Un único requestAnimationFrame adelanta un reloj, en días, a partir de la
   fecha de referencia; cada frame solo escribe `transform`. Las velocidades
   angulares salen de los periodos reales: Mercurio da 4,15 vueltas por cada una
   de la Tierra y Plutón apenas se mueve.
   Con prefers-reduced-motion no hay bucle: los mundos quedan quietos en su
   posición para la fecha de referencia y los cambios son un fundido. */
(function () {
  "use strict";

  var App = (window.PlanetAge = window.PlanetAge || {});
  var ages = App.ages;
  var worlds = App.worlds;
  var node = worlds.node;
  var WORLDS = ages.WORLDS;
  var RAD = Math.PI / 180;
  var FADE_MS = 170;
  var PING_GAP = 450; // ms mínimos entre dos destellos de la misma marca

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function reduced() {
    return window.Pluton && window.Pluton.reducedMotion();
  }

  App.createScene = function (options) {
    var stage = options.stage;
    var svg = options.svg;
    var live = svg.querySelector("#sky-live");
    var orbitsLayer = svg.querySelector("#orbits");
    var marksLayer = svg.querySelector("#marks");
    var planetsLayer = svg.querySelector("#planets");
    var tag = svg.querySelector("#tag");
    var hudDate = options.hudDate;
    var hudLapse = options.hudLapse;

    var model = { ref: ages.today(), birth: null };
    var pending = null; // fechas nuevas esperando al fundido
    var elapsed = 0; // días de escena transcurridos desde la fecha de referencia
    var speed = 30; // días por segundo
    var paused = false;
    var focusing = false; // con el foco del teclado en un mundo, el reloj espera
    var selected = null;
    var bodyScale = 1; // los discos crecen en pantallas pequeñas para seguir viéndose
    var tagSize = 12;
    var frame = 0;
    var lastFrame = 0;
    var fadeTimer = 0;
    var hud = { day: null, at: 0 };

    var items = WORLDS.map(function (world, i) {
      var orbit = node("circle", { class: "orbit-dashed orbit", r: world.orbit }, orbitsLayer);

      // Marca fija: dónde estaba el mundo el día del nacimiento.
      var mark = node("g", { class: "mark" }, marksLayer);
      var ping = node("circle", { class: "mark-ping", cx: world.orbit, cy: 0, r: 6 }, mark);
      node("path", { class: "mark-tick", d: "M" + (world.orbit - 7) + " 0H" + (world.orbit + 7) }, mark);

      var el = node("g", { class: "planet", role: "button", tabindex: i === 0 ? "0" : "-1", "aria-pressed": "false", "data-world": world.id }, planetsLayer);
      var hit = node("circle", { class: "planet-hit", r: 15 }, el);
      var ring = node("circle", { class: "planet-ring", r: 12 }, el);
      var focus = node("circle", { class: "planet-focus", r: 16 }, el);
      var body = node("g", { class: "planet-body" }, el);
      var radius = worlds.draw(world.id, body);

      return { world: world, orbit: orbit, mark: mark, ping: ping, el: el, hit: hit, ring: ring, focus: focus, body: body, radius: radius, x: 0, y: 0, laps: null, pingAt: 0 };
    });

    function indexOf(id) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].world.id === id) return i;
      }
      return -1;
    }

    /* ---------- geometría ---------- */

    function layout() {
      var rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      bodyScale = clamp(520 / rect.width, 1, 1.3);
      // El rótulo se mantiene en ~12 px reales aunque el viewBox encoja.
      tagSize = 12 * clamp(600 / rect.width, 1, 1.7);
      stage.style.setProperty("--tag", tagSize.toFixed(2) + "px");

      items.forEach(function (item) {
        var r = item.world.size * bodyScale;
        item.body.setAttribute("transform", "scale(" + (r / item.radius).toFixed(4) + ") translate(-60 -60)");
        item.ring.setAttribute("r", (r + 5).toFixed(1));
        item.focus.setAttribute("r", (r + 9).toFixed(1));
        item.hit.setAttribute("r", Math.max(15, r + 7).toFixed(1));
      });
      if (!frame) draw(performance.now());
    }

    // Las marcas solo dependen de la fecha de nacimiento: se colocan al cambiarla.
    function placeMarks() {
      var known = model.birth != null;
      marksLayer.classList.toggle("is-hidden", !known);
      items.forEach(function (item) {
        item.laps = null;
        if (known) item.mark.setAttribute("transform", "rotate(" + (-ages.longitude(item.world, model.birth)).toFixed(3) + ")");
      });
    }

    function placeTag() {
      var item = selected === null ? null : items[selected];
      if (!item) return;
      var r = item.world.size * bodyScale;
      var half = item.world.name.length * 0.31 * tagSize;
      var x = clamp(item.x, -296 + half, 296 - half);
      var above = item.y - r - 10;
      var y = above - tagSize < -296 ? item.y + r + 10 + tagSize * 0.72 : above;
      tag.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
    }

    function setHud(now, day) {
      var whole = Math.floor(day + 1e-6);
      if (whole === hud.day) return;
      // Texto a ~10 Hz: se lee bien y no obliga a recalcular nada en cada frame.
      if (frame && now - hud.at < 100) return;
      hud.day = whole;
      hud.at = now;
      hudDate.textContent = ages.shortDate(whole);
      hudLapse.textContent = "+" + ages.plural(whole - model.ref, "día", "días");
    }

    /* ---------- dibujo y bucle ---------- */

    function ping(item, now) {
      if (now - item.pingAt < PING_GAP || !item.ping.animate) return;
      item.pingAt = now;
      item.ping.animate(
        [
          { transform: "scale(1)", opacity: 0.9 },
          { transform: "scale(3.4)", opacity: 0 },
        ],
        { duration: 760, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
    }

    function draw(now) {
      var day = model.ref + elapsed;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var angle = ages.longitude(item.world, day) * RAD;
        // Sentido antihorario, como se ve el sistema solar desde el norte.
        item.x = item.world.orbit * Math.cos(angle);
        item.y = -item.world.orbit * Math.sin(angle);
        item.el.setAttribute("transform", "translate(" + item.x.toFixed(2) + " " + item.y.toFixed(2) + ")");

        // Al cruzar su marca, el mundo cumple una vuelta: la marca destella.
        if (model.birth != null) {
          var laps = Math.floor((day - model.birth) / item.world.period);
          if (frame && item.laps !== null && laps > item.laps) ping(item, now);
          item.laps = laps;
        }
      }
      placeTag();
      setHud(now, day);
    }

    function tick(now) {
      var dt = Math.min(now - lastFrame, 100);
      lastFrame = now;
      if (!focusing) {
        elapsed += (dt / 1000) * speed;
        draw(now);
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (frame || paused || reduced() || document.hidden) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function redraw() {
      hud.day = null;
      draw(performance.now());
    }

    /* ---------- estado ---------- */

    function apply() {
      if (pending) model = pending;
      pending = null;
      elapsed = 0;
      placeMarks();
      redraw();
    }

    // Fechas nuevas. Con `fade`, los mundos se funden, saltan a su sitio y vuelven.
    function update(next, fade) {
      pending = { ref: next.ref, birth: next.birth };
      window.clearTimeout(fadeTimer);
      if (fade) {
        live.classList.add("is-switching");
        fadeTimer = window.setTimeout(function () {
          apply();
          live.classList.remove("is-switching");
        }, FADE_MS);
      } else {
        live.classList.remove("is-switching");
        apply();
      }
      start();
    }

    function select(id) {
      selected = id == null || indexOf(id) === -1 ? null : indexOf(id);
      items.forEach(function (item, i) {
        var on = i === selected;
        item.el.classList.toggle("is-selected", on);
        item.el.setAttribute("aria-pressed", on ? "true" : "false");
        item.mark.classList.toggle("is-selected", on);
        item.orbit.classList.toggle("is-selected", on);
      });
      tag.textContent = selected === null ? "" : items[selected].world.name;
      placeTag();
    }

    function setLabels(labels) {
      items.forEach(function (item) {
        item.el.setAttribute("aria-label", labels[item.world.id] || item.world.name);
      });
    }

    function setSpeed(value) {
      speed = value;
    }

    function setPaused(value) {
      paused = Boolean(value);
      if (paused) stop();
      else start();
    }

    function rewind() {
      elapsed = 0;
      items.forEach(function (item) {
        item.laps = null;
      });
      redraw();
    }

    /* ---------- eventos ---------- */

    function worldOf(target) {
      var el = target instanceof Element ? target.closest(".planet") : null;
      return el ? indexOf(el.getAttribute("data-world")) : -1;
    }

    planetsLayer.addEventListener("click", function (event) {
      var index = worldOf(event.target);
      if (index !== -1) options.onSelect(items[index].world.id);
    });

    // Barra de herramientas: un solo alto de tabulación y flechas para recorrerla.
    planetsLayer.addEventListener("keydown", function (event) {
      var index = worldOf(event.target);
      if (index === -1 || event.ctrlKey || event.metaKey || event.altKey) return;
      var count = items.length;
      var next = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % count;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + count) % count;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = count - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onSelect(items[index].world.id);
        return;
      } else return;

      event.preventDefault();
      items[index].el.setAttribute("tabindex", "-1");
      items[next].el.setAttribute("tabindex", "0");
      items[next].el.focus();
    });

    // Un anillo de foco que da vueltas no se puede seguir: con el teclado sobre un
    // mundo, el reloj de la escena espera. Un clic de ratón no lo detiene.
    // Se escucha en el contenedor HTML: Chrome vuelve enfocable cualquier elemento
    // SVG que tenga oyentes de foco, y el grupo ganaría un alto de tabulación vacío.
    stage.addEventListener("focusin", function (event) {
      focusing = worldOf(event.target) !== -1 && event.target.matches(":focus-visible");
    });
    stage.addEventListener("focusout", function () {
      focusing = false;
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    if (window.matchMedia) {
      var query = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMotionChange = function () {
        if (query.matches) {
          stop();
          rewind();
        } else {
          start();
        }
        if (options.onMotionChange) options.onMotionChange(query.matches);
      };
      if (query.addEventListener) query.addEventListener("change", onMotionChange);
    }

    if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);
    else window.addEventListener("resize", layout);
    layout();
    placeMarks();

    return {
      update: update,
      select: select,
      setLabels: setLabels,
      setSpeed: setSpeed,
      setPaused: setPaused,
      rewind: rewind,
    };
  };
})();
