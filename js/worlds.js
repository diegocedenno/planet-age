/* Aspecto de los mundos: discos sobrios con los tonos de la paleta Plutón y un
   detalle propio por mundo, los mismos de gravity-check. Sirven igual para la
   escena (dentro de un <g>) que para las tarjetas (en su propio <svg>).
   Plutón no se redibuja: usa el pluto.svg compartido, con su corazón. */
(function () {
  "use strict";

  var App = (window.PlanetAge = window.PlanetAge || {});
  var SVG_NS = "http://www.w3.org/2000/svg";

  function node(name, attrs, parent) {
    var el = document.createElementNS(SVG_NS, name);
    for (var key in attrs) el.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(el);
    return el;
  }

  // Colores propios de cada cuerpo: no cambian con el tema.
  var LOOKS = {
    mercury: { base: "#9aa1a9", dark: "#6e7681", light: "#cfd6dd" },
    venus: { base: "#dcc6a2", dark: "#c9a27e", light: "#efe3d3" },
    earth: { base: "#58a6ff", dark: "#3b78c4", light: "#e6edf3" },
    mars: { base: "#c8683c", dark: "#8f4526", light: "#efe3d3" },
    jupiter: { base: "#c9a27e", dark: "#8a6548", light: "#efe3d3" },
    saturn: { base: "#d9c19e", dark: "#b98a66", light: "#efe3d3" },
    uranus: { base: "#9cc7ff", dark: "#6fa8e8", light: "#e6edf3" },
    neptune: { base: "#3f7fd0", dark: "#2c5c9c", light: "#9cc7ff" },
  };

  // Detalles de cada disco, en el mismo lienzo que pluto.svg (120×120, radio 52).
  var FEATURES = {
    mercury: function (g, k) {
      node("circle", { cx: 40, cy: 44, r: 9, fill: k.dark, opacity: 0.45 }, g);
      node("circle", { cx: 80, cy: 70, r: 11, fill: k.dark, opacity: 0.4 }, g);
      node("circle", { cx: 72, cy: 34, r: 4.5, fill: k.dark, opacity: 0.5 }, g);
      node("circle", { cx: 48, cy: 84, r: 6, fill: k.dark, opacity: 0.45 }, g);
      node("circle", { cx: 92, cy: 46, r: 3, fill: k.light, opacity: 0.6 }, g);
    },
    venus: function (g, k) {
      node("path", { d: "M4 42 C30 32 60 52 116 36 V50 C70 64 40 46 4 58 Z", fill: k.light, opacity: 0.55 }, g);
      node("path", { d: "M4 72 C40 62 70 84 116 68 V80 C80 94 40 76 4 86 Z", fill: k.dark, opacity: 0.4 }, g);
      node("path", { d: "M4 22 C40 16 80 28 116 18 V26 C80 36 40 24 4 30 Z", fill: k.dark, opacity: 0.25 }, g);
    },
    earth: function (g, k) {
      node("path", { d: "M44 44 C56 38 72 44 74 56 C76 68 66 80 54 76 C46 73 48 64 42 58 C38 53 38 47 44 44 Z", fill: "#c9a27e", opacity: 0.9 }, g);
      node("path", { d: "M80 78 C88 74 98 78 96 86 C94 94 84 96 78 90 C75 86 76 80 80 78 Z", fill: "#c9a27e", opacity: 0.8 }, g);
      node("path", { d: "M8 38 C28 28 44 40 62 32 C76 26 90 32 104 26 C96 40 78 42 64 42 C44 46 28 40 8 38 Z", fill: k.light, opacity: 0.8 }, g);
      node("path", { d: "M14 84 C34 76 52 90 74 84 C66 96 44 98 30 94 C22 92 18 88 14 84 Z", fill: k.light, opacity: 0.7 }, g);
      node("path", { d: "M34 14 C48 8 72 8 86 14 C74 20 46 20 34 14 Z", fill: k.light, opacity: 0.85 }, g);
    },
    mars: function (g, k) {
      node("path", { d: "M8 62 C30 52 52 68 74 58 C90 52 102 58 112 54 V68 C94 76 78 68 60 76 C40 82 24 70 8 74 Z", fill: k.dark, opacity: 0.5 }, g);
      node("path", { d: "M34 14 C48 7 72 7 86 14 C74 21 46 21 34 14 Z", fill: k.light, opacity: 0.9 }, g);
      node("circle", { cx: 78, cy: 88, r: 5, fill: k.dark, opacity: 0.4 }, g);
      node("circle", { cx: 38, cy: 40, r: 4, fill: k.dark, opacity: 0.35 }, g);
    },
    jupiter: function (g, k) {
      node("rect", { x: 0, y: 26, width: 120, height: 9, fill: k.dark, opacity: 0.45 }, g);
      node("rect", { x: 0, y: 41, width: 120, height: 6, fill: k.light, opacity: 0.5 }, g);
      node("rect", { x: 0, y: 53, width: 120, height: 13, fill: k.dark, opacity: 0.6 }, g);
      node("rect", { x: 0, y: 72, width: 120, height: 7, fill: k.light, opacity: 0.45 }, g);
      node("rect", { x: 0, y: 85, width: 120, height: 9, fill: k.dark, opacity: 0.4 }, g);
      node("ellipse", { cx: 78, cy: 64, rx: 10, ry: 6, fill: "#c8683c" }, g);
    },
    saturn: function (g, k) {
      node("rect", { x: 0, y: 30, width: 120, height: 9, fill: k.dark, opacity: 0.35 }, g);
      node("rect", { x: 0, y: 48, width: 120, height: 7, fill: k.light, opacity: 0.55 }, g);
      node("rect", { x: 0, y: 64, width: 120, height: 11, fill: k.dark, opacity: 0.3 }, g);
      node("rect", { x: 0, y: 86, width: 120, height: 8, fill: k.dark, opacity: 0.25 }, g);
    },
    uranus: function (g, k) {
      node("rect", { x: 0, y: 46, width: 120, height: 26, fill: k.light, opacity: 0.2 }, g);
      node("rect", { x: 0, y: 84, width: 120, height: 10, fill: k.dark, opacity: 0.35 }, g);
    },
    neptune: function (g, k) {
      node("rect", { x: 0, y: 34, width: 120, height: 8, fill: k.dark, opacity: 0.55 }, g);
      node("rect", { x: 0, y: 74, width: 120, height: 11, fill: k.dark, opacity: 0.5 }, g);
      node("ellipse", { cx: 46, cy: 60, rx: 10, ry: 6, fill: k.dark, opacity: 0.8 }, g);
      node("path", { d: "M58 50 C68 46 80 52 92 48", fill: "none", stroke: k.light, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.75 }, g);
    },
  };

  function globe(id, parent) {
    if (id === "pluto") {
      node("image", { href: "assets/pluto.svg", x: 0, y: 0, width: 120, height: 120 }, parent);
    } else {
      var look = LOOKS[id];
      node("circle", { cx: 60, cy: 60, r: 52, fill: look.base }, parent);
      var inner = node("g", { "clip-path": "url(#pa-disc)" }, parent);
      FEATURES[id](inner, look);
      node("circle", { cx: 60, cy: 60, r: 52, fill: "url(#pa-light)" }, inner);
    }
    // Filo del disco: invisible en oscuro; en claro sostiene a los mundos pálidos sobre el papel.
    node("circle", { class: "globe-rim", cx: 60, cy: 60, r: 52 }, parent);
  }

  // Dibuja el mundo en un lienzo de 120×120 con centro en (60, 60).
  // Devuelve el radio del globo en ese lienzo: Saturno encoge para dejar sitio a los anillos.
  function draw(id, parent) {
    if (id === "saturn") {
      // Medio anillo detrás y medio delante. El color va por clase (style.css):
      // casi blanco, sobre papel se perdería.
      var ring = { class: "ring-saturn", fill: "none", "stroke-width": 5, opacity: 0.85 };
      ring.d = "M4 60 A56 15 0 0 1 116 60";
      node("path", ring, node("g", { transform: "rotate(-14 60 60)" }, parent));
      globe(id, node("g", { transform: "translate(60 60) scale(0.68) translate(-60 -60)" }, parent));
      ring.d = "M4 60 A56 15 0 0 0 116 60";
      node("path", ring, node("g", { transform: "rotate(-14 60 60)" }, parent));
      return 52 * 0.68;
    }

    if (id === "uranus") {
      // Anillo fino y casi vertical: Urano rueda tumbado.
      var thin = { class: "ring-uranus", fill: "none", "stroke-width": 1.6, opacity: 0.5 };
      thin.d = "M60 3 A10 57 0 0 0 60 117";
      node("path", thin, node("g", { transform: "rotate(12 60 60)" }, parent));
      globe(id, parent);
      thin.d = "M60 3 A10 57 0 0 1 60 117";
      node("path", thin, node("g", { transform: "rotate(12 60 60)" }, parent));
      return 52;
    }

    globe(id, parent);
    return 52;
  }

  // Disco suelto para las tarjetas.
  function disc(id) {
    var svg = node("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false" });
    draw(id, svg);
    return svg;
  }

  App.worlds = {
    node: node,
    draw: draw,
    disc: disc,
  };
})();
