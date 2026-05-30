const { createClient } = supabase
const SUPABASE_URL = "https://xeduwecilmygdtukxewl.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHV3ZWNpbG15Z2R0dWt4ZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDczOTQsImV4cCI6MjA5NTcyMzM5NH0.WxTBSrxG9DTGn08IURNrF3xU7gj7StDa5_aEFru_R7U"
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

async function intentarLogin() {
  const email    = document.getElementById("login-email").value.trim()
  const password = document.getElementById("login-password").value
  const btn      = document.getElementById("btn-login")
  const errorEl  = document.getElementById("login-error")

  errorEl.classList.remove("visible")

  if (!email || !password) {
    errorEl.textContent = "Completa todos los campos"
    errorEl.classList.add("visible")
    return
  }

  btn.textContent = "Iniciando sesión..."
  btn.disabled = true

  const { data, error } = await db.auth.signInWithPassword({ email, password })

  if (error) {
    errorEl.textContent = "Credenciales incorrectas. Intenta nuevamente."
    errorEl.classList.add("visible")
    btn.textContent = "Iniciar sesión"
    btn.disabled = false
    return
  }

  const { data: usuario } = await db
    .from("usuarios").select("*").eq("id", data.user.id).single()

  if (!usuario) {
    errorEl.textContent = "Usuario no encontrado en el sistema."
    errorEl.classList.add("visible")
    btn.textContent = "Iniciar sesión"
    btn.disabled = false
    return
  }

  sessionStorage.setItem("usuario", JSON.stringify(usuario))
  window.location.href = "dashboard.html"
}

document.getElementById("btn-login").addEventListener("click", intentarLogin)

// Enter en cualquier campo dispara el login
document.getElementById("login-email").addEventListener("keypress", e => { if (e.key === "Enter") intentarLogin() })
document.getElementById("login-password").addEventListener("keypress", e => { if (e.key === "Enter") intentarLogin() })