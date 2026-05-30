const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let ordenActual = null
let hitoSeleccionado = null
let todasLasOrdenes = []

function inicializarUI() {
  const nombre = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent = nombre
  document.getElementById("sb-rol").textContent = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

// ─────────────────────────────────────────────
// ICONOS POR TIPO DE HITO
// ─────────────────────────────────────────────
function iconoPorHito(codigo) {
  const iconos = {
    orden_creada:      `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    prealerta_enviada: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    booking_confirmado:`<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    carga_embarcada:   `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/><circle cx="12" cy="12" r="10"/></svg>`,
    hbl_recibido:      `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    hawb_recibido:     `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`,
    eta_confirmado:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    aviso_llegada:     `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    carga_arribada:    `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    carga_direccionada:`<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    visto_bueno:       `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    docs_agente:       `<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.18 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.51a16 16 0 0 0 6 6l.91-1.38a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    dam_numerada:      `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    dam_pagada:        `<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    dam_levante:       `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    retiro_programado: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    retiro_en_curso:   `<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    carga_recogida:    `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    en_ruta:           `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
    carga_entregada:   `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    guia_sellada:      `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`,
    orden_liquidada:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    docs_recibidos:    `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    revision_completa: `<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    permisos_gestionados:`<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    mandato_firmado:   `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    proveedor_asignado:`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    conductor_asignado:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 14 0v2"/></svg>`,
    orden_cerrada:     `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    reserva_confirmada:`<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  }
  return iconos[codigo] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>`
}

// ─────────────────────────────────────────────
// CARGAR SELECTOR
// ─────────────────────────────────────────────
async function cargarOrdenes() {
  const { data } = await db
    .from("ordenes").select("*").eq("activo", true)
    .order("created_at", { ascending: false })

  todasLasOrdenes = data || []
  renderSelector(todasLasOrdenes)
}

function renderSelector(ordenes) {
  const cont = document.getElementById("lista-ordenes-selector")
  cont.innerHTML = ""

  if (!ordenes.length) {
    cont.innerHTML = `<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px">Sin órdenes</div>`
    return
  }

  ordenes.forEach(o => {
    const div = document.createElement("div")
    div.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-radius:8px;transition:background .1s;margin-bottom:2px"
    div.innerHTML = `
      <span class="pill pill-${o.tipo}" style="min-width:40px;justify-content:center">${o.tipo}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:#111827">${o.numero}</div>
        <div style="font-size:10px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.origen || "—"} → ${o.destino || "—"}</div>
      </div>
      <span class="pill pill-${o.estado}" style="font-size:9px">${o.estado.replace(/_/g," ")}</span>
    `
    div.addEventListener("mouseenter", () => div.style.background = "#fafbff")
    div.addEventListener("mouseleave", () => div.style.background = "")
    div.addEventListener("click", () => {
      document.querySelectorAll("#lista-ordenes-selector > div").forEach(d => d.style.background = "")
      div.style.background = "#f5f3ff"
      cargarHitos(o.id)
    })
    cont.appendChild(div)
  })
}

function filtrarSelector() {
  const busqueda = document.getElementById("filtro-orden-busqueda").value.toLowerCase()
  const tipo     = document.getElementById("filtro-orden-tipo").value

  const filtradas = todasLasOrdenes
    .filter(o => tipo === "TODOS" || o.tipo === tipo)
    .filter(o =>
      o.numero.toLowerCase().includes(busqueda) ||
      (o.origen && o.origen.toLowerCase().includes(busqueda)) ||
      (o.destino && o.destino.toLowerCase().includes(busqueda))
    )

  renderSelector(filtradas)
}

// ─────────────────────────────────────────────
// CARGAR HITOS
// ─────────────────────────────────────────────
async function cargarHitos(ordenId) {
  const { data: orden } = await db
    .from("ordenes").select("*").eq("id", ordenId).single()

  ordenActual = orden

  const { data: catalogo } = await db
    .from("hitos_catalogo").select("*")
    .eq("tipo_orden", orden.tipo)
    .order("orden_secuencia", { ascending: true })

  const { data: registrados } = await db
    .from("hitos_operativos").select("*").eq("orden_id", ordenId)

  const hitos = (catalogo || []).map(h => {
    const reg = (registrados || []).find(r => r.hito_catalogo_id === h.id)
    return { ...h, completado: !!reg, fecha_real: reg?.fecha_real || null, observacion: reg?.observacion || null }
  })

  mostrarPanel(orden, hitos)
}

function mostrarPanel(orden, hitos) {
  document.getElementById("panel-vacio").classList.add("hidden")
  document.getElementById("panel-orden").classList.remove("hidden")

  document.getElementById("orden-numero").textContent = orden.numero
  const badgeTipo = document.getElementById("orden-tipo")
  badgeTipo.textContent = orden.tipo
  badgeTipo.className = `pill pill-${orden.tipo}`
  document.getElementById("orden-origen").textContent  = orden.origen  || "—"
  document.getElementById("orden-destino").textContent = orden.destino || "—"

  const completados = hitos.filter(h => h.completado).length
  const total = hitos.length
  const pct   = Math.round((completados / total) * 100)

  document.getElementById("progreso-fill").style.width = pct + "%"
  document.getElementById("progreso-texto").textContent = `${completados} de ${total} hitos completados · ${pct}%`
  document.getElementById("hitos-badge").textContent = `${completados}/${total}`

  renderDocsRequeridos(hitos)
  renderLineaTiempoHorizontal(hitos)

  document.getElementById("res-tipo").textContent    = orden.tipo
  document.getElementById("res-regimen").textContent = orden.regimen || "—"
  document.getElementById("res-agente").textContent  = orden.agente_origen || "—"
  document.getElementById("res-estado").innerHTML    = `<span class="pill pill-${orden.estado}">${orden.estado.replace(/_/g," ")}</span>`
}

// ─────────────────────────────────────────────
// LÍNEA DE TIEMPO HORIZONTAL
// ─────────────────────────────────────────────
function renderLineaTiempoHorizontal(hitos) {
  const cont = document.getElementById("linea-tiempo")
  cont.innerHTML = ""
  cont.className = "timeline-h"

  const primerPendiente = hitos.findIndex(h => !h.completado)

  hitos.forEach((h, i) => {
    const esActual = i === primerPendiente
    const esUltimo = i === hitos.length - 1

    let claseIcono = "hito-h-icon-wrap"
    if (h.completado)      claseIcono += " done"
    else if (esActual)     claseIcono += " actual"
    else if (h.es_alerta)  claseIcono += " alerta"

    const fechaStr = h.fecha_real
      ? new Date(h.fecha_real).toLocaleDateString("es-PE", { day:"2-digit", month:"short" })
      : esActual ? "Hito actual" : "Pendiente"

    const obsStr = h.observacion || ""

    const item = document.createElement("div")
    item.className = "hito-h-item"

    item.innerHTML = `
      ${!esUltimo ? `<div class="hito-h-connector ${h.completado ? "done" : ""}"></div>` : ""}
      <div class="${claseIcono}">
        ${iconoPorHito(h.codigo)}
        <div class="hito-tooltip">
          <div class="hito-tooltip-title">${h.nombre}</div>
          <div class="hito-tooltip-date">${h.fecha_real ? new Date(h.fecha_real).toLocaleString("es-PE") : "Sin registrar"}</div>
          ${obsStr ? `<div class="hito-tooltip-obs">${obsStr}</div>` : ""}
          ${h.requiere_documento ? `<div class="hito-tooltip-obs" style="color:#c4b5fd;margin-top:4px">Requiere documento</div>` : ""}
        </div>
      </div>
      <div class="hito-h-label ${h.completado ? "done" : esActual ? "actual" : ""}">${h.nombre}</div>
      <div class="hito-h-date ${h.completado ? "done" : ""}">${fechaStr}</div>
    `

    if (!h.completado) {
      item.querySelector(".hito-h-icon-wrap").style.cursor = "pointer"
      item.querySelector(".hito-h-icon-wrap").addEventListener("click", () => abrirModal(h))
    }

    cont.appendChild(item)
  })
}

function renderDocsRequeridos(hitos) {
  const cont = document.getElementById("docs-requeridos")
  const conDocs = hitos.filter(h => h.requiere_documento)

  if (!conDocs.length) {
    cont.innerHTML = `<p class="text-muted text-sm">Sin documentos requeridos</p>`
    return
  }

  cont.innerHTML = ""
  conDocs.forEach(h => {
    const div = document.createElement("div")
    div.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f9fafb"
    div.innerHTML = `
      <span style="font-size:11px;color:#374151;font-weight:500">${h.nombre}</span>
      <span class="${h.completado ? "badge-doc" : "badge-alerta"}">${h.completado ? "cargado" : "pendiente"}</span>
    `
    cont.appendChild(div)
  })
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function abrirModal(hito) {
  hitoSeleccionado = hito
  document.getElementById("modal-nombre-hito").textContent = hito.nombre
  document.getElementById("modal-observacion").value = ""
  const ahora = new Date()
  document.getElementById("modal-fecha").value = new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0,16)
  document.getElementById("modal-overlay").classList.add("visible")
}

function cerrarModal() {
  document.getElementById("modal-overlay").classList.remove("visible")
  hitoSeleccionado = null
}

async function registrarHito() {
  if (!hitoSeleccionado || !ordenActual) return
  const observacion = document.getElementById("modal-observacion").value.trim()
  const fecha       = document.getElementById("modal-fecha").value

  if (!fecha) { alert("Selecciona la fecha y hora"); return }

  const { error } = await db.from("hitos_operativos").insert({
    orden_id:         ordenActual.id,
    hito_catalogo_id: hitoSeleccionado.id,
    estado:           "completado",
    observacion,
    fecha_real: new Date(fecha).toISOString()
  })

  if (error) { alert("Error: " + error.message); return }
  cerrarModal()
  await cargarHitos(ordenActual.id)
}

document.getElementById("btn-cancelar").addEventListener("click", cerrarModal)
document.getElementById("btn-confirmar").addEventListener("click", registrarHito)
document.getElementById("filtro-orden-busqueda").addEventListener("input", filtrarSelector)
document.getElementById("filtro-orden-tipo").addEventListener("change", filtrarSelector)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarOrdenes()