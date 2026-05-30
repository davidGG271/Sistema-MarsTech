const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

function inicializarUI() {
  const nombre = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent = nombre
  document.getElementById("sb-rol").textContent = usuarioActual.rol.toUpperCase() + " · ACCESO TOTAL"

  const ahora = new Date()
  const fecha = ahora.toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
  document.getElementById("tb-fecha").textContent = fecha

  const hora = ahora.getHours()
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"
  document.getElementById("hero-saludo").textContent = `${saludo}, ${nombre}`
}

async function cargarDashboard() {
  const { data: ordenes } = await db
    .from("ordenes").select("*").eq("activo", true)

  const { data: clientes } = await db
    .from("clientes").select("id").eq("activo", true)

  const { data: hitosHoy } = await db
    .from("hitos_operativos").select("id")
    .gte("fecha_real", new Date(new Date().setHours(0,0,0,0)).toISOString())

  const { data: comprobantes } = await db
    .from("comprobantes").select("total")

  const { data: costos } = await db
    .from("costos_orden").select("monto")

  const totalIngresos = comprobantes ? comprobantes.reduce((s,c) => s + parseFloat(c.total), 0) : 0
  const totalCostos   = costos ? costos.reduce((s,c) => s + parseFloat(c.monto), 0) : 0
  const profit = totalIngresos - totalCostos

  const totalOrdenes  = ordenes ? ordenes.length : 0
  const totalClientes = clientes ? clientes.length : 0
  const totalHitos    = hitosHoy ? hitosHoy.length : 0

  document.getElementById("kpi-ordenes").textContent  = totalOrdenes
  document.getElementById("kpi-profit").textContent   = `$${Math.round(profit).toLocaleString()}`
  document.getElementById("kpi-hitos").textContent    = totalHitos
  document.getElementById("h-profit").textContent     = `$${Math.round(profit).toLocaleString()}`
  document.getElementById("h-activas").textContent    = totalOrdenes
  document.getElementById("h-clientes").textContent   = totalClientes
  document.getElementById("badge-ordenes").textContent = totalOrdenes

  document.getElementById("hero-sub").textContent =
    `// ${totalOrdenes} órdenes activas · ${totalClientes} clientes · semana ${Math.ceil(new Date().getDate()/7)} de ${new Date().getFullYear()}`

  document.getElementById("kpi-ordenes-sub").textContent =
    `${ordenes ? ordenes.filter(o => o.estado === "en_curso").length : 0} en curso`

  if (ordenes) {
    renderTablaRecientes(ordenes.slice(0, 5))
    renderMixOperativo(ordenes)
    renderAlertas(ordenes)
  }
}

function renderTablaRecientes(ordenes) {
  const tbody = document.getElementById("tabla-recientes")
  tbody.innerHTML = ""

  if (!ordenes.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px;font-family:'DM Mono',monospace">// sin órdenes</td></tr>`
    return
  }

  ordenes.forEach(o => {
    const fila = document.createElement("tr")
    fila.innerHTML = `
      <td><span class="orden-id">${o.numero}</span></td>
      <td><span class="pill pill-${o.tipo}">${o.tipo}</span></td>
      <td class="text-muted text-sm">${o.origen || "—"} → ${o.destino || "—"}</td>
      <td><span class="pill pill-${o.estado}">${o.estado.replace(/_/g," ")}</span></td>
      <td>
        <div class="prog-wrap">
          <div class="prog-track">
            <div class="prog-fill" style="width:${progresoPorEstado(o.estado)}%;background:#6366f1"></div>
          </div>
          <span class="prog-pct">${progresoPorEstado(o.estado)}%</span>
        </div>
      </td>
    `
    tbody.appendChild(fila)
  })
}

function progresoPorEstado(estado) {
  const mapa = {
    creada: 5, en_curso: 40, dam_numerada: 60,
    dam_pagada: 75, levante_otorgado: 90, liquidada: 100, alerta: 50
  }
  return mapa[estado] || 20
}

function renderMixOperativo(ordenes) {
  const tipos = ["SEA","AIR","ADU","SLI","TL"]
  const colores = { SEA:"#6366f1", AIR:"#7c3aed", ADU:"#d97706", SLI:"#a21caf", TL:"#059669" }
  const max = Math.max(...tipos.map(t => ordenes.filter(o => o.tipo === t).length), 1)
  const cont = document.getElementById("mix-operativo")
  cont.innerHTML = ""

  tipos.forEach(tipo => {
    const cantidad = ordenes.filter(o => o.tipo === tipo).length
    if (!cantidad) return
    const pct = Math.round((cantidad / max) * 100)
    const div = document.createElement("div")
    div.style.cssText = "display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(0,0,0,0.03)"
    div.innerHTML = `
      <span class="pill pill-${tipo}" style="min-width:42px;justify-content:center">${tipo}</span>
      <div style="flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${colores[tipo]};border-radius:3px"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:#1a1a2e;min-width:20px;text-align:right;font-family:'DM Mono',monospace">${cantidad}</span>
    `
    cont.appendChild(div)
  })
}

function renderAlertas(ordenes) {
  const enAlerta = ordenes.filter(o => o.estado === "alerta")
  document.getElementById("kpi-alertas").textContent = enAlerta.length
  document.getElementById("badge-alertas").textContent = enAlerta.length
  document.getElementById("badge-alertas-count").textContent = enAlerta.length
  document.getElementById("h-alertas-txt").textContent = `△ ${enAlerta.length} en alerta`

  const lista = document.getElementById("lista-alertas")
  lista.innerHTML = ""

  if (!enAlerta.length) {
    lista.innerHTML = `<p class="text-muted text-sm text-mono">// sin alertas activas</p>`
    return
  }

  enAlerta.forEach(o => {
    const div = document.createElement("div")
    div.className = "alert-card red"
    div.innerHTML = `
      <div class="alert-dot red"></div>
      <div>
        <div class="alert-title">${o.numero}</div>
        <div class="alert-desc">${o.origen || "—"} → ${o.destino || "—"}</div>
      </div>
    `
    lista.appendChild(div)
  })
}

inicializarUI()
cargarDashboard()