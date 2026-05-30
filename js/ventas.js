const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let todasLasCotizaciones = []
let itemsActuales        = []
let conceptosCatalogo    = []
let cotizacionEditando   = null
let accionEstadoPendiente = null

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
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
  await Promise.all([cargarConceptos(), cargarClientesSelect(), cargarCotizaciones()])
}

async function cargarConceptos() {
  const { data } = await db.from("conceptos_catalogo").select("*").eq("activo", true).order("tipo").order("nombre")
  conceptosCatalogo = data || []
}

async function cargarClientesSelect() {
  const { data } = await db.from("clientes").select("id,razon_social").eq("activo", true).order("razon_social")
  if (!data) return

  const selectModal   = document.getElementById("cot-cliente")
  const selectFiltro  = document.getElementById("filtro-cliente")

  selectModal.innerHTML  = `<option value="">Selecciona un cliente *</option>`
  selectFiltro.innerHTML = `<option value="TODOS">Todos los clientes</option>`

  data.forEach(c => {
    selectModal.innerHTML  += `<option value="${c.id}">${c.razon_social}</option>`
    selectFiltro.innerHTML += `<option value="${c.id}">${c.razon_social}</option>`
  })
}

async function cargarCotizaciones() {
  const { data, error } = await db
    .from("cotizaciones")
    .select("*, clientes(id, razon_social)")
    .eq("activo", true)
    .order("created_at", { ascending: false })

  if (error) return
  todasLasCotizaciones = data
  filtrarYMostrar()
}

// ─────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────
function filtrarYMostrar() {
  const busqueda   = document.getElementById("filtro-busqueda").value.toLowerCase()
  const estado     = document.getElementById("filtro-estado").value
  const clienteId  = document.getElementById("filtro-cliente").value
  const fechaDesde = document.getElementById("filtro-fecha-desde").value
  const fechaHasta = document.getElementById("filtro-fecha-hasta").value

  const filtradas = todasLasCotizaciones.filter(c => {
    const num     = c.numero?.toLowerCase() || ""
    const cliente = c.clientes?.razon_social?.toLowerCase() || ""
    const fecha   = c.created_at?.split("T")[0] || ""

    if (estado !== "TODOS"  && c.estado !== estado) return false
    if (clienteId !== "TODOS" && String(c.cliente_id) !== clienteId) return false
    if (fechaDesde && fecha < fechaDesde) return false
    if (fechaHasta && fecha > fechaHasta) return false
    if (busqueda && !num.includes(busqueda) && !cliente.includes(busqueda)) return false
    return true
  })

  renderTabla(filtradas)
}

document.getElementById("filtro-busqueda").addEventListener("input", filtrarYMostrar)
document.getElementById("filtro-estado").addEventListener("change", filtrarYMostrar)
document.getElementById("filtro-cliente").addEventListener("change", filtrarYMostrar)
document.getElementById("filtro-fecha-desde").addEventListener("change", filtrarYMostrar)
document.getElementById("filtro-fecha-hasta").addEventListener("change", filtrarYMostrar)
document.getElementById("btn-limpiar-filtros").addEventListener("click", () => {
  document.getElementById("filtro-busqueda").value    = ""
  document.getElementById("filtro-estado").value      = "TODOS"
  document.getElementById("filtro-cliente").value     = "TODOS"
  document.getElementById("filtro-fecha-desde").value = ""
  document.getElementById("filtro-fecha-hasta").value = ""
  filtrarYMostrar()
})

