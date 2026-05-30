const { createClient } = supabase
const SUPABASE_URL = "https://gaugpcxukbnoyrhsotkt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdWdwY3h1a2Jub3lyaHNvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDg3MjEsImV4cCI6MjA5MDkyNDcyMX0.iXn3STVjdYafx5fMQwDjKNQPFwwifk4WN-BXoaUqliA"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

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
// NUMERACIÓN AUTOMÁTICA
// ─────────────────────────────────────────────
async function generarNumeroOrden(tipo) {
  const { data } = await db
    .from("ordenes")
    .select("numero")
    .like("numero", `${tipo}-%`)
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data || data.length === 0) {
    return `${tipo}-000001`
  }

  const ultimo = data[0].numero
  const partes = ultimo.split("-")
  const correlativo = parseInt(partes[partes.length - 1]) + 1
  return `${tipo}-${String(correlativo).padStart(6, "0")}`
}

document.getElementById("tipo").addEventListener("change", async function() {
  const numero = await generarNumeroOrden(this.value)
  document.getElementById("numero").value = numero
  document.getElementById("numero").style.background = "#f5f3ff"
  setTimeout(() => document.getElementById("numero").style.background = "", 800)
})

// ─────────────────────────────────────────────
// CARGAR ÓRDENES
// ─────────────────────────────────────────────
async function cargarOrdenes() {
  const { data, error } = await db
    .from("ordenes").select("*").eq("activo", true)
    .order("created_at", { ascending: false })

  if (error) return
  todasLasOrdenes = data
  filtrarYMostrar()

  // Generar número inicial al cargar
  const tipoActual = document.getElementById("tipo").value
  const numero = await generarNumeroOrden(tipoActual)
  document.getElementById("numero").value = numero
}

function filtrarYMostrar() {
  const tipo     = document.getElementById("filtro-tipo").value
  const estado   = document.getElementById("filtro-estado").value
  const busqueda = document.getElementById("filtro-busqueda").value.toLowerCase()

  const filtradas = todasLasOrdenes
    .filter(o => tipo === "TODOS" || o.tipo === tipo)
    .filter(o => estado === "TODOS" || o.estado === estado)
    .filter(o =>
      o.numero.toLowerCase().includes(busqueda) ||
      (o.origen && o.origen.toLowerCase().includes(busqueda))
    )

  renderTabla(filtradas)
}

function renderTabla(ordenes) {
  const tbody = document.getElementById("tbody-ordenes")
  tbody.innerHTML = ""
  document.getElementById("contador").textContent = ordenes.length

  if (!ordenes.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:32px">Sin órdenes</td></tr>`
    return
  }

  ordenes.forEach(o => {
    const fila = document.createElement("tr")
    const fecha = new Date(o.created_at).toLocaleDateString("es-PE")
    fila.innerHTML = `
    <td><span class="orden-id">${o.numero}</span></td>
    <td><span class="pill pill-${o.tipo}">${o.tipo}</span></td>
    <td class="text-muted text-sm">${o.origen || "—"}</td>
    <td class="text-muted text-sm">${o.destino || "—"}</td>
    <td class="text-muted text-sm">${o.agente_origen || "—"}</td>
    <td><span class="pill pill-${o.estado}">${o.estado.replace(/_/g," ")}</span></td>
    <td>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a href="orden-detalle.html?id=${o.id}" class="btn btn-primary btn-xs">Ver detalle</a>
      <button class="btn btn-danger btn-xs btn-eliminar" data-id="${o.id}">Eliminar</button>
    </div>
    </td>
    `
    fila.querySelector(".btn-eliminar").addEventListener("click", async function() {
      if (!confirm("¿Eliminar esta orden?")) return
      await db.from("ordenes").update({ activo: false }).eq("id", this.dataset.id)
      await cargarOrdenes()
    })
    tbody.appendChild(fila)
  })
}

document.getElementById("filtro-tipo").addEventListener("change", filtrarYMostrar)
document.getElementById("filtro-estado").addEventListener("change", filtrarYMostrar)
document.getElementById("filtro-busqueda").addEventListener("input", filtrarYMostrar)

document.getElementById("form-nueva-orden").addEventListener("submit", async function(e) {
  e.preventDefault()
  const numero        = document.getElementById("numero").value.trim()
  const tipo          = document.getElementById("tipo").value
  const regimen       = document.getElementById("regimen").value
  const via           = document.getElementById("via").value
  const origen        = document.getElementById("origen").value.trim()
  const destino       = document.getElementById("destino").value.trim()
  const agenteOrigen  = document.getElementById("agenteOrigen").value.trim()
  const observaciones = document.getElementById("observaciones").value.trim()

  if (!numero || !origen || !destino) {
    alert("Completa número, origen y destino")
    return
  }

  const { error } = await db.from("ordenes").insert({
    numero, tipo, regimen, via, origen, destino,
    agente_origen: agenteOrigen, observaciones,
    estado: "creada", activo: true
  })

  if (error) { alert("Error: " + error.message); return }
  this.reset()
  await cargarOrdenes()
})

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarOrdenes()