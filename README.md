# Sistema MarsTech Logistics v2.0

Bienvenido al repositorio oficial del **Sistema MarsTech**, una plataforma web integral de gestión logística diseñada para controlar el ciclo de vida de operaciones de comercio exterior, gestión de clientes, órdenes, finanzas y control de inventarios.

## 🚀 Módulos Principales

*   **Clientes y Ventas**: Registro de clientes, emisión de cotizaciones con cálculo de rentabilidad y aprobaciones.
*   **Operaciones y Trazabilidad (Hitos)**: Seguimiento de BLs, tiempos estimados (ETA/ETD) y actualización de hitos operativos en tiempo real.
*   **Control de Stock**: Direccionamiento de cargas a Depósitos Aduaneros, Temporales o Descarga Directa, y gestión completa del Kardex.
*   **Finanzas**: Registro de costos operativos, comprobantes, solicitudes de pago y liquidaciones.

## 🤖 Aseguramiento de Calidad (QA Automation)

Este proyecto cuenta con una robusta suite de pruebas automatizadas **End-to-End (E2E)** alojada en la carpeta `mars-tech-testing`. Esta arquitectura garantiza la estabilidad del sistema frente a nuevos cambios.

**Stack Tecnológico de Pruebas:**
*   **Framework:** Playwright (con Node.js y TypeScript).
*   **Enfoque BDD:** Uso de `playwright-bdd` para escribir casos de prueba en lenguaje natural Gherkin (`.feature`).
*   **Arquitectura:** Patrón POM (Page Object Model) para abstraer la UI de la lógica de las pruebas.
*   **Pipeline CI/CD:** GitHub Actions configurado para validar umbrales de éxito del 95% en cada Push/Pull Request.

### ¿Cómo correr las pruebas localmente?

1. Navega al directorio de pruebas e instala dependencias:
   ```bash
   cd mars-tech-testing
   npm install
   ```
2. Inicia el servidor de la aplicación (desde la raíz del proyecto en otra terminal):
   ```bash
   npx -y http-server . -p 8080 -c-1
   ```
3. Ejecuta la compilación de BDD y lanza las pruebas:
   ```bash
   npx bddgen && npx playwright test --project=chromium --workers=1
   ```

## 🛠 Desarrollo

Para levantar el sistema de forma rápida y probarlo en tu navegador:

```bash
npx -y http-server . -p 8080 -c-1
```

Ingresa a `http://127.0.0.1:8080` para comenzar a usar la plataforma.