// ─────────────────────────────────────────────
// RENDER TABLA
// ─────────────────────────────────────────────
function renderTabla(cotizaciones) {
  const tbody = document.getElementById("tbody-cotizaciones")
  tbody.innerHTML = ""
  document.getElementById("contador").textContent = cotizaciones.length

  if (!cotizaciones.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#9ca3af;padding:32px">Sin cotizaciones</td></tr>`
    return
  }

  cotizaciones.forEach(cot => {
    const cliente = cot.clientes?.razon_social || "Sin cliente"
    const fecha   = new Date(cot.created_at).toLocaleDateString("es-PE")
    const bloq    = cot.bloqueado || cot.estado === "aprobada" || cot.estado === "rechazada"
    const fila    = document.createElement("tr")

    // Botones según estado
    let botonesEstado = ""
    if (cot.estado === "borrador") {
      botonesEstado = `<button class="btn btn-secondary btn-xs btn-enviar" data-id="${cot.id}">Enviar</button>`
    } else if (cot.estado === "enviada") {
      botonesEstado = `
        <button class="btn btn-primary btn-xs btn-aprobar" data-id="${cot.id}">Aprobar</button>
        <button class="btn btn-danger btn-xs btn-rechazar" data-id="${cot.id}">Rechazar</button>
      `
    }

    fila.innerHTML = `
      <td><span class="orden-id">${cot.numero || "—"}</span></td>
      <td style="font-size:12px;font-weight:500;color:#111827">${cliente}</td>
      <td class="text-sm text-muted">${cot.moneda}</td>
      <td class="text-sm">${cot.moneda} ${parseFloat(cot.subtotal || 0).toFixed(2)}</td>
      <td class="text-sm text-muted">${cot.moneda} ${parseFloat(cot.igv || 0).toFixed(2)}</td>
      <td style="font-weight:700;color:#111827">${cot.moneda} ${parseFloat(cot.total || 0).toFixed(2)}</td>
      <td><span class="pill pill-${cot.estado}">${cot.estado}</span></td>
      <td class="text-sm text-muted">${fecha}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${!bloq ? `<button class="btn btn-secondary btn-xs btn-editar" data-id="${cot.id}">Editar</button>` : ""}
          ${botonesEstado}
          <button class="btn btn-secondary btn-xs btn-pdf" data-id="${cot.id}">PDF</button>
          ${!bloq ? `<button class="btn btn-danger btn-xs btn-anular" data-id="${cot.id}">Anular</button>` : ""}
        </div>
      </td>
    `

    // Eventos
    fila.querySelector(".btn-pdf")?.addEventListener("click", () => generarPDF(cot))
    fila.querySelector(".btn-editar")?.addEventListener("click", () => abrirModalEditar(cot))
    fila.querySelector(".btn-enviar")?.addEventListener("click", () => cambiarEstado(cot, "enviada"))
    fila.querySelector(".btn-aprobar")?.addEventListener("click", () => cambiarEstado(cot, "aprobada"))
    fila.querySelector(".btn-rechazar")?.addEventListener("click", () => cambiarEstado(cot, "rechazada"))
    fila.querySelector(".btn-anular")?.addEventListener("click", () => anularCotizacion(cot))

    tbody.appendChild(fila)
  })
}

// ─────────────────────────────────────────────
// MODAL COTIZACIÓN
// ─────────────────────────────────────────────
function abrirModalNuevo() {
  cotizacionEditando = null
  itemsActuales      = []
  document.getElementById("modal-cot-titulo").textContent  = "Nueva cotización"
  document.getElementById("modal-cot-numero").textContent  = "El número se generará automáticamente"
  document.getElementById("cot-cliente").value             = ""
  document.getElementById("cot-moneda").value              = "USD"
  document.getElementById("cot-validez").value             = ""
  document.getElementById("cot-lugar").value               = ""
  document.getElementById("cot-tiempo").value              = ""
  document.getElementById("cot-observaciones").value       = ""
  document.getElementById("cot-condiciones").value         = ""
  renderItems()
  document.getElementById("modal-cotizacion").classList.add("visible")
}

async function abrirModalEditar(cot) {
  cotizacionEditando = cot

  // Verificar si está en estado "enviada" — requiere confirmación
  if (cot.estado === "enviada") {
    const ok = confirm(`Esta cotización está en estado "Enviada". ¿Deseas editarla? El cliente ya la recibió.`)
    if (!ok) return
  }

  document.getElementById("modal-cot-titulo").textContent = "Editar cotización"
  document.getElementById("modal-cot-numero").textContent = `Número: ${cot.numero}`
  document.getElementById("cot-cliente").value            = cot.cliente_id || ""
  document.getElementById("cot-moneda").value             = cot.moneda || "USD"
  document.getElementById("cot-validez").value            = cot.fecha_validez || ""
  document.getElementById("cot-lugar").value              = cot.lugar_entrega || ""
  document.getElementById("cot-tiempo").value             = cot.tiempo_entrega || ""
  document.getElementById("cot-observaciones").value      = cot.observaciones || ""
  document.getElementById("cot-condiciones").value        = cot.condiciones || ""

  // Cargar items existentes
  const { data: items } = await db
    .from("cotizacion_items").select("*").eq("cotizacion_id", cot.id).order("id")

  itemsActuales = (items || []).map(i => ({
    id:            i.id,
    concepto_id:   i.concepto_id || "",
    concepto_nombre: i.concepto || "",
    tipo:          i.tipo_servicio || "",
    cantidad:      i.cantidad || 1,
    precio:        parseFloat(i.precio_unitario || 0),
    total:         parseFloat(i.total || 0),
    descripcion:   i.descripcion || "",
    unidad:        i.unidad || "Servicio"
  }))

  renderItems()
  document.getElementById("modal-cotizacion").classList.add("visible")
}

document.getElementById("btn-nueva-cot").addEventListener("click", abrirModalNuevo)
document.getElementById("modal-cot-cancelar").addEventListener("click", () => {
  document.getElementById("modal-cotizacion").classList.remove("visible")
})

// ─────────────────────────────────────────────
// ITEMS CON MAESTRO DE CONCEPTOS
// ─────────────────────────────────────────────
function agregarItem() {
  itemsActuales.push({ concepto_id:"", concepto_nombre:"", tipo:"", cantidad:1, precio:0, total:0, descripcion:"", unidad:"Servicio" })
  renderItems()
}

function renderItems() {
  const cont    = document.getElementById("items-cotizacion")
  const moneda  = document.getElementById("cot-moneda").value
  cont.innerHTML = ""

  if (!itemsActuales.length) {
    cont.innerHTML = `<div style="text-align:center;padding:20px;color:#d1d5db;font-size:12px;border:2px dashed #f3f4f6;border-radius:8px">Agrega al menos un servicio</div>`
    actualizarTotales()
    return
  }

  itemsActuales.forEach((item, index) => {
    const div = document.createElement("div")
    div.style.cssText = "display:grid;grid-template-columns:2fr 1fr 100px 110px 90px 32px;gap:8px;align-items:end;padding:12px;background:#fafafa;border:1px solid #f3f4f6;border-radius:10px;margin-bottom:8px"

    const opcionesConcepto = conceptosCatalogo.map(c =>
      `<option value="${c.id}" data-nombre="${c.nombre}" data-tipo="${c.tipo}" ${item.concepto_id == c.id ? "selected" : ""}>${c.nombre}</option>`
    ).join("")

    div.innerHTML = `
      <div>
        <div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px">CONCEPTO *</div>
        <select class="form-input sel-concepto" style="font-size:12px;padding:7px 10px">
          <option value="">Selecciona concepto...</option>
          ${opcionesConcepto}
        </select>
        <input class="form-input inp-desc" type="text" placeholder="Descripción adicional (opcional)" value="${item.descripcion}" style="font-size:11px;padding:5px 8px;margin-top:4px;color:#6b7280" />
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px">UNIDAD</div>
        <select class="form-input sel-unidad" style="font-size:12px;padding:7px 10px">
          <option ${item.unidad==="Servicio" ? "selected":""}>Servicio</option>
          <option ${item.unidad==="Bulto" ? "selected":""}>Bulto</option>
          <option ${item.unidad==="Kg" ? "selected":""}>Kg</option>
          <option ${item.unidad==="m3" ? "selected":""}>m3</option>
          <option ${item.unidad==="Contenedor" ? "selected":""}>Contenedor</option>
          <option ${item.unidad==="Global" ? "selected":""}>Global</option>
        </select>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px">CANT.</div>
        <input class="form-input inp-cantidad" type="number" min="1" value="${item.cantidad}" style="font-size:12px;padding:7px 10px" />
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px">PRECIO UNIT.</div>
        <input class="form-input inp-precio" type="number" step="0.01" placeholder="0.00" style="font-size:12px;padding:7px 10px" />
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px">TOTAL</div>
        <div class="item-total-val" style="font-size:13px;font-weight:700;color:#7c3aed;padding:7px 0">${moneda} ${item.total.toFixed(2)}</div>
      </div>
      <div style="padding-bottom:2px">
        <button class="btn btn-danger btn-xs btn-quitar" style="width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center">×</button>
      </div>
    `

    const selConcepto = div.querySelector(".sel-concepto")
    const inpPrecio   = div.querySelector(".inp-precio")
    const inpCantidad = div.querySelector(".inp-cantidad")
    const inpDesc     = div.querySelector(".inp-desc")
    const selUnidad   = div.querySelector(".sel-unidad")

    if (item.precio > 0) inpPrecio.value = item.precio

    selConcepto.addEventListener("change", function() {
      const opt = this.options[this.selectedIndex]
      itemsActuales[index].concepto_id    = this.value
      itemsActuales[index].concepto_nombre = opt.dataset.nombre || ""
      itemsActuales[index].tipo           = opt.dataset.tipo   || ""
    })

    inpDesc.addEventListener("input", e => { itemsActuales[index].descripcion = e.target.value })
    selUnidad.addEventListener("change", e => { itemsActuales[index].unidad = e.target.value })

    inpCantidad.addEventListener("input", () => {
      itemsActuales[index].cantidad = parseInt(inpCantidad.value) || 1
      recalcularItem(index, div)
    })

    inpPrecio.addEventListener("input", () => {
      itemsActuales[index].precio = parseFloat(inpPrecio.value) || 0
      recalcularItem(index, div)
    })

    div.querySelector(".btn-quitar").addEventListener("click", () => {
      itemsActuales.splice(index, 1)
      renderItems()
    })

    cont.appendChild(div)
  })

  actualizarTotales()
}

function recalcularItem(index, div) {
  const item  = itemsActuales[index]
  const moneda = document.getElementById("cot-moneda").value
  item.total  = item.precio * item.cantidad
  div.querySelector(".item-total-val").textContent = `${moneda} ${item.total.toFixed(2)}`
  actualizarTotales()
}

function actualizarTotales() {
  const moneda   = document.getElementById("cot-moneda").value
  const subtotal = itemsActuales.reduce((s,i) => s + i.total, 0)
  const igv      = subtotal * 0.18
  const total    = subtotal + igv

  document.getElementById("cot-subtotal-display").textContent = `${moneda} ${subtotal.toFixed(2)}`
  document.getElementById("cot-igv-display").textContent      = `${moneda} ${igv.toFixed(2)}`
  document.getElementById("cot-total-display").textContent    = `${moneda} ${total.toFixed(2)}`
}

document.getElementById("btn-agregar-item").addEventListener("click", agregarItem)
document.getElementById("cot-moneda").addEventListener("change", () => {
  renderItems()
  actualizarTotales()
})

// ─────────────────────────────────────────────
// GUARDAR COTIZACIÓN
// ─────────────────────────────────────────────
async function guardarCotizacion(estado) {
  const clienteId     = document.getElementById("cot-cliente").value
  const moneda        = document.getElementById("cot-moneda").value
  const validez       = document.getElementById("cot-validez").value
  const lugar         = document.getElementById("cot-lugar").value.trim()
  const tiempo        = document.getElementById("cot-tiempo").value.trim()
  const observaciones = document.getElementById("cot-observaciones").value.trim()
  const condiciones   = document.getElementById("cot-condiciones").value.trim()

  if (!clienteId) { alert("Selecciona un cliente"); return }
  if (!itemsActuales.length) { alert("Agrega al menos un servicio"); return }
  if (itemsActuales.some(i => !i.concepto_id)) { alert("Selecciona el concepto de todos los servicios"); return }
  if (itemsActuales.some(i => i.precio <= 0)) { alert("Todos los servicios deben tener un precio mayor a 0"); return }

  const subtotal = itemsActuales.reduce((s,i) => s + i.total, 0)
  const igv      = subtotal * 0.18
  const total    = subtotal + igv

  const payload = {
    cliente_id:     parseInt(clienteId),
    usuario_id:     usuarioActual.id,
    moneda, subtotal, igv, total,
    observaciones:  observaciones || null,
    condiciones:    condiciones   || null,
    lugar_entrega:  lugar         || null,
    tiempo_entrega: tiempo        || null,
    fecha_validez:  validez       || null,
    estado:         estado || "borrador",
    activo:         true
  }

  let cotId
  let errorGuardado

  if (cotizacionEditando) {
    const { error } = await db.from("cotizaciones").update(payload).eq("id", cotizacionEditando.id)
    errorGuardado = error
    cotId         = cotizacionEditando.id
    if (!error) {
      await db.from("cotizacion_items").delete().eq("cotizacion_id", cotId)
    }
  } else {
    const { data, error } = await db.from("cotizaciones").insert(payload).select().single()
    errorGuardado = error
    cotId         = data?.id
  }

  if (errorGuardado) { alert("Error: " + errorGuardado.message); return }

  const items = itemsActuales.map(i => ({
    cotizacion_id:   cotId,
    concepto:        i.concepto_nombre,
    concepto_id:     i.concepto_id ? parseInt(i.concepto_id) : null,
    tipo_servicio:   i.tipo || "otro",
    cantidad:        i.cantidad,
    precio_unitario: i.precio,
    total:           i.total,
    moneda,
    descripcion:     i.descripcion || null,
    unidad:          i.unidad || "Servicio"
  }))

  const { error: errItems } = await db.from("cotizacion_items").insert(items)
  if (errItems) { alert("Error en items: " + errItems.message); return }

  document.getElementById("modal-cotizacion").classList.remove("visible")
  await cargarCotizaciones()
}

document.getElementById("btn-guardar-borrador").addEventListener("click", () => guardarCotizacion("borrador"))
document.getElementById("btn-guardar-cot").addEventListener("click",      () => guardarCotizacion("borrador"))

// ─────────────────────────────────────────────
// CAMBIO DE ESTADO CON VALIDACIÓN
// ─────────────────────────────────────────────
function cambiarEstado(cot, nuevoEstado) {
  const textos = {
    enviada:   { titulo:"Enviar cotización", desc:`La cotización ${cot.numero} será marcada como enviada al cliente. Los datos del cliente quedarán bloqueados.` },
    aprobada:  { titulo:"Aprobar cotización", desc:`Al aprobar, se generará una orden operativa automáticamente. ¿Confirmas la aprobación de ${cot.numero}?` },
    rechazada: { titulo:"Rechazar cotización", desc:`La cotización ${cot.numero} será marcada como rechazada. Esta acción queda registrada en el historial.` },
  }

  const txt = textos[nuevoEstado]
  document.getElementById("modal-estado-titulo").textContent = txt.titulo
  document.getElementById("modal-estado-desc").textContent   = txt.desc
  document.getElementById("modal-estado-extra").innerHTML    = ""

  if (nuevoEstado === "aprobada") {
    document.getElementById("modal-estado-extra").innerHTML = `
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;color:#7c3aed;margin-bottom:8px">Selecciona el tipo de orden a generar</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${["SEA","AIR","ADU","SLI","TL"].map(t => `
            <label style="display:flex;align-items:center;gap:6px;padding:8px;border:1px solid #e5e7eb;border-radius:7px;cursor:pointer;font-size:12px;font-weight:500">
              <input type="radio" name="tipo-orden-gen" value="${t}" style="accent-color:#7c3aed" />
              <span class="pill pill-${t}" style="font-size:9px">${t}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `
  }

  accionEstadoPendiente = { cot, nuevoEstado }
  document.getElementById("modal-estado").classList.add("visible")
}

document.getElementById("modal-estado-cancelar").addEventListener("click", () => {
  document.getElementById("modal-estado").classList.remove("visible")
  accionEstadoPendiente = null
})

document.getElementById("modal-estado-confirmar").addEventListener("click", async () => {
  if (!accionEstadoPendiente) return
  const { cot, nuevoEstado } = accionEstadoPendiente

  const bloq = nuevoEstado === "enviada" || nuevoEstado === "aprobada" || nuevoEstado === "rechazada"

  await db.from("cotizaciones").update({
    estado:    nuevoEstado,
    bloqueado: bloq
  }).eq("id", cot.id)

  if (nuevoEstado === "aprobada") {
    const tipoSel = document.querySelector("input[name='tipo-orden-gen']:checked")
    const tipo    = tipoSel ? tipoSel.value : "SEA"
    await generarOrdenDesdeCotizacion(cot, tipo)
  }

  document.getElementById("modal-estado").classList.remove("visible")
  accionEstadoPendiente = null
  await cargarCotizaciones()
})

async function anularCotizacion(cot) {
  if (!confirm(`¿Anular la cotización ${cot.numero}? Quedará en el historial con estado anulada.`)) return
  await db.from("cotizaciones").update({ estado:"rechazada", bloqueado:true, activo:false }).eq("id", cot.id)
  await cargarCotizaciones()
}

// ─────────────────────────────────────────────
// GENERAR ORDEN DESDE COTIZACIÓN
// ─────────────────────────────────────────────
async function generarOrdenDesdeCotizacion(cot, tipo) {
  const { data: ultima } = await db
    .from("ordenes").select("numero")
    .like("numero", `${tipo}-%`)
    .order("created_at", { ascending: false })
    .limit(1).single()

  let nuevoNumero = `${tipo}-000001`
  if (ultima) {
    const partes      = ultima.numero.split("-")
    const correlativo = parseInt(partes[partes.length - 1]) + 1
    nuevoNumero       = `${tipo}-${String(correlativo).padStart(6,"0")}`
  }

  const { data: nuevaOrden, error } = await db
    .from("ordenes")
    .insert({
      numero:        nuevoNumero,
      tipo,
      cliente_id:    cot.cliente_id,
      cotizacion_id: cot.id,
      estado:        "creada",
      observaciones: `Generada desde cotización ${cot.numero}`,
      activo:        true
    })
    .select().single()

  if (error) { alert("Error al crear orden: " + error.message); return }
  alert(`✓ Orden ${nuevaOrden.numero} creada exitosamente desde ${cot.numero}`)
}

// ─────────────────────────────────────────────
// GENERACIÓN DE PDF PROFESIONAL
// ─────────────────────────────────────────────
async function generarPDF(cot) {
  const { jsPDF } = window.jspdf

  const { data: cliente } = await db
    .from("clientes").select("*").eq("id", cot.cliente_id).single()

  const { data: items } = await db
    .from("cotizacion_items").select("*").eq("cotizacion_id", cot.id).order("id")

  const doc   = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" })
  const W     = 210
  const margen = 15
  let   y     = margen

  // ── Paleta
  const morado = [124, 58, 237]
  const oscuro  = [30, 27, 75]
  const gris    = [107, 114, 128]
  const claro   = [249, 250, 251]
  const negro   = [17, 24, 39]

  // ── HEADER
  doc.setFillColor(...oscuro)
  doc.rect(0, 0, W, 36, "F")

  doc.setFont("helvetica","bold")
  doc.setFontSize(20)
  doc.setTextColor(255,255,255)
  doc.text("MarsTech", margen, 16)

  doc.setFont("helvetica","normal")
  doc.setFontSize(8)
  doc.setTextColor(200, 200, 220)
  doc.text("LOGISTICS PLATFORM · v2.0", margen, 22)
  doc.text("RUC: 20XXXXXXXXXX · Av. Principal 123, Lima, Perú", margen, 27)
  doc.text("contacto@marstech.pe · +51 01 XXX-XXXX", margen, 32)

  // Número cotización (derecha)
  doc.setFont("helvetica","bold")
  doc.setFontSize(14)
  doc.setTextColor(255,255,255)
  doc.text(cot.numero || "—", W - margen, 16, { align:"right" })
  doc.setFont("helvetica","normal")
  doc.setFontSize(8)
  doc.setTextColor(200,200,220)
  doc.text("COTIZACIÓN", W - margen, 22, { align:"right" })
  doc.text(`Fecha: ${new Date(cot.created_at).toLocaleDateString("es-PE")}`, W - margen, 27, { align:"right" })
  if (cot.fecha_validez) doc.text(`Válida hasta: ${cot.fecha_validez}`, W - margen, 32, { align:"right" })

  y = 44

  // ── DATOS CLIENTE Y CONDICIONES
  const colW = (W - margen * 2 - 8) / 2

  // Caja cliente
  doc.setFillColor(...claro)
  doc.setDrawColor(230,230,240)
  doc.roundedRect(margen, y, colW, 36, 3, 3, "FD")

  doc.setFont("helvetica","bold")
  doc.setFontSize(7)
  doc.setTextColor(...morado)
  doc.text("CLIENTE", margen + 4, y + 6)

  doc.setFont("helvetica","bold")
  doc.setFontSize(10)
  doc.setTextColor(...negro)
  doc.text(cliente?.razon_social || "—", margen + 4, y + 13)

  doc.setFont("helvetica","normal")
  doc.setFontSize(8)
  doc.setTextColor(...gris)
  doc.text(`RUC: ${cliente?.ruc || "—"}`, margen + 4, y + 19)
  if (cliente?.contacto) doc.text(`Contacto: ${cliente.contacto}`, margen + 4, y + 24)
  if (cliente?.direccion) doc.text(cliente.direccion.substring(0,50), margen + 4, y + 29)

  // Caja condiciones
  const cx = margen + colW + 8
  doc.setFillColor(...claro)
  doc.roundedRect(cx, y, colW, 36, 3, 3, "FD")

  doc.setFont("helvetica","bold")
  doc.setFontSize(7)
  doc.setTextColor(...morado)
  doc.text("CONDICIONES", cx + 4, y + 6)

  doc.setFont("helvetica","normal")
  doc.setFontSize(8)
  doc.setTextColor(...gris)
  let yc = y + 13
  if (cot.lugar_entrega)  { doc.text(`Lugar entrega: ${cot.lugar_entrega}`,  cx + 4, yc); yc += 5 }
  if (cot.tiempo_entrega) { doc.text(`Tiempo estimado: ${cot.tiempo_entrega}`, cx + 4, yc); yc += 5 }
  if (cot.condiciones)    { doc.text(`Pago: ${cot.condiciones.substring(0,40)}`, cx + 4, yc); yc += 5 }
  doc.text(`Moneda: ${cot.moneda}`, cx + 4, yc)

  y += 44

  // ── DESCRIPCIÓN DEL SERVICIO
  if (cot.observaciones) {
    doc.setFillColor(...claro)
    doc.roundedRect(margen, y, W - margen*2, 14, 3, 3, "FD")
    doc.setFont("helvetica","bold")
    doc.setFontSize(7)
    doc.setTextColor(...morado)
    doc.text("ALCANCE DEL SERVICIO", margen + 4, y + 5)
    doc.setFont("helvetica","normal")
    doc.setFontSize(8)
    doc.setTextColor(...gris)
    doc.text(cot.observaciones.substring(0,120), margen + 4, y + 10)
    y += 18
  }

  // ── TABLA DE SERVICIOS
  doc.setFont("helvetica","bold")
  doc.setFontSize(7)
  doc.setTextColor(...morado)
  doc.text("SERVICIOS COTIZADOS", margen, y + 6)
  y += 8

  const tableData = (items || []).map((item, i) => [
    (i + 1).toString(),
    item.concepto || "—",
    item.descripcion || "",
    item.unidad || "Servicio",
    item.cantidad?.toString() || "1",
    `${cot.moneda} ${parseFloat(item.precio_unitario || 0).toFixed(2)}`,
    `${cot.moneda} ${parseFloat(item.total || 0).toFixed(2)}`
  ])

  doc.autoTable({
    startY: y,
    head:   [["#", "Concepto", "Descripción", "Unidad", "Cant.", "Precio unit.", "Total"]],
    body:   tableData,
    margin: { left: margen, right: margen },
    styles: {
      fontSize:  8,
      cellPadding: 3,
      textColor: negro,
      lineColor: [230,230,240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor:  oscuro,
      textColor:  [255,255,255],
      fontStyle:  "bold",
      fontSize:   7.5,
    },
    alternateRowStyles: { fillColor: claro },
    columnStyles: {
      0: { cellWidth:8,  halign:"center" },
      3: { cellWidth:22, halign:"center" },
      4: { cellWidth:14, halign:"center" },
      5: { cellWidth:28, halign:"right"  },
      6: { cellWidth:28, halign:"right", fontStyle:"bold" },
    },
  })

  y = doc.lastAutoTable.finalY + 6

  // ── TOTALES
  const subtotal = parseFloat(cot.subtotal || 0)
  const igv      = parseFloat(cot.igv      || 0)
  const total    = parseFloat(cot.total    || 0)
  const boxX     = W - margen - 70

  doc.setFillColor(...claro)
  doc.roundedRect(boxX, y, 70, 30, 3, 3, "F")

  doc.setFont("helvetica","normal")
  doc.setFontSize(8)
  doc.setTextColor(...gris)
  doc.text("Subtotal:", boxX + 4, y + 8)
  doc.text(`IGV (18%):`, boxX + 4, y + 15)

  doc.setTextColor(...negro)
  doc.text(`${cot.moneda} ${subtotal.toFixed(2)}`, boxX + 66, y + 8,  { align:"right" })
  doc.text(`${cot.moneda} ${igv.toFixed(2)}`,      boxX + 66, y + 15, { align:"right" })

  doc.setFillColor(...morado)
  doc.roundedRect(boxX, y + 20, 70, 12, 3, 3, "F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(9)
  doc.setTextColor(255,255,255)
  doc.text("TOTAL:", boxX + 4, y + 28)
  doc.text(`${cot.moneda} ${total.toFixed(2)}`, boxX + 66, y + 28, { align:"right" })

  y += 40

  // ── NOTAS FINALES
  if (y > 240) { doc.addPage(); y = margen }

  doc.setDrawColor(...morado)
  doc.setLineWidth(0.5)
  doc.line(margen, y, W - margen, y)
  y += 6

  doc.setFont("helvetica","bold")
  doc.setFontSize(7)
  doc.setTextColor(...morado)
  doc.text("NOTAS Y CONDICIONES GENERALES", margen, y)
  y += 5

  const notas = [
    "• Los precios indicados son referenciales y están sujetos a confirmación según disponibilidad.",
    "• Esta cotización tiene validez según la fecha indicada.",
    "• Los impuestos de importación, aranceles y tributos aduaneros no están incluidos salvo indicación.",
    "• Para aceptar esta cotización, sírvase responder por escrito a contacto@marstech.pe",
  ]

  doc.setFont("helvetica","normal")
  doc.setFontSize(7)
  doc.setTextColor(...gris)
  notas.forEach(nota => { doc.text(nota, margen, y); y += 4 })

  // ── FIRMA
  y += 6
  doc.setFont("helvetica","bold")
  doc.setFontSize(8)
  doc.setTextColor(...negro)
  doc.text("_________________________", margen, y + 10)
  doc.text("MarsTech Logistics", margen, y + 15)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...gris)
  doc.text("Representante Comercial", margen, y + 19)

  // ── FOOTER
  const totalPags = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPags; p++) {
    doc.setPage(p)
    doc.setFillColor(...oscuro)
    doc.rect(0, 287, W, 10, "F")
    doc.setFont("helvetica","normal")
    doc.setFontSize(6.5)
    doc.setTextColor(180,180,200)
    doc.text("MarsTech Logistics Platform · www.marstech.pe · contacto@marstech.pe", margen, 293)
    doc.text(`Pág. ${p} de ${totalPags}`, W - margen, 293, { align:"right" })
  }

  doc.save(`${cot.numero || "cotizacion"}.pdf`)
}

// ─────────────────────────────────────────────
// CERRAR SESIÓN
// ─────────────────────────────────────────────
async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarTodo()