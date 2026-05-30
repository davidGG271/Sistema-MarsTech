const { createClient } = supabase
const SUPABASE_URL = "https://xeduwecilmygdtukxewl.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHV3ZWNpbG15Z2R0dWt4ZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDczOTQsImV4cCI6MjA5NTcyMzM5NH0.WxTBSrxG9DTGn08IURNrF3xU7gj7StDa5_aEFru_R7U"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let todosLosClientes = []
let clienteEditando  = null

function inicializarUI() {
  const nombre   = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent    = nombre
  document.getElementById("sb-rol").textContent       = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent     = new Date().toLocaleDateString("es-PE", { day:"2-digit", month:"short", year:"numeric" })
}

// ─────────────────────────────────────────────
// CARGAR CLIENTES
// ─────────────────────────────────────────────
async function cargarClientes() {
  const { data, error } = await db
    .from("clientes").select("*")
    .eq("activo", true)
    .order("razon_social")

  if (error) return
  todosLosClientes = data
  filtrarYMostrar()
}

function filtrarYMostrar() {
  const busqueda = document.getElementById("filtro-busqueda").value.toLowerCase()
  const tipo     = document.getElementById("filtro-tipo").value

  const filtrados = todosLosClientes
    .filter(c => tipo === "TODOS" || c.tipo === tipo)
    .filter(c =>
      c.razon_social.toLowerCase().includes(busqueda) ||
      (c.ruc && c.ruc.toLowerCase().includes(busqueda)) ||
      (c.contacto && c.contacto.toLowerCase().includes(busqueda))
    )

  renderTabla(filtrados)
}

function renderTabla(clientes) {
  const tbody = document.getElementById("tbody-clientes")
  tbody.innerHTML = ""
  document.getElementById("contador").textContent = clientes.length

  if (!clientes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:32px">Sin clientes</td></tr>`
    return
  }

  clientes.forEach(c => {
    const iniciales = c.razon_social.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
    const fila = document.createElement("tr")
    fila.innerHTML = `
      <td class="text-mono" style="font-size:12px">${c.ruc || "—"}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${iniciales}</div>
          <div>
            <div style="font-weight:600;color:#111827;font-size:13px">${c.razon_social}</div>
            ${c.direccion ? `<div style="font-size:10px;color:#9ca3af">${c.direccion}</div>` : ""}
          </div>
        </div>
      </td>
      <td class="text-sm text-muted">${c.contacto || "—"}</td>
      <td><span class="pill pill-${c.tipo}">${c.tipo}</span></td>
      <td class="text-sm text-muted">${c.pais || "Peru"}</td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-xs btn-vista" data-id="${c.id}">Vista rápida</button>
          <a href="cliente-detalle.html?id=${c.id}" class="btn btn-primary btn-xs">Ver detalle</a>
          <button class="btn btn-secondary btn-xs btn-editar" data-id="${c.id}">Editar</button>
          <button class="btn btn-danger btn-xs btn-eliminar" data-id="${c.id}">Eliminar</button>
        </div>
      </td>
    `

    fila.querySelector(".btn-vista").addEventListener("click", () => abrirVistaRapida(c))
    fila.querySelector(".btn-editar").addEventListener("click", () => abrirModalEditar(c))
    fila.querySelector(".btn-eliminar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar a ${c.razon_social}? Esta acción no se puede deshacer.`)) return
      await db.from("clientes").update({ activo: false }).eq("id", c.id)
      await cargarClientes()
    })

    tbody.appendChild(fila)
  })
}

// ─────────────────────────────────────────────
// MODAL NUEVO / EDITAR
// ─────────────────────────────────────────────
function limpiarModal() {
  document.getElementById("cli-tipo-doc").value  = "RUC"
  document.getElementById("cli-ruc").value       = ""
  document.getElementById("cli-razon").value     = ""
  document.getElementById("cli-contacto").value  = ""
  document.getElementById("cli-telefono").value  = ""
  document.getElementById("cli-email").value     = ""
  document.getElementById("cli-tipo").value      = "importador"
  document.getElementById("cli-pais").value      = "Peru"
  document.getElementById("cli-direccion").value = ""
  document.getElementById("cli-vendedor").value  = ""
  document.getElementById("cli-condicion").value = "Contado"
  document.getElementById("cli-credito").value   = ""
  document.getElementById("cli-obs").value       = ""
}

function abrirModalNuevo() {
  clienteEditando = null
  limpiarModal()
  document.getElementById("modal-cliente-titulo").textContent = "Nuevo cliente"
  document.getElementById("modal-cli-guardar").textContent    = "Crear cliente"
  document.getElementById("modal-cliente").classList.add("visible")
}

function abrirModalEditar(c) {
  clienteEditando = c
  document.getElementById("cli-tipo-doc").value  = c.tipo_documento || "RUC"
  document.getElementById("cli-ruc").value       = c.ruc || ""
  document.getElementById("cli-razon").value     = c.razon_social || ""
  document.getElementById("cli-contacto").value  = c.contacto || ""
  document.getElementById("cli-telefono").value  = c.telefono || ""
  document.getElementById("cli-email").value     = c.email || ""
  document.getElementById("cli-tipo").value      = c.tipo || "importador"
  document.getElementById("cli-pais").value      = c.pais || "Peru"
  document.getElementById("cli-direccion").value = c.direccion || ""
  document.getElementById("cli-vendedor").value  = c.vendedor || ""
  document.getElementById("cli-condicion").value = c.condicion_pago || "Contado"
  document.getElementById("cli-credito").value   = c.credito_limite || ""
  document.getElementById("cli-obs").value       = c.observaciones || ""
  document.getElementById("modal-cliente-titulo").textContent = "Editar cliente"
  document.getElementById("modal-cli-guardar").textContent    = "Guardar cambios"
  document.getElementById("modal-cliente").classList.add("visible")
}

document.getElementById("btn-nuevo-cliente").addEventListener("click", abrirModalNuevo)
document.getElementById("modal-cli-cancelar").addEventListener("click", () => {
  document.getElementById("modal-cliente").classList.remove("visible")
})

document.getElementById("modal-cli-guardar").addEventListener("click", async () => {
  const ruc       = document.getElementById("cli-ruc").value.trim()
  const razon     = document.getElementById("cli-razon").value.trim()
  const contacto  = document.getElementById("cli-contacto").value.trim()

  if (!ruc || !razon) {
    alert("El número de documento y razón social son obligatorios")
    return
  }

  const payload = {
    tipo_documento:  document.getElementById("cli-tipo-doc").value,
    ruc,
    razon_social:    razon,
    contacto,
    telefono:        document.getElementById("cli-telefono").value.trim() || null,
    email:           document.getElementById("cli-email").value.trim()    || null,
    tipo:            document.getElementById("cli-tipo").value,
    pais:            document.getElementById("cli-pais").value.trim()     || "Peru",
    direccion:       document.getElementById("cli-direccion").value.trim() || null,
    vendedor:        document.getElementById("cli-vendedor").value.trim() || null,
    condicion_pago:  document.getElementById("cli-condicion").value,
    credito_limite:  parseFloat(document.getElementById("cli-credito").value) || 0,
    observaciones:   document.getElementById("cli-obs").value.trim() || null,
    activo:          true,
    updated_at:      new Date().toISOString()
  }

  let error
  if (clienteEditando) {
    const res = await db.from("clientes").update(payload).eq("id", clienteEditando.id)
    error = res.error
  } else {
    const res = await db.from("clientes").insert(payload)
    error = res.error
  }

  if (error) { alert("Error: " + error.message); return }
  document.getElementById("modal-cliente").classList.remove("visible")
  await cargarClientes()
})

// ─────────────────────────────────────────────
// VISTA RÁPIDA
// ─────────────────────────────────────────────
async function abrirVistaRapida(c) {
  const iniciales = c.razon_social.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("vr-avatar").textContent    = iniciales
  document.getElementById("vr-nombre").textContent    = c.razon_social
  document.getElementById("vr-ruc").textContent       = `${c.tipo_documento || "RUC"}: ${c.ruc || "—"}`
  document.getElementById("vr-tipo").textContent      = c.tipo
  document.getElementById("vr-tipo").className        = `pill pill-${c.tipo}`
  document.getElementById("vr-contacto").textContent  = c.contacto || "—"
  document.getElementById("vr-telefono").textContent  = c.telefono || "—"
  document.getElementById("vr-vendedor").textContent  = c.vendedor || "—"
  document.getElementById("vr-condicion").textContent = c.condicion_pago || "—"
  document.getElementById("vr-pais").textContent      = c.pais || "Peru"
  document.getElementById("vr-credito").textContent   = c.credito_limite ? `$${parseFloat(c.credito_limite).toLocaleString()}` : "Sin límite"
  document.getElementById("vr-detalle").href          = `cliente-detalle.html?id=${c.id}`

  document.getElementById("vr-total-ordenes").textContent  = "..."
  document.getElementById("vr-ordenes-activas").textContent = "..."
  document.getElementById("vr-cotizaciones").textContent    = "..."

  document.getElementById("modal-vista-rapida").classList.add("visible")

  const [ordRes, cotRes] = await Promise.all([
    db.from("ordenes").select("id,estado").eq("cliente_id", c.id).eq("activo", true),
    db.from("cotizaciones").select("id").eq("cliente_id", c.id).eq("activo", true)
  ])

  const ordenes = ordRes.data || []
  const activas = ordenes.filter(o => !["liquidada","anulada"].includes(o.estado))

  document.getElementById("vr-total-ordenes").textContent   = ordenes.length
  document.getElementById("vr-ordenes-activas").textContent = activas.length
  document.getElementById("vr-cotizaciones").textContent    = (cotRes.data || []).length

  document.getElementById("vr-editar").onclick = () => {
    document.getElementById("modal-vista-rapida").classList.remove("visible")
    abrirModalEditar(c)
  }
}

document.getElementById("vr-cerrar").addEventListener("click", () => {
  document.getElementById("modal-vista-rapida").classList.remove("visible")
})

// ─────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────
document.getElementById("filtro-busqueda").addEventListener("input", filtrarYMostrar)
document.getElementById("filtro-tipo").addEventListener("change", filtrarYMostrar)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarClientes()