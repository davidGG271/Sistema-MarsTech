const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let ordenActual = null
let conceptosCatalogo = []
let tabActiva = "ingresos"

function inicializarUI() {
  const nombre = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent = nombre
  document.getElementById("sb-rol").textContent = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

async function cargarConceptos() {
  const { data } = await db
    .from("conceptos_catalogo").select("*")
    .eq("activo", true).order("tipo").order("nombre")
  conceptosCatalogo = data || []
}

async function cargarSelector() {
  const { data } = await db
    .from("ordenes").select("*, clientes(razon_social)")
    .eq("activo", true).order("created_at", { ascending: false })

  if (!data) return
  const selector = document.getElementById("selector-orden")
  selector.innerHTML = `<option value="">Selecciona una orden...</option>`

  data.forEach(o => {
    const opt = document.createElement("option")
    opt.value = o.id
    const cliente = o.clientes ? o.clientes.razon_social : "Sin cliente"
    opt.textContent = `${o.numero} — ${cliente}`
    selector.appendChild(opt)
  })

  const params = new URLSearchParams(window.location.search)
  const ordenId = params.get("orden")
  if (ordenId) {
    selector.value = ordenId
    if (selector.value) await cargarFinanzas(ordenId)
  }
}

async function cargarFinanzas(ordenId) {
  const { data: orden } = await db
    .from("ordenes").select("*, clientes(razon_social)")
    .eq("id", ordenId).single()
  ordenActual = orden

  const [compRes, costoRes, solRes] = await Promise.all([
    db.from("comprobantes").select("*").eq("orden_id", ordenId).order("created_at"),
    db.from("costos_orden").select("*").eq("orden_id", ordenId).order("created_at"),
    db.from("solicitudes_pago").select("*").eq("orden_id", ordenId).order("created_at")
  ])

  mostrarPanel(orden, compRes.data || [], costoRes.data || [], solRes.data || [])
}

function mostrarPanel(orden, comprobantes, costos, solicitudes) {
  document.getElementById("panel-vacio").classList.add("hidden")
  document.getElementById("panel-finanzas").classList.remove("hidden")

  document.getElementById("orden-numero").textContent = orden.numero
  const badgeTipo = document.getElementById("orden-tipo")
  badgeTipo.textContent = orden.tipo
  badgeTipo.className = `pill pill-${orden.tipo}`
  document.getElementById("orden-cliente").textContent =
    orden.clientes ? orden.clientes.razon_social : "Sin cliente"

  const totalIngresos = comprobantes.reduce((s,c) => s + parseFloat(c.total || 0), 0)
  const totalCostos   = costos.reduce((s,c) => s + parseFloat(c.monto || 0), 0)
  const solPendientes = solicitudes.filter(s => s.estado !== "pagado")
    .reduce((s,c) => s + parseFloat(c.monto_total || 0), 0)
  const profit = totalIngresos - totalCostos

  document.getElementById("kpi-ingresos").textContent  = `$${totalIngresos.toFixed(2)}`
  document.getElementById("kpi-costos").textContent    = `$${totalCostos.toFixed(2)}`
  document.getElementById("kpi-profit").textContent    = `$${profit.toFixed(2)}`
  document.getElementById("kpi-pendiente").textContent = `$${solPendientes.toFixed(2)}`

  const profitEl = document.getElementById("kpi-profit")
  profitEl.className = profit >= 0 ? "kpi-val" : "kpi-val"
  profitEl.style.color = profit >= 0 ? "#059669" : "#dc2626"

  renderTab(comprobantes, costos, solicitudes)
}

function renderTab(comprobantes, costos, solicitudes) {
  document.querySelectorAll(".fin-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tabActiva))

  if (tabActiva === "ingresos")   renderIngresos(comprobantes)
  if (tabActiva === "costos")     renderCostos(costos)
  if (tabActiva === "solicitudes") renderSolicitudes(solicitudes)
  if (tabActiva === "liquidacion") renderLiquidacion(comprobantes, costos)
}

// ─────────────────────────────────────────────
// INGRESOS
// ─────────────────────────────────────────────
function renderIngresos(comprobantes) {
  const cont = document.getElementById("tab-content")
  cont.innerHTML = ""

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#111827">${comprobantes.length} comprobantes registrados</div>
    <button class="btn btn-primary btn-sm" id="btn-nuevo-ingreso">+ Nuevo comprobante</button>
  `
  cont.appendChild(header)

  const formWrap = document.createElement("div")
  formWrap.className = "form-inline"
  formWrap.id = "form-ingreso"
  formWrap.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="ing-tipo">
          <option value="Factura">Factura</option>
          <option value="Boleta">Boleta</option>
          <option value="Liquidacion aduanas">Liquidación aduanas</option>
          <option value="Liquidacion cobranza">Liquidación cobranza</option>
          <option value="Nota debito">Nota débito</option>
          <option value="Nota credito">Nota crédito</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Serie / número</label>
        <input class="form-input" type="text" id="ing-serie" placeholder="F001-00123" />
      </div>
      <div class="form-group">
        <label class="form-label">Concepto</label>
        <select class="form-select" id="ing-concepto">
          <option value="">Selecciona...</option>
          ${conceptosCatalogo.map(c => `<option value="${c.id}" data-igv="${c.aplica_igv}">${c.nombre}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Moneda</label>
        <select class="form-select" id="ing-moneda">
          <option value="USD">USD</option>
          <option value="PEN">PEN</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Monto</label>
        <input class="form-input" type="number" id="ing-monto" placeholder="0.00" step="0.01" />
      </div>
      <div class="form-group">
        <label class="form-label">El monto</label>
        <select class="form-select" id="ing-igv-modo">
          <option value="sin_igv">No incluye IGV (se suma 18%)</option>
          <option value="con_igv">Ya incluye IGV</option>
          <option value="exento">Exento de IGV</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Total calculado</label>
        <input class="form-input" type="text" id="ing-total-calc" readonly style="background:#f9fafb;font-weight:600;color:#059669" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Vencimiento</label>
        <input class="form-input" type="date" id="ing-vencimiento" />
      </div>
      <div class="form-group">
        <label class="form-label">Estado de pago</label>
        <select class="form-select" id="ing-estado-pago">
          <option value="pendiente">Pendiente</option>
          <option value="cobrado">Cobrado</option>
          <option value="factoring">Factoring</option>
        </select>
      </div>
    </div>
    <div class="form-inline-btns">
      <button class="btn btn-secondary btn-sm" id="btn-cancelar-ingreso">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-guardar-ingreso">Guardar comprobante</button>
    </div>
  `
  cont.appendChild(formWrap)

  calcularTotalIngreso()
  document.getElementById("ing-monto").addEventListener("input", calcularTotalIngreso)
  document.getElementById("ing-igv-modo").addEventListener("change", calcularTotalIngreso)

  document.getElementById("btn-nuevo-ingreso").addEventListener("click", () => {
    formWrap.classList.toggle("visible")
  })

  document.getElementById("btn-cancelar-ingreso").addEventListener("click", () => {
    formWrap.classList.remove("visible")
  })

  document.getElementById("btn-guardar-ingreso").addEventListener("click", async () => {
    await guardarIngreso()
  })

  if (!comprobantes.length) {
    const empty = document.createElement("div")
    empty.style.cssText = "text-align:center;padding:32px;color:#9ca3af;font-size:12px"
    empty.textContent = "Sin comprobantes registrados"
    cont.appendChild(empty)
    return
  }

  const tabla = document.createElement("table")
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>TIPO</th><th>SERIE/NRO</th><th>MONEDA</th>
        <th>SIN IGV</th><th>IGV</th><th>TOTAL</th><th>ESTADO</th>
      </tr>
    </thead>
    <tbody>
      ${comprobantes.map(c => {
        const sinIgv = parseFloat(c.monto_sin_igv || c.subtotal || 0)
        const igv    = parseFloat(c.igv || 0)
        const total  = parseFloat(c.total || 0)
        return `<tr>
          <td style="font-weight:600;color:#111827">${c.tipo}</td>
          <td class="text-muted text-sm">${c.serie_numero || "—"}</td>
          <td><span class="pill" style="background:#f3f4f6;color:#6b7280">${c.moneda}</span></td>
          <td class="text-sm">${c.moneda} ${sinIgv.toFixed(2)}</td>
          <td class="text-sm text-muted">${c.moneda} ${igv.toFixed(2)}</td>
          <td style="font-weight:700;color:#059669">${c.moneda} ${total.toFixed(2)}</td>
          <td><span class="pill pill-${c.estado_pago || "pendiente"}">${c.estado_pago || "pendiente"}</span></td>
        </tr>`
      }).join("")}
    </tbody>
  `
  cont.appendChild(tabla)
}

function calcularTotalIngreso() {
  const monto = parseFloat(document.getElementById("ing-monto")?.value) || 0
  const modo  = document.getElementById("ing-igv-modo")?.value
  const calcEl = document.getElementById("ing-total-calc")
  if (!calcEl) return

  let sinIgv, igv, total
  if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
  else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
  else { sinIgv = monto; igv = 0; total = monto }

  calcEl.value = `Total: ${total.toFixed(2)} (IGV: ${igv.toFixed(2)})`
}

async function guardarIngreso() {
  if (!ordenActual) return
  const tipo      = document.getElementById("ing-tipo").value
  const serie     = document.getElementById("ing-serie").value.trim()
  const conceptoId = document.getElementById("ing-concepto").value
  const moneda    = document.getElementById("ing-moneda").value
  const monto     = parseFloat(document.getElementById("ing-monto").value) || 0
  const modo      = document.getElementById("ing-igv-modo").value
  const venc      = document.getElementById("ing-vencimiento").value
  const estadoPago = document.getElementById("ing-estado-pago").value

  if (!monto) { alert("Ingresa un monto válido"); return }

  let sinIgv, igv, total
  if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
  else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
  else { sinIgv = monto; igv = 0; total = monto }

  const { error } = await db.from("comprobantes").insert({
    orden_id: ordenActual.id,
    tipo, serie_numero: serie,
    concepto_id: conceptoId || null,
    moneda, subtotal: sinIgv,
    monto_sin_igv: sinIgv, igv, total,
    incluye_igv: modo === "con_igv",
    fecha_vencimiento: venc || null,
    estado_pago: estadoPago
  })

  if (error) { alert("Error: " + error.message); return }
  await cargarFinanzas(ordenActual.id)
}

// ─────────────────────────────────────────────
// COSTOS
// ─────────────────────────────────────────────
function renderCostos(costos) {
  const cont = document.getElementById("tab-content")
  cont.innerHTML = ""

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#111827">${costos.length} costos registrados</div>
    <button class="btn btn-primary btn-sm" id="btn-nuevo-costo">+ Nuevo costo</button>
  `
  cont.appendChild(header)

  const formWrap = document.createElement("div")
  formWrap.className = "form-inline"
  formWrap.id = "form-costo"
  formWrap.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Concepto</label>
        <select class="form-select" id="cos-concepto">
          <option value="">Selecciona un concepto...</option>
          ${conceptosCatalogo.map(c => `<option value="${c.id}" data-nombre="${c.nombre}" data-tipo="${c.tipo}" data-igv="${c.aplica_igv}">${c.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Proveedor / beneficiario</label>
        <input class="form-input" type="text" id="cos-proveedor" placeholder="Nombre del proveedor" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Moneda</label>
        <select class="form-select" id="cos-moneda">
          <option value="USD">USD</option>
          <option value="PEN">PEN</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Monto</label>
        <input class="form-input" type="number" id="cos-monto" placeholder="0.00" step="0.01" />
      </div>
      <div class="form-group">
        <label class="form-label">El monto</label>
        <select class="form-select" id="cos-igv-modo">
          <option value="sin_igv">No incluye IGV (se suma 18%)</option>
          <option value="con_igv">Ya incluye IGV</option>
          <option value="exento">Exento de IGV</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Total calculado</label>
        <input class="form-input" type="text" id="cos-total-calc" readonly style="background:#f9fafb;font-weight:600;color:#374151" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Número de comprobante (opcional)</label>
      <input class="form-input" type="text" id="cos-comprobante" placeholder="F001-00123" />
    </div>
    <div class="form-inline-btns">
      <button class="btn btn-secondary btn-sm" id="btn-cancelar-costo">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-guardar-costo">Guardar costo</button>
    </div>
  `
  cont.appendChild(formWrap)

  calcularTotalCosto()
  document.getElementById("cos-monto").addEventListener("input", calcularTotalCosto)
  document.getElementById("cos-igv-modo").addEventListener("change", calcularTotalCosto)

  document.getElementById("btn-nuevo-costo").addEventListener("click", () => {
    formWrap.classList.toggle("visible")
  })

  document.getElementById("btn-cancelar-costo").addEventListener("click", () => {
    formWrap.classList.remove("visible")
  })

  document.getElementById("btn-guardar-costo").addEventListener("click", async () => {
    await guardarCosto()
  })

  if (!costos.length) {
    const empty = document.createElement("div")
    empty.style.cssText = "text-align:center;padding:32px;color:#9ca3af;font-size:12px"
    empty.textContent = "Sin costos registrados"
    cont.appendChild(empty)
    return
  }

  const tabla = document.createElement("table")
  tabla.innerHTML = `
    <thead>
      <tr>
        <th>CONCEPTO</th><th>TIPO</th><th>MONEDA</th>
        <th>SIN IGV</th><th>IGV</th><th>TOTAL</th><th>ESTADO</th>
      </tr>
    </thead>
    <tbody>
      ${costos.map(c => {
        const sinIgv = parseFloat(c.monto_sin_igv || c.monto || 0)
        const igv    = parseFloat(c.igv || 0)
        const total  = parseFloat(c.monto || 0)
        return `<tr>
          <td style="font-weight:500;color:#111827">${c.concepto || "—"}</td>
          <td><span class="pill" style="background:#f3f4f6;color:#6b7280">${c.tipo || "—"}</span></td>
          <td><span class="pill" style="background:#f3f4f6;color:#6b7280">${c.moneda}</span></td>
          <td class="text-sm">${c.moneda} ${sinIgv.toFixed(2)}</td>
          <td class="text-sm text-muted">${c.moneda} ${igv.toFixed(2)}</td>
          <td style="font-weight:700;color:#374151">${c.moneda} ${total.toFixed(2)}</td>
          <td><span class="pill ${c.pagado ? "pill-aprobada" : "pill-borrador"}">${c.pagado ? "pagado" : "pendiente"}</span></td>
        </tr>`
      }).join("")}
    </tbody>
  `
  cont.appendChild(tabla)
}

function calcularTotalCosto() {
  const monto = parseFloat(document.getElementById("cos-monto")?.value) || 0
  const modo  = document.getElementById("cos-igv-modo")?.value
  const calcEl = document.getElementById("cos-total-calc")
  if (!calcEl) return

  let sinIgv, igv, total
  if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
  else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
  else { sinIgv = monto; igv = 0; total = monto }

  calcEl.value = `Total: ${total.toFixed(2)} (IGV: ${igv.toFixed(2)})`
}

async function guardarCosto() {
  if (!ordenActual) return
  const sel        = document.getElementById("cos-concepto")
  const opt        = sel.options[sel.selectedIndex]
  const conceptoId = sel.value
  const nombre     = opt?.dataset?.nombre || ""
  const tipo       = opt?.dataset?.tipo   || "otro"
  const proveedor  = document.getElementById("cos-proveedor").value.trim()
  const moneda     = document.getElementById("cos-moneda").value
  const monto      = parseFloat(document.getElementById("cos-monto").value) || 0
  const modo       = document.getElementById("cos-igv-modo").value
  const comprobante = document.getElementById("cos-comprobante").value.trim()

  if (!conceptoId || !monto) { alert("Selecciona concepto e ingresa monto"); return }

  let sinIgv, igv, total
  if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
  else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
  else { sinIgv = monto; igv = 0; total = monto }

  const { error } = await db.from("costos_orden").insert({
    orden_id: ordenActual.id,
    concepto_id: parseInt(conceptoId),
    concepto: nombre, tipo, moneda,
    monto_sin_igv: sinIgv, igv,
    monto: total,
    aplica_igv: modo !== "exento",
    pagado: false,
    observaciones: proveedor,
    ...(comprobante && { observaciones: `${proveedor} · ${comprobante}` })
  })

  if (error) { alert("Error: " + error.message); return }
  await cargarFinanzas(ordenActual.id)
}

// ─────────────────────────────────────────────
// SOLICITUDES DE PAGO
// ─────────────────────────────────────────────
function renderSolicitudes(solicitudes) {
  const cont = document.getElementById("tab-content")
  cont.innerHTML = ""

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#111827">${solicitudes.length} solicitudes</div>
    <button class="btn btn-primary btn-sm" id="btn-nueva-sol">+ Nueva solicitud</button>
  `
  cont.appendChild(header)

  const formWrap = document.createElement("div")
  formWrap.className = "form-inline"
  formWrap.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Concepto</label>
        <select class="form-select" id="sol-concepto">
          <option value="">Selecciona...</option>
          ${conceptosCatalogo.map(c => `<option value="${c.id}" data-nombre="${c.nombre}" data-igv="${c.aplica_igv}">${c.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Beneficiario</label>
        <input class="form-input" type="text" id="sol-beneficiario" placeholder="A quién se paga" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Moneda</label>
        <select class="form-select" id="sol-moneda">
          <option value="USD">USD</option>
          <option value="PEN">PEN</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Monto</label>
        <input class="form-input" type="number" id="sol-monto" placeholder="0.00" step="0.01" />
      </div>
      <div class="form-group">
        <label class="form-label">El monto</label>
        <select class="form-select" id="sol-igv-modo">
          <option value="sin_igv">No incluye IGV</option>
          <option value="con_igv">Ya incluye IGV</option>
          <option value="exento">Exento de IGV</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Total</label>
        <input class="form-input" type="text" id="sol-total-calc" readonly style="background:#f9fafb;font-weight:600" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Sustento / descripción</label>
      <input class="form-input" type="text" id="sol-sustento" placeholder="Detalle de la solicitud..." />
    </div>
    <div class="form-inline-btns">
      <button class="btn btn-secondary btn-sm" id="btn-cancelar-sol">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-guardar-sol">Solicitar pago</button>
    </div>
  `
  cont.appendChild(formWrap)

  const calcSol = () => {
    const monto = parseFloat(document.getElementById("sol-monto")?.value) || 0
    const modo  = document.getElementById("sol-igv-modo")?.value
    const el    = document.getElementById("sol-total-calc")
    if (!el) return
    let sinIgv, igv, total
    if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
    else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
    else { sinIgv = monto; igv = 0; total = monto }
    el.value = `Total: ${total.toFixed(2)} (IGV: ${igv.toFixed(2)})`
  }

  document.getElementById("btn-nueva-sol").addEventListener("click", () => {
    formWrap.classList.toggle("visible")
  })

  document.getElementById("btn-cancelar-sol").addEventListener("click", () => {
    formWrap.classList.remove("visible")
  })

  document.getElementById("sol-monto").addEventListener("input", calcSol)
  document.getElementById("sol-igv-modo").addEventListener("change", calcSol)

  document.getElementById("btn-guardar-sol").addEventListener("click", async () => {
    const sel      = document.getElementById("sol-concepto")
    const opt      = sel.options[sel.selectedIndex]
    const concId   = sel.value
    const nombre   = opt?.dataset?.nombre || ""
    const benef    = document.getElementById("sol-beneficiario").value.trim()
    const moneda   = document.getElementById("sol-moneda").value
    const monto    = parseFloat(document.getElementById("sol-monto").value) || 0
    const modo     = document.getElementById("sol-igv-modo").value
    const sustento = document.getElementById("sol-sustento").value.trim()

    if (!concId || !monto || !benef) {
      alert("Completa concepto, beneficiario y monto")
      return
    }

    let sinIgv, igv, total
    if (modo === "sin_igv")  { sinIgv = monto; igv = monto * 0.18; total = monto * 1.18 }
    else if (modo === "con_igv") { total = monto; sinIgv = monto / 1.18; igv = monto - sinIgv }
    else { sinIgv = monto; igv = 0; total = monto }

    const { error } = await db.from("solicitudes_pago").insert({
      orden_id: ordenActual.id,
      concepto_id: parseInt(concId),
      concepto_nombre: nombre,
      beneficiario: benef, moneda,
      monto_sin_igv: sinIgv, igv,
      monto_total: total,
      aplica_igv: modo !== "exento",
      sustento, estado: "pedido",
      creado_por: usuarioActual.id
    })

    if (error) { alert("Error: " + error.message); return }
    formWrap.classList.remove("visible")
    await cargarFinanzas(ordenActual.id)
  })

  if (!solicitudes.length) {
    const empty = document.createElement("div")
    empty.style.cssText = "text-align:center;padding:32px;color:#9ca3af;font-size:12px"
    empty.textContent = "Sin solicitudes de pago"
    cont.appendChild(empty)
    return
  }

  solicitudes.forEach(s => {
    const card = document.createElement("div")
    card.style.cssText = "background:#fff;border:1px solid #eef0f6;border-radius:12px;padding:16px;margin-bottom:10px"
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-size:13px;font-weight:600;color:#111827">${s.concepto_nombre}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">${s.beneficiario} · ${s.moneda}</div>
          ${s.sustento ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">${s.sustento}</div>` : ""}
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:700;color:#111827">$${parseFloat(s.monto_total).toFixed(2)}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">IGV: $${parseFloat(s.igv || 0).toFixed(2)}</div>
          <span class="pill pill-${s.estado}" style="margin-top:6px;display:inline-block">${s.estado}</span>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        ${s.estado === "pedido"    ? `<button class="btn btn-secondary btn-xs btn-aprobar" data-id="${s.id}">Aprobar</button>` : ""}
        ${s.estado === "aprobado"  ? `<button class="btn btn-primary btn-xs btn-pagar" data-id="${s.id}">Marcar pagado</button>` : ""}
        ${s.estado === "pagado"    ? `<span style="font-size:11px;color:#9ca3af">Pagado · convertido a costo</span>` : ""}
      </div>
    `

    const btnAprobar = card.querySelector(".btn-aprobar")
    const btnPagar   = card.querySelector(".btn-pagar")

    if (btnAprobar) {
      btnAprobar.addEventListener("click", async () => {
        await db.from("solicitudes_pago")
          .update({ estado: "aprobado", aprobado_por: usuarioActual.id, fecha_aprobacion: new Date().toISOString() })
          .eq("id", s.id)
        await cargarFinanzas(ordenActual.id)
      })
    }

    if (btnPagar) {
  btnPagar.addEventListener("click", async () => {
    // Modal de confirmación con adjunto
    const overlay = document.createElement("div")
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center"

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
        <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">Confirmar pago</div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">${s.concepto_nombre} · ${s.moneda} ${parseFloat(s.monto_total).toFixed(2)}</div>

        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-group">
            <label class="form-label">Número de comprobante *</label>
            <input class="form-input" type="text" id="pago-nro-comp" placeholder="F001-00123" />
          </div>

          <div style="border:2px dashed #e5e7eb;border-radius:8px;padding:14px;text-align:center;cursor:pointer" id="pago-upload-zone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="margin:0 auto;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Adjuntar comprobante de pago</div>
            <div id="pago-filename" style="font-size:10px;color:#7c3aed;margin-top:3px;display:none"></div>
            <input type="file" id="pago-archivo" style="display:none" accept=".pdf,.jpg,.jpeg,.png" />
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;font-size:11px;color:#166534">
            Al confirmar: el pago se registrará como costo y se notificará al solicitante.
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:20px">
          <button id="pago-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
          <button id="pago-confirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Confirmar pago</button>
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    document.getElementById("pago-upload-zone").addEventListener("click", () => {
      document.getElementById("pago-archivo").click()
    })

    document.getElementById("pago-archivo").addEventListener("change", function() {
      if (this.files[0]) {
        document.getElementById("pago-filename").textContent = this.files[0].name
        document.getElementById("pago-filename").style.display = "block"
      }
    })

    document.getElementById("pago-cancelar").addEventListener("click", () => {
      document.body.removeChild(overlay)
    })

    document.getElementById("pago-confirmar").addEventListener("click", async () => {
      const nroComp = document.getElementById("pago-nro-comp").value.trim()
      const archivo = document.getElementById("pago-archivo").files[0]

      if (!nroComp) { alert("Ingresa el número de comprobante"); return }

      let urlComp = null
      if (archivo) {
        const ext  = archivo.name.split(".").pop()
        const path = `comprobantes/${ordenActual.id}/${s.id}_${Date.now()}.${ext}`
        const { error: upErr } = await db.storage.from("documentos").upload(path, archivo)
        if (!upErr) {
          const { data: urlData } = db.storage.from("documentos").getPublicUrl(path)
          urlComp = urlData.publicUrl
        }
      }

      // Marcar solicitud como pagada
      await db.from("solicitudes_pago").update({
        estado:               "pagado",
        fecha_pago:           new Date().toISOString(),
        numero_comprobante:   nroComp,
        convertido_a_costo:   true
      }).eq("id", s.id)

      // Generar costo automáticamente
      const { data: costoGenerado, error: errCosto } = await db.from("costos_orden").insert({
        orden_id:       ordenActual.id,
        concepto:       s.concepto_nombre,
        concepto_id:    s.concepto_id || null,
        tipo:           "solicitud_pago",
        moneda:         s.moneda,
        monto_sin_igv:  parseFloat(s.monto_sin_igv),
        igv:            parseFloat(s.igv || 0),
        monto:          parseFloat(s.monto_total),
        aplica_igv:     s.aplica_igv,
        pagado:         true,
        observaciones:  `Beneficiario: ${s.beneficiario} · Comp: ${nroComp}`
      }).select().single()

      if (errCosto) {
        alert("Error al generar costo: " + errCosto.message)
        document.body.removeChild(overlay)
        return
      }

      // Vincular costo a la solicitud
      await db.from("solicitudes_pago").update({
        costo_id: costoGenerado.id
      }).eq("id", s.id)

      // Subir comprobante como documento de la orden
      if (urlComp) {
        await db.from("documentos_orden").insert({
          orden_id:         ordenActual.id,
          tipo_documento:   "Comprobante pago",
          numero_documento: nroComp,
          nombre_archivo:   archivo.name,
          url_storage:      urlComp,
          estado:           "cargado",
          subido_por:       usuarioActual.id
        })
      }

      document.body.removeChild(overlay)
      await cargarFinanzas(ordenActual.id)
      alert(`✓ Pago registrado. Costo generado correctamente.`)
    })
  })
}

    cont.appendChild(card)
  })
}

// ─────────────────────────────────────────────
// LIQUIDACIÓN DE ORDEN
// ─────────────────────────────────────────────
function renderLiquidacion(comprobantes, costos) {
  const cont = document.getElementById("tab-content")
  cont.innerHTML = ""

  const totalIngresos = comprobantes.reduce((s,c) => s + parseFloat(c.total || 0), 0)
  const totalCostos   = costos.reduce((s,c) => s + parseFloat(c.monto || 0), 0)
  const profit        = totalIngresos - totalCostos

  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;color:#111827">Liquidación de orden ${ordenActual.numero}</div>
      <button class="btn btn-secondary btn-sm" onclick="window.print()">Imprimir</button>
    </div>

    <div style="border:1px solid #eef0f6;border-radius:12px;overflow:hidden;margin-bottom:16px">
      <div style="background:#1e1b4b;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff">${ordenActual.numero}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">${ordenActual.origen || "—"} → ${ordenActual.destino || "—"}</div>
        </div>
        <span class="pill pill-${ordenActual.tipo}" style="font-size:11px">${ordenActual.tipo}</span>
      </div>

      <div style="padding:20px">
        <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Ingresos</div>
        ${comprobantes.length ? `
          <table style="margin-bottom:16px">
            <thead><tr><th>TIPO</th><th>SERIE</th><th>SIN IGV</th><th>IGV</th><th>TOTAL</th></tr></thead>
            <tbody>
              ${comprobantes.map(c => `
                <tr>
                  <td style="font-weight:500">${c.tipo}</td>
                  <td class="text-muted text-sm">${c.serie_numero || "—"}</td>
                  <td class="text-sm">${c.moneda} ${parseFloat(c.monto_sin_igv || c.subtotal || 0).toFixed(2)}</td>
                  <td class="text-sm text-muted">${c.moneda} ${parseFloat(c.igv || 0).toFixed(2)}</td>
                  <td style="font-weight:700;color:#059669">${c.moneda} ${parseFloat(c.total || 0).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div style="color:#9ca3af;font-size:12px;padding:8px 0 16px">Sin ingresos</div>`}

        <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Costos</div>
        ${costos.length ? `
          <table style="margin-bottom:16px">
            <thead><tr><th>CONCEPTO</th><th>TIPO</th><th>SIN IGV</th><th>IGV</th><th>TOTAL</th></tr></thead>
            <tbody>
              ${costos.map(c => `
                <tr>
                  <td style="font-weight:500">${c.concepto || "—"}</td>
                  <td class="text-muted text-sm">${c.tipo || "—"}</td>
                  <td class="text-sm">${c.moneda} ${parseFloat(c.monto_sin_igv || 0).toFixed(2)}</td>
                  <td class="text-sm text-muted">${c.moneda} ${parseFloat(c.igv || 0).toFixed(2)}</td>
                  <td style="font-weight:700;color:#374151">${c.moneda} ${parseFloat(c.monto || 0).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div style="color:#9ca3af;font-size:12px;padding:8px 0 16px">Sin costos</div>`}

        <div style="border-top:2px solid #eef0f6;padding-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          <div style="text-align:center;padding:16px;background:#f9fafb;border-radius:10px">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">Total ingresos</div>
            <div style="font-size:20px;font-weight:700;color:#059669">$${totalIngresos.toFixed(2)}</div>
          </div>
          <div style="text-align:center;padding:16px;background:#f9fafb;border-radius:10px">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">Total costos</div>
            <div style="font-size:20px;font-weight:700;color:#374151">$${totalCostos.toFixed(2)}</div>
          </div>
          <div style="text-align:center;padding:16px;background:${profit >= 0 ? "#ecfdf5" : "#fef2f2"};border-radius:10px;border:1px solid ${profit >= 0 ? "#a7f3d0" : "#fecaca"}">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">Profit</div>
            <div style="font-size:20px;font-weight:700;color:${profit >= 0 ? "#059669" : "#dc2626"}">$${profit.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
document.querySelectorAll(".fin-tab").forEach(tab => {
  tab.addEventListener("click", async function() {
    tabActiva = this.dataset.tab
    if (ordenActual) await cargarFinanzas(ordenActual.id)
  })
})

document.getElementById("selector-orden").addEventListener("change", async function() {
  if (!this.value) {
    document.getElementById("panel-finanzas").classList.add("hidden")
    document.getElementById("panel-vacio").classList.remove("hidden")
    ordenActual = null
    return
  }
  await cargarFinanzas(this.value)
})

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
Promise.all([cargarConceptos(), cargarSelector()])