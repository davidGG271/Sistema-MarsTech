const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

const params    = new URLSearchParams(window.location.search)
const clienteId = params.get("id")
if (!clienteId) window.location.href = "clientes.html"

let clienteActual = null
let tabActiva     = "perfil"

function inicializarUI() {
  const nombre    = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent    = nombre
  document.getElementById("sb-rol").textContent       = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent     = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

async function cargarCliente() {
  const { data, error } = await db
    .from("clientes").select("*").eq("id", clienteId).single()

  if (error || !data) { window.location.href = "clientes.html"; return }

  clienteActual = data
  document.getElementById("loading").classList.add("hidden")
  document.getElementById("cliente-content").classList.remove("hidden")

  renderHeader(data)
  await cargarKPIs()
  await renderTabActivo()
}

function renderHeader(c) {
  document.title = `MarsTech — ${c.razon_social}`
  const iniciales = c.razon_social.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("cli-avatar-grande").textContent = iniciales
  document.getElementById("topbar-nombre").textContent     = c.razon_social
  document.getElementById("cli-nombre-grande").textContent = c.razon_social
  document.getElementById("cli-ruc-grande").textContent    = `${c.tipo_documento || "RUC"}: ${c.ruc || "—"}`
  document.getElementById("cli-tipo-badge").textContent    = c.tipo
  document.getElementById("cli-tipo-badge").className      = `pill pill-${c.tipo}`
  document.getElementById("cli-pais-badge").textContent    = c.pais || "Peru"
}

async function cargarKPIs() {
  const [ordRes, cotRes, compRes] = await Promise.all([
    db.from("ordenes").select("id,estado,tipo").eq("cliente_id", parseInt(clienteId)).eq("activo", true),
    db.from("cotizaciones").select("id,estado,total").eq("cliente_id", parseInt(clienteId)).eq("activo", true),
    db.from("comprobantes").select("total,moneda").eq("orden_id", "dummy")
  ])

  const ordenes    = ordRes.data || []
  const cots       = cotRes.data || []
  const activas    = ordenes.filter(o => !["liquidada","anulada"].includes(o.estado))
  const finalizadas = ordenes.filter(o => o.estado === "liquidada")
  const totalCots  = cots.reduce((s,c) => s + parseFloat(c.total || 0), 0)

  const kpis = [
    { lbl:"Total órdenes",    val: ordenes.length,    sub:"históricas",     color:"#7c3aed" },
    { lbl:"Órdenes activas",  val: activas.length,    sub:"en proceso",     color:"#059669" },
    { lbl:"Finalizadas",      val: finalizadas.length, sub:"liquidadas",    color:"#374151" },
    { lbl:"Cotizaciones",     val: cots.length,        sub:"registradas",   color:"#7c3aed" },
    { lbl:"Venta cotizada",   val: `$${totalCots.toFixed(0)}`, sub:"USD total", color:"#059669" },
    { lbl:"Crédito límite",   val: clienteActual.credito_limite ? `$${parseFloat(clienteActual.credito_limite).toLocaleString()}` : "—", sub:"USD", color:"#374151" },
  ]

  const cont = document.getElementById("kpis-cliente")
  cont.innerHTML = kpis.map(k => `
    <div class="kpi-c">
      <div class="kpi-c-lbl">${k.lbl}</div>
      <div class="kpi-c-val" style="color:${k.color}">${k.val}</div>
      <div class="kpi-c-sub">${k.sub}</div>
    </div>
  `).join("")
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", async function() {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"))
    this.classList.add("active")
    tabActiva = this.dataset.tab
    document.getElementById(`tab-${tabActiva}`).classList.remove("hidden")
    await renderTabActivo()
  })
})

async function renderTabActivo() {
  if (tabActiva === "perfil")        renderPerfil()
  if (tabActiva === "ordenes")       await renderOrdenes()
  if (tabActiva === "cotizaciones")  await renderCotizaciones()
  if (tabActiva === "timeline")      await renderTimeline()
  if (tabActiva === "finanzas")      await renderFinanzas()
}

// ─────────────────────────────────────────────
// TAB PERFIL
// ─────────────────────────────────────────────
function renderPerfil() {
  const c    = clienteActual
  const cont = document.getElementById("tab-perfil")

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

      <div class="card">
        <div class="card-body">
          <div style="font-size:12px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:14px">Información general</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${campo("Tipo de documento", c.tipo_documento || "RUC")}
            ${campo("Número de documento", c.ruc)}
            ${campo("Razón social", c.razon_social)}
            ${campo("Tipo de cliente", c.tipo)}
            ${campo("País", c.pais || "Peru")}
            ${campo("Dirección", c.direccion)}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div style="font-size:12px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:14px">Contacto comercial</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${campo("Contacto principal", c.contacto)}
            ${campo("Teléfono / WhatsApp", c.telefono)}
            ${campo("Correo electrónico", c.email)}
            ${campo("Vendedor asignado", c.vendedor)}
            ${campo("Condición de pago", c.condicion_pago)}
            ${campo("Límite de crédito", c.credito_limite ? `USD ${parseFloat(c.credito_limite).toLocaleString()}` : "Sin límite")}
          </div>
        </div>
      </div>

      ${c.observaciones ? `
      <div class="card" style="grid-column:1/-1">
        <div class="card-body">
          <div style="font-size:12px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px">Observaciones internas</div>
          <div style="font-size:13px;color:#374151">${c.observaciones}</div>
        </div>
      </div>` : ""}

    </div>
  `
}

function campo(lbl, val) {
  return `
    <div class="campo-perfil">
      <div class="campo-perfil-lbl">${lbl}</div>
      <div class="campo-perfil-val ${!val ? "empty" : ""}">${val || "—"}</div>
    </div>
  `
}

// ─────────────────────────────────────────────
// TAB ÓRDENES
// ─────────────────────────────────────────────
async function renderOrdenes() {
  const cont = document.getElementById("tab-ordenes")
  cont.innerHTML = ""

  const { data: ordenes } = await db
    .from("ordenes").select("*")
    .eq("cliente_id", parseInt(clienteId))
    .eq("activo", true)
    .order("created_at", { ascending: false })

  if (!ordenes?.length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/></svg></div><p>Sin órdenes</p><span>Este cliente no tiene órdenes registradas</span></div>`
    return
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Órdenes del cliente</span>
      <span style="font-size:12px;color:#9ca3af">${ordenes.length} registros</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>NÚMERO</th><th>TIPO</th><th>RUTA</th><th>ESTADO</th><th>FECHA</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${ordenes.map(o => `
          <tr>
            <td><span class="orden-id">${o.numero}</span></td>
            <td><span class="pill pill-${o.tipo}">${o.tipo}</span></td>
            <td class="text-sm text-muted">${o.origen || "—"} → ${o.destino || "—"}</td>
            <td><span class="pill pill-${o.estado}">${o.estado.replace(/_/g," ")}</span></td>
            <td class="text-sm text-muted">${new Date(o.created_at).toLocaleDateString("es-PE")}</td>
            <td><a href="orden-detalle.html?id=${o.id}" class="btn btn-secondary btn-xs">Ver →</a></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(card)
}

// ─────────────────────────────────────────────
// TAB COTIZACIONES
// ─────────────────────────────────────────────
async function renderCotizaciones() {
  const cont = document.getElementById("tab-cotizaciones")
  cont.innerHTML = ""

  const { data: cots } = await db
    .from("cotizaciones").select("*")
    .eq("cliente_id", parseInt(clienteId))
    .eq("activo", true)
    .order("created_at", { ascending: false })

  if (!cots?.length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><p>Sin cotizaciones</p><span>Este cliente no tiene cotizaciones registradas</span></div>`
    return
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Cotizaciones</span>
      <span style="font-size:12px;color:#9ca3af">${cots.length} registros</span>
    </div>
    <table>
      <thead>
        <tr><th>NÚMERO</th><th>MONEDA</th><th>TOTAL</th><th>ESTADO</th><th>FECHA</th></tr>
      </thead>
      <tbody>
        ${cots.map(c => `
          <tr>
            <td><span class="orden-id">${c.numero}</span></td>
            <td class="text-sm text-muted">${c.moneda}</td>
            <td style="font-weight:700;color:#111827">${c.moneda} ${parseFloat(c.total).toFixed(2)}</td>
            <td><span class="pill pill-${c.estado}">${c.estado}</span></td>
            <td class="text-sm text-muted">${new Date(c.created_at).toLocaleDateString("es-PE")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(card)
}

// ─────────────────────────────────────────────
// TAB TIMELINE
// ─────────────────────────────────────────────
async function renderTimeline() {
  const cont = document.getElementById("tab-timeline")
  cont.innerHTML = ""

  const { data: ordenes } = await db
    .from("ordenes").select("id,numero,tipo,estado,created_at,origen,destino")
    .eq("cliente_id", parseInt(clienteId))
    .eq("activo", true)
    .order("created_at", { ascending: false })

  if (!ordenes?.length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><p>Sin actividad</p><span>No hay operaciones registradas para este cliente</span></div>`
    return
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `<div class="card-header"><span class="card-title">Línea de tiempo operativa</span></div><div class="card-body"><div id="tl-lista"></div></div>`
  cont.appendChild(card)

  const lista = document.getElementById("tl-lista")

  ordenes.forEach((o, i) => {
    const div = document.createElement("div")
    div.className = "tl-op-item"
    div.style.position = "relative"

    const fecha = new Date(o.created_at)
    const fechaStr = fecha.toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })

    div.innerHTML = `
      <div class="tl-op-left">
        <div class="tl-op-dot" style="background:${o.estado === "liquidada" ? "#059669" : o.estado === "anulada" ? "#dc2626" : "#7c3aed"}"></div>
        ${i < ordenes.length - 1 ? `<div style="width:1px;background:#f3f4f6;position:absolute;left:4px;top:14px;bottom:-16px"></div>` : ""}
      </div>
      <div style="flex:1;padding-top:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="orden-id" style="font-size:12px">${o.numero}</span>
          <span class="pill pill-${o.tipo}" style="font-size:9px">${o.tipo}</span>
          <span class="pill pill-${o.estado}" style="font-size:9px">${o.estado.replace(/_/g," ")}</span>
          <a href="orden-detalle.html?id=${o.id}" class="btn btn-secondary btn-xs" style="margin-left:auto">Ver →</a>
        </div>
        <div style="font-size:11px;color:#9ca3af">${o.origen || "—"} → ${o.destino || "—"} · ${fechaStr}</div>
      </div>
    `
    lista.appendChild(div)
  })
}

// ─────────────────────────────────────────────
// TAB FINANZAS
// ─────────────────────────────────────────────
async function renderFinanzas() {
  const cont = document.getElementById("tab-finanzas")
  cont.innerHTML = ""

  const { data: ordenes } = await db
    .from("ordenes").select("id,numero,tipo")
    .eq("cliente_id", parseInt(clienteId))
    .eq("activo", true)

  if (!ordenes?.length) {
    cont.innerHTML = `<div class="panel-vacio"><p>Sin datos financieros</p><span>No hay órdenes con movimientos registrados</span></div>`
    return
  }

  const ordenIds = ordenes.map(o => o.id)

  const [compRes, costoRes] = await Promise.all([
    db.from("comprobantes").select("total,moneda,tipo,estado_pago,orden_id").in("orden_id", ordenIds),
    db.from("costos_orden").select("monto,moneda,concepto,orden_id").in("orden_id", ordenIds)
  ])

  const comprobantes = compRes.data  || []
  const costos       = costoRes.data || []

  const totalFacturado = comprobantes.reduce((s,c) => s + parseFloat(c.total || 0), 0)
  const totalCostos    = costos.reduce((s,c) => s + parseFloat(c.monto || 0), 0)
  const profitTotal    = totalFacturado - totalCostos
  const pendiente      = comprobantes.filter(c => c.estado_pago === "pendiente").reduce((s,c) => s + parseFloat(c.total || 0), 0)

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="kpi-c"><div class="kpi-c-lbl">Total facturado</div><div class="kpi-c-val" style="color:#059669;font-size:18px">$${totalFacturado.toFixed(2)}</div><div class="kpi-c-sub">USD</div></div>
      <div class="kpi-c"><div class="kpi-c-lbl">Total costos</div><div class="kpi-c-val" style="font-size:18px">$${totalCostos.toFixed(2)}</div><div class="kpi-c-sub">USD</div></div>
      <div class="kpi-c"><div class="kpi-c-lbl">Profit acumulado</div><div class="kpi-c-val" style="color:${profitTotal >= 0 ? "#7c3aed" : "#dc2626"};font-size:18px">$${profitTotal.toFixed(2)}</div><div class="kpi-c-sub">USD</div></div>
      <div class="kpi-c"><div class="kpi-c-lbl">Por cobrar</div><div class="kpi-c-val" style="color:#d97706;font-size:18px">$${pendiente.toFixed(2)}</div><div class="kpi-c-sub">Pendiente</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Comprobantes emitidos</span></div>
        <table>
          <thead><tr><th>ORDEN</th><th>TIPO</th><th>TOTAL</th><th>ESTADO</th></tr></thead>
          <tbody>
            ${comprobantes.slice(0,10).map(c => {
              const ord = ordenes.find(o => o.id === c.orden_id)
              return `<tr>
                <td class="text-mono text-sm">${ord?.numero || "—"}</td>
                <td class="text-sm text-muted">${c.tipo || "—"}</td>
                <td style="font-weight:600;color:#059669">${c.moneda} ${parseFloat(c.total).toFixed(2)}</td>
                <td><span class="pill pill-${c.estado_pago || "pendiente"}" style="font-size:9px">${c.estado_pago || "pendiente"}</span></td>
              </tr>`
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Costos por orden</span></div>
        <table>
          <thead><tr><th>ORDEN</th><th>CONCEPTO</th><th>MONTO</th></tr></thead>
          <tbody>
            ${costos.slice(0,10).map(c => {
              const ord = ordenes.find(o => o.id === c.orden_id)
              return `<tr>
                <td class="text-mono text-sm">${ord?.numero || "—"}</td>
                <td class="text-sm text-muted">${c.concepto || "—"}</td>
                <td style="font-weight:600">${c.moneda} ${parseFloat(c.monto).toFixed(2)}</td>
              </tr>`
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// EDITAR CLIENTE
// ─────────────────────────────────────────────
document.getElementById("btn-editar-cliente").addEventListener("click", () => {
  const c = clienteActual
  document.getElementById("e-tipo-doc").value  = c.tipo_documento || "RUC"
  document.getElementById("e-ruc").value       = c.ruc || ""
  document.getElementById("e-razon").value     = c.razon_social || ""
  document.getElementById("e-contacto").value  = c.contacto || ""
  document.getElementById("e-telefono").value  = c.telefono || ""
  document.getElementById("e-email").value     = c.email || ""
  document.getElementById("e-tipo").value      = c.tipo || "importador"
  document.getElementById("e-pais").value      = c.pais || "Peru"
  document.getElementById("e-direccion").value = c.direccion || ""
  document.getElementById("e-vendedor").value  = c.vendedor || ""
  document.getElementById("e-condicion").value = c.condicion_pago || "Contado"
  document.getElementById("e-credito").value   = c.credito_limite || ""
  document.getElementById("e-obs").value       = c.observaciones || ""
  document.getElementById("modal-editar").classList.add("visible")
})

document.getElementById("e-cancelar").addEventListener("click", () => {
  document.getElementById("modal-editar").classList.remove("visible")
})

document.getElementById("e-guardar").addEventListener("click", async () => {
  const { error } = await db.from("clientes").update({
    tipo_documento:  document.getElementById("e-tipo-doc").value,
    ruc:             document.getElementById("e-ruc").value.trim(),
    razon_social:    document.getElementById("e-razon").value.trim(),
    contacto:        document.getElementById("e-contacto").value.trim(),
    telefono:        document.getElementById("e-telefono").value.trim() || null,
    email:           document.getElementById("e-email").value.trim()    || null,
    tipo:            document.getElementById("e-tipo").value,
    pais:            document.getElementById("e-pais").value.trim()     || "Peru",
    direccion:       document.getElementById("e-direccion").value.trim() || null,
    vendedor:        document.getElementById("e-vendedor").value.trim() || null,
    condicion_pago:  document.getElementById("e-condicion").value,
    credito_limite:  parseFloat(document.getElementById("e-credito").value) || 0,
    observaciones:   document.getElementById("e-obs").value.trim() || null,
    updated_at:      new Date().toISOString()
  }).eq("id", clienteId)

  if (error) { alert("Error: " + error.message); return }
  document.getElementById("modal-editar").classList.remove("visible")
  await cargarCliente()
})

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarCliente()