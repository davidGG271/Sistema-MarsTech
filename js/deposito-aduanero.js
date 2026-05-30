const { createClient } = supabase
const SUPABASE_URL = "https://xeduwecilmygdtukxewl.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHV3ZWNpbG15Z2R0dWt4ZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDczOTQsImV4cCI6MjA5NTcyMzM5NH0.WxTBSrxG9DTGn08IURNrF3xU7gj7StDa5_aEFru_R7U"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let tabActiva      = "lotes"
let todosLosLotes  = []
let itemsDAForm    = []
let loteNacActual  = null
let almacenes      = []

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

  // Fecha numeración default hoy
  document.getElementById("da-fecha-num").value = new Date().toISOString().split("T")[0]

  // Fecha vencimiento default +1 año
  const venc = new Date()
  venc.setFullYear(venc.getFullYear() + 1)
  document.getElementById("da-fecha-venc").value = venc.toISOString().split("T")[0]

  // Auto-generar número de orden al cambiar tipo
  document.querySelectorAll("input[name='nac-tipo']").forEach(r => {
    r.addEventListener("change", generarNumeroOrdenNac)
  })
}

// ─────────────────────────────────────────────
// CARGA INICIAL
// ─────────────────────────────────────────────
async function cargarTodo() {
  const [almRes, lotesRes] = await Promise.all([
    db.from("almacenes").select("*").eq("activo", true).in("tipo",["DA","DT","Simple"]).order("nombre"),
    db.from("deposito_aduanero_lotes")
      .select(`*, almacenes(nombre,tipo), ordenes(numero,tipo,cliente_id, clientes(razon_social)),
               deposito_aduanero_items(*), da_nacionalizaciones(*, ordenes(numero,tipo,estado))`)
      .order("created_at", { ascending:false })
  ])

  almacenes    = almRes.data  || []
  todosLosLotes = lotesRes.data || []

  poblarFiltros()
  renderKPIs()
  renderAlertas()
  renderContenido()
}

function poblarFiltros() {
  const selAlm = document.getElementById("filtro-almacen-da")
  selAlm.innerHTML = `<option value="TODOS">Todos los almacenes</option>`
  almacenes.forEach(a => {
    selAlm.innerHTML += `<option value="${a.id}">${a.nombre}</option>`
  })

  // Selector del modal
  const selAlmModal = document.getElementById("da-almacen")
  selAlmModal.innerHTML = `<option value="">Selecciona almacén DA...</option>`
  almacenes.forEach(a => {
    selAlmModal.innerHTML += `<option value="${a.id}">${a.nombre} (${a.tipo})</option>`
  })
}

// ─────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────
function renderKPIs() {
  const activos   = todosLosLotes.filter(l => l.estado !== "nacionalizado_total")
  const enDep     = todosLosLotes.filter(l => l.estado === "en_deposito")
  const parcial   = todosLosLotes.filter(l => l.estado === "parcialmente_nacionalizado")
  const conAlerta = todosLosLotes.filter(l => {
    if (!l.fecha_vencimiento_da || l.estado === "nacionalizado_total") return false
    const dias = Math.floor((new Date(l.fecha_vencimiento_da) - new Date()) / (1000*60*60*24))
    return dias <= 30
  })
  const totalFOB  = activos.reduce((s,l) => s + parseFloat(l.valor_fob || 0), 0)

  document.getElementById("kpis-da").innerHTML = `
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Lotes activos</div><div class="kpi-val">${activos.length}</div><div class="kpi-trend nt">en depósito aduanero</div></div>
      <div class="kpi-ico red"><svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">En depósito total</div><div class="kpi-val">${enDep.length}</div><div class="kpi-trend nt">sin nacionalizar</div></div>
      <div class="kpi-ico amber"><svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Parc. nacionalizados</div><div class="kpi-val">${parcial.length}</div><div class="kpi-trend nt">en proceso</div></div>
      <div class="kpi-ico purple"><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">FOB total en DA</div><div class="kpi-val" style="font-size:20px">$${Math.round(totalFOB).toLocaleString()}</div><div class="kpi-trend nt">USD</div></div>
      <div class="kpi-ico green"><svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
    </div>
  `
}

// ─────────────────────────────────────────────
// ALERTAS DA
// ─────────────────────────────────────────────
function renderAlertas() {
  const alertas = todosLosLotes.filter(l => {
    if (!l.fecha_vencimiento_da || l.estado === "nacionalizado_total") return false
    const dias = Math.floor((new Date(l.fecha_vencimiento_da) - new Date()) / (1000*60*60*24))
    return dias <= 30
  })

  const cont = document.getElementById("alertas-da")
  if (!alertas.length) { cont.innerHTML = ""; return }

  cont.innerHTML = `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px">⚠ ${alertas.length} lote${alertas.length>1?"s":""} con vencimiento próximo</div>
      ${alertas.map(l => {
        const dias = Math.floor((new Date(l.fecha_vencimiento_da) - new Date()) / (1000*60*60*24))
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #fecaca">
            <span class="dam-badge">${l.numero_dam}</span>
            <span style="font-size:11px;color:#6b7280">${l.ordenes?.clientes?.razon_social || "—"}</span>
            <span style="font-size:11px;color:#6b7280">${l.almacenes?.nombre || "—"}</span>
            <span style="margin-left:auto;font-size:11px;font-weight:700;color:${dias<=0?"#dc2626":dias<=10?"#dc2626":"#d97706"}">
              ${dias<=0 ? "VENCIDO" : `Vence en ${dias}d`}
            </span>
            <span style="font-size:11px;color:#6b7280">FOB: $${parseFloat(l.valor_fob||0).toFixed(2)}</span>
          </div>
        `
      }).join("")}
    </div>
  `
}

// ─────────────────────────────────────────────
// FILTRAR
// ─────────────────────────────────────────────
function lotesFiltrados() {
  const estado   = document.getElementById("filtro-estado-da").value
  const almacen  = document.getElementById("filtro-almacen-da").value
  const busqueda = document.getElementById("filtro-busqueda-da").value.toLowerCase()

  return todosLosLotes.filter(l => {
    if (estado  !== "TODOS" && l.estado !== estado)                    return false
    if (almacen !== "TODOS" && String(l.almacen_id) !== almacen)      return false
    if (busqueda) {
      const dam     = l.numero_dam?.toLowerCase()                     || ""
      const orden   = l.ordenes?.numero?.toLowerCase()                || ""
      const cliente = l.ordenes?.clientes?.razon_social?.toLowerCase() || ""
      if (!dam.includes(busqueda) && !orden.includes(busqueda) && !cliente.includes(busqueda)) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────
function renderContenido() {
  const lotes = lotesFiltrados()
  if (tabActiva === "lotes")            renderLotes(lotes)
  if (tabActiva === "nacionalizaciones") renderNacionalizaciones()
  if (tabActiva === "reportes")         renderReportes(lotes)
}

// ─────────────────────────────────────────────
// VISTA LOTES DA
// ─────────────────────────────────────────────
function renderLotes(lotes) {
  const cont = document.getElementById("da-content")
  cont.innerHTML = ""

  if (!lotes.length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div><p>Sin lotes DA</p><span>No hay lotes de depósito aduanero registrados</span></div>`
    return
  }

  lotes.forEach(lote => {
    const items        = lote.deposito_aduanero_items || []
    const nacs         = lote.da_nacionalizaciones    || []
    const diasVenc     = lote.fecha_vencimiento_da
      ? Math.floor((new Date(lote.fecha_vencimiento_da) - new Date()) / (1000*60*60*24))
      : null
    const pctNac       = lote.total_items > 0
      ? Math.round((items.filter(i => i.estado_item === "agotado").length / items.length) * 100)
      : 0

    const estadoEtq = {
      en_deposito:              { bg:"#fef2f2", color:"#dc2626",  lbl:"En depósito" },
      parcialmente_nacionalizado:{ bg:"#f5f3ff", color:"#7c3aed", lbl:"Parc. nacionalizado" },
      nacionalizado_total:      { bg:"#ecfdf5", color:"#059669",  lbl:"Nacionalizado total" },
    }
    const est = estadoEtq[lote.estado] || { bg:"#f3f4f6", color:"#6b7280", lbl:lote.estado }

    const card = document.createElement("div")
    card.className = "lote-da-card"

    card.innerHTML = `
      <div class="lote-da-head">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="dam-badge">${lote.numero_dam}</span>
            <span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:${est.bg};color:${est.color}">${est.lbl}</span>
            ${diasVenc !== null && diasVenc <= 30 && lote.estado !== "nacionalizado_total"
              ? `<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:#fef2f2;color:#dc2626">⚠ ${diasVenc<=0?"VENCIDO":"Vence en "+diasVenc+"d"}</span>`
              : ""}
          </div>
          <div style="font-size:12px;color:#6b7280">
            ${lote.ordenes?.clientes?.razon_social || "Sin cliente"} ·
            Almacén: <strong>${lote.almacenes?.nombre || "—"}</strong> ·
            Orden: <a href="orden-detalle.html?id=${lote.orden_id}" style="color:#7c3aed;font-weight:600;text-decoration:none">${lote.ordenes?.numero || "—"}</a>
          </div>
          ${lote.descripcion_mercancia ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">${lote.descripcion_mercancia}</div>` : ""}
        </div>
        <div style="display:flex;gap:14px;text-align:right;flex-shrink:0;margin-left:20px">
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">FOB</div>
            <div style="font-size:14px;font-weight:700;color:#111827">$${parseFloat(lote.valor_fob||0).toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Ítems</div>
            <div style="font-size:14px;font-weight:700;color:#111827">${items.length}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Nacs.</div>
            <div style="font-size:14px;font-weight:700;color:#7c3aed">${nacs.length}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Vence DA</div>
            <div style="font-size:12px;font-weight:600;color:${diasVenc!==null&&diasVenc<=30?"#dc2626":"#111827"}">${lote.fecha_vencimiento_da || "—"}</div>
          </div>
        </div>
      </div>

      <!-- Progreso de nacionalización -->
      <div style="padding:14px 20px;border-bottom:1px solid #f3f4f6">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:6px">
          <span>Progreso de nacionalización</span>
          <span>${pctNac}% de ítems agotados</span>
        </div>
        <div style="height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden">
          <div style="width:${pctNac}%;height:100%;background:${pctNac===100?"#059669":"#7c3aed"};border-radius:3px;transition:width .3s"></div>
        </div>
      </div>

      <!-- Ítems -->
      ${items.length ? `
        <div style="padding:0">
          <div style="padding:10px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
            <div style="font-size:10px;font-weight:700;color:#374151;letter-spacing:0.5px;text-transform:uppercase">Ítems de la DAM</div>
          </div>
          ${items.map(item => {
            const pctItem = item.cantidad > 0
              ? Math.round((item.cantidad_nacionalizada / item.cantidad) * 100)
              : 0
            const clsItem = item.estado_item === "agotado" ? "#059669" : item.estado_item === "parcial" ? "#7c3aed" : "#9ca3af"
            return `
              <div class="item-da-row">
                <div class="item-num">${item.numero_item}</div>
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:500;color:#111827">${item.descripcion}</div>
                  <div style="font-size:10px;color:#9ca3af;margin-top:2px">
                    ${item.partida_arancelaria ? "P.A.: "+item.partida_arancelaria+" · " : ""}
                    ${item.unidad_medida || ""} · FOB: $${parseFloat(item.valor_fob||0).toFixed(2)}
                  </div>
                </div>
                <div style="text-align:center;min-width:80px">
                  <div style="font-size:13px;font-weight:700;color:${clsItem}">${item.cantidad_disponible}<span style="font-size:10px;color:#9ca3af">/${item.cantidad} ${item.unidad_medida||""}</span></div>
                  <div style="font-size:9px;color:#9ca3af;margin-top:1px">disponible</div>
                </div>
                <div class="prog-item" style="max-width:80px">
                  <div class="prog-item-fill" style="width:${pctItem}%;background:${clsItem}"></div>
                </div>
                <span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;background:${item.estado_item==="agotado"?"#ecfdf5":item.estado_item==="parcial"?"#f5f3ff":"#f3f4f6"};color:${clsItem}">${item.estado_item}</span>
              </div>
            `
          }).join("")}
        </div>
      ` : ""}

      <!-- Nacionalizaciones existentes -->
      ${nacs.length ? `
        <div style="padding:14px 20px;border-top:1px solid #f3f4f6">
          <div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;margin-bottom:10px">Órdenes de nacionalización</div>
          ${nacs.map(n => `
            <div class="nac-card">
              <div style="display:flex;align-items:center;gap:10px">
                <span class="pill pill-${n.tipo_orden}">${n.tipo_orden}</span>
                <a href="orden-detalle.html?id=${n.orden_id}" style="font-size:12px;font-weight:700;color:#7c3aed;text-decoration:none;font-family:monospace">${n.ordenes?.numero || "—"}</a>
                <span class="pill pill-${n.ordenes?.estado || "creada"}" style="font-size:9px">${n.ordenes?.estado?.replace(/_/g," ") || "creada"}</span>
                <span style="margin-left:auto;font-size:10px;color:#9ca3af">${new Date(n.created_at).toLocaleDateString("es-PE")}</span>
              </div>
              ${n.observaciones ? `<div style="font-size:11px;color:#6b7280;margin-top:6px">${n.observaciones}</div>` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}

      <!-- Acciones -->
      <div style="padding:14px 20px;border-top:1px solid #f3f4f6;display:flex;gap:8px">
        ${lote.estado !== "nacionalizado_total" ? `
          <button class="btn btn-primary btn-sm btn-nueva-nac" data-lote-id="${lote.id}">
            + Nueva orden de nacionalización
          </button>
        ` : `
          <span style="font-size:12px;color:#059669;font-weight:600">✓ Lote completamente nacionalizado</span>
        `}
        <a href="orden-detalle.html?id=${lote.orden_id}" class="btn btn-secondary btn-sm">Ver orden origen</a>
      </div>
    `

    card.querySelector(".btn-nueva-nac")?.addEventListener("click", function() {
      abrirModalNacionalizacion(lote)
    })

    cont.appendChild(card)
  })
}

// ─────────────────────────────────────────────
// MODAL NUEVA NACIONALIZACIÓN
// ─────────────────────────────────────────────
async function abrirModalNacionalizacion(lote) {
  loteNacActual = lote
  document.getElementById("nac-dam-ref").textContent = lote.numero_dam

  // Generar número de orden
  await generarNumeroOrdenNac()

  // Items disponibles
  const items = (lote.deposito_aduanero_items || []).filter(i => i.estado_item !== "agotado")
  const lista = document.getElementById("nac-items-lista")
  lista.innerHTML = ""

  if (!items.length) {
    lista.innerHTML = `<div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px">No hay ítems disponibles para nacionalizar</div>`
  } else {
    items.forEach(item => {
      const div = document.createElement("div")
      div.style.cssText = "display:flex;align-items:center;gap:12px;padding:10px;background:#fafafa;border:1px solid #f3f4f6;border-radius:8px;margin-bottom:8px"
      div.innerHTML = `
        <input type="checkbox" class="nac-item-check" data-item-id="${item.id}" data-max="${item.cantidad_disponible}" data-desc="${item.descripcion}" style="accent-color:#7c3aed;width:16px;height:16px" />
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:#111827">Ítem ${item.numero_item}: ${item.descripcion}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">Disponible: ${item.cantidad_disponible} ${item.unidad_medida||""} · FOB: $${parseFloat(item.valor_fob||0).toFixed(2)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <label style="font-size:10px;color:#9ca3af">Cantidad:</label>
          <input type="number" class="form-input nac-item-cant" data-item-id="${item.id}"
            min="0.01" max="${item.cantidad_disponible}" step="0.01"
            value="${item.cantidad_disponible}"
            style="width:90px;font-size:12px;padding:5px 8px" disabled />
          <span style="font-size:10px;color:#9ca3af">${item.unidad_medida||""}</span>
        </div>
      `

      const check = div.querySelector(".nac-item-check")
      const cant  = div.querySelector(".nac-item-cant")

      check.addEventListener("change", function() {
        cant.disabled = !this.checked
        actualizarResumenNac(items)
      })

      lista.appendChild(div)
    })
  }

  document.getElementById("nac-obs").value = ""
  actualizarResumenNac(items)
  document.getElementById("modal-nac").classList.add("visible")
}

async function generarNumeroOrdenNac() {
  const tipo = document.querySelector("input[name='nac-tipo']:checked")?.value || "ADU"
  const { data } = await db.from("ordenes").select("numero")
    .like("numero", `${tipo}-%`)
    .order("created_at", { ascending:false }).limit(1).single()

  let num = `${tipo}-000001`
  if (data) {
    const partes = data.numero.split("-")
    const corr   = parseInt(partes[partes.length-1]) + 1
    num = `${tipo}-${String(corr).padStart(6,"0")}`
  }
  const el = document.getElementById("nac-numero-orden")
  if (el) el.value = num
}

function actualizarResumenNac(items) {
  const checks = document.querySelectorAll(".nac-item-check:checked")
  const res    = document.getElementById("nac-resumen-content")

  if (!checks.length) {
    res.innerHTML = `<div style="font-size:12px;color:#9ca3af">Selecciona al menos un ítem</div>`
    return
  }

  let html = ""
  let totalFOB = 0
  checks.forEach(ch => {
    const itemId = ch.dataset.itemId
    const cant   = parseFloat(document.querySelector(`.nac-item-cant[data-item-id="${itemId}"]`)?.value || 0)
    const item   = items.find(i => String(i.id) === itemId)
    if (!item) return
    const fobUnit = item.cantidad > 0 ? (parseFloat(item.valor_fob||0) / item.cantidad) : 0
    const fobPart = fobUnit * cant
    totalFOB += fobPart
    html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #f3f4f6"><span>${item.descripcion}</span><span style="font-weight:600">${cant} ${item.unidad_medida||""} · $${fobPart.toFixed(2)}</span></div>`
  })

  html += `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#7c3aed;padding:8px 0 0"><span>FOB total a nacionalizar</span><span>$${totalFOB.toFixed(2)}</span></div>`
  res.innerHTML = html
}

document.getElementById("modal-nac-cancelar").addEventListener("click", () => {
  document.getElementById("modal-nac").classList.remove("visible")
  loteNacActual = null
})

document.getElementById("modal-nac-confirmar").addEventListener("click", async () => {
  if (!loteNacActual) return

  const tipo    = document.querySelector("input[name='nac-tipo']:checked")?.value || "ADU"
  const numOrden = document.getElementById("nac-numero-orden").value
  const obs     = document.getElementById("nac-obs").value.trim()
  const checks  = document.querySelectorAll(".nac-item-check:checked")

  if (!checks.length) { alert("Selecciona al menos un ítem"); return }

  const itemsSeleccionados = Array.from(checks).map(ch => {
    const itemId = ch.dataset.itemId
    const cant   = parseFloat(document.querySelector(`.nac-item-cant[data-item-id="${itemId}"]`)?.value || 0)
    return { id: parseInt(itemId), cantidad: cant }
  })

  if (itemsSeleccionados.some(i => i.cantidad <= 0)) {
    alert("Todas las cantidades deben ser mayores a 0")
    return
  }

  // 1. Crear orden ADU o SLI
  const { data: nuevaOrden, error: errOrden } = await db.from("ordenes").insert({
    numero:        numOrden,
    tipo,
    cliente_id:    loteNacActual.ordenes?.cliente_id || null,
    estado:        "creada",
    regimen:       "Importacion definitiva",
    observaciones: `Nacionalización desde DA · DAM ${loteNacActual.numero_dam}${obs ? " · " + obs : ""}`,
    activo:        true
  }).select().single()

  if (errOrden) { alert("Error al crear orden: " + errOrden.message); return }

  // 2. Registrar nacionalización
  const { data: nac, error: errNac } = await db.from("da_nacionalizaciones").insert({
    lote_id:    loteNacActual.id,
    orden_id:   nuevaOrden.id,
    tipo_orden: tipo,
    estado:     "en_proceso",
    observaciones: obs || null
  }).select().single()

  if (errNac) { alert("Error al registrar nacionalización: " + errNac.message); return }

  // 3. Registrar ítems y actualizar saldos
  for (const sel of itemsSeleccionados) {
    await db.from("da_nacionalizacion_items").insert({
      nacionalizacion_id: nac.id,
      item_id:            sel.id,
      cantidad:           sel.cantidad
    })

    // Actualizar saldo del ítem
    const item = loteNacActual.deposito_aduanero_items?.find(i => i.id === sel.id)
    if (item) {
      const nuevaCantNac  = parseFloat(item.cantidad_nacionalizada || 0) + sel.cantidad
      const nuevaDisp     = parseFloat(item.cantidad_disponible || 0) - sel.cantidad
      const nuevoEstItem  = nuevaDisp <= 0 ? "agotado" : nuevaCantNac > 0 ? "parcial" : "disponible"

      await db.from("deposito_aduanero_items").update({
        cantidad_nacionalizada: nuevaCantNac,
        cantidad_disponible:    Math.max(0, nuevaDisp),
        estado_item:            nuevoEstItem
      }).eq("id", sel.id)
    }
  }

  // 4. Actualizar estado del lote DA
  const { data: itemsActualizados } = await db
    .from("deposito_aduanero_items").select("estado_item").eq("lote_id", loteNacActual.id)

  const todosAgotados = (itemsActualizados || []).every(i => i.estado_item === "agotado")
  const algunoParcial = (itemsActualizados || []).some(i => i.estado_item !== "disponible")

  await db.from("deposito_aduanero_lotes").update({
    estado: todosAgotados ? "nacionalizado_total" : algunoParcial ? "parcialmente_nacionalizado" : "en_deposito"
  }).eq("id", loteNacActual.id)

  document.getElementById("modal-nac").classList.remove("visible")
  loteNacActual = null
  alert(`✓ Orden ${numOrden} creada. Proceso de nacionalización iniciado.`)
  await cargarTodo()
})

// ─────────────────────────────────────────────
// MODAL NUEVO LOTE DA
// ─────────────────────────────────────────────
async function cargarOrdenesParaDA() {
  const { data } = await db.from("ordenes").select("id,numero,tipo,cliente_id,clientes(razon_social)")
    .in("tipo",["ADU","SLI"]).eq("activo",true).order("created_at",{ascending:false})

  const sel = document.getElementById("da-orden")
  sel.innerHTML = `<option value="">Sin orden asociada</option>`
  ;(data||[]).forEach(o => {
    sel.innerHTML += `<option value="${o.id}">${o.numero} (${o.tipo})${o.clientes ? " · "+o.clientes.razon_social : ""}</option>`
  })
}

function agregarItemDA() {
  itemsDAForm.push({ numero: itemsDAForm.length+1, descripcion:"", partida:"", cantidad:1, unidad:"", peso:null, fob:null })
  renderItemsDAForm()
}

function renderItemsDAForm() {
  const cont = document.getElementById("items-da-form")
  cont.innerHTML = ""

  itemsDAForm.forEach((item, idx) => {
    const div = document.createElement("div")
    div.style.cssText = "background:#fafafa;border:1px solid #f3f4f6;border-radius:10px;padding:14px;margin-bottom:10px"
    div.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase">Ítem ${item.numero}</div>
        <button class="btn btn-danger btn-xs btn-del-item-da">Quitar</button>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:2">
          <label class="form-label">Descripción *</label>
          <input class="form-input inp-da-desc" type="text" placeholder="Descripción de la mercancía" value="${item.descripcion}" style="font-size:12px" />
        </div>
        <div class="form-group">
          <label class="form-label">Partida arancelaria</label>
          <input class="form-input inp-da-partida" type="text" placeholder="0000.00.00.00" value="${item.partida}" style="font-size:12px" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cantidad *</label>
          <input class="form-input inp-da-cant" type="number" min="0.01" step="0.01" value="${item.cantidad}" style="font-size:12px" />
        </div>
        <div class="form-group">
          <label class="form-label">Unidad de medida</label>
          <select class="form-select inp-da-unidad" style="font-size:12px">
            <option ${item.unidad==="UNIDAD"?"selected":""}>UNIDAD</option>
            <option ${item.unidad==="KG"?"selected":""}>KG</option>
            <option ${item.unidad==="TN"?"selected":""}>TN</option>
            <option ${item.unidad==="L"?"selected":""}>L</option>
            <option ${item.unidad==="M2"?"selected":""}>M2</option>
            <option ${item.unidad==="M3"?"selected":""}>M3</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Peso bruto (kg)</label>
          <input class="form-input inp-da-peso" type="number" step="0.01" placeholder="0.00" value="${item.peso||""}" style="font-size:12px" />
        </div>
        <div class="form-group">
          <label class="form-label">Valor FOB (USD)</label>
          <input class="form-input inp-da-fob" type="number" step="0.01" placeholder="0.00" value="${item.fob||""}" style="font-size:12px" />
        </div>
      </div>
    `

    div.querySelector(".inp-da-desc").addEventListener("input", e => { itemsDAForm[idx].descripcion = e.target.value })
    div.querySelector(".inp-da-partida").addEventListener("input", e => { itemsDAForm[idx].partida = e.target.value })
    div.querySelector(".inp-da-cant").addEventListener("input", e => { itemsDAForm[idx].cantidad = parseFloat(e.target.value)||1 })
    div.querySelector(".inp-da-unidad").addEventListener("change", e => { itemsDAForm[idx].unidad = e.target.value })
    div.querySelector(".inp-da-peso").addEventListener("input", e => { itemsDAForm[idx].peso = parseFloat(e.target.value)||null })
    div.querySelector(".inp-da-fob").addEventListener("input", e => { itemsDAForm[idx].fob = parseFloat(e.target.value)||null })
    div.querySelector(".btn-del-item-da").addEventListener("click", () => {
      itemsDAForm.splice(idx, 1)
      itemsDAForm.forEach((it,i) => it.numero = i+1)
      renderItemsDAForm()
    })

    cont.appendChild(div)
  })
}

document.getElementById("btn-nuevo-lote-da").addEventListener("click", async () => {
  itemsDAForm = []
  renderItemsDAForm()
  await cargarOrdenesParaDA()
  document.getElementById("modal-nuevo-da").classList.add("visible")
})

document.getElementById("btn-agregar-item-da").addEventListener("click", agregarItemDA)

document.getElementById("modal-da-cancelar").addEventListener("click", () => {
  document.getElementById("modal-nuevo-da").classList.remove("visible")
})

document.getElementById("modal-da-guardar").addEventListener("click", async () => {
  const dam        = document.getElementById("da-dam").value.trim()
  const fechaNum   = document.getElementById("da-fecha-num").value
  const fechaVenc  = document.getElementById("da-fecha-venc").value
  const ordenId    = document.getElementById("da-orden").value
  const almacenId  = document.getElementById("da-almacen").value
  const fob        = parseFloat(document.getElementById("da-fob").value)  || 0
  const tc         = parseFloat(document.getElementById("da-tc").value)   || null
  const desc       = document.getElementById("da-descripcion").value.trim()
  const obs        = document.getElementById("da-obs").value.trim()

  if (!dam || !almacenId || !fechaNum) {
    alert("Completa: número DAM, almacén y fecha de numeración")
    return
  }
  if (!itemsDAForm.length) {
    alert("Agrega al menos un ítem de la DAM")
    return
  }
  if (itemsDAForm.some(i => !i.descripcion || i.cantidad <= 0)) {
    alert("Todos los ítems deben tener descripción y cantidad")
    return
  }

  // Crear lote DA
  const { data: lote, error: errLote } = await db.from("deposito_aduanero_lotes").insert({
    orden_id:             ordenId || null,
    numero_dam:           dam,
    fecha_numeracion:     fechaNum,
    fecha_vencimiento_da: fechaVenc || null,
    almacen_id:           parseInt(almacenId),
    valor_fob:            fob,
    tipo_cambio:          tc,
    descripcion_mercancia: desc || null,
    total_items:          itemsDAForm.length,
    estado:               "en_deposito",
    observaciones:        obs || null
  }).select().single()

  if (errLote) { alert("Error: " + errLote.message); return }

  // Crear ítems del lote
  const itemsPayload = itemsDAForm.map(it => ({
    lote_id:             lote.id,
    numero_item:         it.numero,
    descripcion:         it.descripcion,
    partida_arancelaria: it.partida || null,
    cantidad:            it.cantidad,
    cantidad_disponible: it.cantidad,
    cantidad_nacionalizada: 0,
    unidad_medida:       it.unidad || "UNIDAD",
    peso_kg:             it.peso   || null,
    valor_fob:           it.fob    || null,
    estado_item:         "disponible"
  }))

  const { error: errItems } = await db.from("deposito_aduanero_items").insert(itemsPayload)
  if (errItems) { alert("Error en ítems: " + errItems.message); return }

  // Si tiene orden ADU/SLI asociada, actualizar campos de la orden
  if (ordenId) {
    await db.from("ordenes").update({
      numero_dam:       dam,
      fecha_numeracion: fechaNum,
      canal_aduanero:   null
    }).eq("id", ordenId)
  }

  document.getElementById("modal-nuevo-da").classList.remove("visible")
  alert(`✓ Lote DA creado correctamente — DAM: ${dam}`)
  await cargarTodo()
})

// ─────────────────────────────────────────────
// VISTA NACIONALIZACIONES
// ─────────────────────────────────────────────
function renderNacionalizaciones() {
  const cont = document.getElementById("da-content")
  cont.innerHTML = ""

  const todasNacs = todosLosLotes.flatMap(l =>
    (l.da_nacionalizaciones || []).map(n => ({ ...n, lote:l }))
  )

  if (!todasNacs.length) {
    cont.innerHTML = `<div class="panel-vacio"><p>Sin nacionalizaciones</p><span>No hay órdenes de nacionalización registradas</span></div>`
    return
  }

  const card = document.createElement("div")
  card.className = "card"
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Órdenes de nacionalización</span>
      <span style="font-size:12px;color:#9ca3af">${todasNacs.length} registros</span>
    </div>
    <table>
      <thead>
        <tr><th>ORDEN</th><th>TIPO</th><th>DAM ORIGEN</th><th>CLIENTE</th><th>ALMACÉN</th><th>ESTADO</th><th>FECHA</th><th></th></tr>
      </thead>
      <tbody>
        ${todasNacs.map(n => `
          <tr>
            <td><a href="orden-detalle.html?id=${n.orden_id}" style="font-weight:700;color:#7c3aed;text-decoration:none;font-family:monospace;font-size:12px">${n.ordenes?.numero || "—"}</a></td>
            <td><span class="pill pill-${n.tipo_orden}">${n.tipo_orden}</span></td>
            <td><span class="dam-badge" style="font-size:11px">${n.lote?.numero_dam || "—"}</span></td>
            <td class="text-sm text-muted">${n.lote?.ordenes?.clientes?.razon_social || "—"}</td>
            <td class="text-sm">${n.lote?.almacenes?.nombre || "—"}</td>
            <td><span class="pill pill-${n.ordenes?.estado || "creada"}" style="font-size:9px">${n.ordenes?.estado?.replace(/_/g," ") || "creada"}</span></td>
            <td class="text-sm text-muted">${new Date(n.created_at).toLocaleDateString("es-PE")}</td>
            <td><a href="orden-detalle.html?id=${n.orden_id}" class="btn btn-secondary btn-xs">Ver →</a></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(card)
}

// ─────────────────────────────────────────────
// REPORTES DA
// ─────────────────────────────────────────────
function renderReportes(lotes) {
  const cont = document.getElementById("da-content")
  cont.innerHTML = ""

  const totalFOB    = lotes.reduce((s,l) => s + parseFloat(l.valor_fob||0), 0)
  const activos     = lotes.filter(l => l.estado !== "nacionalizado_total")
  const nacionaliz  = lotes.filter(l => l.estado === "nacionalizado_total")

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <div class="card">
        <div class="card-header">
          <span class="card-title">Resumen de lotes DA</span>
          <button class="btn btn-secondary btn-xs" id="btn-pdf-resumen-da">PDF</button>
        </div>
        <table>
          <thead><tr><th>DAM</th><th>CLIENTE</th><th>ALMACÉN</th><th>FOB USD</th><th>ÍTEMS</th><th>ESTADO</th></tr></thead>
          <tbody>
            ${lotes.map(l => `
              <tr>
                <td style="font-family:monospace;font-weight:700;font-size:11px;color:#dc2626">${l.numero_dam}</td>
                <td class="text-sm text-muted">${l.ordenes?.clientes?.razon_social?.substring(0,18)||"—"}</td>
                <td class="text-sm">${l.almacenes?.nombre||"—"}</td>
                <td style="font-weight:600">$${parseFloat(l.valor_fob||0).toLocaleString()}</td>
                <td style="text-align:center">${(l.deposito_aduanero_items||[]).length}</td>
                <td><span class="pill pill-${l.estado==="en_deposito"?"en_curso":l.estado==="parcialmente_nacionalizado"?"dam_numerada":"liquidada"}" style="font-size:9px">${l.estado.replace(/_/g," ")}</span></td>
              </tr>
            `).join("")}
            <tr style="border-top:2px solid #f3f4f6">
              <td colspan="3" style="font-weight:700;color:#111827">TOTAL</td>
              <td style="font-weight:700;color:#7c3aed">$${totalFOB.toLocaleString()}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Estadísticas DA</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#fafafa;border-radius:8px">
            <span style="font-size:12px;color:#6b7280">Total lotes</span>
            <span style="font-size:18px;font-weight:700;color:#111827">${lotes.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#fef2f2;border-radius:8px">
            <span style="font-size:12px;color:#6b7280">Activos (en depósito)</span>
            <span style="font-size:18px;font-weight:700;color:#dc2626">${activos.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#ecfdf5;border-radius:8px">
            <span style="font-size:12px;color:#6b7280">Completamente nacionalizados</span>
            <span style="font-size:18px;font-weight:700;color:#059669">${nacionaliz.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#f5f3ff;border-radius:8px">
            <span style="font-size:12px;color:#6b7280">FOB total activo (USD)</span>
            <span style="font-size:18px;font-weight:700;color:#7c3aed">$${activos.reduce((s,l)=>s+parseFloat(l.valor_fob||0),0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById("btn-pdf-resumen-da").addEventListener("click", () => {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
    doc.setFillColor(30,27,75)
    doc.rect(0,0,297,20,"F")
    doc.setFont("helvetica","bold")
    doc.setFontSize(12)
    doc.setTextColor(255,255,255)
    doc.text("MarsTech — Reporte Depósito Aduanero régimen 70", 14, 13)
    doc.setFont("helvetica","normal")
    doc.setFontSize(9)
    doc.text(new Date().toLocaleDateString("es-PE"), 260, 13)

    const rows = lotes.map(l => [
      l.numero_dam,
      l.ordenes?.clientes?.razon_social || "—",
      l.almacenes?.nombre || "—",
      `$${parseFloat(l.valor_fob||0).toLocaleString()}`,
      (l.deposito_aduanero_items||[]).length,
      l.fecha_vencimiento_da || "—",
      l.estado.replace(/_/g," ")
    ])

    doc.autoTable({
      startY: 26,
      head: [["DAM","Cliente","Almacén","FOB USD","Ítems","Vence DA","Estado"]],
      body: rows,
      styles: { fontSize:8, cellPadding:3 },
      headStyles: { fillColor:[30,27,75], textColor:[255,255,255], fontStyle:"bold" },
      alternateRowStyles: { fillColor:[249,250,251] },
      margin: { left:14, right:14 }
    })

    doc.save(`deposito-aduanero-${new Date().toISOString().split("T")[0]}.pdf`)
  })
}

// ─────────────────────────────────────────────
// EXPORTAR GLOBAL
// ─────────────────────────────────────────────
document.getElementById("btn-exportar-da-excel").addEventListener("click", () => {
  const lotes = lotesFiltrados()
  const rows  = [["DAM","Cliente","Almacén","FOB USD","TC","Total ítems","Fecha numeración","Vence DA","Estado"]]
  lotes.forEach(l => {
    rows.push([
      l.numero_dam,
      l.ordenes?.clientes?.razon_social || "—",
      l.almacenes?.nombre || "—",
      parseFloat(l.valor_fob||0).toFixed(2),
      l.tipo_cambio || "",
      (l.deposito_aduanero_items||[]).length,
      l.fecha_numeracion || "",
      l.fecha_vencimiento_da || "",
      l.estado.replace(/_/g," ")
    ])
  })
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `deposito-aduanero-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
})

document.getElementById("btn-exportar-da-pdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf
  const doc  = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const lotes = lotesFiltrados()
  doc.setFillColor(30,27,75)
  doc.rect(0,0,297,20,"F")
  doc.setFont("helvetica","bold")
  doc.setFontSize(12)
  doc.setTextColor(255,255,255)
  doc.text("MarsTech — Depósito Aduanero régimen 70", 14, 13)
  doc.setFont("helvetica","normal")
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString("es-PE"), 260, 13)

  const rows = lotes.map(l => [
    l.numero_dam,
    l.ordenes?.clientes?.razon_social?.substring(0,20)||"—",
    l.almacenes?.nombre||"—",
    `$${parseFloat(l.valor_fob||0).toLocaleString()}`,
    (l.deposito_aduanero_items||[]).length,
    (l.da_nacionalizaciones||[]).length,
    l.fecha_vencimiento_da||"—",
    l.estado.replace(/_/g," ")
  ])

  doc.autoTable({
    startY: 26,
    head: [["DAM","Cliente","Almacén","FOB USD","Ítems","Nacs.","Vence","Estado"]],
    body: rows,
    styles: { fontSize:7.5, cellPadding:2.5 },
    headStyles: { fillColor:[30,27,75], textColor:[255,255,255], fontStyle:"bold" },
    alternateRowStyles: { fillColor:[249,250,251] },
    margin: { left:14, right:14 }
  })
  doc.save(`deposito-aduanero-${new Date().toISOString().split("T")[0]}.pdf`)
})

// ─────────────────────────────────────────────
// TABS Y FILTROS
// ─────────────────────────────────────────────
document.querySelectorAll(".tab-da-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".tab-da-btn").forEach(b => b.classList.remove("active"))
    this.classList.add("active")
    tabActiva = this.dataset.tab
    renderContenido()
  })
})

document.getElementById("filtro-estado-da").addEventListener("change",    renderContenido)
document.getElementById("filtro-almacen-da").addEventListener("change",   renderContenido)
document.getElementById("filtro-busqueda-da").addEventListener("input",   renderContenido)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarTodo()