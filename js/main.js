(function () {
  var WA_NUMBER = "59892501142";
  var waUrl = function (text) { return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text); };

  // Links de WhatsApp con mensaje precargado
  document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = waUrl(a.dataset.wa); });

  /* ---------- Tabs de modelos (rotan solas) ---------- */
  var tablist = document.querySelector(".tabs");
  var tabs = tablist.querySelectorAll('[role="tab"]');
  var modelos = document.getElementById("modelos");

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on);
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { stopAuto(); selectTab(tab); });
  });

  // Rotación automática cada TAB_SECONDS; la barrita bajo la pestaña muestra el avance.
  var TAB_SECONDS = 5, TICK = 100;
  var autoOn = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var visible = false, hover = false, elapsed = 0, timer;
  function paused() { return !visible || hover || document.hidden; }
  function stopAuto() { autoOn = false; clearInterval(timer); tablist.classList.remove("is-auto"); }
  if (autoOn) {
    tablist.classList.add("is-auto");
    timer = setInterval(function () {
      if (paused()) return;
      elapsed += TICK;
      if (elapsed >= TAB_SECONDS * 1000) {
        elapsed = 0;
        var list = Array.prototype.slice.call(tabs);
        var i = list.findIndex(function (t) { return t.getAttribute("aria-selected") === "true"; });
        selectTab(list[(i + 1) % list.length]);
      }
      tablist.style.setProperty("--tab-progress", elapsed / (TAB_SECONDS * 1000));
    }, TICK);
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.35 }).observe(modelos);
    modelos.addEventListener("mouseenter", function () { hover = true; });
    modelos.addEventListener("mouseleave", function () { hover = false; });
    // En celular: si desliza las tarjetas o toca algo de la sección, deja de rotar
    modelos.addEventListener("touchstart", stopAuto, { passive: true });
  }

  // Links del footer que apuntan a un panel (ej. Proyectos)
  document.querySelectorAll('a[href^="#tab-"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var tab = document.querySelector('[aria-controls="' + a.getAttribute("href").slice(1) + '"]');
      if (tab) tab.click();
    });
  });

  /* ---------- Suma animada del precio ---------- */
  // Al llegar a la sección se suman los ítems uno por uno, el total "gira"
  // números y al frenar aparece el botón: el precio final depende del terreno.
  var suma = document.getElementById("suma");
  var sumaQ = document.getElementById("suma-q");
  if (suma && "IntersectionObserver" in window) {
    var quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    suma.classList.add("is-pending");
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      suma.classList.add("is-on");
      if (quiet) { suma.classList.add("is-done"); return; }
      setTimeout(function () {
        var n = 0, spin = setInterval(function () {
          // Montos al azar entre 15.000 y 45.000: nunca por debajo del precio de la casa (14.500)
          var monto = 15000 + Math.floor(Math.random() * 301) * 100;
          sumaQ.textContent = "USD " + monto.toLocaleString("es-UY");
          if (++n > 14) { clearInterval(spin); suma.classList.add("is-done"); }
        }, 80);
      }, 2700);
    }, { threshold: 0.45 }).observe(suma);
  }

  /* ---------- Modal de video (YouTube) ---------- */
  var modal = document.getElementById("vmodal");
  var frame = document.getElementById("vmodal-frame");
  function openVideo(id, title) {
    // YouTube exige saber desde qué sitio se inserta el video (si no, "Error 153").
    // Abriendo index.html como archivo local no hay sitio, así que se abre en YouTube.
    if (location.protocol === "file:") {
      window.open("https://www.youtube.com/watch?v=" + id, "_blank", "noopener");
      return;
    }
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0" title="' + (title || "Video") + '" referrerpolicy="strict-origin-when-cross-origin"' +
      ' allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
    modal.showModal();
  }
  function closeVideo() { modal.close(); }
  modal.addEventListener("close", function () { frame.innerHTML = ""; });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeVideo(); });
  document.getElementById("vmodal-close").addEventListener("click", closeVideo);
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-video]");
    if (el) { e.preventDefault(); openVideo(el.dataset.video, el.dataset.title); }
  });

  /* ---------- Galería de fotos (proyectos y obras) ---------- */
  var gmodal = document.getElementById("gmodal");
  var gImg = document.getElementById("gmodal-img");
  var gTitle = document.getElementById("gmodal-title");
  var gCount = document.getElementById("gmodal-count");
  var gItems = [], gNombre = "", gIndex = 0;

  // items: [{ src, alt, titulo? }] — si la foto tiene titulo, se muestra arriba en lugar del nombre
  function openGallery(nombre, items, start) {
    gNombre = nombre; gItems = items;
    showFoto(start || 0);
    gmodal.showModal();
  }
  function showFoto(i) {
    gIndex = (i + gItems.length) % gItems.length;
    var it = gItems[gIndex];
    gImg.src = it.src;
    gImg.alt = it.alt;
    gTitle.textContent = it.titulo || gNombre;
    gCount.textContent = (gIndex + 1) + " / " + gItems.length;
    new Image().src = gItems[(gIndex + 1) % gItems.length].src; // precarga la siguiente
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-galeria]");
    if (!el || !window.PROYECTOS) return;
    var p = window.PROYECTOS[el.dataset.galeria];
    if (!p) return;
    var cover = el.closest(".proj") && el.closest(".proj").querySelector(".proj__cover");
    openGallery(p.nombre, p.fotos.map(function (f, i) {
      return { src: "img/proyectos/" + f + ".jpg", alt: p.nombre + ", foto " + (i + 1) };
    }), cover ? Number(cover.dataset.idx || 0) : 0);
    stopAuto(); // si está mirando un proyecto, que las pestañas no cambien solas
  });
  document.getElementById("gmodal-prev").addEventListener("click", function () { showFoto(gIndex - 1); });
  document.getElementById("gmodal-next").addEventListener("click", function () { showFoto(gIndex + 1); });
  document.getElementById("gmodal-close").addEventListener("click", function () { gmodal.close(); });
  gmodal.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") showFoto(gIndex - 1);
    if (e.key === "ArrowRight") showFoto(gIndex + 1);
  });
  // Deslizar con el dedo en celular
  var touchX = null;
  gImg.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  gImg.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) showFoto(gIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Portadas de proyectos que cambian solas ---------- */
  // Cambia una tarjeta por vez, en cadena, con fundido. Solo corre si la pestaña
  // Proyectos está a la vista, sin el mouse encima y con la galería cerrada.
  var COVER_MS = 1800;
  var covers = Array.prototype.slice.call(document.querySelectorAll(".proj__cover"));
  var panelProy = document.getElementById("tab-proyectos");
  var coverTurn = 0, coverHover = false;
  covers.forEach(function (c) {
    var layer = document.createElement("img");
    layer.className = "proj__layer"; layer.alt = ""; layer.setAttribute("aria-hidden", "true");
    c.insertBefore(layer, c.querySelector(".proj__count"));
    c.dataset.idx = 0;
    c.addEventListener("mouseenter", function () { coverHover = true; });
    c.addEventListener("mouseleave", function () { coverHover = false; });
  });
  function nextCover(c) {
    var fotos = window.PROYECTOS[c.dataset.galeria].fotos;
    var idx = (Number(c.dataset.idx) + 1) % fotos.length;
    var base = c.querySelector("img:not(.proj__layer)"), layer = c.querySelector(".proj__layer");
    var src = "img/proyectos/thumb/" + fotos[idx] + ".jpg";
    layer.onload = function () {
      layer.classList.add("is-in");
      setTimeout(function () { base.src = src; layer.classList.remove("is-in"); }, 900);
    };
    layer.src = src;
    c.dataset.idx = idx;
  }
  if (covers.length && window.PROYECTOS && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(function () {
      if (panelProy.hidden || !visible || coverHover || document.hidden || gmodal.open) return;
      nextCover(covers[coverTurn % covers.length]);
      coverTurn++;
    }, COVER_MS);
  }

  /* ---------- Obras realizadas ---------- */
  var grid = document.getElementById("obras-grid");
  var moreBtn = document.getElementById("obras-mas");
  var PAGE = 8, shown = PAGE, filter = "todos";
  var obras = [];

  function label(m) { return !m ? "[Modelo]" : m === "18" ? "Módulo 18 m²" : m === "otro" ? "A medida" : m + " m²"; }
  function lugar(o) { return o.localidad || "[Localidad]"; }
  // Foto local (nombre en img/obras/) o de Sanity (se pide del tamaño justo)
  function obraSrc(o, w) {
    if (o.foto && o.foto.url) return sanityImg(o.foto, w);
    return "img/obras/" + (w <= 800 ? "thumb/" : "") + o.foto + ".jpg";
  }
  var visibles = [];

  function renderObras() {
    var list = obras.filter(function (o) { return o.foto && (filter === "todos" || o.modelo === filter); });
    visibles = list.slice(0, shown);
    grid.innerHTML = list.length ? "" : '<p class="ogrid__empty">Pronto vas a ver obras de este modelo acá.</p>';
    visibles.forEach(function (o, i) {
      var alt = escapeHtml("Casa entregada" + (o.modelo ? " de " + label(o.modelo) : "") + (o.localidad ? " en " + o.localidad : ""));
      var srcset = o.foto.url ? ' srcset="' + obraSrc(o, 400) + " 400w, " + obraSrc(o, 600) + " 600w, " + obraSrc(o, 800) + ' 800w" sizes="(min-width: 720px) 25vw, 50vw"' : "";
      var el = document.createElement("article");
      el.className = "obra";
      el.innerHTML =
        '<button class="obra__img" data-obra="' + i + '" aria-label="Ampliar foto">' +
        '<img src="' + obraSrc(o, 600) + '"' + srcset + ' alt="' + alt + '" loading="lazy"></button>' +
        "<strong>" + label(o.modelo) + "</strong><span>" + escapeHtml(lugar(o)) + "</span>" +
        (o.youtube ? '<button class="linkbtn obra__video" data-video="' + o.youtube + '" data-title="' +
          escapeHtml(label(o.modelo) + " · " + lugar(o)) + '">▶ Ver video</button>' : "");
      grid.appendChild(el);
    });
    moreBtn.hidden = list.length <= shown;
  }
  grid.addEventListener("click", function (e) {
    var b = e.target.closest("[data-obra]");
    if (!b) return;
    openGallery("Casas entregadas", visibles.map(function (o) {
      return { src: obraSrc(o, 1400), alt: "Casa entregada", titulo: label(o.modelo) + " · " + lugar(o) };
    }), Number(b.dataset.obra));
  });
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-on", c === chip);
        c.setAttribute("aria-pressed", c === chip);
      });
      filter = chip.dataset.filter; shown = PAGE; renderObras();
    });
  });
  moreBtn.addEventListener("click", function () { shown += PAGE; renderObras(); });
  window.cargarObras().then(function (list) { obras = list; renderObras(); });

  /* ---------- Formulario de presupuesto (4 pasos) ---------- */
  var form = document.getElementById("quote");
  var steps = form.querySelectorAll(".qstep");
  var stepLabel = document.getElementById("q-step-label");
  var bar = document.getElementById("q-bar");
  var back = document.getElementById("q-back");
  var next = document.getElementById("q-next");
  var err = document.getElementById("q-err");
  var current = 1, TOTAL = steps.length;

  function show(n) {
    current = n;
    steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
    stepLabel.textContent = "Paso " + n + " de " + TOTAL;
    bar.style.width = (n / TOTAL) * 100 + "%";
    back.hidden = n === 1;
    next.textContent = n === TOTAL ? "Enviar por WhatsApp" : "Siguiente";
    err.textContent = "";
  }

  function validate(n) {
    var d = new FormData(form);
    if (n === 1 && !d.get("modelo")) return "Elegí un modelo (o “Todavía no sé”).";
    if (n === 2 && !d.get("terreno")) return "Elegí una opción.";
    if (n === 3 && !String(d.get("localidad") || "").trim()) return "Contanos en qué localidad.";
    if (n === 4) {
      if (!String(d.get("nombre") || "").trim()) return "Falta tu nombre.";
      if (String(d.get("telefono") || "").replace(/\D/g, "").length < 8) return "Revisá el teléfono.";
    }
    return "";
  }

  // Avanza solo al elegir una opción en los pasos de botones
  form.addEventListener("change", function (e) {
    if (e.target.type === "radio" && current < 3) setTimeout(function () { show(current + 1); }, 180);
  });

  back.addEventListener("click", function () { show(current - 1); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = validate(current);
    if (msg) { err.textContent = msg; return; }
    if (current < TOTAL) { show(current + 1); return; }

    var d = new FormData(form);
    var text =
      "Hola! Quiero un presupuesto.\n" +
      "• Nombre: " + d.get("nombre") + "\n" +
      "• Teléfono: " + d.get("telefono") + "\n" +
      "• Modelo: " + d.get("modelo") + "\n" +
      "• ¿Tengo terreno?: " + d.get("terreno") + "\n" +
      "• Localidad: " + d.get("localidad");

    // Cuando haya back: además de WhatsApp, enviar el lead al CMS/CRM acá (fetch POST).
    window.open(waUrl(text), "_blank", "noopener");
    form.innerHTML = '<div class="quote__done"><h3>¡Listo, ' + escapeHtml(d.get("nombre")) +
      '!</h3><p>Se abrió WhatsApp con tus datos. Enviá el mensaje y te respondemos con el presupuesto.</p>' +
      '<a class="btn btn--accent" href="' + waUrl(text) + '" target="_blank" rel="noopener">Abrir WhatsApp de nuevo</a></div>';
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }

  // Botones "Quiero esta": preseleccionan el modelo y saltan al paso 2
  document.querySelectorAll("[data-modelo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var radio = form.querySelector('input[name="modelo"][value="' + btn.dataset.modelo + '"]');
      if (radio) { radio.checked = true; show(2); } else { show(1); }
    });
  });

  show(1);
})();
