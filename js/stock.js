const { createClient } = supabase
const SUPABASE_URL = "https://xeduwecilmygdtukxewl.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHV3ZWNpbG15Z2R0dWt4ZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDczOTQsImV4cCI6MjA5NTcyMzM5NH0.WxTBSrxG9DTGn08IURNrF3xU7gj7StDa5_aEFru_R7U"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let tabActiva     = "almacenes"
let todosLosLotes = []
let almacenes     = []

function inicializarUI() {
  const nombre    = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent    = nombre
  document.getElementById("sb-rol").textContent       = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent     = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

// ─────────────────────────────────────────────
// CARGA INICIAL
// ─────────────────────────────────────────────
async function cargarTodo() {
  const [almRes, lotesRes] = await Promise.all([
    db.from("almacenes").select("*").eq("activo", true).order("tipo").order("nombre"),
    db.from("stock_lotes").select("*, almacenes(id,nombre,tipo), ordenes(id,numero,tipo,cliente_id, clientes(razon_social))")
      .order("created_at", { ascending: false })
  ])

  almacenes     = almRes.data  || []
  todosLosLotes = lotesRes.data || []

  poblarFiltroAlmacen()
  renderKPIs()
  renderAlertas()
  renderContenido()
}

function poblarFiltroAlmacen() {
  const sel = document.getElementById("filtro-almacen")
  sel.innerHTML = `<option value="TODOS">Todos los almacenes</option>`
  almacenes.forEach(a => {
    sel.innerHTML += `<option value="${a.id}">${a.nombre} (${a.tipo})</option>`
  })
}

// ─────────────────────────────────────────────
// KPIs GLOBALES
// ─────────────────────────────────────────────
function renderKPIs() {
  const activos      = todosLosLotes.filter(l => !["despachado_total"].includes(l.estado))
  const pendientes   = todosLosLotes.filter(l => l.estado === "pendiente_ingreso")
  const enAlmacen    = todosLosLotes.filter(l => l.estado === "ingresado" || l.estado === "parcialmente_despachado")
  const conAlerta    = todosLosLotes.filter(l => {
    if (!l.fecha_vencimiento) return false
    const dias = Math.floor((new Date(l.fecha_vencimiento) - new Date()) / (1000*60*60*24))
    return dias <= 10 && l.estado !== "despachado_total"
  })

  const totalUnidades = enAlmacen.reduce((s,l) => s + (l.saldo_unidades || 0), 0)
  const totalBultos   = enAlmacen.reduce((s,l) => s + (l.saldo_bultos || 0), 0)

  document.getElementById("kpis-stock").innerHTML = `
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Lotes activos</div><div class="kpi-val">${activos.length}</div><div class="kpi-trend nt">en gestión</div></div>
      <div class="kpi-ico purple"><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">En almacén</div><div class="kpi-val">${enAlmacen.length}</div><div class="kpi-trend nt">${totalUnidades} unidades · ${totalBultos} bultos</div></div>
      <div class="kpi-ico blue"><svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Pendientes ingreso</div><div class="kpi-val">${pendientes.length}</div><div class="kpi-trend nt">direccionados</div></div>
      <div class="kpi-ico amber"><svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
    </div>
    <div class="kpi k-red">
      <div class="kpi-body"><div class="kpi-lbl">Alertas vencimiento</div><div class="kpi-val" style="color:${conAlerta.length > 0 ? "#dc2626" : "#111827"}">${conAlerta.length}</div><div class="kpi-trend ${conAlerta.length > 0 ? "dn" : "nt"}">próximos 10 días</div></div>
      <div class="kpi-ico red"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
    </div>
  `
}

// ─────────────────────────────────────────────
// ALERTAS DE VENCIMIENTO
// ─────────────────────────────────────────────
function renderAlertas() {
  const alertas = todosLosLotes.filter(l => {
    if (!l.fecha_vencimiento || l.estado === "despachado_total") return false
    const dias = Math.floor((new Date(l.fecha_vencimiento) - new Date()) / (1000*60*60*24))
    return dias <= 10
  })

  const cont = document.getElementById("alertas-vencimiento")
  if (!alertas.length) { cont.innerHTML = ""; return }

  cont.innerHTML = `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px">⚠ ${alertas.length} lote${alertas.length > 1 ? "s" : ""} próximos a vencer</div>
      ${alertas.map(l => {
        const dias = Math.floor((new Date(l.fecha_vencimiento) - new Date()) / (1000*60*60*24))
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #fecaca">
            <span style="font-size:11px;font-weight:600;color:#111827">${l.ordenes?.numero || "—"}</span>
            <span style="font-size:11px;color:#6b7280">→ ${l.almacenes?.nombre || "—"}</span>
            <span style="font-size:11px;color:#6b7280">BL: ${l.referencia_bl}</span>
            <span style="margin-left:auto;font-size:11px;font-weight:700;color:${dias <= 0 ? "#dc2626" : "#d97706"}">
              ${dias <= 0 ? "VENCIDO" : `Vence en ${dias} día${dias !== 1 ? "s" : ""}`}
            </span>
            <a href="orden-detalle.html?id=${l.orden_id}&tab=stock" class="btn btn-danger btn-xs">Ver</a>
          </div>
        `
      }).join("")}
    </div>
  `
}

// ─────────────────────────────────────────────
// FILTRAR LOTES
// ─────────────────────────────────────────────
function loteFiltrado() {
  const almacenId = document.getElementById("filtro-almacen").value
  const tipoAlm   = document.getElementById("filtro-tipo-almacen").value
  const estadoLot = document.getElementById("filtro-estado-lote").value
  const busqueda  = document.getElementById("filtro-busqueda-stock").value.toLowerCase()

  return todosLosLotes.filter(l => {
    if (almacenId !== "TODOS" && String(l.almacen_id) !== almacenId) return false
    if (tipoAlm   !== "TODOS" && l.almacenes?.tipo !== tipoAlm)      return false
    if (estadoLot !== "TODOS" && l.estado !== estadoLot)             return false
    if (busqueda) {
      const num     = l.ordenes?.numero?.toLowerCase() || ""
      const bl      = l.referencia_bl?.toLowerCase()   || ""
      const cliente = l.ordenes?.clientes?.razon_social?.toLowerCase() || ""
      if (!num.includes(busqueda) && !bl.includes(busqueda) && !cliente.includes(busqueda)) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────
// RENDER CONTENIDO SEGÚN TAB
// ─────────────────────────────────────────────
function renderContenido() {
  const lotes = loteFiltrado()
  if (tabActiva === "almacenes")  renderPorAlmacen(lotes)
  if (tabActiva === "ordenes")    renderPorOrden(lotes)
  if (tabActiva === "reportes")   renderReportes(lotes)
}

// ─────────────────────────────────────────────
// VISTA POR ALMACÉN
// ─────────────────────────────────────────────
function renderPorAlmacen(lotes) {
  const cont = document.getElementById("stock-content")
  cont.innerHTML = ""

  const porAlmacen = {}
  lotes.forEach(l => {
    const key = l.almacen_id
    if (!porAlmacen[key]) {
      porAlmacen[key] = {
        almacen: l.almacenes,
        lotes:   []
      }
    }
    porAlmacen[key].lotes.push(l)
  })

  if (!Object.keys(porAlmacen).length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div><p>Sin lotes activos</p><span>No hay cargas en almacén con los filtros aplicados</span></div>`
    return
  }

  Object.values(porAlmacen).forEach(grupo => {
    const alm     = grupo.almacen || {}
    const lotesGr = grupo.lotes
    const enAlm   = lotesGr.filter(l => l.estado !== "despachado_total")
    const totalU  = enAlm.reduce((s,l) => s + (l.saldo_unidades || 0), 0)
    const totalB  = enAlm.reduce((s,l) => s + (l.saldo_bultos   || 0), 0)
    const totalP  = enAlm.reduce((s,l) => s + parseFloat(l.total_peso_kg || 0), 0)

    const tipoCls = {
      "DT": "tipo-DT", "DA": "tipo-DA",
      "Simple": "tipo-Simple", "Descarga directa": "tipo-DD"
    }[alm.tipo] || "tipo-Simple"

    const card = document.createElement("div")
    card.className = "almacen-card"
    card.innerHTML = `
      <div class="almacen-head">
        <div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:15px;font-weight:700;color:#111827">${alm.nombre || "—"}</span>
            <span class="almacen-tipo-badge ${tipoCls}">${alm.tipo}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:3px">
            ${alm.direccion || ""} ${alm.ciudad ? "· " + alm.ciudad : ""}
            ${alm.contacto_nombre ? "· " + alm.contacto_nombre : ""}
          </div>
        </div>
        <div style="display:flex;gap:16px;text-align:right">
          <div class="stat-box">
            <div class="stat-val">${enAlm.length}</div>
            <div class="stat-lbl">Lotes activos</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${totalU}</div>
            <div class="stat-lbl">Unidades</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${totalB}</div>
            <div class="stat-lbl">Bultos</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${totalP.toFixed(0)}</div>
            <div class="stat-lbl">Kg total</div>
          </div>
        </div>
      </div>
    `

    lotesGr.forEach(lote => {
      const diasEnAlm = lote.fecha_ingreso
        ? Math.floor((new Date() - new Date(lote.fecha_ingreso)) / (1000*60*60*24))
        : null

      const diasRest = lote.fecha_vencimiento
        ? Math.floor((new Date(lote.fecha_vencimiento) - new Date()) / (1000*60*60*24))
        : null

      let diasBadge = ""
      if (diasEnAlm !== null) {
        const cls = diasEnAlm > 25 ? "dias-crit" : diasEnAlm > 15 ? "dias-warn" : "dias-ok"
        diasBadge = `<span class="dias-badge ${cls}">${diasEnAlm}d en almacén</span>`
      }

      let vencBadge = ""
      if (diasRest !== null && lote.estado !== "despachado_total") {
        const cls = diasRest <= 0 ? "dias-crit" : diasRest <= 5 ? "dias-crit" : diasRest <= 10 ? "dias-warn" : "dias-ok"
        vencBadge = `<span class="dias-badge ${cls}">${diasRest <= 0 ? "VENCIDO" : "Vence " + diasRest + "d"}</span>`
      }

      const estadoEtq = {
        pendiente_ingreso:       { bg:"#f3f4f6", color:"#6b7280",  lbl:"Pendiente ingreso" },
        ingresado:               { bg:"#eff6ff", color:"#2563eb",  lbl:"Ingresado" },
        parcialmente_despachado: { bg:"#f5f3ff", color:"#7c3aed",  lbl:"Parc. despachado" },
        despachado_total:        { bg:"#ecfdf5", color:"#059669",  lbl:"Despachado" },
      }
      const est = estadoEtq[lote.estado] || { bg:"#f3f4f6", color:"#6b7280", lbl:lote.estado }

      const row = document.createElement("a")
      row.href  = `orden-detalle.html?id=${lote.orden_id}`
      row.className = "lote-row"
      row.innerHTML = `
        <div style="min-width:120px">
          <div style="font-size:12px;font-weight:700;color:#111827;font-family:monospace">${lote.ordenes?.numero || "—"}</div>
          <div style="font-size:10px;color:#9ca3af">${lote.ordenes?.tipo || ""}${lote.ordenes?.clientes?.razon_social ? " · " + lote.ordenes.clientes.razon_social : ""}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:#374151">BL: <strong>${lote.referencia_bl}</strong></div>
          <div style="font-size:10px;color:#9ca3af">${lote.tipo_direccionamiento}</div>
        </div>
        <div style="display:flex;gap:20px;text-align:center">
          <div><div style="font-size:13px;font-weight:700;color:#111827">${lote.saldo_unidades}<span style="font-size:10px;color:#9ca3af">/${lote.total_unidades}</span></div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Unidades</div></div>
          <div><div style="font-size:13px;font-weight:700;color:#111827">${lote.saldo_bultos}<span style="font-size:10px;color:#9ca3af">/${lote.total_bultos}</span></div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Bultos</div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px;background:${est.bg};color:${est.color}">${est.lbl}</span>
          ${diasBadge}
          ${vencBadge}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
      `
      card.appendChild(row)
    })

    cont.appendChild(card)
  })
}

// ─────────────────────────────────────────────
// VISTA POR ORDEN
// ─────────────────────────────────────────────
function renderPorOrden(lotes) {
  const cont = document.getElementById("stock-content")
  cont.innerHTML = ""

  if (!lotes.length) {
    cont.innerHTML = `<div class="panel-vacio"><p>Sin lotes</p><span>No hay cargas con los filtros aplicados</span></div>`
    return
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Lotes por orden</span>
      <span style="font-size:12px;color:#9ca3af">${lotes.length} lotes</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>ORDEN</th><th>CLIENTE</th><th>BL</th><th>ALMACÉN</th>
          <th>UNIDADES</th><th>BULTOS</th><th>DÍAS</th><th>VENCE</th><th>ESTADO</th>
        </tr>
      </thead>
      <tbody>
        ${lotes.map(l => {
          const dias = l.fecha_ingreso
            ? Math.floor((new Date() - new Date(l.fecha_ingreso)) / (1000*60*60*24))
            : null
          const vence = l.fecha_vencimiento
            ? Math.floor((new Date(l.fecha_vencimiento) - new Date()) / (1000*60*60*24))
            : null
          const est = {
            pendiente_ingreso:"pill-borrador", ingresado:"pill-en_curso",
            parcialmente_despachado:"pill-dam_numerada", despachado_total:"pill-liquidada"
          }[l.estado] || "pill-borrador"

          return `
            <tr>
              <td><a href="orden-detalle.html?id=${l.orden_id}" style="font-weight:700;color:#7c3aed;text-decoration:none;font-family:monospace;font-size:12px">${l.ordenes?.numero || "—"}</a></td>
              <td class="text-sm text-muted">${l.ordenes?.clientes?.razon_social || "—"}</td>
              <td style="font-size:11px;font-family:monospace">${l.referencia_bl}</td>
              <td class="text-sm">${l.almacenes?.nombre || "—"}</td>
              <td style="font-weight:600;text-align:center">${l.saldo_unidades}/${l.total_unidades}</td>
              <td style="font-weight:600;text-align:center">${l.saldo_bultos}/${l.total_bultos}</td>
              <td style="text-align:center"><span class="dias-badge ${dias===null ? "" : dias > 20 ? "dias-crit" : dias > 10 ? "dias-warn" : "dias-ok"}">${dias !== null ? dias + "d" : "—"}</span></td>
              <td style="text-align:center"><span class="dias-badge ${vence===null ? "" : vence <= 0 ? "dias-crit" : vence <= 10 ? "dias-warn" : "dias-ok"}">${vence !== null ? (vence <= 0 ? "VENCIDO" : vence + "d") : "—"}</span></td>
              <td><span class="pill ${est}">${l.estado.replace(/_/g," ")}</span></td>
            </tr>
          `
        }).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(card)
}

// ─────────────────────────────────────────────
// REPORTES
// ─────────────────────────────────────────────
function renderReportes(lotes) {
  const cont = document.getElementById("stock-content")
  cont.innerHTML = ""

  // Reporte 1 — Movimientos del mes
  const hoy     = new Date()
  const inicioM = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  // Reporte 2 — Volumen por almacén
  const volPorAlm = {}
  lotes.forEach(l => {
    const nom = l.almacenes?.nombre || "—"
    if (!volPorAlm[nom]) volPorAlm[nom] = { ingresos:0, saldo:0, unidades:0 }
    volPorAlm[nom].ingresos  += l.total_bultos    || 0
    volPorAlm[nom].saldo     += l.saldo_bultos    || 0
    volPorAlm[nom].unidades  += l.saldo_unidades  || 0
  })

  // Reporte 3 — Por cliente
  const volPorCli = {}
  lotes.forEach(l => {
    const cli = l.ordenes?.clientes?.razon_social || "Sin cliente"
    if (!volPorCli[cli]) volPorCli[cli] = { lotes:0, bultos:0, unidades:0 }
    volPorCli[cli].lotes    += 1
    volPorCli[cli].bultos   += l.saldo_bultos   || 0
    volPorCli[cli].unidades += l.saldo_unidades || 0
  })

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- Volumen por almacén -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Saldo por almacén</span>
          <button class="btn btn-secondary btn-xs" id="btn-export-alm-pdf">PDF</button>
        </div>
        <table>
          <thead><tr><th>ALMACÉN</th><th>TIPO</th><th>LOTES</th><th>UNIDADES</th><th>BULTOS TOTALES</th><th>SALDO</th></tr></thead>
          <tbody>
            ${Object.entries(volPorAlm).map(([nom, d]) => `
              <tr>
                <td style="font-weight:600;color:#111827">${nom}</td>
                <td class="text-muted text-sm">${almacenes.find(a => a.nombre === nom)?.tipo || "—"}</td>
                <td style="text-align:center">${lotes.filter(l => l.almacenes?.nombre === nom).length}</td>
                <td style="text-align:center;font-weight:600">${d.unidades}</td>
                <td style="text-align:center">${d.ingresos}</td>
                <td style="text-align:center;font-weight:700;color:#7c3aed">${d.saldo}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <!-- Por cliente -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Stock por cliente</span>
          <button class="btn btn-secondary btn-xs" id="btn-export-cli-pdf">PDF</button>
        </div>
        <table>
          <thead><tr><th>CLIENTE</th><th>LOTES</th><th>UNIDADES</th><th>BULTOS</th></tr></thead>
          <tbody>
            ${Object.entries(volPorCli).sort((a,b) => b[1].bultos - a[1].bultos).map(([cli, d]) => `
              <tr>
                <td style="font-weight:500;color:#111827;font-size:12px">${cli}</td>
                <td style="text-align:center">${d.lotes}</td>
                <td style="text-align:center;font-weight:600">${d.unidades}</td>
                <td style="text-align:center;font-weight:700;color:#7c3aed">${d.bultos}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kardex / movimientos -->
    <div class="card" id="kardex-card">
      <div class="card-header">
        <span class="card-title">Movimientos — Kardex</span>
        <div style="display:flex;gap:8px">
          <input class="form-input" type="month" id="filtro-mes-kardex" value="${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}" style="width:auto;font-size:12px;padding:5px 10px" />
          <button class="btn btn-secondary btn-xs" id="btn-export-kardex-pdf">PDF</button>
          <button class="btn btn-secondary btn-xs" id="btn-export-kardex-excel">Excel</button>
        </div>
      </div>
      <div id="kardex-content" style="padding:16px">
        <div style="text-align:center;color:#9ca3af;font-size:12px">Cargando movimientos...</div>
      </div>
    </div>
  `

  cargarKardex()

  document.getElementById("filtro-mes-kardex").addEventListener("change", cargarKardex)
  document.getElementById("btn-export-kardex-pdf").addEventListener("click", exportarKardexPDF)
  document.getElementById("btn-export-kardex-excel").addEventListener("click", exportarKardexExcel)
  document.getElementById("btn-export-alm-pdf").addEventListener("click", () => exportarTablaSimplePDF("Saldo por almacén", volPorAlm))
  document.getElementById("btn-export-cli-pdf").addEventListener("click", () => exportarTablaClientePDF("Stock por cliente", volPorCli))
}

async function cargarKardex() {
  const mes    = document.getElementById("filtro-mes-kardex")?.value
  if (!mes) return

  const [anio, mesNum] = mes.split("-").map(Number)
  const desde  = new Date(anio, mesNum-1, 1).toISOString()
  const hasta  = new Date(anio, mesNum, 0, 23, 59, 59).toISOString()

  const { data: movs } = await db
    .from("stock_movimientos")
    .select("*, stock_lotes(referencia_bl, almacenes(nombre)), ordenes(numero, clientes(razon_social))")
    .gte("fecha_movimiento", desde)
    .lte("fecha_movimiento", hasta)
    .order("fecha_movimiento")

  const cont = document.getElementById("kardex-content")
  if (!movs?.length) {
    cont.innerHTML = `<div style="text-align:center;color:#9ca3af;font-size:12px">Sin movimientos en el período seleccionado</div>`
    return
  }

  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>FECHA</th><th>ORDEN</th><th>CLIENTE</th><th>ALMACÉN</th>
          <th>BL</th><th>TIPO</th><th>UNIDADES</th><th>BULTOS</th><th>PESO KG</th>
        </tr>
      </thead>
      <tbody>
        ${movs.map(m => `
          <tr>
            <td class="text-sm text-muted">${new Date(m.fecha_movimiento).toLocaleDateString("es-PE")}</td>
            <td style="font-weight:600;font-family:monospace;font-size:11px">${m.ordenes?.numero || "—"}</td>
            <td class="text-sm text-muted">${m.ordenes?.clientes?.razon_social || "—"}</td>
            <td class="text-sm">${m.stock_lotes?.almacenes?.nombre || "—"}</td>
            <td style="font-size:11px;font-family:monospace">${m.stock_lotes?.referencia_bl || "—"}</td>
            <td><span class="pill ${m.tipo_movimiento === "ingreso" ? "pill-aprobada" : "pill-en_curso"}" style="font-size:9px">${m.tipo_movimiento.replace(/_/g," ")}</span></td>
            <td style="text-align:center;font-weight:600">${m.unidades || 0}</td>
            <td style="text-align:center;font-weight:600">${m.bultos || 0}</td>
            <td style="text-align:center">${m.peso_kg ? parseFloat(m.peso_kg).toFixed(0) : 0}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
}

// ─────────────────────────────────────────────
// EXPORTAR PDF
// ─────────────────────────────────────────────
function exportarKardexPDF() {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const mes = document.getElementById("filtro-mes-kardex")?.value || ""

  doc.setFillColor(30,27,75)
  doc.rect(0,0,297,20,"F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(12)
  doc.setTextColor(255,255,255)
  doc.text("MarsTech — Kardex de movimientos de stock", 14, 13)
  doc.setFont("helvetica","normal")
  doc.setFontSize(9)
  doc.text(`Período: ${mes}`, 230, 13)

  const rows = []
  const trs  = document.querySelectorAll("#kardex-content tbody tr")
  trs.forEach(tr => {
    const tds = Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim())
    rows.push(tds)
  })

  doc.autoTable({
    startY: 26,
    head: [["Fecha","Orden","Cliente","Almacén","BL","Tipo","Unidades","Bultos","Peso kg"]],
    body: rows,
    styles: { fontSize:8, cellPadding:3 },
    headStyles: { fillColor:[30,27,75], textColor:[255,255,255], fontStyle:"bold" },
    alternateRowStyles: { fillColor:[249,250,251] },
    margin: { left:14, right:14 }
  })

  doc.save(`kardex-stock-${mes}.pdf`)
}

function exportarKardexExcel() {
  const rows  = [["Fecha","Orden","Cliente","Almacén","BL","Tipo","Unidades","Bultos","Peso kg"]]
  const trs   = document.querySelectorAll("#kardex-content tbody tr")
  trs.forEach(tr => {
    rows.push(Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim()))
  })

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `kardex-stock-${document.getElementById("filtro-mes-kardex")?.value || "reporte"}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportarTablaSimplePDF(titulo, datos) {
  const { jsPDF } = window.jspdf
  const doc  = new jsPDF()
  doc.setFillColor(30,27,75)
  doc.rect(0,0,210,18,"F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(11)
  doc.setTextColor(255,255,255)
  doc.text(`MarsTech — ${titulo}`, 14, 12)

  const rows = Object.entries(datos).map(([nom, d]) => [nom, d.unidades, d.ingresos, d.saldo])
  doc.autoTable({
    startY: 24,
    head: [["Almacén","Unidades","Bultos totales","Saldo"]],
    body: rows,
    styles: { fontSize:9 },
    headStyles: { fillColor:[30,27,75], textColor:[255,255,255] },
    margin: { left:14, right:14 }
  })
  doc.save(`${titulo.toLowerCase().replace(/ /g,"-")}.pdf`)
}

function exportarTablaClientePDF(titulo, datos) {
  const { jsPDF } = window.jspdf
  const doc  = new jsPDF()
  doc.setFillColor(30,27,75)
  doc.rect(0,0,210,18,"F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(11)
  doc.setTextColor(255,255,255)
  doc.text(`MarsTech — ${titulo}`, 14, 12)

  const rows = Object.entries(datos).sort((a,b)=>b[1].bultos-a[1].bultos)
    .map(([cli, d]) => [cli, d.lotes, d.unidades, d.bultos])
  doc.autoTable({
    startY: 24,
    head: [["Cliente","Lotes","Unidades","Bultos"]],
    body: rows,
    styles: { fontSize:9 },
    headStyles: { fillColor:[30,27,75], textColor:[255,255,255] },
    margin: { left:14, right:14 }
  })
  doc.save(`${titulo.toLowerCase().replace(/ /g,"-")}.pdf`)
}

// ─────────────────────────────────────────────
// GESTIONAR ALMACENES
// ─────────────────────────────────────────────
async function cargarListaAlmacenes() {
  const { data } = await db.from("almacenes").select("*").order("tipo").order("nombre")
  const cont     = document.getElementById("lista-almacenes")
  if (!data?.length) { cont.innerHTML = ""; return }

  cont.innerHTML = `
    <table>
      <thead><tr><th>NOMBRE</th><th>TIPO</th><th>CIUDAD</th><th>CONTACTO</th><th>DÍAS MÁX</th><th></th></tr></thead>
      <tbody>
        ${data.map(a => `
          <tr>
            <td style="font-weight:600;color:#111827">${a.nombre}</td>
            <td><span class="almacen-tipo-badge tipo-${a.tipo === "Descarga directa" ? "DD" : a.tipo}">${a.tipo}</span></td>
            <td class="text-sm text-muted">${a.ciudad || "—"}</td>
            <td class="text-sm text-muted">${a.contacto_nombre || "—"}</td>
            <td style="text-align:center">${a.dias_maximos || "—"}</td>
            <td>
              ${a.nombre !== "DESCARGA DIRECTA" ? `
                <button class="btn btn-danger btn-xs btn-del-alm" data-id="${a.id}">Eliminar</button>
              ` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `

  cont.querySelectorAll(".btn-del-alm").forEach(btn => {
    btn.addEventListener("click", async function() {
      if (!confirm("¿Eliminar este almacén?")) return
      await db.from("almacenes").update({ activo:false }).eq("id", this.dataset.id)
      await cargarListaAlmacenes()
      await cargarTodo()
    })
  })
}

document.getElementById("btn-gestionar-almacenes").addEventListener("click", async () => {
  await cargarListaAlmacenes()
  document.getElementById("modal-almacenes").classList.add("visible")
})

document.getElementById("cerrar-modal-almacenes").addEventListener("click", () => {
  document.getElementById("modal-almacenes").classList.remove("visible")
})

document.getElementById("btn-nuevo-almacen").addEventListener("click", () => {
  document.getElementById("form-almacen").classList.toggle("visible")
})

document.getElementById("btn-cancelar-almacen").addEventListener("click", () => {
  document.getElementById("form-almacen").classList.remove("visible")
})

document.getElementById("btn-guardar-almacen").addEventListener("click", async () => {
  const nombre = document.getElementById("alm-nombre").value.trim()
  const tipo   = document.getElementById("alm-tipo").value
  if (!nombre) { alert("Ingresa el nombre del almacén"); return }

  const { error } = await db.from("almacenes").insert({
    nombre:           nombre.toUpperCase(),
    tipo,
    direccion:        document.getElementById("alm-direccion").value.trim() || null,
    ciudad:           document.getElementById("alm-ciudad").value.trim()    || "Callao",
    contacto_nombre:  document.getElementById("alm-contacto").value.trim()  || null,
    contacto_telefono:document.getElementById("alm-telefono").value.trim()  || null,
    contacto_email:   document.getElementById("alm-email").value.trim()     || null,
    horario_atencion: document.getElementById("alm-horario").value.trim()   || null,
    dias_maximos:     parseInt(document.getElementById("alm-dias").value)   || null,
    particularidades: document.getElementById("alm-notas").value.trim()     || null,
    activo:           true
  })

  if (error) { alert("Error: " + error.message); return }
  document.getElementById("form-almacen").classList.remove("visible")
  await cargarListaAlmacenes()
  await cargarTodo()
})

// ─────────────────────────────────────────────
// EXPORTAR GLOBAL
// ─────────────────────────────────────────────
document.getElementById("btn-exportar-excel").addEventListener("click", () => {
  const lotes = loteFiltrado()
  const rows  = [["Orden","Cliente","BL","Almacén","Tipo","Unidades saldo","Bultos saldo","Peso kg","Días almacén","Vence","Estado"]]
  lotes.forEach(l => {
    const dias  = l.fecha_ingreso ? Math.floor((new Date()-new Date(l.fecha_ingreso))/(1000*60*60*24)) : ""
    const vence = l.fecha_vencimiento ? Math.floor((new Date(l.fecha_vencimiento)-new Date())/(1000*60*60*24)) : ""
    rows.push([
      l.ordenes?.numero || "",
      l.ordenes?.clientes?.razon_social || "",
      l.referencia_bl,
      l.almacenes?.nombre || "",
      l.almacenes?.tipo   || "",
      l.saldo_unidades,
      l.saldo_bultos,
      parseFloat(l.total_peso_kg || 0).toFixed(0),
      dias,
      vence,
      l.estado.replace(/_/g," ")
    ])
  })

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `stock-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
})

document.getElementById("btn-exportar-pdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf
  const doc   = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const lotes = loteFiltrado()

  doc.setFillColor(30,27,75)
  doc.rect(0,0,297,20,"F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(12)
  doc.setTextColor(255,255,255)
  doc.text("MarsTech — Reporte de stock por almacén", 14, 13)
  doc.setFont("helvetica","normal")
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString("es-PE"), 260, 13)

  const rows = lotes.map(l => {
    const dias  = l.fecha_ingreso ? Math.floor((new Date()-new Date(l.fecha_ingreso))/(1000*60*60*24)) + "d" : "—"
    const vence = l.fecha_vencimiento ? Math.floor((new Date(l.fecha_vencimiento)-new Date())/(1000*60*60*24)) + "d" : "—"
    return [
      l.ordenes?.numero || "—",
      l.ordenes?.clientes?.razon_social?.substring(0,20) || "—",
      l.referencia_bl,
      l.almacenes?.nombre || "—",
      `${l.saldo_unidades}/${l.total_unidades}`,
      `${l.saldo_bultos}/${l.total_bultos}`,
      dias, vence,
      l.estado.replace(/_/g," ")
    ]
  })

  doc.autoTable({
    startY: 26,
    head: [["Orden","Cliente","BL","Almacén","Unidades","Bultos","Días","Vence","Estado"]],
    body: rows,
    styles: { fontSize:7.5, cellPadding:2.5 },
    headStyles: { fillColor:[30,27,75], textColor:[255,255,255], fontStyle:"bold" },
    alternateRowStyles: { fillColor:[249,250,251] },
    margin: { left:14, right:14 }
  })

  doc.save(`stock-${new Date().toISOString().split("T")[0]}.pdf`)
})

// ─────────────────────────────────────────────
// TABS Y FILTROS
// ─────────────────────────────────────────────
document.querySelectorAll(".tab-stock-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".tab-stock-btn").forEach(b => b.classList.remove("active"))
    this.classList.add("active")
    tabActiva = this.dataset.tab
    renderContenido()
  })
})

document.getElementById("filtro-almacen").addEventListener("change", renderContenido)
document.getElementById("filtro-tipo-almacen").addEventListener("change", renderContenido)
document.getElementById("filtro-estado-lote").addEventListener("change", renderContenido)
document.getElementById("filtro-busqueda-stock").addEventListener("input", renderContenido)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarTodo()