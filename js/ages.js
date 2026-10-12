/* Edades orbitales, cumpleaños y fechas. Sin DOM: se puede probar con Node.
   Modelo: las fechas son días de calendario, sin hora. Como la hora de nacimiento
   no se conoce, se toma el mediodía de cada día; así
     días vividos   = días de calendario entre el nacimiento y la fecha de referencia
     edad           = días vividos / periodo sidéreo
     próximo cumple = nacimiento + (⌊edad⌋ + 1) · periodo, redondeado al día
   Las posiciones de la escena salen de la longitud media de cada mundo en J2000
   y avanzan en órbitas circulares: es un esquema, no una efeméride. */
(function () {
  "use strict";

  var App = (window.PlanetAge = window.PlanetAge || {});

  var DAY_MS = 86400000;
  var EPOCH = Date.UTC(2000, 0, 1); // día 0 del calendario interno
  var EARTH_YEAR = 365.256; // año sidéreo, la misma vara para "años terrestres"

  // period: días terrestres por vuelta (sidéreo) · lon: longitud media en J2000 (grados)
  // orbit y size: radio de la órbita y del disco en la escena (comprimidos, no a escala)
  var WORLDS = [
    { id: "mercury", name: "Mercurio", at: "en Mercurio", period: 87.969, lon: 252.251, orbit: 40, size: 6 },
    { id: "venus", name: "Venus", at: "en Venus", period: 224.701, lon: 181.98, orbit: 64, size: 7.5 },
    { id: "earth", name: "Tierra", at: "en la Tierra", period: 365.256, lon: 100.464, orbit: 90, size: 8 },
    { id: "mars", name: "Marte", at: "en Marte", period: 686.98, lon: 355.453, orbit: 116, size: 6.5 },
    { id: "jupiter", name: "Júpiter", at: "en Júpiter", period: 4332.59, lon: 34.404, orbit: 150, size: 13 },
    { id: "saturn", name: "Saturno", at: "en Saturno", period: 10759.22, lon: 49.944, orbit: 194, size: 11 },
    { id: "uranus", name: "Urano", at: "en Urano", period: 30688.5, lon: 313.232, orbit: 232, size: 9.5 },
    { id: "neptune", name: "Neptuno", at: "en Neptuno", period: 60182, lon: 304.88, orbit: 260, size: 9.5 },
    { id: "pluto", name: "Plutón", at: "en Plutón", period: 90560, lon: 238.929, orbit: 285, size: 7.5 },
  ];

  var LIMITS = { min: "1900-01-01", max: "2299-12-31" };
  var LIFESPAN = 120; // años terrestres: más allá, el cumpleaños se cuenta en condicional

  var WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  /* ---------- fechas ---------- */

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // "2000-01-01" → nº de día desde el 1 ene 2000, o null si no es una fecha real.
  function parse(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text == null ? "" : text).trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    var ms = Date.UTC(y, mo - 1, d);
    var back = new Date(ms);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
    return Math.round((ms - EPOCH) / DAY_MS);
  }

  function parts(day) {
    var date = new Date(EPOCH + day * DAY_MS);
    return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate(), w: date.getUTCDay() };
  }

  function key(day) {
    var p = parts(day);
    return p.y + "-" + pad(p.m + 1) + "-" + pad(p.d);
  }

  // Hoy según el reloj local del visitante.
  function today(now) {
    var date = now || new Date();
    return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / DAY_MS);
  }

  // "2 may 2026"
  function shortDate(day) {
    var p = parts(day);
    return p.d + " " + MONTHS[p.m] + " " + p.y;
  }

  // "sáb 2 may 2026"
  function longDate(day) {
    return WEEKDAYS[parts(day).w] + " " + shortDate(day);
  }

  /* ---------- números ---------- */

  function fmt(value, decimals) {
    var text = value.toFixed(decimals);
    if (parseFloat(text) === 0) text = text.replace("-", "");
    return text.replace(".", ",");
  }

  // 81063 → "81 063" (espacio de no separación)
  function thousands(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+$)/g, "\u00a0");
  }

  // 1 → "1.er", 2 → "2.º", 3 → "3.er", 21 → "21.er" (primer y tercer se apocopan)
  function ordinal(n) {
    var unit = n % 10;
    var short = unit === 3 || (unit === 1 && n % 100 !== 11);
    return n + (short ? ".er" : ".º");
  }

  function plural(n, one, many) {
    return thousands(n) + "\u00a0" + (n === 1 ? one : many);
  }

  // Lo que dura un año en ese mundo: días si es corto, años terrestres si no.
  function yearLength(world) {
    if (world.period < 1000) return { value: thousands(world.period), unit: "días" };
    var years = world.period / EARTH_YEAR;
    return { value: fmt(years, years < 20 ? 2 : 1), unit: "años" };
  }

  /* ---------- edades ---------- */

  function ageOn(world, days, birth) {
    var age = days / world.period;
    var laps = Math.floor(age);
    var count = laps + 1; // el cumpleaños que viene
    var offset = Math.round(count * world.period); // días desde el nacimiento
    var left = offset - days;
    // La última vuelta se cerró en esta misma fecha, o la siguiente se cierra hoy.
    var todayCount = left === 0 ? count : laps >= 1 && Math.round(laps * world.period) === days ? laps : 0;

    return {
      id: world.id,
      age: age,
      laps: laps,
      progress: age - laps,
      nextCount: count,
      nextDay: birth + offset,
      daysLeft: left,
      todayCount: todayCount,
      // Cumpleaños que caería después de una vida humana larga.
      beyond: offset / EARTH_YEAR > LIFESPAN,
    };
  }

  // birth, ref, now: nº de día. Devuelve { ok, why } o el modelo completo.
  function compute(birth, ref, now) {
    if (birth == null) return { ok: false, why: "empty" };
    if (birth < parse(LIMITS.min)) return { ok: false, why: "old" };
    if (now != null && birth > now) return { ok: false, why: "unborn" };
    if (ref == null) return { ok: false, why: "noref" };
    if (ref < birth) return { ok: false, why: "before" };

    var days = ref - birth;
    var worlds = WORLDS.map(function (world) {
      return ageOn(world, days, birth);
    });

    var nearest = worlds[0];
    worlds.forEach(function (item) {
      if (item.daysLeft < nearest.daysLeft) nearest = item;
    });

    return { ok: true, birth: birth, ref: ref, days: days, worlds: worlds, nearest: nearest.id };
  }

  // Orden de las tarjetas: "sun" por distancia al Sol, "next" por cumpleaños más cercano.
  function order(model, mode) {
    var ids = WORLDS.map(function (world) {
      return world.id;
    });
    if (mode !== "next" || !model || !model.ok) return ids;
    return model.worlds
      .slice()
      .sort(function (a, b) {
        return a.daysLeft - b.daysLeft || ids.indexOf(a.id) - ids.indexOf(b.id);
      })
      .map(function (item) {
        return item.id;
      });
  }

  /* ---------- posiciones ---------- */

  // Longitud media en grados (0–360) el día `day`; admite fracciones de día.
  function longitude(world, day) {
    var deg = (world.lon + (360 * day) / world.period) % 360;
    return deg < 0 ? deg + 360 : deg;
  }

  function byId(id) {
    for (var i = 0; i < WORLDS.length; i++) {
      if (WORLDS[i].id === id) return WORLDS[i];
    }
    return null;
  }

  App.ages = {
    WORLDS: WORLDS,
    LIMITS: LIMITS,
    EARTH_YEAR: EARTH_YEAR,
    parse: parse,
    key: key,
    today: today,
    shortDate: shortDate,
    longDate: longDate,
    fmt: fmt,
    thousands: thousands,
    ordinal: ordinal,
    plural: plural,
    yearLength: yearLength,
    ageOn: ageOn,
    compute: compute,
    order: order,
    longitude: longitude,
    byId: byId,
  };
})();
