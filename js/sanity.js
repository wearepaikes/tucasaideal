/*
  Conexión con Sanity (lectura pública, sin token).
  Completar projectId con el mismo valor que studio/env.js.
  Mientras esté vacío o si Sanity no responde, la página usa data/obras.js.
*/
window.SANITY = { projectId: "COMPLETAR", dataset: "production", apiVersion: "2024-01-01" };

window.cargarObras = function () {
  var s = window.SANITY;
  var local = Promise.resolve(window.OBRAS || []);
  if (!/^[a-z0-9-]+$/.test(s.projectId) || s.projectId === "COMPLETAR") return local;

  var query = '*[_type == "obra" && defined(foto.asset)] | order(fecha desc) {' +
    'modelo, localidad, youtube, "foto": foto{ "url": asset->url, hotspot } }';
  var url = "https://" + s.projectId + ".apicdn.sanity.io/v" + s.apiVersion +
    "/data/query/" + s.dataset + "?query=" + encodeURIComponent(query);

  return fetch(url)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      return data.result.map(function (o) {
        return {
          modelo: o.modelo,
          localidad: o.localidad,
          youtube: youtubeId(o.youtube),
          foto: o.foto && o.foto.url ? o.foto : null
        };
      });
    })
    .catch(function (e) { console.warn("Sanity no respondió, uso datos locales", e); return local; });
};

// Sanity achica y comprime en el momento: ancho pedido, WebP/AVIF automático
// y recorte 16:9 centrado en el punto de foco que se marcó en el Studio.
window.sanityImg = function (foto, w) {
  var h = Math.round(w * 9 / 16);
  var fp = foto.hotspot ? "&crop=focalpoint&fp-x=" + foto.hotspot.x.toFixed(3) + "&fp-y=" + foto.hotspot.y.toFixed(3) : "";
  return foto.url + "?w=" + w + "&h=" + h + "&fit=crop" + fp + "&auto=format&q=75";
};

function youtubeId(v) {
  if (!v) return null;
  var m = v.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(v.trim()) ? v.trim() : null);
}
