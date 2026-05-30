const { createClient } = supabase
const SUPABASE_URL = "https://xeduwecilmygdtukxewl.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHV3ZWNpbG15Z2R0dWt4ZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDczOTQsImV4cCI6MjA5NTcyMzM5NH0.WxTBSrxG9DTGn08IURNrF3xU7gj7StDa5_aEFru_R7U"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const usuarioSesion = sessionStorage.getItem("usuario")
if (!usuarioSesion) window.location.href = "index.html"
const usuarioActual = JSON.parse(usuarioSesion)

let todosLosDirs  = []
let almacenes     = []
let tabActiva     = "solicitudes"

// ─── INIT ────────────────────────────────────────────────────────────────
function inicializarUI() {
  const nombre    = usuarioActual.nombre
  const iniciales = nombre.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()
  document.getElementById("sb-iniciales").textContent = iniciales
  document.getElementById("sb-nombre").textContent    = nombre
  document.getElementById("sb-rol").textContent       = usuarioActual.rol.toUpperCase()
  document.getElementById("tb-fecha").textContent     = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})
}

async function cargarTodo() {
  const [almRes, dirRes] = await Promise.all([
    db.from("almacenes").select("*").eq("activo",true).order("nombre"),
    db.from("direccionamientos")
      .select("*, ordenes(numero,tipo,expediente_id,clientes(razon_social)), unidades_carga(referencia,tipo_unidad,bultos,tipo_bulto,descripcion), almacenes(nombre,tipo)")
      .order("created_at",{ascending:false})
  ])
  almacenes    = almRes.data  || []
  todosLosDirs = dirRes.data  || []
  renderKPIs()
  renderContenido()
}

// ─── KPIs ────────────────────────────────────────────────────────────────
function renderKPIs() {
  const solicitados  = todosLosDirs.filter(d => d.estado === "solicitado")
  const realizados   = todosLosDirs.filter(d => d.estado === "realizado")
  const ingresados   = todosLosDirs.filter(d => ["ingresado","entregado"].includes(d.estado))
  const hoy          = new Date().toDateString()
  const hoyCount     = todosLosDirs.filter(d => d.fecha_confirmacion && new Date(d.fecha_confirmacion).toDateString() === hoy)

  document.getElementById("kpis-dir").innerHTML = `
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Pendientes de atención</div>
        <div class="kpi-val" style="color:#ca8a04">${solicitados.length}</div>
        <div class="kpi-trend nt">solicitudes activas</div></div>
      <div class="kpi-ico amber"><svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Realizados</div>
        <div class="kpi-val" style="color:#2563eb">${realizados.length}</div>
        <div class="kpi-trend nt">esperando ingreso</div></div>
      <div class="kpi-ico blue"><svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Ingresados / Entregados</div>
        <div class="kpi-val" style="color:#059669">${ingresados.length}</div>
        <div class="kpi-trend up">completados</div></div>
      <div class="kpi-ico green"><svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg></div>
    </div>
    <div class="kpi">
      <div class="kpi-body"><div class="kpi-lbl">Confirmados hoy</div>
        <div class="kpi-val">${hoyCount.length}</div>
        <div class="kpi-trend nt">movimientos del día</div></div>
      <div class="kpi-ico purple"><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
    </div>
  `
}

// ─── FILTRAR ─────────────────────────────────────────────────────────────
function dirsFiltrados() {
  const estado   = document.getElementById("filtro-estado-dir")?.value   || "TODOS"
  const tipo     = document.getElementById("filtro-tipo-dir")?.value     || "TODOS"
  const busqueda = document.getElementById("filtro-busqueda-dir")?.value?.toLowerCase() || ""

  return todosLosDirs.filter(d => {
    if (estado !== "TODOS" && d.estado !== estado)   return false
    if (tipo   !== "TODOS" && d.tipo   !== tipo)     return false
    if (busqueda) {
      const ord = d.ordenes?.numero?.toLowerCase()             || ""
      const uni = d.unidades_carga?.referencia?.toLowerCase()  || ""
      const alm = d.almacenes?.nombre?.toLowerCase()           || ""
      if (!ord.includes(busqueda) && !uni.includes(busqueda) && !alm.includes(busqueda)) return false
    }
    return true
  })
}

// ─── RENDER CONTENIDO ────────────────────────────────────────────────────
function renderContenido() {
  document.querySelectorAll(".tab-dir-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabActiva))
  const dirs = dirsFiltrados()
  if (tabActiva === "solicitudes")  renderSolicitudes(dirs.filter(d => d.estado === "solicitado"))
  if (tabActiva === "en_proceso")   renderEnProceso(dirs.filter(d => d.estado === "realizado"))
  if (tabActiva === "completados")  renderCompletados(dirs.filter(d => ["ingresado","entregado","transferido"].includes(d.estado)))
  if (tabActiva === "todos")        renderTodos(dirs)
}

// ─── SOLICITUDES PENDIENTES ───────────────────────────────────────────────
function renderSolicitudes(dirs) {
  const cont = document.getElementById("dir-content")
  cont.innerHTML = ""

  if (!dirs.length) {
    cont.innerHTML = `<div class="panel-vacio"><div class="panel-vacio-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><p>Sin solicitudes pendientes</p><span>No hay direccionamientos esperando atención</span></div>`
    return
  }

  dirs.forEach(d => {
    const card = document.createElement("div")
    card.className = "dir-card"
    const unidad  = d.unidades_carga
    const orden   = d.ordenes

    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700;color:#111827;font-family:monospace">${orden?.numero || "—"}</span>
            <span class="pill pill-${orden?.tipo || "SEA"}">${orden?.tipo || "—"}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:${d.tipo==="DT"?"#fefce8":"#ecfdf5"};color:${d.tipo==="DT"?"#ca8a04":"#059669"}">${d.tipo}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af">${orden?.clientes?.razon_social || "Sin cliente"}</div>
        </div>
        <span class="dir-estado dir-solicitado">Pendiente de atención</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px">
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Unidad de carga</div>
          <div style="font-size:12px;font-weight:600;color:#111827;font-family:monospace">${unidad?.referencia || "—"}</div>
          <div style="font-size:10px;color:#9ca3af">${unidad?.tipo_unidad?.toUpperCase() || "—"} · ${unidad?.bultos || 0} bultos</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Tipo dir.</div>
          <div style="font-size:12px;font-weight:600;color:#111827">${d.tipo}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Origen (POD)</div>
          <div style="font-size:12px;font-weight:500;color:#111827">${d.origen || "—"}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Destino</div>
          <div style="font-size:12px;font-weight:500;color:#111827">${d.destino || d.almacenes?.nombre || "—"}</div></div>
      </div>

      ${d.observaciones_solicitud ? `<div style="font-size:11px;color:#6b7280;margin-bottom:10px;padding:8px;background:#f9fafb;border-radius:6px">${d.observaciones_solicitud}</div>` : ""}

      <div style="font-size:10px;color:#9ca3af;margin-bottom:10px">Solicitado: ${new Date(d.fecha_solicitud).toLocaleString("es-PE")}</div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm btn-confirmar-dir" data-id="${d.id}" data-tipo="${d.tipo}">
          Confirmar direccionamiento
        </button>
      </div>
    `

    card.querySelector(".btn-confirmar-dir").addEventListener("click", function() {
      abrirModalConfirmarDir(d)
    })

    cont.appendChild(card)
  })
}

// ─── EN PROCESO (realizados) ──────────────────────────────────────────────
function renderEnProceso(dirs) {
  const cont = document.getElementById("dir-content")
  cont.innerHTML = ""

  if (!dirs.length) {
    cont.innerHTML = `<div class="panel-vacio"><p>Sin direccionamientos en proceso</p><span>No hay cargas esperando confirmación de ingreso</span></div>`
    return
  }

  dirs.forEach(d => {
    const card = document.createElement("div")
    card.className = "dir-card"
    const unidad = d.unidades_carga
    const orden  = d.ordenes

    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700;color:#111827;font-family:monospace">${orden?.numero || "—"}</span>
            <span class="pill pill-${orden?.tipo || "SEA"}">${orden?.tipo || "—"}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:${d.tipo==="DT"?"#fefce8":"#ecfdf5"};color:${d.tipo==="DT"?"#ca8a04":"#059669"}">${d.tipo}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af">${orden?.clientes?.razon_social || "Sin cliente"}</div>
        </div>
        <span class="dir-estado dir-realizado">Realizado — esperando ingreso</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;padding:12px;background:#fafafa;border-radius:8px">
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Unidad</div>
          <div style="font-size:12px;font-weight:600;color:#111827;font-family:monospace">${unidad?.referencia || "—"}</div>
          <div style="font-size:10px;color:#9ca3af">${unidad?.bultos || 0} bultos · ${unidad?.tipo_bulto || "—"}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Tipo</div>
          <div style="font-size:12px;font-weight:600;color:#111827">${d.tipo}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Origen</div>
          <div style="font-size:12px;font-weight:500;color:#111827">${d.origen || "—"}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:2px">Destino</div>
          <div style="font-size:12px;font-weight:500;color:#111827">${d.destino || d.almacenes?.nombre || "—"}</div></div>
      </div>

      <div style="font-size:10px;color:#9ca3af;margin-bottom:10px">
        Confirmado: ${d.fecha_confirmacion ? new Date(d.fecha_confirmacion).toLocaleString("es-PE") : "—"}
        ${d.confirmado_por ? " · por operativo" : ""}
      </div>

      ${d.archivo_sustento_url ? `<div style="margin-bottom:10px"><a href="${d.archivo_sustento_url}" target="_blank" class="btn btn-secondary btn-xs">Ver sustento del direccionamiento</a></div>` : ""}

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm btn-registrar-ingreso" data-id="${d.id}" data-tipo="${d.tipo}">
          ${d.tipo === "DT" ? "Registrar ingreso al DT" : "Registrar retiro de puerto"}
        </button>
      </div>
    `

    card.querySelector(".btn-registrar-ingreso").addEventListener("click", () => {
      abrirModalIngreso(d)
    })

    cont.appendChild(card)
  })
}

// ─── COMPLETADOS ──────────────────────────────────────────────────────────
function renderCompletados(dirs) {
  const cont = document.getElementById("dir-content")
  cont.innerHTML = ""

  if (!dirs.length) {
    cont.innerHTML = `<div class="panel-vacio"><p>Sin completados</p></div>`
    return
  }

  const tabla = document.createElement("div")
  tabla.className = "card"
  tabla.innerHTML = `
    <div class="card-header"><span class="card-title">Direccionamientos completados</span><span style="font-size:12px;color:#9ca3af">${dirs.length} registros</span></div>
    <table>
      <thead><tr><th>ORDEN</th><th>UNIDAD DE CARGA</th><th>TIPO</th><th>ORIGEN</th><th>DESTINO</th><th>F. CONFIRMACIÓN</th><th>ESTADO</th></tr></thead>
      <tbody>
        ${dirs.map(d => `
          <tr>
            <td><span style="font-weight:700;font-family:monospace;font-size:12px">${d.ordenes?.numero || "—"}</span></td>
            <td><span style="font-family:monospace;font-size:11px">${d.unidades_carga?.referencia || "—"}</span><div style="font-size:10px;color:#9ca3af">${d.unidades_carga?.bultos || 0} bultos</div></td>
            <td><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;background:${d.tipo==="DT"?"#fefce8":"#ecfdf5"};color:${d.tipo==="DT"?"#ca8a04":"#059669"}">${d.tipo}</span></td>
            <td class="text-sm text-muted">${d.origen || "—"}</td>
            <td class="text-sm">${d.destino || d.almacenes?.nombre || "—"}</td>
            <td class="text-sm text-muted">${d.fecha_confirmacion ? new Date(d.fecha_confirmacion).toLocaleDateString("es-PE") : "—"}</td>
            <td><span class="dir-estado dir-${d.estado}">${d.estado}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(tabla)
}

// ─── TODOS ────────────────────────────────────────────────────────────────
function renderTodos(dirs) {
  const cont = document.getElementById("dir-content")
  cont.innerHTML = ""

  const tabla = document.createElement("div")
  tabla.className = "card"
  tabla.innerHTML = `
    <div class="card-header"><span class="card-title">Todos los direccionamientos</span><span style="font-size:12px;color:#9ca3af">${dirs.length} registros</span></div>
    <table>
      <thead><tr><th>ORDEN</th><th>UNIDAD</th><th>TIPO</th><th>ORIGEN</th><th>DESTINO</th><th>ESTADO</th><th>FECHA</th></tr></thead>
      <tbody>
        ${dirs.map(d => `
          <tr>
            <td><span style="font-weight:700;font-family:monospace;font-size:12px">${d.ordenes?.numero || "—"}</span></td>
            <td style="font-family:monospace;font-size:11px">${d.unidades_carga?.referencia || "—"}</td>
            <td><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;background:${d.tipo==="DT"?"#fefce8":"#ecfdf5"};color:${d.tipo==="DT"?"#ca8a04":"#059669"}">${d.tipo}</span></td>
            <td class="text-sm text-muted">${d.origen || "—"}</td>
            <td class="text-sm">${d.destino || "—"}</td>
            <td><span class="dir-estado dir-${d.estado}">${d.estado}</span></td>
            <td class="text-sm text-muted">${new Date(d.fecha_solicitud).toLocaleDateString("es-PE")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `
  cont.appendChild(tabla)
}

// ─── MODAL CONFIRMAR DIRECCIONAMIENTO ─────────────────────────────────────
function abrirModalConfirmarDir(dir) {
  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">Confirmar direccionamiento</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">Orden: ${dir.ordenes?.numero || "—"} · ${dir.tipo} → ${dir.destino || dir.almacenes?.nombre || "—"}</div>

      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:#7c3aed;margin-bottom:8px">Datos originales de la solicitud</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><span style="color:#9ca3af">Unidad:</span> <strong>${dir.unidades_carga?.referencia || "—"}</strong></div>
          <div><span style="color:#9ca3af">Tipo:</span> <strong>${dir.tipo}</strong></div>
          <div><span style="color:#9ca3af">Origen:</span> <strong>${dir.origen || "—"}</strong></div>
          <div><span style="color:#9ca3af">Destino:</span> <strong>${dir.destino || dir.almacenes?.nombre || "—"}</strong></div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Confirmar que se direccionó correctamente según lo solicitado *</label>
          <select class="form-select" id="conf-acorde">
            <option value="si">Sí — se direccionó acorde a lo solicitado</option>
            <option value="no">No — hubo diferencias (especificar en observaciones)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones adicionales</label>
          <input class="form-input" type="text" id="conf-obs" placeholder="Notas del direccionamiento..." />
        </div>
        <div class="form-group">
          <label class="form-label">Sustento del direccionamiento * (captura de pantalla del sistema naviero/agente)</label>
          <div style="border:2px dashed #e5e7eb;border-radius:8px;padding:14px;text-align:center;cursor:pointer" id="conf-upload-zone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="margin:0 auto;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Clic para seleccionar archivo</div>
            <div id="conf-filename" style="font-size:10px;color:#7c3aed;margin-top:3px;display:none"></div>
            <input type="file" id="conf-archivo" style="display:none" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="conf-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="conf-confirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Confirmar direccionamiento</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById("conf-upload-zone").addEventListener("click", () => document.getElementById("conf-archivo").click())
  document.getElementById("conf-archivo").addEventListener("change", function() {
    if (this.files[0]) {
      document.getElementById("conf-filename").textContent = this.files[0].name
      document.getElementById("conf-filename").style.display = "block"
    }
  })
  document.getElementById("conf-cancelar").addEventListener("click", () => document.body.removeChild(overlay))
  document.getElementById("conf-confirmar").addEventListener("click", async () => {
    const archivo = document.getElementById("conf-archivo").files[0]
    const obs     = document.getElementById("conf-obs").value.trim()

    if (!archivo) { alert("Debes adjuntar el sustento del direccionamiento"); return }

    let urlSustento = null
    const ext  = archivo.name.split(".").pop()
    const path = `direccionamientos/${dir.id}/sustento_${Date.now()}.${ext}`
    const { error: upErr } = await db.storage.from("documentos").upload(path, archivo)
    if (!upErr) {
      const { data: u } = db.storage.from("documentos").getPublicUrl(path)
      urlSustento = u.publicUrl
    }

    await db.from("direccionamientos").update({
      estado:               "realizado",
      confirmado_por:       usuarioActual.id,
      fecha_confirmacion:   new Date().toISOString(),
      archivo_sustento_url: urlSustento,
      archivo_sustento_nombre: archivo.name
    }).eq("id", dir.id)

    document.body.removeChild(overlay)
    await cargarTodo()
  })
}

// ─── MODAL REGISTRAR INGRESO/RETIRO ──────────────────────────────────────
async function abrirModalIngreso(dir) {
  const esDT    = dir.tipo === "DT"
  const titulo  = esDT ? "Registrar ingreso al Depósito Temporal" : "Registrar retiro de puerto (Descarga Directa)"

  const { data: ordenesTL } = await db
    .from("ordenes").select("id,numero")
    .eq("tipo","TL").eq("activo",true)
    .order("created_at",{ascending:false})

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:560px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">${titulo}</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">Unidad: ${dir.unidades_carga?.referencia || "—"} · Destino: ${dir.destino || dir.almacenes?.nombre || "—"}</div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Fecha y hora de ingreso/retiro *</label>
          <input class="form-input" type="datetime-local" id="ing-fecha" value="${new Date(new Date()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" />
        </div>

        ${esDT ? `
        <div class="form-group">
          <label class="form-label">Número de volante *</label>
          <input class="form-input" type="text" id="ing-volante" placeholder="Número del volante de ingreso" />
        </div>` : ""}

        <div class="form-group">
          <label class="form-label">Órdenes TL asociadas * (obligatorio)</label>
          <select class="form-select" id="ing-tl-select" multiple style="min-height:100px">
            ${(ordenesTL || []).map(o => `<option value="${o.id}">${o.numero}</option>`).join("")}
          </select>
          <div style="font-size:10px;color:#9ca3af;margin-top:3px">Ctrl+clic para seleccionar varias</div>
        </div>

        <div style="background:#fafafa;border:1px solid #f3f4f6;border-radius:8px;padding:12px">
          <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:10px">Documentos de sustento *</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div class="form-group">
              <label class="form-label">Consolidado de tickets de puerto</label>
              <input type="file" class="form-input" id="doc-tickets" accept=".pdf,.jpg,.jpeg,.png" style="padding:4px" />
            </div>
            <div class="form-group">
              <label class="form-label">Guías de remisión / transporte</label>
              <input type="file" class="form-input" id="doc-guias" accept=".pdf,.jpg,.jpeg,.png" style="padding:4px" />
            </div>
            ${esDT ? `
            <div class="form-group">
              <label class="form-label">Volante (documento físico)</label>
              <input type="file" class="form-input" id="doc-volante-file" accept=".pdf,.jpg,.jpeg,.png" style="padding:4px" />
            </div>` : ""}
            <div class="form-group">
              <label class="form-label">Fotos de la carga</label>
              <input type="file" class="form-input" id="doc-fotos" accept=".jpg,.jpeg,.png" style="padding:4px" multiple />
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="ing-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="ing-confirmar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">
          ${esDT ? "Confirmar ingreso al DT" : "Confirmar retiro de puerto"}
        </button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById("ing-cancelar").addEventListener("click", () => document.body.removeChild(overlay))
  document.getElementById("ing-confirmar").addEventListener("click", async () => {
    const fecha   = document.getElementById("ing-fecha").value
    const volante = document.getElementById("ing-volante")?.value.trim()
    const selTL   = Array.from(document.getElementById("ing-tl-select").selectedOptions).map(o => o.value)

    if (!fecha) { alert("Ingresa la fecha de ingreso"); return }
    if (!selTL.length) { alert("Debes asociar al menos una orden TL"); return }
    if (esDT && !volante) { alert("Ingresa el número de volante"); return }

    const nuevoEstado = esDT ? "ingresado" : "entregado"

    // Subir documentos
    const uploadDoc = async (inputId, nombre) => {
      const el = document.getElementById(inputId)
      if (!el || !el.files[0]) return null
      const f    = el.files[0]
      const ext  = f.name.split(".").pop()
      const path = `direccionamientos/${dir.id}/${nombre}_${Date.now()}.${ext}`
      const { error } = await db.storage.from("documentos").upload(path, f)
      if (error) return null
      const { data: u } = db.storage.from("documentos").getPublicUrl(path)
      return u.publicUrl
    }

    const [urlTickets, urlGuias, urlFotos, urlVolanteFile] = await Promise.all([
      uploadDoc("doc-tickets",  "tickets"),
      uploadDoc("doc-guias",    "guias"),
      uploadDoc("doc-fotos",    "fotos"),
      esDT ? uploadDoc("doc-volante-file", "volante_doc") : Promise.resolve(null),
    ])

    await db.from("direccionamientos").update({
      estado:                nuevoEstado,
      fecha_ingreso_entrega: new Date(fecha).toISOString(),
      numero_volante:        volante || null,
      ordenes_tl_ids:        selTL,
      archivo_tickets_url:   urlTickets,
      archivo_guias_url:     urlGuias,
      archivo_fotos_url:     urlFotos,
      archivo_volante_url:   urlVolanteFile,
    }).eq("id", dir.id)

    // Generar lote de stock automáticamente
    await generarLoteStock(dir, nuevoEstado, fecha, volante)

    document.body.removeChild(overlay)
    await cargarTodo()
    alert(`✓ ${esDT ? "Ingreso al DT" : "Retiro de puerto"} registrado. Lote generado en stock.`)
  })
}

// ─── GENERAR LOTE DE STOCK AUTOMÁTICAMENTE ────────────────────────────────
async function generarLoteStock(dir, estado, fecha, volante) {
  const unidad = dir.unidades_carga
  const orden  = dir.ordenes

  const estadoLote    = estado === "ingresado" ? "ingresado" : "despachado"
  const fechaTarja    = estado === "ingresado" ? (volante ? fecha : fecha) : fecha

  const { data: lote, error } = await db.from("stock_lotes").insert({
    orden_id:              dir.orden_id,
    almacen_id:            dir.almacen_id,
    tipo_direccionamiento: dir.tipo,
    referencia_bl:         unidad?.referencia || "—",
    descripcion:           unidad?.descripcion || unidad?.referencia || "—",
    estado:                estadoLote,
    fecha_ingreso:         new Date(fecha).toISOString(),
    numero_volante:        volante || null,
    fecha_tarja:           fecha ? new Date(fecha).toISOString().split("T")[0] : null,
    total_bultos:          unidad?.bultos || 0,
    saldo_bultos:          estadoLote === "ingresado" ? (unidad?.bultos || 0) : 0,
    total_unidades:        1,
    saldo_unidades:        estadoLote === "ingresado" ? 1 : 0,
    total_volumen_m3:      unidad?.volumen_m3 || 0,
    saldo_peso_kg:         unidad?.peso_kg    || 0,
    total_peso_kg:         unidad?.peso_kg    || 0,
    observaciones:         `Generado desde direccionamiento ${dir.tipo}`,
    direccionamiento_id:   dir.id,
  }).select().single()

  if (error) { console.error("Error generando lote:", error.message); return }

  // Actualizar el direccionamiento con el lote generado
  await db.from("direccionamientos").update({ lote_stock_id: lote.id }).eq("id", dir.id)

  // Registrar movimiento inicial
  await db.from("stock_movimientos").insert({
    lote_id:         lote.id,
    orden_id:        dir.orden_id,
    tipo_movimiento: "ingreso",
    unidades:        1,
    bultos:          unidad?.bultos || 0,
    peso_kg:         unidad?.peso_kg || 0,
    observaciones:   `Ingreso ${dir.tipo} desde direccionamiento`,
    registrado_por:  usuarioActual.id,
    fecha_movimiento: new Date(fecha).toISOString()
  })
}

// ─── MODAL NUEVA SOLICITUD DE DIRECCIONAMIENTO ────────────────────────────
async function abrirModalNuevoDir() {
  const { data: ordenes } = await db
    .from("ordenes").select("id,numero,tipo,origen,destino,clientes(razon_social)")
    .in("tipo",["SEA","AIR"]).eq("activo",true).order("created_at",{ascending:false})

  const { data: unidades } = await db
    .from("unidades_carga").select("id,orden_id,referencia,tipo_unidad,bultos,descripcion")
    .in("estado",["en_transito","en_deposito"])

  const opAlmacenes = almacenes.filter(a => a.tipo === "DT")
    .map(a => `<option value="${a.id}">${a.nombre}</option>`).join("")

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px"
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:520px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:20px">Nueva solicitud de direccionamiento</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Tipo de direccionamiento *</label>
          <div style="display:flex;gap:8px">
            <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer">
              <input type="radio" name="dir-tipo" value="DT" checked style="accent-color:#7c3aed" /> Depósito Temporal (DT)
            </label>
            <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer">
              <input type="radio" name="dir-tipo" value="DD" style="accent-color:#7c3aed" /> Descarga Directa (DD)
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Orden de carga *</label>
          <select class="form-select" id="new-dir-orden">
            <option value="">Selecciona orden SEA/AIR...</option>
            ${(ordenes||[]).map(o => `<option value="${o.id}" data-origen="${o.origen||""}" data-destino="${o.destino||""}">${o.numero} (${o.tipo}) · ${o.clientes?.razon_social||""}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Unidad de carga *</label>
          <select class="form-select" id="new-dir-unidad">
            <option value="">Primero selecciona la orden...</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Origen (POD)</label>
            <input class="form-input" type="text" id="new-dir-origen" placeholder="Puerto de llegada" />
          </div>
          <div class="form-group">
            <label class="form-label">Destino *</label>
            <input class="form-input" type="text" id="new-dir-destino-dd" placeholder="Lugar de entrega final (DD)" />
          </div>
        </div>
        <div class="form-group" id="grupo-almacen">
          <label class="form-label">Depósito Temporal destino</label>
          <select class="form-select" id="new-dir-almacen">
            <option value="">Selecciona DT...</option>
            ${opAlmacenes}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <input class="form-input" type="text" id="new-dir-obs" placeholder="Indicaciones adicionales..." />
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button id="new-dir-cancelar" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600">Cancelar</button>
        <button id="new-dir-guardar" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Solicitar direccionamiento</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // Cambiar tipo muestra/oculta campo almacén
  overlay.querySelectorAll("input[name='dir-tipo']").forEach(r => {
    r.addEventListener("change", function() {
      const grupoAlm = document.getElementById("grupo-almacen")
      grupoAlm.style.display = this.value === "DT" ? "flex" : "none"
    })
  })

  // Cargar unidades de la orden seleccionada
  document.getElementById("new-dir-orden").addEventListener("change", function() {
    const opt    = this.options[this.selectedIndex]
    const origen = opt.dataset.origen || ""
    document.getElementById("new-dir-origen").value = origen

    const unidadesFiltradas = (unidades || []).filter(u => u.orden_id === this.value)
    const sel = document.getElementById("new-dir-unidad")
    sel.innerHTML = unidadesFiltradas.length
      ? `<option value="">Selecciona unidad...</option>` + unidadesFiltradas.map(u => `<option value="${u.id}">${u.referencia} · ${u.tipo_unidad?.toUpperCase()} · ${u.bultos||0} bultos</option>`).join("")
      : `<option value="">Sin unidades disponibles</option>`
  })

  document.getElementById("new-dir-cancelar").addEventListener("click", () => document.body.removeChild(overlay))
  document.getElementById("new-dir-guardar").addEventListener("click", async () => {
    const tipo      = document.querySelector("input[name='dir-tipo']:checked")?.value
    const ordenId   = document.getElementById("new-dir-orden").value
    const unidadId  = document.getElementById("new-dir-unidad").value
    const origen    = document.getElementById("new-dir-origen").value.trim()
    const destinoDD = document.getElementById("new-dir-destino-dd").value.trim()
    const almacenId = document.getElementById("new-dir-almacen").value
    const obs       = document.getElementById("new-dir-obs").value.trim()

    if (!ordenId || !unidadId) { alert("Selecciona la orden y la unidad de carga"); return }
    if (tipo === "DD" && !destinoDD) { alert("Ingresa el destino para Descarga Directa"); return }
    if (tipo === "DT" && !almacenId) { alert("Selecciona el Depósito Temporal"); return }

    const { error } = await db.from("direccionamientos").insert({
      orden_id:                ordenId,
      unidad_carga_id:         parseInt(unidadId),
      tipo,
      estado:                  "solicitado",
      origen:                  origen || null,
      destino:                 tipo === "DD" ? destinoDD : null,
      almacen_id:              tipo === "DT" ? parseInt(almacenId) : null,
      observaciones_solicitud: obs || null,
      solicitado_por:          usuarioActual.id,
      fecha_solicitud:         new Date().toISOString()
    })

    if (error) { alert("Error: " + error.message); return }

    // Actualizar estado de la unidad de carga a "solicitado"
    await db.from("unidades_carga").update({ estado: "en_deposito" }).eq("id", unidadId)

    document.body.removeChild(overlay)
    await cargarTodo()
  })
}

// ─── TABS Y FILTROS ───────────────────────────────────────────────────────
document.querySelectorAll(".tab-dir-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    tabActiva = this.dataset.tab
    renderContenido()
  })
})

document.getElementById("filtro-estado-dir")?.addEventListener("change", renderContenido)
document.getElementById("filtro-tipo-dir")?.addEventListener("change",   renderContenido)
document.getElementById("filtro-busqueda-dir")?.addEventListener("input", renderContenido)
document.getElementById("btn-nuevo-dir")?.addEventListener("click", abrirModalNuevoDir)

async function cerrarSesion() {
  await db.auth.signOut()
  sessionStorage.removeItem("usuario")
  window.location.href = "index.html"
}

inicializarUI()
cargarTodo()