const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

const params   = new URLSearchParams(window.location.search)
const ordenId  = params.get("id")
if (!ordenId) window.location.href = "ordenes.html"

let ordenActual    = null
let modoEdicion    = false
let tabActiva      = "general"
let hitoSeleccionado = null

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function inicializarUI() {
  const nombre   = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent    = nombre
  document.getElementById("sb-rol").textContent       = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent     = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

async function cargarOrden() {
  const { data: orden, error } = await db
    .from("ordenes")
    .select("*, clientes(id, razon_social, ruc)")
    .eq("id", ordenId)
    .single()

  if (error || !orden) { window.location.href = "ordenes.html"; return }

  ordenActual = orden
  document.getElementById("loading").classList.add("hidden")
  document.getElementById("orden-content").classList.remove("hidden")

  renderHeader(orden)
  renderExpediente(orden)
  await renderTabActivo()
}

function renderHeader(o) {
  document.title = `MarsTech — ${o.numero}`
  document.getElementById("topbar-numero").textContent    = o.numero
  document.getElementById("topbar-tipo").textContent      = o.tipo
  document.getElementById("topbar-tipo").className        = `pill pill-${o.tipo}`
  document.getElementById("topbar-estado").textContent    = o.estado.replace(/_/g," ")
  document.getElementById("topbar-estado").className      = `pill pill-${o.estado}`
  document.getElementById("select-estado").value          = o.estado
  document.getElementById("orden-numero").textContent     = o.numero
  document.getElementById("orden-tipo-badge").textContent = o.tipo
  document.getElementById("orden-tipo-badge").className   = `pill pill-${o.tipo}`
  document.getElementById("orden-cliente-nombre").textContent =
    o.clientes ? `${o.clientes.razon_social} · ${o.clientes.ruc}` : "Sin cliente"
  document.getElementById("orden-ruta").textContent =
    `${o.origen || "—"} → ${o.destino || "—"}`
  document.getElementById("orden-fecha-creacion").textContent =
    `Creada: ${new Date(o.created_at).toLocaleDateString("es-PE")}`

  // Mostrar tabs de carga y stock solo para SEA y AIR
  if (["SEA","AIR"].includes(o.tipo)) {
    document.getElementById("tab-btn-carga").style.display = "block"
    document.getElementById("tab-btn-stock").style.display = "block"
  }
}

async function renderExpediente(o) {
  if (!o.expediente_id) return
  const banner = document.getElementById("expediente-banner")
  banner.style.display = "flex"
  document.getElementById("exp-id").textContent = o.expediente_id

  if (o.orden_carga_id) {
    const { data: carga } = await db.from("ordenes").select("numero,tipo,estado").eq("id", o.orden_carga_id).single()
    if (carga) document.getElementById("exp-carga").textContent = carga.numero
  } else {
    document.getElementById("exp-carga").textContent = o.numero
  }

  const { data: ordenes } = await db.from("ordenes").select("numero,tipo,estado").eq("expediente_id", o.expediente_id)
  if (ordenes) {
    const adus = ordenes.filter(x => ["ADU","SLI"].includes(x.tipo))
    const tls  = ordenes.filter(x => x.tipo === "TL")
    document.getElementById("exp-aduana").textContent = adus.length ? adus.map(x => x.numero).join(", ") : "—"
    document.getElementById("exp-tl").textContent     = tls.length  ? tls.map(x => x.numero).join(", ")  : "—"
  }
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
  if (tabActiva === "general")      renderGeneral(ordenActual)
  if (tabActiva === "cadena")       await renderCadena()
  if (tabActiva === "hitos")        await renderHitos()
  if (tabActiva === "documentos")   await renderDocumentos()
  if (tabActiva === "finanzas")     await renderFinanzas()
  if (tabActiva === "carga")        await renderUnidadesCarga()
  if (tabActiva === "stock")        await renderStockOrden()
}

// ─────────────────────────────────────────────
// TAB GENERAL
// ─────────────────────────────────────────────
function renderGeneral(o) {
  const cont = document.getElementById("tab-general")
  cont.innerHTML = ""

  if (o.estado === "anulada") {
    cont.innerHTML += `<div class="alerta-banner">⚠ Esta orden está anulada y no puede modificarse.</div>`
  }

  const camposComunes = [
  { lbl:"Número",        val:o.numero,                    campo:"numero",        tipo:"text",   readonly:true },
  { lbl:"Tipo",          val:o.tipo,                      campo:"tipo",          tipo:"text",   readonly:true },
  { lbl:"Régimen",       val:o.regimen,                   campo:"regimen",       tipo:"select", ops:["Importacion definitiva","Admision temporal","Deposito aduanero","Exportacion","NA"] },
  { lbl:"Estado",        val:o.estado,                    campo:"estado",        tipo:"text",   readonly:true },
  { lbl:"Cliente",       val:o.clientes?.razon_social,    campo:null,            tipo:"text",   readonly:true },
  { lbl:"Origen",        val:o.origen,                    campo:"origen",        tipo:"text" },
  { lbl:"Destino",       val:o.destino,                   campo:"destino",       tipo:"text" },
  { lbl:"Agente origen", val:o.agente_origen,             campo:"agente_origen", tipo:"text" },
  { lbl:"Incoterm",      val:o.incoterm,                  campo:"incoterm",      tipo:"select", ops:["EXW","FOB","CFR","CIF","DAP","DAT","DDP","FCA","CPT","CIP"] },
  { lbl:"Descripción",   val:o.descripcion_carga,         campo:"descripcion_carga", tipo:"text" },
  { lbl:"Observaciones", val:o.observaciones,             campo:"observaciones", tipo:"text" },
]

  // Campos específicos por tipo
  let camposEspecificos = []

  if (["SEA","AIR"].includes(o.tipo)) {
    camposEspecificos = [
      { lbl:"MBL / MAWB",    val:o.numero_mbl,    campo:"numero_mbl",     tipo:"text" },
      { lbl:"HBL / HAWB",    val:o.numero_hbl,    campo:"numero_hbl",     tipo:"text" },
      { lbl:"Tipo de carga", val:o.tipo_carga,    campo:"tipo_carga",     tipo:"select", ops:["FCL","LCL","Consolidado","Break bulk"] },
      { lbl:"Naviera / Línea", val:o.naviera,     campo:"naviera",        tipo:"text" },
      { lbl:"Agente marítimo", val:o.agente_maritimo, campo:"agente_maritimo", tipo:"text" },
      { lbl:"Nave / Vuelo",  val:o.nave,          campo:"nave",           tipo:"text" },
      { lbl:"Viaje",         val:o.viaje,         campo:"viaje",          tipo:"text" },
      { lbl:"POL",           val:o.pol,           campo:"pol",            tipo:"text" },
      { lbl:"POD",           val:o.pod,           campo:"pod",            tipo:"text" },
      { lbl:"ETD",           val:fmtDate(o.etd),  campo:"etd",            tipo:"date" },
      { lbl:"ATD",           val:fmtDate(o.atd),  campo:"atd",            tipo:"date" },
      { lbl:"ETA",           val:fmtDate(o.eta),  campo:"eta",            tipo:"date" },
      { lbl:"ATA",           val:fmtDate(o.ata),  campo:"ata",            tipo:"date" },
      { lbl:"Depósito temp.",val:o.deposito_temporal, campo:"deposito_temporal", tipo:"text" },
      { lbl:"Manifiesto",    val:o.manifiesto,    campo:"manifiesto",     tipo:"text" },
      { lbl:"Volante",       val:o.volante,       campo:"volante",        tipo:"text" },
      { lbl:"Peso total (kg)",val:o.peso_total_kg,campo:"peso_total_kg",  tipo:"number" },
      { lbl:"Volumen (m³)",  val:o.volumen_total_m3, campo:"volumen_total_m3", tipo:"number" },
      { lbl:"Bultos total",  val:o.bultos_total,  campo:"bultos_total",   tipo:"number" },
      { lbl:"Tipo de bulto", val:o.tipo_bulto,    campo:"tipo_bulto",     tipo:"select", ops:["Pallets","Cajas","Rollos","Tambores","Sacos","Granel","Otro"] },
      { lbl:"FOB (USD)",     val:o.fob_valor,     campo:"fob_valor",      tipo:"number" },
    ]
  }

  if (["ADU","SLI"].includes(o.tipo)) {
    camposEspecificos = [
      { lbl:"Número DAM",      val:o.numero_dam,      campo:"numero_dam",      tipo:"text" },
      { lbl:"Agente aduanas",  val:o.agente_maritimo, campo:"agente_maritimo", tipo:"text" },
      { lbl:"Modalidad",       val:o.modalidad,       campo:"modalidad",       tipo:"select", ops:["Despacho anticipado","Despacho diferido","Despacho urgente"] },
      { lbl:"Canal",           val:o.canal_aduanero,  campo:"canal_aduanero",  tipo:"select", ops:["Verde","Naranja","Rojo"] },
      { lbl:"Valor FOB (USD)", val:o.fob_valor,       campo:"fob_valor",       tipo:"number" },
      { lbl:"Nro. ítems",      val:o.nro_items,       campo:"nro_items",       tipo:"number" },
      { lbl:"Tipo de cambio",  val:o.tipo_cambio,     campo:"tipo_cambio",     tipo:"number" },
      { lbl:"Fecha numeración",val:fmtDate(o.fecha_numeracion), campo:"fecha_numeracion", tipo:"date" },
      { lbl:"Fecha levante",   val:fmtDate(o.fecha_levante),    campo:"fecha_levante",    tipo:"date" },
      { lbl:"Carta fianza",    val:o.carta_fianza,    campo:"carta_fianza",    tipo:"text" },
      { lbl:"Ad valorem (PEN)",val:o.advalorem,       campo:"advalorem",       tipo:"number" },
      { lbl:"IGV aduanas",     val:o.igv_aduanas,     campo:"igv_aduanas",     tipo:"number" },
      { lbl:"IPM",             val:o.ipm,             campo:"ipm",             tipo:"number" },
      { lbl:"Percepción",      val:o.percepcion,      campo:"percepcion",      tipo:"number" },
    ]
  }

  if (o.tipo === "TL") {
    camposEspecificos = [
      { lbl:"Proveedor transporte", val:o.proveedor_transporte, campo:"proveedor_transporte", tipo:"text" },
      { lbl:"Conductor",           val:o.conductor,           campo:"conductor",            tipo:"text" },
      { lbl:"DNI conductor",       val:o.dni_conductor,       campo:"dni_conductor",        tipo:"text" },
      { lbl:"Placa tracto",        val:o.placa_tracto,        campo:"placa_tracto",         tipo:"text" },
      { lbl:"Placa carreta",       val:o.placa_carreta,       campo:"placa_carreta",        tipo:"text" },
      { lbl:"Guía de remisión",    val:o.guia_remision,       campo:"guia_remision",        tipo:"text" },
      { lbl:"Punto de recojo",     val:o.punto_recojo,        campo:"punto_recojo",         tipo:"text" },
      { lbl:"Punto de entrega",    val:o.punto_entrega,       campo:"punto_entrega",        tipo:"text" },
      { lbl:"Fecha recojo",        val:fmtDate(o.fecha_recojo), campo:"fecha_recojo",       tipo:"date" },
      { lbl:"Fecha entrega",       val:fmtDate(o.fecha_entrega), campo:"fecha_entrega",     tipo:"date" },
      { lbl:"Peso (kg)",           val:o.peso_total_kg,       campo:"peso_total_kg",        tipo:"number" },
      { lbl:"Volumen (m³)",        val:o.volumen_total_m3,    campo:"volumen_total_m3",     tipo:"number" },
      { lbl:"Incidencias",         val:o.incidencias,         campo:"incidencias",          tipo:"text" },
    ]
  }

  // Renderizar sección común
  const secComun = document.createElement("div")
  secComun.className = "card" ; secComun.style.marginBottom = "16px"
  secComun.innerHTML = `<div class="card-body"><div class="section-title">Información general</div><div class="field-grid" id="campos-comunes"></div></div>`
  cont.appendChild(secComun)
  renderCampos(document.getElementById("campos-comunes"), camposComunes)

  // Renderizar sección específica
  if (camposEspecificos.length) {
    const secEsp = document.createElement("div")
    secEsp.className = "card"
    secEsp.innerHTML = `<div class="card-body"><div class="section-title">Datos operativos · ${o.tipo}</div><div class="field-grid" id="campos-especificos"></div></div>`
    cont.appendChild(secEsp)
    renderCampos(document.getElementById("campos-especificos"), camposEspecificos)
  }

  // Botones de edición
  if (modoEdicion && o.estado !== "anulada") {
    const editActions = document.createElement("div")
    editActions.className = "edit-actions"
    editActions.innerHTML = `
      <button class="btn btn-primary" id="btn-guardar-campos">Guardar cambios</button>
      <button class="btn btn-secondary" id="btn-anular" style="margin-left:auto;color:#dc2626;border-color:#fecaca">Anular orden</button>
    `
    cont.appendChild(editActions)
    document.getElementById("btn-guardar-campos").addEventListener("click", guardarCampos)
    document.getElementById("btn-anular").addEventListener("click", anularOrden)
  }
}

function renderCampos(cont, campos) {
  campos.forEach(c => {
    const div = document.createElement("div")
    div.className = "field-item"

    // readonly:true = NUNCA editable, sin importar el modo
    const esEditable = modoEdicion && c.campo && !c.readonly && ordenActual.estado !== "anulada"

    if (esEditable) {
      if (c.tipo === "select") {
        div.innerHTML = `
          <div class="field-lbl">${c.lbl}</div>
          <select class="field-input" data-campo="${c.campo}">
            ${c.ops.map(op => `<option value="${op}" ${c.val === op ? "selected" : ""}>${op}</option>`).join("")}
          </select>`
      } else {
        div.innerHTML = `
          <div class="field-lbl">${c.lbl}</div>
          <input class="field-input" type="${c.tipo || "text"}" data-campo="${c.campo}" value="${c.val || ""}" />`
      }
    } else {
      // Campo de solo lectura — con indicador visual si está bloqueado permanentemente
      const lockIcon = c.readonly
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" style="margin-left:4px;flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
        : ""
      div.innerHTML = `
        <div class="field-lbl" style="display:flex;align-items:center;gap:2px">${c.lbl}${lockIcon}</div>
        <div class="field-val ${!c.val ? "empty" : ""}">${c.val || "—"}</div>`
    }
    cont.appendChild(div)
  })
}

async function guardarCampos() {
  const inputs  = document.querySelectorAll("[data-campo]")
  const updates = {}
  inputs.forEach(inp => { updates[inp.dataset.campo] = inp.value || null })

  const { error } = await db.from("ordenes").update(updates).eq("id", ordenId)
  if (error) { alert("Error al guardar: " + error.message); return }

  modoEdicion = false
  toggleEdicion(false)
  await cargarOrden()
}

async function anularOrden() {
  const conf1 = confirm("¿Estás seguro de que deseas anular esta orden?")
  if (!conf1) return
  const conf2 = confirm("Esta acción no se puede deshacer fácilmente. ¿Confirmas la anulación?")
  if (!conf2) return

  await db.from("ordenes").update({ estado: "anulada", activo: false }).eq("id", ordenId)
  await cargarOrden()
}

// ─────────────────────────────────────────────
// TAB CADENA OPERATIVA
// ─────────────────────────────────────────────
async function renderCadena() {
  const cont = document.getElementById("tab-cadena")
  cont.innerHTML = ""

  const o = ordenActual

  // Advertencia si ADU/SLI/TL sin carga
  if (["ADU","SLI"].includes(o.tipo) && !o.orden_carga_id) {
    cont.innerHTML += `<div class="alerta-banner">⚠ Esta orden de aduanas no tiene una orden de carga asociada. Se recomienda vincularla.</div>`
  }

  if (o.tipo === "TL" && !o.orden_aduanas_id) {
    cont.innerHTML += `<div class="alerta-banner">⚠ Esta orden de transporte no tiene una orden de aduanas asociada.</div>`
  }

  // Selector para asociar órdenes
  if (["ADU","SLI"].includes(o.tipo) && !o.orden_carga_id) {
    const { data: cargas } = await db.from("ordenes").select("id,numero,tipo").in("tipo",["SEA","AIR"]).eq("activo",true)
    if (cargas?.length) {
      const sel = document.createElement("div")
      sel.className = "card" ; sel.style.marginBottom = "16px"
      sel.innerHTML = `
        <div class="card-body">
          <div class="section-title">Vincular orden de carga</div>
          <div style="display:flex;gap:10px;align-items:flex-end">
            <div class="form-group" style="flex:1">
              <label class="form-label">Orden de carga (SEA / AIR)</label>
              <select class="form-select" id="sel-carga">
                <option value="">Selecciona...</option>
                ${cargas.map(c => `<option value="${c.id}">${c.numero} (${c.tipo})</option>`).join("")}
              </select>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-vincular-carga">Vincular</button>
          </div>
        </div>`
      cont.appendChild(sel)
      document.getElementById("btn-vincular-carga").addEventListener("click", () => vincularOrden("carga"))
    }
  }

  if (o.tipo === "TL" && !o.orden_aduanas_id) {
    const { data: adus } = await db.from("ordenes").select("id,numero,tipo").in("tipo",["ADU","SLI"]).eq("activo",true)
    if (adus?.length) {
      const sel = document.createElement("div")
      sel.className = "card" ; sel.style.marginBottom = "16px"
      sel.innerHTML = `
        <div class="card-body">
          <div class="section-title">Vincular orden de aduanas</div>
          <div style="display:flex;gap:10px;align-items:flex-end">
            <div class="form-group" style="flex:1">
              <label class="form-label">Orden de aduanas (ADU / SLI)</label>
              <select class="form-select" id="sel-aduana">
                <option value="">Selecciona...</option>
                ${adus.map(a => `<option value="${a.id}">${a.numero} (${a.tipo})</option>`).join("")}
              </select>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-vincular-aduana">Vincular</button>
          </div>
        </div>`
      cont.appendChild(sel)
      document.getElementById("btn-vincular-aduana").addEventListener("click", () => vincularOrden("aduana"))
    }
  }

  // Mostrar cadena completa
  if (o.expediente_id) {
    const { data: cadena } = await db
      .from("ordenes").select("id,numero,tipo,estado,origen,destino,created_at")
      .eq("expediente_id", o.expediente_id)
      .order("created_at")

    if (cadena?.length) {
      const card = document.createElement("div")
      card.className = "card"
      card.innerHTML = `<div class="card-body"><div class="section-title">Cadena operativa · ${o.expediente_id}</div><div id="cadena-lista"></div></div>`
      cont.appendChild(card)

      const lista = card.querySelector("#cadena-lista")
      const grupos = { carga:[], aduanas:[], transporte:[] }
      cadena.forEach(x => {
        if (["SEA","AIR"].includes(x.tipo)) grupos.carga.push(x)
        else if (["ADU","SLI"].includes(x.tipo)) grupos.aduanas.push(x)
        else if (x.tipo === "TL") grupos.transporte.push(x)
      })

      const etapas = [
        { label:"Carga", items: grupos.carga, color:"#7c3aed" },
        { label:"Aduanas", items: grupos.aduanas, color:"#d97706" },
        { label:"Transporte", items: grupos.transporte, color:"#059669" },
      ]

      etapas.forEach((etapa, ei) => {
        if (!etapa.items.length) return
        const sec = document.createElement("div")
        sec.style.cssText = "margin-bottom:16px"
        sec.innerHTML = `<div style="font-size:10px;font-weight:600;color:${etapa.color};letter-spacing:1px;margin-bottom:8px;text-transform:uppercase">${etapa.label}</div>`

        etapa.items.forEach(x => {
          const link = document.createElement("a")
          link.href = `orden-detalle.html?id=${x.id}`
          link.className = "chain-card"
          link.style.borderLeft = x.id === ordenId ? `3px solid ${etapa.color}` : ""
          link.innerHTML = `
            <span class="pill pill-${x.tipo}">${x.tipo}</span>
            <div>
              <div class="chain-num">${x.numero} ${x.id === ordenId ? "<span style='font-size:10px;color:#9ca3af'>(esta orden)</span>" : ""}</div>
              <div class="chain-sub">${x.origen || "—"} → ${x.destino || "—"} · <span class="pill pill-${x.estado}" style="font-size:9px">${x.estado.replace(/_/g," ")}</span></div>
            </div>
            <svg class="chain-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          `
          sec.appendChild(link)
        })

        if (ei < etapas.length - 1 && etapas.some((e,i) => i > ei && e.items.length)) {
          sec.innerHTML += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0 4px 16px"><div style="width:1px;height:20px;background:#e5e7eb"></div><span style="font-size:10px;color:#9ca3af">↓</span></div>`
        }

        lista.appendChild(sec)
      })
    }
  } else {
    const empty = document.createElement("div")
    empty.className = "panel-vacio"
    empty.innerHTML = `<div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div><p>Sin expediente vinculado</p><span>Vincula esta orden a una cadena operativa desde los selectores de arriba</span>`
    cont.appendChild(empty)
  }
}

async function vincularOrden(tipo) {
  const selId = tipo === "carga"
    ? document.getElementById("sel-carga")?.value
    : document.getElementById("sel-aduana")?.value

  if (!selId) { alert("Selecciona una orden"); return }

  const { data: ordenVinculada } = await db.from("ordenes").select("*").eq("id", selId).single()
  if (!ordenVinculada) return

  const expId = ordenVinculada.expediente_id || `EXP-${ordenActual.numero}`
  const updates = { expediente_id: expId }

  if (tipo === "carga") {
    updates.orden_carga_id = selId
    updates.cliente_id = ordenVinculada.cliente_id || ordenActual.cliente_id
  } else {
    updates.orden_aduanas_id = selId
    updates.cliente_id = ordenVinculada.cliente_id || ordenActual.cliente_id
  }

  await db.from("ordenes").update(updates).eq("id", ordenId)
  await db.from("ordenes").update({ expediente_id: expId }).eq("id", selId)

  alert("Orden vinculada correctamente")
  await cargarOrden()
}

// ─────────────────────────────────────────────
// TAB HITOS
// ─────────────────────────────────────────────
async function renderHitos() {
  const cont = document.getElementById("tab-hitos")
  cont.innerHTML = ""

  const { data: catalogo } = await db
    .from("hitos_catalogo").select("*")
    .eq("tipo_orden", ordenActual.tipo)
    .order("orden_secuencia")

  const { data: registrados } = await db
    .from("hitos_operativos").select("*").eq("orden_id", ordenId)

  const hitos = (catalogo || []).map(h => {
    const reg = (registrados || []).find(r => r.hito_catalogo_id === h.id)
    return { ...h, completado: !!reg, fecha_real: reg?.fecha_real, observacion: reg?.observacion }
  })

  const completados = hitos.filter(h => h.completado).length
  const pct = Math.round((completados / hitos.length) * 100)

  // Barra de progreso
  const prog = document.createElement("div")
  prog.className = "progreso-wrap"
  prog.style.marginBottom = "16px"
  prog.innerHTML = `
    <div class="progreso-barra"><div class="progreso-fill" style="width:${pct}%"></div></div>
    <span class="progreso-texto">${completados} de ${hitos.length} · ${pct}%</span>`
  cont.appendChild(prog)

  // Si es ADU o SLI — mostrar hitos heredados de la carga
  if (["ADU","SLI"].includes(ordenActual.tipo) && ordenActual.orden_carga_id) {
    const { data: hitosHeredados } = await db
      .from("hitos_operativos")
      .select("*, hitos_catalogo(nombre,codigo)")
      .eq("orden_id", ordenActual.orden_carga_id)

    if (hitosHeredados?.length) {
      const heredadosCard = document.createElement("div")
      heredadosCard.className = "card"
      heredadosCard.style.marginBottom = "16px"
      heredadosCard.innerHTML = `
        <div class="card-body">
          <div class="section-title" style="color:#9ca3af">Hitos heredados de la orden de carga</div>
          ${hitosHeredados.map(h => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f9fafb;opacity:0.6">
              <div style="width:22px;height:22px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af">✓</div>
              <div style="font-size:12px;color:#6b7280">${h.hitos_catalogo?.nombre || "—"}</div>
              <div style="margin-left:auto;font-size:10px;color:#c4c9d4">${h.fecha_real ? new Date(h.fecha_real).toLocaleDateString("es-PE") : ""}</div>
            </div>`).join("")}
        </div>`
      cont.appendChild(heredadosCard)
    }
  }

  // Timeline horizontal
  const timelineCard = document.createElement("div")
  timelineCard.className = "card"
  timelineCard.innerHTML = `<div class="card-body"><div class="section-title">Hitos de esta orden</div><div id="timeline-h" class="timeline-h"></div></div>`
  cont.appendChild(timelineCard)

  renderTimelineH(hitos, document.getElementById("timeline-h"))
}

function iconoPorCodigo(codigo) {
  const m = {
    orden_creada:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    booking_confirmado:`<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    prealerta_enviada:`<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    carga_embarcada:`<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/><circle cx="12" cy="12" r="10"/></svg>`,
    hbl_recibido:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
    hawb_recibido:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`,
    eta_confirmado:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    carga_direccionada:`<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    aviso_llegada:`<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>`,
    carga_arribada:`<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>`,
    manifiesto_descargado:`<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    volante_obtenido:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/></svg>`,
    docs_agente:`<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>`,
    mandato_firmado:`<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    docs_recibidos:`<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    revision_documentaria:`<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    permisos_sectoriales:`<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    dam_numerada:`<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    canal_asignado:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    dam_pagada:`<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    dam_levante:`<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    orden_liquidada:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    proveedor_asignado:`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    conductor_asignado:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 14 0v2"/></svg>`,
    retiro_programado:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    en_camino_recojo:`<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    carga_recogida:`<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    en_ruta_entrega:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
    incidencia:`<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    carga_entregada:`<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    guia_sellada:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`,
    orden_cerrada:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    reserva_confirmada:`<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  }
  return m[codigo] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>`
}

function renderTimelineH(hitos, cont) {
  cont.innerHTML = ""

  // Crear tooltip global único
  let tooltip = document.getElementById("hito-tooltip-global")
  if (!tooltip) {
    tooltip = document.createElement("div")
    tooltip.id = "hito-tooltip-global"
    tooltip.className = "hito-tooltip"
    document.body.appendChild(tooltip)
  }

  const primerPendiente = hitos.findIndex(h => !h.completado)

  hitos.forEach((h, i) => {
    const esActual = i === primerPendiente
    const esUltimo = i === hitos.length - 1

    let claseIcono = "hito-h-icon-wrap"
    if (h.completado)     claseIcono += " done"
    else if (esActual)    claseIcono += " actual"
    else if (h.es_alerta) claseIcono += " alerta"

    const fechaStr = h.fecha_real
      ? new Date(h.fecha_real).toLocaleDateString("es-PE", { day:"2-digit", month:"short" })
      : esActual ? "Pendiente" : "—"

    const item = document.createElement("div")
    item.className = "hito-h-item"
    item.innerHTML = `
      ${!esUltimo ? `<div class="hito-h-connector ${h.completado ? "done" : ""}"></div>` : ""}
      <div class="${claseIcono}">
        ${iconoPorCodigo(h.codigo)}
      </div>
      <div class="hito-h-label ${h.completado ? "done" : esActual ? "actual" : ""}">${h.nombre}</div>
      <div class="hito-h-date ${h.completado ? "done" : ""}">${fechaStr}</div>
    `

    const iconWrap = item.querySelector(".hito-h-icon-wrap")

    // Tooltip con JS — posición fija calculada
    iconWrap.addEventListener("mouseenter", (e) => {
      const rect = iconWrap.getBoundingClientRect()
      const fechaTooltip = h.fecha_real
        ? new Date(h.fecha_real).toLocaleString("es-PE")
        : "Sin registrar"

      tooltip.innerHTML = `
        <div class="hito-tooltip-title">${h.nombre}</div>
        <div class="hito-tooltip-date">${fechaTooltip}</div>
        ${h.observacion ? `<div class="hito-tooltip-obs">${h.observacion}</div>` : ""}
        ${h.requiere_documento ? `<div class="hito-tooltip-obs" style="color:#c4b5fd;margin-top:4px">Requiere documento</div>` : ""}
        ${!h.completado ? `<div class="hito-tooltip-obs" style="color:#fcd34d;margin-top:4px">Clic para registrar</div>` : ""}
      `

      // Posicionar encima del ícono
      tooltip.style.left  = (rect.left + rect.width / 2) + "px"
      tooltip.style.top   = (rect.top - 12 + window.scrollY) + "px"
      tooltip.style.transform = "translateX(-50%) translateY(-100%)"
      tooltip.classList.add("visible")
    })

    iconWrap.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible")
    })

    // Clic para registrar hito pendiente
    if (!h.completado && ordenActual.estado !== "anulada") {
      iconWrap.style.cursor = "pointer"
      iconWrap.addEventListener("click", () => {
        tooltip.classList.remove("visible")
        abrirModalHito(h)
      })
    }

    cont.appendChild(item)
  })
}

// ─────────────────────────────────────────────
// MODAL HITO
// ─────────────────────────────────────────────
async function abrirModalHito(hito) {
  hitoSeleccionado = hito
  document.getElementById("modal-hito-titulo").textContent = "Registrar hito"
  document.getElementById("modal-hito-nombre").textContent = hito.nombre

  const campos = document.getElementById("modal-hito-campos")
  campos.innerHTML = `
    <div class="form-group">
      <label class="form-label">Fecha y hora *</label>
      <input class="form-input" type="datetime-local" id="hito-fecha"
        value="${new Date(new Date()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Observación</label>
      <input class="form-input" type="text" id="hito-obs" placeholder="Detalle del hito..." />
    </div>
  `

  // ── Campos especiales por código ─────────────────────────────────────
  const agentes = await cargarAgentesAduanas()

  const camposEspeciales = {
    hbl_recibido:    [{ id:"hito-numero-hbl",    lbl:"Número HBL *",          campo:"numero_hbl" }],
    hawb_recibido:   [{ id:"hito-numero-hbl",    lbl:"Número HAWB *",         campo:"numero_hbl" }],
    dam_numerada:    [
      { id:"hito-numero-dam",   lbl:"Número DAM *",       campo:"numero_dam" },
      { id:"hito-fecha-num",    lbl:"Fecha numeración",   campo:"fecha_numeracion", tipo:"date" }
    ],
    canal_asignado:  [{ id:"hito-canal",  lbl:"Canal asignado *", campo:"canal_aduanero", tipo:"select", ops:["Verde","Naranja","Rojo"] }],
    volante_obtenido:[{ id:"hito-volante",lbl:"Número volante *",  campo:"volante" }],
    dam_pagada:      [{ id:"hito-fecha-pago-dam", lbl:"Fecha de pago DAM", campo:"fecha_pago_dam", tipo:"date" }],
    dam_levante:     [{ id:"hito-fecha-levante",  lbl:"Fecha levante",     campo:"fecha_levante",  tipo:"date" }],
    guia_sellada:    [{ id:"hito-guia",   lbl:"Número guía de remisión", campo:"guia_remision" }],
    asignacion_agente: [
      { id:"hito-agente-adu", lbl:"Agente de aduanas *", campo:"agente_aduanas_id", tipo:"select",
        ops: agentes.map(a => a.nombre), vals: agentes.map(a => String(a.id)) }
    ],
  }

  const especiales = camposEspeciales[hito.codigo] || []
  especiales.forEach(c => {
    const div = document.createElement("div")
    div.className = "form-group"
    if (c.tipo === "select") {
      const ops = c.vals
        ? c.ops.map((o,i) => `<option value="${c.vals[i]}">${o}</option>`).join("")
        : c.ops.map(o => `<option value="${o}">${o}</option>`).join("")
      div.innerHTML = `<label class="form-label">${c.lbl}</label>
        <select class="form-select" id="${c.id}" data-campo="${c.campo}">
          <option value="">Selecciona...</option>${ops}
        </select>`
    } else {
      div.innerHTML = `<label class="form-label">${c.lbl}</label>
        <input class="form-input" type="${c.tipo||"text"}" id="${c.id}" data-campo="${c.campo}" placeholder="${c.lbl}" />`
    }
    campos.appendChild(div)
  })

  // ── Hitos condicionales: liberación en puerto y DT/DD ─────────────────
  if (["liberacion_puerto","ingreso_dt_retiro_puerto"].includes(hito.codigo)) {
    await renderHitoCondicional(hito, campos)
  }

  // ── Upload obligatorio ────────────────────────────────────────────────
  if (hito.requiere_documento) {
    const divDoc = document.createElement("div")
    divDoc.style.cssText = "background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px"

    let opcionesDocTipo = `
      <option value="HBL">HBL / HAWB</option>
      <option value="MBL">MBL / MAWB</option>
      <option value="DAM">DAM</option>
      <option value="Volante">Volante de despacho</option>
      <option value="Factura comercial">Factura comercial</option>
      <option value="Packing list">Packing list</option>
      <option value="Guia remision">Guía de remisión</option>
      <option value="Mandato">Mandato electrónico</option>
      <option value="Permiso">Permiso sectorial</option>
      <option value="Comprobante pago">Comprobante de pago</option>
      <option value="Print sustento">Print de sustento</option>
      <option value="Tickets de balanza">Consolidado tickets de balanza</option>
      <option value="Guias transporte">Guías de transporte</option>
      <option value="Fotos">Fotografías de carga</option>
      <option value="Otro">Otro (especificar)</option>
    `

    divDoc.innerHTML = `
      <div style="font-size:11px;font-weight:600;color:#ca8a04;display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Este hito requiere adjuntar un documento
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de documento</label>
        <select class="form-select" id="hito-doc-tipo" style="font-size:12px">
          ${opcionesDocTipo}
        </select>
      </div>
      <div class="form-group" id="hito-doc-tipo-otro-wrap" style="display:none">
        <label class="form-label">Nombre del documento</label>
        <input class="form-input" type="text" id="hito-doc-tipo-otro" placeholder="Ej: Certificado de origen..." style="font-size:12px" />
      </div>
      <div class="form-group">
        <label class="form-label">Número de documento</label>
        <input class="form-input" type="text" id="hito-doc-numero" placeholder="Ej: HLCU123456" style="font-size:12px" />
      </div>
      <div style="border:2px dashed #fde68a;border-radius:8px;padding:12px;text-align:center;cursor:pointer;background:#fffbf0" id="hito-upload-zone">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="1.5" style="margin:0 auto;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size:11px;color:#ca8a04;margin-top:4px">Clic para seleccionar archivo</div>
        <div id="hito-doc-filename" style="font-size:10px;color:#7c3aed;margin-top:4px;display:none"></div>
        <input type="file" id="hito-doc-archivo" style="display:none" />
      </div>
    `
    campos.appendChild(divDoc)

    // Mostrar campo de nombre si elige "Otro"
    document.getElementById("hito-doc-tipo").addEventListener("change", function() {
      const otroWrap = document.getElementById("hito-doc-tipo-otro-wrap")
      otroWrap.style.display = this.value === "Otro" ? "flex" : "none"
    })

    document.getElementById("hito-upload-zone").addEventListener("click", () => {
      document.getElementById("hito-doc-archivo").click()
    })
    document.getElementById("hito-doc-archivo").addEventListener("change", function() {
      if (this.files[0]) {
        document.getElementById("hito-doc-filename").textContent = this.files[0].name
        document.getElementById("hito-doc-filename").style.display = "block"
      }
    })
  }

  document.getElementById("modal-hito").classList.add("visible")
}

// ── Hito condicional (liberación y DT/DD) ─────────────────────────────────
async function renderHitoCondicional(hito, campos) {
  if (hito.codigo === "liberacion_puerto") {
    // Verificar hito docs_agente en orden de carga del expediente
    let hitoBase = null
    if (ordenActual.orden_carga_id) {
      const { data: hc } = await db.from("hitos_catalogo").select("id").eq("codigo","docs_agente").single()
      if (hc) {
        const { data: ho } = await db.from("hitos_operativos").select("id,fecha_real")
          .eq("orden_id", ordenActual.orden_carga_id).eq("hito_catalogo_id", hc.id).single()
        hitoBase = ho
      }
    }

    if (!hitoBase) {
      const aviso = document.createElement("div")
      aviso.style.cssText = "background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:11px;color:#dc2626;font-weight:500"
      aviso.innerHTML = `⚠ Este hito solo puede registrarse cuando el hito "Documentos entregados al agente aduanas" de la orden de carga del expediente esté completado. Verificar cadena operativa.`
      campos.appendChild(aviso)

      // Deshabilitar el botón confirmar
      setTimeout(() => {
        const btnConf = document.getElementById("modal-hito-confirmar")
        if (btnConf) {
          btnConf.disabled = true
          btnConf.style.opacity = "0.4"
          btnConf.style.cursor = "not-allowed"
        }
      }, 100)
      return
    }

    const aviso = document.createElement("div")
    aviso.style.cssText = "background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:10px;font-size:11px;color:#059669;font-weight:500"
    aviso.innerHTML = `✓ Hito de carga verificado: docs entregados al agente el ${new Date(hitoBase.fecha_real).toLocaleDateString("es-PE")}`
    campos.appendChild(aviso)
    return
  }

  if (hito.codigo === "ingreso_dt_retiro_puerto") {
    // Detectar tipo de direccionamiento del expediente
    let tipoDirec = null
    if (ordenActual.expediente_id) {
      const { data: dirs } = await db
        .from("direccionamientos")
        .select("tipo,estado,destino,almacen_id")
        .eq("estado","realizado")
      if (dirs?.length) {
        const { data: ordCarga } = await db
          .from("ordenes").select("id")
          .eq("expediente_id", ordenActual.expediente_id)
          .in("tipo",["SEA","AIR"]).single()
        if (ordCarga) {
          const dirOrden = dirs.find(d => {
            return true
          })
          if (dirOrden) tipoDirec = dirOrden.tipo
        }
      }
    }

    const infoDiv = document.createElement("div")
    if (tipoDirec) {
      infoDiv.style.cssText = "background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;font-size:11px;color:#7c3aed;font-weight:500"
      infoDiv.innerHTML = `ℹ Este hito corresponde a: <strong>${tipoDirec === "DT" ? "Ingreso al Depósito Temporal" : "Retiro de Puerto (Descarga Directa)"}</strong>`
    } else {
      infoDiv.style.cssText = "background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:11px;color:#ca8a04;font-weight:500"
      infoDiv.innerHTML = `⚠ No se detectó direccionamiento activo en el expediente. Verifica que la orden de carga tenga un direccionamiento en estado "realizado".`
    }
    campos.appendChild(infoDiv)
  }
}

document.getElementById("modal-hito-cancelar").addEventListener("click", () => {
  document.getElementById("modal-hito").classList.remove("visible")
})

document.getElementById("modal-hito-confirmar").addEventListener("click", async () => {
  const fecha = document.getElementById("hito-fecha").value
  const obs   = document.getElementById("hito-obs").value.trim()

  if (!fecha) { alert("Selecciona la fecha y hora"); return }

  if (hitoSeleccionado.requiere_documento) {
    const archivo = document.getElementById("hito-doc-archivo")?.files[0]
    if (!archivo) {
      alert("Este hito requiere adjuntar un documento. Por favor selecciona el archivo.")
      return
    }
  }

  // Insertar hito
  const { error } = await db.from("hitos_operativos").insert({
    orden_id:         ordenId,
    hito_catalogo_id: hitoSeleccionado.id,
    estado:           "completado",
    observacion:      obs,
    fecha_real:       new Date(fecha).toISOString()
  })
  if (error) { alert("Error: " + error.message); return }

  // Actualizar campos especiales en la orden
  const inputsEsp = document.querySelectorAll("#modal-hito-campos [data-campo]")
  if (inputsEsp.length) {
    const updates = {}
    inputsEsp.forEach(inp => {
      if (inp.value) {
        // Agente de aduanas: guardar el ID numérico
        if (inp.dataset.campo === "agente_aduanas_id") {
          updates[inp.dataset.campo] = parseInt(inp.value)
        } else {
          updates[inp.dataset.campo] = inp.value
        }
      }
    })
    if (Object.keys(updates).length) {
      await db.from("ordenes").update(updates).eq("id", ordenId)
    }
  }

  // Subir documento si existe
  if (hitoSeleccionado.requiere_documento) {
    const archivo   = document.getElementById("hito-doc-archivo")?.files[0]
    let   docTipo   = document.getElementById("hito-doc-tipo")?.value
    const docNumero = document.getElementById("hito-doc-numero")?.value.trim()

    // Si es "Otro", usar el nombre personalizado
    if (docTipo === "Otro") {
      const otroNombre = document.getElementById("hito-doc-tipo-otro")?.value.trim()
      if (otroNombre) docTipo = otroNombre
    }

    if (archivo) {
      const ext  = archivo.name.split(".").pop()
      const path = `documentos/${ordenId}/${hitoSeleccionado.codigo}_${Date.now()}.${ext}`
      const { error: upErr } = await db.storage.from("documentos").upload(path, archivo)
      if (!upErr) {
        const { data: urlData } = db.storage.from("documentos").getPublicUrl(path)
        await db.from("documentos_orden").insert({
          orden_id:         ordenId,
          tipo_documento:   docTipo || "Documento",
          numero_documento: docNumero || null,
          nombre_archivo:   archivo.name,
          url_storage:      urlData.publicUrl,
          estado:           "cargado",
          subido_por:       usuarioActual.id
        })
      }
    }
  }

  document.getElementById("modal-hito").classList.remove("visible")
  await cargarOrden()
  tabActiva = "hitos"
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "hitos"))
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"))
  document.getElementById("tab-hitos").classList.remove("hidden")
  await renderHitos()
})

// ─────────────────────────────────────────────
// TAB DOCUMENTOS
// ─────────────────────────────────────────────
async function renderDocumentos() {
  const cont = document.getElementById("tab-documentos")
  cont.innerHTML = ""

  const { data: docs } = await db
    .from("documentos_orden").select("*").eq("orden_id", ordenId)
    .order("created_at", { ascending: false })

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#111827">${docs?.length || 0} documentos</div>
    <button class="btn btn-primary btn-sm" id="btn-subir-doc">+ Subir documento</button>
  `
  cont.appendChild(header)
  document.getElementById("btn-subir-doc").addEventListener("click", () => {
    document.getElementById("modal-doc").classList.add("visible")
  })

  if (!docs?.length) {
    const empty = document.createElement("div")
    empty.className = "panel-vacio"
    empty.innerHTML = `<div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><p>Sin documentos</p><span>Sube el primer documento de esta orden</span>`
    cont.appendChild(empty)
    return
  }

  const grid = document.createElement("div")
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px"

  docs.forEach(d => {
    const card = document.createElement("div")
    card.className = "card"
    card.innerHTML = `
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-size:13px;font-weight:600;color:#111827">${d.tipo_documento}</div>
            ${d.numero_documento ? `<div style="font-size:11px;color:#7c3aed;font-weight:500;margin-top:2px">${d.numero_documento}</div>` : ""}
            ${d.fecha_documento ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">${new Date(d.fecha_documento+"T00:00:00").toLocaleDateString("es-PE")}</div>` : ""}
          </div>
          <span class="pill pill-${d.estado||"pendiente"}" style="font-size:9px">${d.estado||"pendiente"}</span>
        </div>
        ${d.observaciones ? `<div style="font-size:11px;color:#6b7280;margin-bottom:10px">${d.observaciones}</div>` : ""}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${d.url_storage||d.archivo_url ? `<a href="${d.url_storage||d.archivo_url}" target="_blank" class="btn btn-secondary btn-xs">Ver archivo</a>` : `<span style="font-size:11px;color:#d1d5db">Sin archivo</span>`}
          <button class="btn btn-secondary btn-xs btn-editar-doc" data-id="${d.id}">Editar</button>
          <button class="btn btn-danger btn-xs btn-eliminar-doc" data-id="${d.id}" data-url="${d.url_storage||""}">Eliminar</button>
        </div>
      </div>
    `

    // Editar documento
    card.querySelector(".btn-editar-doc").addEventListener("click", () => abrirModalEditarDoc(d))

    // Eliminar documento
    card.querySelector(".btn-eliminar-doc").addEventListener("click", async function() {
      if (!confirm("¿Eliminar este documento? Se borrará también del almacenamiento.")) return
      const url = this.dataset.url
      if (url) {
        const path = url.split("/documentos/")[1]
        if (path) await db.storage.from("documentos").remove([`documentos/${path}`])
      }
      await db.from("documentos_orden").delete().eq("id", this.dataset.id)
      await renderDocumentos()
    })

    grid.appendChild(card)
  })
  cont.appendChild(grid)
}

// ─── MODAL EDITAR DOCUMENTO ───────────────────────────────────────────────
function abrirModalEditarDoc(doc) {
  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:20px">Editar documento</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Tipo de documento</label>
          <select class="form-select" id="edit-doc-tipo">
            <option ${doc.tipo_documento==="HBL"?"selected":""}>HBL / HAWB</option>
            <option ${doc.tipo_documento==="MBL"?"selected":""}>MBL / MAWB</option>
            <option ${doc.tipo_documento==="DAM"?"selected":""}>DAM</option>
            <option ${doc.tipo_documento==="Volante"?"selected":""}>Volante de despacho</option>
            <option ${doc.tipo_documento==="Factura comercial"?"selected":""}>Factura comercial</option>
            <option ${doc.tipo_documento==="Packing list"?"selected":""}>Packing list</option>
            <option ${doc.tipo_documento==="Guia remision"?"selected":""}>Guía de remisión</option>
            <option ${doc.tipo_documento==="Mandato"?"selected":""}>Mandato electrónico</option>
            <option ${doc.tipo_documento==="Permiso"?"selected":""}>Permiso sectorial</option>
            <option ${doc.tipo_documento==="Comprobante pago"?"selected":""}>Comprobante de pago</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Número de documento</label>
          <input class="form-input" type="text" id="edit-doc-numero" value="${doc.numero_documento||""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha del documento</label>
          <input class="form-input" type="date" id="edit-doc-fecha" value="${doc.fecha_documento||""}" />
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input class="form-input" type="text" id="edit-doc-obs" value="${doc.observaciones||""}" placeholder="Notas adicionales..." />
        </div>
        <div class="form-group">
          <label class="form-label">Reemplazar archivo (opcional)</label>
          <input type="file" class="form-input" id="edit-doc-archivo" style="padding:4px" />
          ${doc.nombre_archivo ? `<div style="font-size:10px;color:#9ca3af;margin-top:3px">Actual: ${doc.nombre_archivo}</div>` : ""}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="edit-doc-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="edit-doc-guardar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Guardar cambios</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById("edit-doc-cancelar").addEventListener("click", () => document.body.removeChild(overlay))
  document.getElementById("edit-doc-guardar").addEventListener("click", async () => {
    const tipo    = document.getElementById("edit-doc-tipo").value
    const numero  = document.getElementById("edit-doc-numero").value.trim()
    const fecha   = document.getElementById("edit-doc-fecha").value
    const obs     = document.getElementById("edit-doc-obs").value.trim()
    const archivo = document.getElementById("edit-doc-archivo").files[0]

    const updates = {
      tipo_documento:   tipo,
      numero_documento: numero || null,
      fecha_documento:  fecha  || null,
      observaciones:    obs    || null,
    }

    if (archivo) {
      // Borrar archivo anterior si existe
      if (doc.url_storage) {
        const oldPath = doc.url_storage.split("/storage/v1/object/public/documentos/")[1]
        if (oldPath) await db.storage.from("documentos").remove([oldPath])
      }
      const ext  = archivo.name.split(".").pop()
      const path = `documentos/${ordenId}/edit_${Date.now()}.${ext}`
      const { error: upErr } = await db.storage.from("documentos").upload(path, archivo)
      if (!upErr) {
        const { data: urlData } = db.storage.from("documentos").getPublicUrl(path)
        updates.url_storage    = urlData.publicUrl
        updates.nombre_archivo = archivo.name
      }
    }

    const { error } = await db.from("documentos_orden").update(updates).eq("id", doc.id)
    if (error) { alert("Error: " + error.message); return }
    document.body.removeChild(overlay)
    await renderDocumentos()
  })
}

// Modal subir documento
document.getElementById("upload-zone").addEventListener("click", () => {
  document.getElementById("doc-archivo").click()
})

document.getElementById("doc-archivo").addEventListener("change", function() {
  if (this.files[0]) {
    const nombre = document.getElementById("doc-archivo-nombre")
    nombre.textContent = this.files[0].name
    nombre.style.display = "block"
  }
})

document.getElementById("modal-doc-cancelar").addEventListener("click", () => {
  document.getElementById("modal-doc").classList.remove("visible")
})

document.getElementById("modal-doc-guardar").addEventListener("click", async () => {
  const tipo    = document.getElementById("doc-tipo").value
  const numero  = document.getElementById("doc-numero").value.trim()
  const fecha   = document.getElementById("doc-fecha").value
  const obs     = document.getElementById("doc-obs").value.trim()
  const archivo = document.getElementById("doc-archivo").files[0]

  let urlStorage = null
  let nombreArchivo = null

  if (archivo) {
    const ext      = archivo.name.split(".").pop()
    const path     = `documentos/${ordenId}/${Date.now()}.${ext}`
    const { error: upErr } = await db.storage.from("documentos").upload(path, archivo)
    if (upErr) { alert("Error al subir archivo: " + upErr.message); return }
    const { data: urlData } = db.storage.from("documentos").getPublicUrl(path)
    urlStorage    = urlData.publicUrl
    nombreArchivo = archivo.name
  }

  const { error } = await db.from("documentos_orden").insert({
    orden_id: ordenId,
    tipo_documento: tipo,
    numero_documento: numero || null,
    fecha_documento: fecha || null,
    observaciones: obs || null,
    url_storage: urlStorage,
    nombre_archivo: nombreArchivo,
    estado: "cargado",
    subido_por: usuarioActual.id
  })

  if (error) { alert("Error: " + error.message); return }
  document.getElementById("modal-doc").classList.remove("visible")
  document.getElementById("doc-numero").value = ""
  document.getElementById("doc-fecha").value  = ""
  document.getElementById("doc-obs").value    = ""
  document.getElementById("doc-archivo").value = ""
  document.getElementById("doc-archivo-nombre").style.display = "none"
  await renderDocumentos()
})

// ─────────────────────────────────────────────
// TAB FINANZAS (embed)
// ─────────────────────────────────────────────
async function renderFinanzas() {
  const cont = document.getElementById("tab-finanzas")
  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:13px;font-weight:600;color:#111827">Finanzas de ${ordenActual.numero}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">Costeo e ingresos de esta orden específica</div>
      </div>
      <a href="finanzas.html?orden=${ordenId}" class="btn btn-secondary btn-sm">Ver en módulo de finanzas →</a>
    </div>
  `

  const [compRes, costoRes] = await Promise.all([
    db.from("comprobantes").select("total,moneda").eq("orden_id", ordenId),
    db.from("costos_orden").select("monto,moneda").eq("orden_id", ordenId)
  ])

  const totalIngresos = (compRes.data || []).reduce((s,c) => s + parseFloat(c.total || 0), 0)
  const totalCostos   = (costoRes.data || []).reduce((s,c) => s + parseFloat(c.monto || 0), 0)
  const profit        = totalIngresos - totalCostos

  const resumen = document.createElement("div")
  resumen.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:14px"
  resumen.innerHTML = `
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Ingresos</div><div class="kpi-val" style="font-size:20px;color:#059669">$${totalIngresos.toFixed(2)}</div></div>
      <div class="kpi-ico green"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Costos</div><div class="kpi-val" style="font-size:20px">$${totalCostos.toFixed(2)}</div></div>
      <div class="kpi-ico red"><svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Profit</div><div class="kpi-val" style="font-size:20px;color:${profit >= 0 ? "#7c3aed" : "#dc2626"}">$${profit.toFixed(2)}</div></div>
      <div class="kpi-ico purple"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
    </div>
  `
  cont.appendChild(resumen)
}

// ─────────────────────────────────────────────
// TAB CONTENEDORES
// ─────────────────────────────────────────────
async function renderContenedores() {
  const cont = document.getElementById("tab-contenedores")
  cont.innerHTML = ""

  const { data: contenedores } = await db
    .from("contenedores").select("*").eq("orden_id", ordenId).order("created_at")

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#111827">${contenedores?.length || 0} contenedores registrados</div>
    <button class="btn btn-primary btn-sm" id="btn-nuevo-contenedor">+ Agregar contenedor</button>
  `
  cont.appendChild(header)

  const formWrap = document.createElement("div")
  formWrap.className = "form-inline"
  formWrap.id = "form-contenedor"
  formWrap.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Número contenedor</label><input class="form-input" type="text" id="cont-numero" placeholder="MSCU1234567" /></div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select class="form-select" id="cont-tipo">
          <option>20GP</option><option>40GP</option><option>40HC</option><option>20RF</option><option>40RF</option><option>LCL</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Sello / precinto</label><input class="form-input" type="text" id="cont-sello" placeholder="PR123456" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Peso (kg)</label><input class="form-input" type="number" id="cont-peso" placeholder="0" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Volumen (m³)</label><input class="form-input" type="number" id="cont-volumen" placeholder="0" step="0.01" /></div>
      <div class="form-group"><label class="form-label">Bultos</label><input class="form-input" type="number" id="cont-bultos" placeholder="0" /></div>
      <div class="form-group"><label class="form-label">Tipo bulto</label>
        <select class="form-select" id="cont-tipo-bulto">
          <option>Pallets</option><option>Cajas</option><option>Rollos</option><option>Tambores</option><option>Sacos</option><option>Granel</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Descripción de carga</label><input class="form-input" type="text" id="cont-desc" placeholder="Descripción de mercancía..." /></div>
    <div class="form-inline-btns">
      <button class="btn btn-secondary btn-sm" id="btn-cancelar-cont">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-guardar-cont">Guardar contenedor</button>
    </div>
  `
  cont.appendChild(formWrap)

  document.getElementById("btn-nuevo-contenedor").addEventListener("click", () => {
    formWrap.classList.toggle("visible")
  })
  document.getElementById("btn-cancelar-cont").addEventListener("click", () => {
    formWrap.classList.remove("visible")
  })
  document.getElementById("btn-guardar-cont").addEventListener("click", async () => {
    const { error } = await db.from("contenedores").insert({
      orden_id:          ordenId,
      numero_contenedor: document.getElementById("cont-numero").value.trim(),
      tipo:              document.getElementById("cont-tipo").value,
      sello:             document.getElementById("cont-sello").value.trim(),
      peso_kg:           parseFloat(document.getElementById("cont-peso").value) || null,
      volumen_m3:        parseFloat(document.getElementById("cont-volumen").value) || null,
      cantidad_bultos:   parseInt(document.getElementById("cont-bultos").value) || null,
      tipo_bulto:        document.getElementById("cont-tipo-bulto").value,
      descripcion:       document.getElementById("cont-desc").value.trim(),
    })
    if (error) { alert("Error: " + error.message); return }
    formWrap.classList.remove("visible")
    await renderContenedores()
  })

  if (!contenedores?.length) {
    const empty = document.createElement("div")
    empty.className = "panel-vacio"
    empty.innerHTML = `<div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><p>Sin contenedores</p><span>Agrega los contenedores de esta orden</span>`
    cont.appendChild(empty)
    return
  }

  const grid = document.createElement("div")
  grid.className = "cont-row"
  contenedores.forEach(c => {
    const card = document.createElement("div")
    card.className = "cont-card"
    card.innerHTML = `
      <div class="cont-card-head">
        <span class="cont-num">${c.numero_contenedor || "Sin número"}</span>
        <span class="pill" style="background:#f3f4f6;color:#6b7280">${c.tipo}</span>
      </div>
      <div class="field-grid" style="grid-template-columns:1fr 1fr;gap:10px">
        <div class="field-item"><div class="field-lbl">Sello</div><div class="field-val ${!c.sello ? "empty" : ""}">${c.sello || "—"}</div></div>
        <div class="field-item"><div class="field-lbl">Peso</div><div class="field-val">${c.peso_kg ? c.peso_kg + " kg" : "—"}</div></div>
        <div class="field-item"><div class="field-lbl">Volumen</div><div class="field-val">${c.volumen_m3 ? c.volumen_m3 + " m³" : "—"}</div></div>
        <div class="field-item"><div class="field-lbl">Bultos</div><div class="field-val">${c.cantidad_bultos ? c.cantidad_bultos + " " + (c.tipo_bulto || "") : "—"}</div></div>
      </div>
      ${c.descripcion ? `<div style="font-size:11px;color:#6b7280;margin-top:10px">${c.descripcion}</div>` : ""}
    `
    grid.appendChild(card)
  })
  cont.appendChild(grid)
}

// ─────────────────────────────────────────────
// EDICIÓN
// ─────────────────────────────────────────────
function toggleEdicion(activar) {
  modoEdicion = activar
  document.getElementById("btn-editar").classList.toggle("hidden", activar)
  document.getElementById("btn-guardar").classList.toggle("hidden", !activar)
  document.getElementById("btn-cancelar-edit").classList.toggle("hidden", !activar)
  document.getElementById("select-estado").style.display = activar ? "block" : "none"
  document.getElementById("topbar-estado").style.display = activar ? "none" : "inline-flex"

  if (tabActiva === "general") renderGeneral(ordenActual)
}

document.getElementById("btn-editar").addEventListener("click", () => toggleEdicion(true))
document.getElementById("btn-cancelar-edit").addEventListener("click", () => {
  toggleEdicion(false)
  renderGeneral(ordenActual)
})
document.getElementById("btn-guardar").addEventListener("click", async () => {
  const nuevoEstado = document.getElementById("select-estado").value
  if (nuevoEstado !== ordenActual.estado) {
    await db.from("ordenes").update({ estado: nuevoEstado }).eq("id", ordenId)
  }
  await guardarCampos()
})

// ─────────────────────────────────────────────
// TAB UNIDADES DE CARGA
// ─────────────────────────────────────────────
async function renderUnidadesCarga() {
  const cont = document.getElementById("tab-carga")
  cont.innerHTML = ""

  const o = ordenActual
  const esFCL = o.tipo_carga === "FCL"
  const tipoUnidad = esFCL ? "contenedor" : (o.tipo === "AIR" ? "awb" : "hbl")
  const labelUnidad = esFCL ? "Contenedor" : (o.tipo === "AIR" ? "AWB" : "HBL")

  const { data: unidades } = await db
    .from("unidades_carga").select("*")
    .eq("orden_id", ordenId)
    .order("created_at")

  // Header con resumen
  const totalBultos = (unidades || []).reduce((s,u) => s + (u.bultos || 0), 0)
  const totalPeso   = (unidades || []).reduce((s,u) => s + parseFloat(u.peso_kg || 0), 0)
  const totalVol    = (unidades || []).reduce((s,u) => s + parseFloat(u.volumen_m3 || 0), 0)

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div style="display:flex;gap:16px;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:600;color:#111827">${unidades?.length || 0} ${labelUnidad}${(unidades?.length || 0) !== 1 ? "s" : ""} registrados</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">
          ${totalBultos} bultos · ${totalPeso.toFixed(0)} kg · ${totalVol.toFixed(2)} m³
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      ${ordenActual.estado !== "anulada" ? `<button class="btn btn-primary btn-sm" id="btn-nueva-unidad">+ Agregar ${labelUnidad}</button>` : ""}
    </div>
  `
  cont.appendChild(header)

  // Formulario inline
  const formWrap = document.createElement("div")
  formWrap.className = "form-inline"
  formWrap.id = "form-unidad"

  if (esFCL) {
    formWrap.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px">Datos del contenedor</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Número de contenedor *</label>
          <input class="form-input" type="text" id="u-referencia" placeholder="MSCU1234567" style="text-transform:uppercase" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="u-tipo-cnt">
            <option value="20GP">20GP — Estándar 20'</option>
            <option value="40GP">40GP — Estándar 40'</option>
            <option value="40HC">40HC — High Cube 40'</option>
            <option value="20RF">20RF — Refrigerado 20'</option>
            <option value="40RF">40RF — Refrigerado 40'</option>
            <option value="20OT">20OT — Open Top 20'</option>
            <option value="40OT">40OT — Open Top 40'</option>
            <option value="45HC">45HC — High Cube 45'</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sello / precinto</label>
          <input class="form-input" type="text" id="u-sello" placeholder="PR123456" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Bultos</label>
          <input class="form-input" type="number" id="u-bultos" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Peso bruto (kg)</label>
          <input class="form-input" type="number" id="u-peso" placeholder="0.00" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Volumen (m³)</label>
          <input class="form-input" type="number" id="u-volumen" placeholder="0.00" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de bulto</label>
          <select class="form-select" id="u-tipo-bulto">
            <option value="">Selecciona...</option>
            <option>Pallets</option><option>Cajas</option><option>Rollos</option>
            <option>Tambores</option><option>Sacos</option><option>Granel</option><option>Otro</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción de carga</label>
        <input class="form-input" type="text" id="u-descripcion" placeholder="Descripción de la mercancía..." />
      </div>
      <div class="form-inline-btns">
        <button class="btn btn-secondary btn-sm" id="btn-cancelar-unidad">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="btn-guardar-unidad">Guardar contenedor</button>
      </div>
    `
  } else {
    formWrap.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px">Datos del ${labelUnidad}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Número ${labelUnidad} *</label>
          <input class="form-input" type="text" id="u-referencia" placeholder="${o.tipo === "AIR" ? "12345678" : "HLCU123456789"}" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de bulto</label>
          <select class="form-select" id="u-tipo-bulto">
            <option value="">Selecciona...</option>
            <option>Cajas</option><option>Pallets</option><option>Rollos</option>
            <option>Sacos</option><option>Tambores</option><option>Otro</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Bultos</label>
          <input class="form-input" type="number" id="u-bultos" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Peso bruto (kg)</label>
          <input class="form-input" type="number" id="u-peso" placeholder="0.00" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Volumen (m³)</label>
          <input class="form-input" type="number" id="u-volumen" placeholder="0.00" step="0.01" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción de carga</label>
        <input class="form-input" type="text" id="u-descripcion" placeholder="Descripción de la mercancía..." />
      </div>
      <div class="form-inline-btns">
        <button class="btn btn-secondary btn-sm" id="btn-cancelar-unidad">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="btn-guardar-unidad">Guardar ${labelUnidad}</button>
      </div>
    `
  }

  cont.appendChild(formWrap)

  // Eventos formulario
  document.getElementById("btn-nueva-unidad")?.addEventListener("click", () => {
    formWrap.classList.toggle("visible")
  })

  document.getElementById("btn-cancelar-unidad").addEventListener("click", () => {
    formWrap.classList.remove("visible")
  })

  document.getElementById("btn-guardar-unidad").addEventListener("click", async () => {
    const referencia = document.getElementById("u-referencia").value.trim().toUpperCase()
    if (!referencia) { alert(`Ingresa el número de ${labelUnidad}`); return }

    const payload = {
      orden_id:        ordenId,
      tipo_unidad:     tipoUnidad,
      referencia,
      bultos:          parseInt(document.getElementById("u-bultos")?.value) || null,
      peso_kg:         parseFloat(document.getElementById("u-peso")?.value) || null,
      volumen_m3:      parseFloat(document.getElementById("u-volumen")?.value) || null,
      tipo_bulto:      document.getElementById("u-tipo-bulto")?.value || null,
      descripcion:     document.getElementById("u-descripcion")?.value.trim() || null,
      estado:          "en_transito",
    }

    if (esFCL) {
      payload.tipo_contenedor = document.getElementById("u-tipo-cnt")?.value || null
      payload.sello           = document.getElementById("u-sello")?.value.trim() || null
    }

    const { error } = await db.from("unidades_carga").insert(payload)
    if (error) { alert("Error: " + error.message); return }

    formWrap.classList.remove("visible")
    await renderUnidadesCarga()
  })

  // Lista de unidades
  if (!unidades?.length) {
    const empty = document.createElement("div")
    empty.className = "panel-vacio"
    empty.innerHTML = `
      <div class="panel-vacio-icon">
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <p>Sin unidades de carga</p>
      <span>Agrega los ${labelUnidad}s de esta orden</span>
    `
    cont.appendChild(empty)
    return
  }

  const estadoColor = {
    en_transito:          { bg:"#eff6ff", color:"#2563eb", lbl:"En tránsito" },
    en_deposito:          { bg:"#fefce8", color:"#ca8a04", lbl:"En depósito" },
    despachado_parcial:   { bg:"#f5f3ff", color:"#7c3aed", lbl:"Despachado parcial" },
    despachado_total:     { bg:"#ecfdf5", color:"#059669", lbl:"Despachado total" },
  }

  const grid = document.createElement("div")
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px"

  unidades.forEach(u => {
    const est = estadoColor[u.estado] || { bg:"#f3f4f6", color:"#6b7280", lbl: u.estado }
    const card = document.createElement("div")
    card.className = "card"
    card.innerHTML = `
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-size:14px;font-weight:700;color:#111827;font-family:monospace">${u.referencia}</div>
            ${u.tipo_contenedor ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${u.tipo_contenedor}</div>` : ""}
          </div>
          <span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:${est.bg};color:${est.color}">${est.lbl}</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Bultos</div>
            <div style="font-size:13px;font-weight:600;color:#111827">${u.bultos || "—"}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Peso</div>
            <div style="font-size:13px;font-weight:600;color:#111827">${u.peso_kg ? u.peso_kg + " kg" : "—"}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Volumen</div>
            <div style="font-size:13px;font-weight:600;color:#111827">${u.volumen_m3 ? u.volumen_m3 + " m³" : "—"}</div>
          </div>
        </div>

        ${u.sello ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px">Sello: <strong>${u.sello}</strong></div>` : ""}
        ${u.tipo_bulto ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px">Tipo: ${u.tipo_bulto}</div>` : ""}
        ${u.descripcion ? `<div style="font-size:11px;color:#6b7280;padding:8px;background:#fafafa;border-radius:6px;margin-bottom:8px">${u.descripcion}</div>` : ""}

        ${u.almacen_id ? `
          <div style="font-size:10px;color:#7c3aed;font-weight:600;display:flex;align-items:center;gap:4px">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            En almacén registrado
          </div>
        ` : ""}

        ${u.estado !== "despachado_total" && ordenActual.estado !== "anulada" ? `
          <div style="display:flex;gap:6px;margin-top:10px">
            <button class="btn btn-danger btn-xs btn-eliminar-unidad" data-id="${u.id}">Eliminar</button>
          </div>
        ` : ""}
      </div>
    `

    card.querySelector(".btn-eliminar-unidad")?.addEventListener("click", async function() {
      if (!confirm("¿Eliminar esta unidad de carga?")) return
      const { error } = await db.from("unidades_carga").delete().eq("id", this.dataset.id)
      if (error) { alert("Error: " + error.message); return }
      await renderUnidadesCarga()
    })

    grid.appendChild(card)
  })

  cont.appendChild(grid)
}
// ─────────────────────────────────────────────
// TAB STOCK DE LA ORDEN
// ─────────────────────────────────────────────
async function renderStockOrden() {
  const cont = document.getElementById("tab-stock")
  cont.innerHTML = ""

  const { data: lotes } = await db
    .from("stock_lotes")
    .select("*, almacenes(nombre, tipo)")
    .eq("orden_id", ordenId)
    .order("created_at")

  const header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"
  header.innerHTML = `
    <div>
      <div style="font-size:13px;font-weight:600;color:#111827">Control de stock — ${ordenActual.numero}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">${lotes?.length || 0} lote${(lotes?.length || 0) !== 1 ? "s" : ""} registrado${(lotes?.length || 0) !== 1 ? "s" : ""}</div>
    </div>
    ${ordenActual.estado !== "anulada" ? `<button class="btn btn-primary btn-sm" id="btn-nuevo-lote">+ Registrar direccionamiento</button>` : ""}
  `
  cont.appendChild(header)

  // Formulario de nuevo lote
  const { data: almacenes } = await db
    .from("almacenes").select("id,nombre,tipo,dias_maximos").eq("activo", true).order("tipo").order("nombre")

  const formLote = document.createElement("div")
  formLote.className = "form-inline"
  formLote.id = "form-lote"

  const { data: unidades } = await db
    .from("unidades_carga").select("*").eq("orden_id", ordenId)

  const opcionesAlmacen = (almacenes || []).map(a =>
    `<option value="${a.id}" data-tipo="${a.tipo}" data-dias="${a.dias_maximos || 0}">${a.nombre} (${a.tipo})</option>`
  ).join("")

  const opcionesUnidades = (unidades || []).map(u =>
    `<option value="${u.id}">${u.referencia} — ${u.tipo_unidad.toUpperCase()} · ${u.bultos || 0} bultos · ${u.peso_kg || 0} kg</option>`
  ).join("")

  formLote.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px">Direccionamiento de carga</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Almacén destino *</label>
        <select class="form-select" id="lote-almacen">${opcionesAlmacen}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de direccionamiento</label>
        <input class="form-input" type="text" id="lote-tipo-dir" readonly style="background:#f9fafb;font-size:12px" />
      </div>
      <div class="form-group">
        <label class="form-label">Referencia BL / HBL / AWB</label>
        <input class="form-input" type="text" id="lote-ref-bl" placeholder="Número del BL principal" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha de direccionamiento</label>
        <input class="form-input" type="date" id="lote-fecha-dir" value="${new Date().toISOString().split("T")[0]}" />
      </div>
      <div class="form-group">
        <label class="form-label">Días máximos en almacén</label>
        <input class="form-input" type="number" id="lote-dias-max" placeholder="30" />
      </div>
    </div>

    ${unidades?.length ? `
      <div class="form-group">
        <label class="form-label">Unidades de carga incluidas *</label>
        <select class="form-select" id="lote-unidades" multiple style="min-height:100px">
          ${opcionesUnidades}
        </select>
        <div style="font-size:10px;color:#9ca3af;margin-top:3px">Ctrl+clic para seleccionar múltiples</div>
      </div>
    ` : `
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:12px;color:#92400e">
        ⚠ No hay unidades de carga registradas. Agrégalas primero en el tab "Unidades de carga".
      </div>
    `}

    <div class="form-group">
      <label class="form-label">Observaciones</label>
      <input class="form-input" type="text" id="lote-obs" placeholder="Notas del direccionamiento..." />
    </div>
    <div class="form-inline-btns">
      <button class="btn btn-secondary btn-sm" id="btn-cancelar-lote">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-guardar-lote">Registrar direccionamiento</button>
    </div>
  `
  cont.appendChild(formLote)

  // Actualizar tipo automático al cambiar almacén
  document.getElementById("lote-almacen")?.addEventListener("change", function() {
    const opt = this.options[this.selectedIndex]
    document.getElementById("lote-tipo-dir").value = opt.dataset.tipo || ""
    const dias = opt.dataset.dias
    if (dias && parseInt(dias) > 0) {
      document.getElementById("lote-dias-max").value = dias
    }
  })

  // Disparar change inicial
  document.getElementById("lote-almacen")?.dispatchEvent(new Event("change"))

  document.getElementById("btn-nuevo-lote")?.addEventListener("click", () => {
    formLote.classList.toggle("visible")
  })

  document.getElementById("btn-cancelar-lote").addEventListener("click", () => {
    formLote.classList.remove("visible")
  })

  document.getElementById("btn-guardar-lote").addEventListener("click", async () => {
    const almacenId = document.getElementById("lote-almacen").value
    const tipoDir   = document.getElementById("lote-tipo-dir").value
    const refBl     = document.getElementById("lote-ref-bl").value.trim()
    const fechaDir  = document.getElementById("lote-fecha-dir").value
    const diasMax   = parseInt(document.getElementById("lote-dias-max").value) || null
    const obs       = document.getElementById("lote-obs").value.trim()

    if (!almacenId || !refBl) {
      alert("Selecciona almacén e ingresa la referencia del BL")
      return
    }

    // Calcular unidades seleccionadas
    const selUnidades = document.getElementById("lote-unidades")
    const unidadesSeleccionadas = selUnidades
      ? Array.from(selUnidades.selectedOptions).map(o => o.value)
      : []

    if (!unidadesSeleccionadas.length && unidades?.length) {
      alert("Selecciona al menos una unidad de carga")
      return
    }

    // Calcular totales de las unidades seleccionadas
    const unidadesData = (unidades || []).filter(u => unidadesSeleccionadas.includes(String(u.id)))
    const totalBultos  = unidadesData.reduce((s,u) => s + (u.bultos || 0), 0)
    const totalPeso    = unidadesData.reduce((s,u) => s + parseFloat(u.peso_kg || 0), 0)
    const totalVol     = unidadesData.reduce((s,u) => s + parseFloat(u.volumen_m3 || 0), 0)

    // Calcular fecha de vencimiento
    let fechaVenc = null
    if (diasMax && fechaDir) {
      const fv = new Date(fechaDir)
      fv.setDate(fv.getDate() + diasMax)
      fechaVenc = fv.toISOString().split("T")[0]
    }

    const { data: lote, error } = await db.from("stock_lotes").insert({
      orden_id:              ordenId,
      almacen_id:            parseInt(almacenId),
      tipo_direccionamiento: tipoDir,
      referencia_bl:         refBl,
      fecha_direccionamiento: fechaDir ? new Date(fechaDir).toISOString() : new Date().toISOString(),
      fecha_vencimiento:     fechaVenc,
      total_bultos:          totalBultos,
      total_peso_kg:         totalPeso,
      total_volumen_m3:      totalVol,
      total_unidades:        unidadesSeleccionadas.length,
      saldo_bultos:          totalBultos,
      saldo_peso_kg:         totalPeso,
      saldo_unidades:        unidadesSeleccionadas.length,
      estado:                "pendiente_ingreso",
      observaciones:         obs || null
    }).select().single()

    if (error) { alert("Error: " + error.message); return }

    // Actualizar estado de las unidades seleccionadas
    if (unidadesSeleccionadas.length) {
      await db.from("unidades_carga")
        .update({ estado: "en_deposito", almacen_id: parseInt(almacenId) })
        .in("id", unidadesSeleccionadas.map(Number))
    }

    // Registrar movimiento de ingreso
    await db.from("stock_movimientos").insert({
      lote_id:          lote.id,
      orden_id:         ordenId,
      tipo_movimiento:  "ingreso",
      unidades:         unidadesSeleccionadas.length,
      bultos:           totalBultos,
      peso_kg:          totalPeso,
      volumen_m3:       totalVol,
      observaciones:    `Direccionamiento a ${tipoDir}`,
      registrado_por:   usuarioActual.id,
      fecha_movimiento: new Date().toISOString()
    })

    formLote.classList.remove("visible")
    await renderStockOrden()
  })

  // Render lotes existentes
  if (!lotes?.length) {
    const empty = document.createElement("div")
    empty.className = "panel-vacio"
    empty.innerHTML = `
      <div class="panel-vacio-icon">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <p>Sin direccionamientos registrados</p>
      <span>Registra el primer direccionamiento de esta carga</span>
    `
    cont.appendChild(empty)
    return
  }

  lotes.forEach(lote => {
    const card = document.createElement("div")
    card.className = "card"
    card.style.marginBottom = "12px"

    const diasEnAlmacen = lote.fecha_ingreso
      ? Math.floor((new Date() - new Date(lote.fecha_ingreso)) / (1000*60*60*24))
      : null

    const diasRestantes = lote.fecha_vencimiento
      ? Math.floor((new Date(lote.fecha_vencimiento) - new Date()) / (1000*60*60*24))
      : null

    const alertaDias = diasRestantes !== null && diasRestantes <= 10
    const pctUsado   = lote.total_unidades > 0
      ? Math.round(((lote.total_unidades - lote.saldo_unidades) / lote.total_unidades) * 100)
      : 0

    const estadoLote = {
      pendiente_ingreso:      { bg:"#f3f4f6", color:"#6b7280",  lbl:"Pendiente ingreso" },
      ingresado:              { bg:"#eff6ff", color:"#2563eb",  lbl:"Ingresado" },
      parcialmente_despachado:{ bg:"#f5f3ff", color:"#7c3aed",  lbl:"Parcialmente despachado" },
      despachado_total:       { bg:"#ecfdf5", color:"#059669",  lbl:"Despachado total" },
    }
    const est = estadoLote[lote.estado] || { bg:"#f3f4f6", color:"#6b7280", lbl:lote.estado }

    card.innerHTML = `
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
          <div>
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:4px">
              ${lote.almacenes?.nombre || "—"}
              <span style="font-size:10px;font-weight:500;color:#9ca3af;margin-left:6px">${lote.almacenes?.tipo || ""}</span>
            </div>
            <div style="font-size:12px;color:#6b7280">BL: <strong style="color:#111827">${lote.referencia_bl}</strong></div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:${est.bg};color:${est.color}">${est.lbl}</span>
            ${alertaDias ? `<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:#fef2f2;color:#dc2626">⚠ Vence en ${diasRestantes}d</span>` : ""}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Unidades</div>
            <div style="font-size:16px;font-weight:700;color:#111827">${lote.saldo_unidades}<span style="font-size:11px;color:#9ca3af">/${lote.total_unidades}</span></div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Bultos</div>
            <div style="font-size:16px;font-weight:700;color:#111827">${lote.saldo_bultos}<span style="font-size:11px;color:#9ca3af">/${lote.total_bultos}</span></div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Días almacén</div>
            <div style="font-size:16px;font-weight:700;color:${diasEnAlmacen > 20 ? "#dc2626" : "#111827"}">${diasEnAlmacen !== null ? diasEnAlmacen + "d" : "—"}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Vencimiento</div>
            <div style="font-size:12px;font-weight:600;color:${alertaDias ? "#dc2626" : "#111827"}">${lote.fecha_vencimiento || "—"}</div>
          </div>
        </div>

        <!-- Barra de progreso de despacho -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:4px">
            <span>Progreso de despacho</span>
            <span>${pctUsado}% despachado</span>
          </div>
          <div style="height:5px;background:#f3f4f6;border-radius:3px;overflow:hidden">
            <div style="width:${pctUsado}%;height:100%;background:${pctUsado === 100 ? "#059669" : "#7c3aed"};border-radius:3px"></div>
          </div>
        </div>

        <!-- Fechas -->
        <div style="display:flex;gap:16px;font-size:11px;color:#9ca3af;margin-bottom:14px">
          <span>Direccionado: ${new Date(lote.fecha_direccionamiento).toLocaleDateString("es-PE")}</span>
          ${lote.fecha_ingreso ? `<span>Ingreso físico: ${new Date(lote.fecha_ingreso).toLocaleDateString("es-PE")}</span>` : "<span style='color:#f59e0b'>⏳ Pendiente de ingreso físico</span>"}
        </div>

        <!-- Acciones -->
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${lote.estado === "pendiente_ingreso" ? `
            <button class="btn btn-primary btn-sm btn-confirmar-ingreso" data-id="${lote.id}">
              Confirmar ingreso físico
            </button>
          ` : ""}
          ${lote.estado !== "despachado_total" && lote.estado !== "pendiente_ingreso" ? `
            <button class="btn btn-secondary btn-sm btn-registrar-retiro" data-id="${lote.id}" data-lote='${JSON.stringify({id:lote.id, saldo_unidades:lote.saldo_unidades, saldo_bultos:lote.saldo_bultos, saldo_peso_kg:lote.saldo_peso_kg, referencia_bl:lote.referencia_bl})}'>
              Registrar retiro
            </button>
          ` : ""}
          <button class="btn btn-secondary btn-sm btn-ver-movimientos" data-id="${lote.id}">
            Ver movimientos
          </button>
        </div>
      </div>
    `

    // Confirmar ingreso físico
    card.querySelector(".btn-confirmar-ingreso")?.addEventListener("click", () => {
      abrirModalIngreso(lote.id)
    })

    // Registrar retiro
    card.querySelector(".btn-registrar-retiro")?.addEventListener("click", async function() {
      const loteData = JSON.parse(this.dataset.lote)
      await abrirModalRetiro(loteData)
    })

    // Ver movimientos
    card.querySelector(".btn-ver-movimientos")?.addEventListener("click", () => {
      verMovimientos(lote.id, cont)
    })

    cont.appendChild(card)
  })
}

// ─────────────────────────────────────────────
// MODAL CONFIRMAR INGRESO FÍSICO
// ─────────────────────────────────────────────
function abrirModalIngreso(loteId) {
  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">Confirmar ingreso físico</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">Registra cuando la carga ingresó físicamente al almacén</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Fecha y hora de ingreso *</label>
          <input class="form-input" type="datetime-local" id="ing-fecha" value="${new Date(new Date()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Número de volante</label>
          <input class="form-input" type="text" id="ing-volante" placeholder="Número del volante de ingreso" />
        </div>
        <div class="form-group">
          <label class="form-label">Ticket de puerto (por unidad si aplica)</label>
          <input class="form-input" type="text" id="ing-ticket" placeholder="Número/s de ticket de salida de puerto" />
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input class="form-input" type="text" id="ing-obs" placeholder="Notas del ingreso..." />
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="ing-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="ing-confirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Confirmar ingreso</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById("ing-cancelar").addEventListener("click", () => document.body.removeChild(overlay))
  document.getElementById("ing-confirmar").addEventListener("click", async () => {
    const fecha   = document.getElementById("ing-fecha").value
    const volante = document.getElementById("ing-volante").value.trim()
    const ticket  = document.getElementById("ing-ticket").value.trim()
    const obs     = document.getElementById("ing-obs").value.trim()

    if (!fecha) { alert("Ingresa la fecha de ingreso"); return }

    await db.from("stock_lotes").update({
      estado:               "ingresado",
      fecha_ingreso:        new Date(fecha).toISOString(),
      numero_volante:       volante || null,
      numero_ticket_puerto: ticket  || null,
    }).eq("id", loteId)

    // Actualizar también la orden
    if (volante) await db.from("ordenes").update({ volante }).eq("id", ordenId)

    await db.from("stock_movimientos").insert({
      lote_id:          loteId,
      orden_id:         ordenId,
      tipo_movimiento:  "ingreso",
      observaciones:    `Ingreso físico confirmado${volante ? ` · Volante: ${volante}` : ""}${ticket ? ` · Ticket: ${ticket}` : ""}`,
      registrado_por:   usuarioActual.id,
      fecha_movimiento: new Date(fecha).toISOString()
    })

    document.body.removeChild(overlay)
    await renderStockOrden()
  })
}

// ─────────────────────────────────────────────
// MODAL REGISTRAR RETIRO
// ─────────────────────────────────────────────
async function abrirModalRetiro(lote) {
  const { data: unidadesEnLote } = await db
    .from("unidades_carga").select("*")
    .eq("orden_id", ordenId)
    .eq("almacen_id", (await db.from("stock_lotes").select("almacen_id").eq("id", lote.id).single()).data?.almacen_id)
    .neq("estado", "despachado_total")

  const { data: ordenesAduana } = await db
    .from("ordenes").select("id,numero,tipo")
    .eq("orden_carga_id", ordenId)
    .in("tipo", ["ADU","SLI"])
    .eq("activo", true)

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">Registrar retiro de carga</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">BL: ${lote.referencia_bl} · Saldo: ${lote.saldo_unidades} unidades / ${lote.saldo_bultos} bultos</div>

      <div style="display:flex;flex-direction:column;gap:12px">

        <div class="form-group">
          <label class="form-label">Orden TL asociada al retiro</label>
          <select class="form-select" id="ret-orden-tl">
            <option value="">Sin orden TL (registrar manualmente)</option>
          </select>
        </div>

        ${ordenesAduana?.length ? `
          <div class="form-group">
            <label class="form-label">Orden de aduanas asociada</label>
            <select class="form-select" id="ret-orden-adu">
              <option value="">— Selecciona —</option>
              ${ordenesAduana.map(o => `<option value="${o.id}">${o.numero} (${o.tipo})</option>`).join("")}
            </select>
          </div>
        ` : ""}

        ${unidadesEnLote?.length ? `
          <div class="form-group">
            <label class="form-label">Unidades a retirar</label>
            <select class="form-select" id="ret-unidades" multiple style="min-height:100px">
              ${unidadesEnLote.map(u => `
                <option value="${u.id}" data-bultos="${u.bultos||0}" data-peso="${u.peso_kg||0}" data-vol="${u.volumen_m3||0}">
                  ${u.referencia} · ${u.tipo_contenedor || u.tipo_unidad.toUpperCase()} · ${u.bultos||0} bultos
                </option>
              `).join("")}
            </select>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px">Ctrl+clic para seleccionar múltiples</div>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Bultos a retirar</label>
            <input class="form-input" type="number" id="ret-bultos" placeholder="0" max="${lote.saldo_bultos}" />
          </div>
          <div class="form-group">
            <label class="form-label">Peso a retirar (kg)</label>
            <input class="form-input" type="number" id="ret-peso" placeholder="0.00" step="0.01" />
          </div>
        `}

        <div class="form-group">
          <label class="form-label">Guía de remisión / documento de retiro</label>
          <input class="form-input" type="text" id="ret-guia" placeholder="Número de guía de remisión" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de retiro</label>
          <input class="form-input" type="date" id="ret-fecha" value="${new Date().toISOString().split("T")[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input class="form-input" type="text" id="ret-obs" placeholder="Notas del retiro..." />
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="ret-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="ret-confirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Confirmar retiro</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // Cargar órdenes TL
  const { data: ordenesTL } = await db
    .from("ordenes").select("id,numero")
    .eq("tipo","TL").eq("activo",true)
    .order("created_at", { ascending:false })

  const selTL = document.getElementById("ret-orden-tl")
  ;(ordenesTL || []).forEach(o => {
    selTL.innerHTML += `<option value="${o.id}">${o.numero}</option>`
  })

  document.getElementById("ret-cancelar").addEventListener("click", () => document.body.removeChild(overlay))

  document.getElementById("ret-confirmar").addEventListener("click", async () => {
    const ordenTlId = document.getElementById("ret-orden-tl")?.value || null
    const guia      = document.getElementById("ret-guia")?.value.trim()
    const fecha     = document.getElementById("ret-fecha")?.value
    const obs       = document.getElementById("ret-obs")?.value.trim()

    const selUnidades = document.getElementById("ret-unidades")
    let unidadesSelIds = []
    let totalBultos = 0, totalPeso = 0, totalVol = 0, totalUnids = 0

    if (selUnidades) {
      const selOpts = Array.from(selUnidades.selectedOptions)
      if (!selOpts.length) { alert("Selecciona al menos una unidad"); return }
      unidadesSelIds = selOpts.map(o => parseInt(o.value))
      totalBultos    = selOpts.reduce((s,o) => s + parseInt(o.dataset.bultos||0), 0)
      totalPeso      = selOpts.reduce((s,o) => s + parseFloat(o.dataset.peso||0), 0)
      totalVol       = selOpts.reduce((s,o) => s + parseFloat(o.dataset.vol||0), 0)
      totalUnids     = selOpts.length
    } else {
      totalBultos = parseInt(document.getElementById("ret-bultos")?.value) || 0
      totalPeso   = parseFloat(document.getElementById("ret-peso")?.value) || 0
      totalUnids  = 1
      if (!totalBultos) { alert("Ingresa los bultos a retirar"); return }
    }

    // Registrar movimiento
    const { data: mov } = await db.from("stock_movimientos").insert({
      lote_id:          lote.id,
      orden_id:         ordenId,
      orden_tl_id:      ordenTlId || null,
      tipo_movimiento:  "retiro_parcial",
      unidades:         totalUnids,
      bultos:           totalBultos,
      peso_kg:          totalPeso,
      volumen_m3:       totalVol,
      referencia_doc:   guia  || null,
      observaciones:    obs   || null,
      registrado_por:   usuarioActual.id,
      fecha_movimiento: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
    }).select().single()

    // Registrar retiro de cada unidad
    if (unidadesSelIds.length && mov) {
      await db.from("retiro_unidades").insert(
        unidadesSelIds.map(uid => ({
          movimiento_id:  mov.id,
          unidad_carga_id: uid,
          orden_tl_id:    ordenTlId || null
        }))
      )

      // Actualizar estado de unidades
      await db.from("unidades_carga")
        .update({ estado: "despachado_total", orden_tl_id: ordenTlId || null })
        .in("id", unidadesSelIds)
    }

    // Actualizar saldos del lote
    const nuevoSaldoUnidades = lote.saldo_unidades - totalUnids
    const nuevoSaldoBultos   = lote.saldo_bultos   - totalBultos
    const nuevoSaldoPeso     = parseFloat(lote.saldo_peso_kg || 0) - totalPeso

    const nuevoEstado = nuevoSaldoUnidades <= 0
      ? "despachado_total"
      : "parcialmente_despachado"

    await db.from("stock_lotes").update({
      saldo_unidades: Math.max(0, nuevoSaldoUnidades),
      saldo_bultos:   Math.max(0, nuevoSaldoBultos),
      saldo_peso_kg:  Math.max(0, nuevoSaldoPeso),
      estado:         nuevoEstado
    }).eq("id", lote.id)

    document.body.removeChild(overlay)
    await renderStockOrden()
  })
}

// ─────────────────────────────────────────────
// VER MOVIMIENTOS DE UN LOTE
// ─────────────────────────────────────────────
async function verMovimientos(loteId, cont) {
  const { data: movs } = await db
    .from("stock_movimientos").select("*")
    .eq("lote_id", loteId)
    .order("fecha_movimiento")

  const existing = document.getElementById(`movs-${loteId}`)
  if (existing) { existing.remove(); return }

  const div = document.createElement("div")
  div.id = `movs-${loteId}`
  div.style.cssText = "background:#fafafa;border:1px solid #f3f4f6;border-radius:10px;padding:16px;margin-top:8px"

  div.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:12px">Movimientos del lote</div>
    ${!movs?.length ? "<p style='font-size:12px;color:#9ca3af'>Sin movimientos registrados</p>" :
      movs.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
          <div style="width:8px;height:8px;border-radius:50%;background:${m.tipo_movimiento==="ingreso" ? "#059669" : "#7c3aed"};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:500;color:#111827;text-transform:capitalize">${m.tipo_movimiento.replace(/_/g," ")}</div>
            <div style="font-size:10px;color:#9ca3af">${m.observaciones || "—"}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;color:#111827">${m.unidades || 0} u · ${m.bultos || 0} bultos</div>
            <div style="font-size:10px;color:#9ca3af">${new Date(m.fecha_movimiento).toLocaleDateString("es-PE")}</div>
          </div>
        </div>
      `).join("")
    }
  `

  cont.appendChild(div)
}

// ─── CARGAR AGENTES ADUANAS ───────────────────────────────────────────────
async function cargarAgentesAduanas() {
  const { data } = await db.from("agentes_aduanas").select("*").eq("activo", true).order("nombre")
  return data || []
}

// ─── AUTOCOMPLETA HITO ORDEN CREADA ──────────────────────────────────────
async function autoCompletarOrdenCreada(ordenId) {
  const { data: hitoCat } = await db
    .from("hitos_catalogo").select("id")
    .eq("tipo_orden", ordenActual.tipo)
    .eq("codigo", "orden_creada")
    .single()

  if (!hitoCat) return

  const { data: existe } = await db
    .from("hitos_operativos").select("id")
    .eq("orden_id", ordenId)
    .eq("hito_catalogo_id", hitoCat.id)
    .single()

  if (existe) return

  await db.from("hitos_operativos").insert({
    orden_id:         ordenId,
    hito_catalogo_id: hitoCat.id,
    estado:           "completado",
    observacion:      "Orden creada automáticamente",
    fecha_real:       ordenActual.created_at || new Date().toISOString()
  })
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return null
  return val.split("T")[0]
}

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

// ─────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────
inicializarUI()
cargarOrden()