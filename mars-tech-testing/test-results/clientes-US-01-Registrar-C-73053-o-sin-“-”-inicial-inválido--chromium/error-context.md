# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clientes.spec.ts >> US-01: Registrar Cliente >> CLI-UAT-002: Registrar cliente con teléfono sin “+” inicial (inválido)
- Location: tests\clientes.spec.ts:61:7

# Error details

```
Error: No se mostró la alerta nativa del navegador validando el teléfono

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e11]: MarsTech
        - generic [ref=e12]: LOGISTICS · v2.0
      - navigation [ref=e13]:
        - generic [ref=e14]: WORKSPACE
        - link "Overview" [ref=e15] [cursor=pointer]:
          - /url: dashboard.html
          - generic [ref=e16]:
            - img [ref=e17]
            - text: Overview
        - link "Clientes" [ref=e22] [cursor=pointer]:
          - /url: clientes.html
          - generic [ref=e23]:
            - img [ref=e24]
            - text: Clientes
        - link "Ventas" [ref=e27] [cursor=pointer]:
          - /url: ventas.html
          - generic [ref=e28]:
            - img [ref=e29]
            - text: Ventas
        - generic [ref=e32]: OPERACIONES
        - link "Órdenes" [ref=e33] [cursor=pointer]:
          - /url: ordenes.html
          - generic [ref=e34]:
            - img [ref=e35]
            - text: Órdenes
        - link "Hitos" [ref=e40] [cursor=pointer]:
          - /url: hitos.html
          - generic [ref=e41]:
            - img [ref=e42]
            - text: Hitos
        - link "Finanzas" [ref=e45] [cursor=pointer]:
          - /url: finanzas.html
          - generic [ref=e46]:
            - img [ref=e47]
            - text: Finanzas
        - generic [ref=e50]: ALMACENES
        - link "Stock" [ref=e51] [cursor=pointer]:
          - /url: stock.html
          - generic [ref=e52]:
            - img [ref=e53]
            - text: Stock
        - link "Depósito Aduanero" [ref=e56] [cursor=pointer]:
          - /url: deposito-aduanero.html
          - generic [ref=e57]:
            - img [ref=e58]
            - text: Depósito Aduanero
        - link "Direccionamiento" [ref=e61] [cursor=pointer]:
          - /url: direccionamiento.html
          - generic [ref=e62]:
            - img [ref=e63]
            - text: Direccionamiento
        - generic [ref=e68]: SISTEMA
        - link "Usuarios" [ref=e69] [cursor=pointer]:
          - /url: "#"
          - generic [ref=e70]:
            - img [ref=e71]
            - text: Usuarios
      - generic [ref=e75] [cursor=pointer]:
        - generic [ref=e76]: A
        - generic [ref=e77]:
          - generic [ref=e78]: Administrador
          - generic [ref=e79]: ADMIN
          - button "Cerrar sesión" [ref=e80]
    - generic [ref=e81]:
      - banner [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]: Clientes
          - generic [ref=e85]: Gestión de cartera
        - generic [ref=e86]:
          - generic [ref=e87]: Online
          - generic [ref=e88]: 31 may. 2026
      - generic [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]:
            - generic [ref=e92]: Clientes
            - generic [ref=e93]: // 3 clientes activos en cartera
          - button "+ Nuevo cliente" [ref=e94] [cursor=pointer]
        - generic [ref=e95]:
          - textbox "Buscar por razón social, RUC o contacto..." [ref=e96]
          - combobox [ref=e97]:
            - option "Todos los tipos" [selected]
            - option "Importador"
            - option "Exportador"
            - option "Ambos"
        - generic [ref=e98]:
          - generic [ref=e100]: Cartera de clientes
          - table [ref=e101]:
            - rowgroup [ref=e102]:
              - row "RUC / DOC RAZÓN SOCIAL CONTACTO TIPO PAÍS ACCIONES" [ref=e103]:
                - columnheader "RUC / DOC" [ref=e104]
                - columnheader "RAZÓN SOCIAL" [ref=e105]
                - columnheader "CONTACTO" [ref=e106]
                - columnheader "TIPO" [ref=e107]
                - columnheader "PAÍS" [ref=e108]
                - columnheader "ACCIONES" [ref=e109]
            - rowgroup [ref=e110]:
              - row "20547855555 E Empresa1 Av. Los Olivos 123 Gianfranco exportador Peru Vista rápida Ver detalle Editar Eliminar" [ref=e111]:
                - cell "20547855555" [ref=e112]
                - cell "E Empresa1 Av. Los Olivos 123" [ref=e113]:
                  - generic [ref=e114]:
                    - generic [ref=e115]: E
                    - generic [ref=e116]:
                      - generic [ref=e117]: Empresa1
                      - generic [ref=e118]: Av. Los Olivos 123
                - cell "Gianfranco" [ref=e119]
                - cell "exportador" [ref=e120]:
                  - generic [ref=e121]: exportador
                - cell "Peru" [ref=e122]
                - cell "Vista rápida Ver detalle Editar Eliminar" [ref=e123]:
                  - generic [ref=e124]:
                    - button "Vista rápida" [ref=e125] [cursor=pointer]
                    - link "Ver detalle" [ref=e126] [cursor=pointer]:
                      - /url: cliente-detalle.html?id=1
                    - button "Editar" [ref=e127] [cursor=pointer]
                    - button "Eliminar" [ref=e128] [cursor=pointer]
              - row "20678944444 E Empresa2 Calle Comercio 456 Miguelito importador Peru Vista rápida Ver detalle Editar Eliminar" [ref=e129]:
                - cell "20678944444" [ref=e130]
                - cell "E Empresa2 Calle Comercio 456" [ref=e131]:
                  - generic [ref=e132]:
                    - generic [ref=e133]: E
                    - generic [ref=e134]:
                      - generic [ref=e135]: Empresa2
                      - generic [ref=e136]: Calle Comercio 456
                - cell "Miguelito" [ref=e137]
                - cell "importador" [ref=e138]:
                  - generic [ref=e139]: importador
                - cell "Peru" [ref=e140]
                - cell "Vista rápida Ver detalle Editar Eliminar" [ref=e141]:
                  - generic [ref=e142]:
                    - button "Vista rápida" [ref=e143] [cursor=pointer]
                    - link "Ver detalle" [ref=e144] [cursor=pointer]:
                      - /url: cliente-detalle.html?id=2
                    - button "Editar" [ref=e145] [cursor=pointer]
                    - button "Eliminar" [ref=e146] [cursor=pointer]
              - row "20547896321 TP Translog Perú SAC Av. Los Olivos 123 Carlos Ramírez importador Perú Vista rápida Ver detalle Editar Eliminar" [ref=e147]:
                - cell "20547896321" [ref=e148]
                - cell "TP Translog Perú SAC Av. Los Olivos 123" [ref=e149]:
                  - generic [ref=e150]:
                    - generic [ref=e151]: TP
                    - generic [ref=e152]:
                      - generic [ref=e153]: Translog Perú SAC
                      - generic [ref=e154]: Av. Los Olivos 123
                - cell "Carlos Ramírez" [ref=e155]
                - cell "importador" [ref=e156]:
                  - generic [ref=e157]: importador
                - cell "Perú" [ref=e158]
                - cell "Vista rápida Ver detalle Editar Eliminar" [ref=e159]:
                  - generic [ref=e160]:
                    - button "Vista rápida" [ref=e161] [cursor=pointer]
                    - link "Ver detalle" [ref=e162] [cursor=pointer]:
                      - /url: cliente-detalle.html?id=22
                    - button "Editar" [ref=e163] [cursor=pointer]
                    - button "Eliminar" [ref=e164] [cursor=pointer]
  - generic [ref=e166]:
    - generic [ref=e167]: Nuevo cliente
    - generic [ref=e168]:
      - generic [ref=e169]:
        - generic [ref=e170]:
          - generic [ref=e171]: Tipo de documento
          - combobox [ref=e172]:
            - option "RUC"
            - option "DNI" [selected]
            - option "Pasaporte"
            - option "Tax ID (extranjero)"
        - generic [ref=e173]:
          - generic [ref=e174]: Número de documento
          - textbox "20517830268" [ref=e175]: "12345678"
      - generic [ref=e176]:
        - generic [ref=e177]: Razón social / Nombre
        - textbox "Empresa SAC" [ref=e178]: Andes
      - generic [ref=e179]:
        - generic [ref=e180]:
          - generic [ref=e181]: Contacto principal
          - textbox "Nombre del contacto" [ref=e182]: Ana
        - generic [ref=e183]:
          - generic [ref=e184]: Teléfono / WhatsApp
          - textbox "+51 999 999 999" [ref=e185]: "51987654321"
      - generic [ref=e186]:
        - generic [ref=e187]: Correo electrónico
        - textbox "contacto@empresa.com" [ref=e188]: aa@b.com
      - generic [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]: Tipo de cliente
          - combobox [ref=e192]:
            - option "Importador"
            - option "Exportador" [selected]
            - option "Ambos"
        - generic [ref=e193]:
          - generic [ref=e194]: País
          - textbox [ref=e195]: PE
      - generic [ref=e196]:
        - generic [ref=e197]: Dirección
        - textbox "Av. Principal 123, Lima" [ref=e198]: Jr 1
      - generic [ref=e199]:
        - generic [ref=e200]:
          - generic [ref=e201]: Vendedor asignado
          - textbox "Nombre del vendedor" [ref=e202]: Luz
        - generic [ref=e203]:
          - generic [ref=e204]: Condición de pago
          - combobox [ref=e205]:
            - option "Contado" [selected]
            - option "Crédito 15 días"
            - option "Crédito 30 días"
            - option "Crédito 45 días"
            - option "Crédito 60 días"
      - generic [ref=e207]:
        - generic [ref=e208]: Límite de crédito (USD)
        - spinbutton [ref=e209]
      - generic [ref=e210]:
        - generic [ref=e211]: Observaciones
        - textbox "Notas internas..." [ref=e212]
    - generic [ref=e213]:
      - button "Cancelar" [ref=e214] [cursor=pointer]
      - button "Crear cliente" [active] [ref=e215] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { LoginPage } from '../pages/LoginPage';
  3   | import { SidebarMenu } from '../pages/SidebarMenu';
  4   | import { ClientesPage } from '../pages/ClientesPage';
  5   | import { ClienteDetallePage } from '../pages/ClienteDetallePage';
  6   | 
  7   | // Asegurar que las pruebas se ejecuten secuencialmente para que Editar encuentre el cliente creado en Registrar
  8   | // Se removió el modo serial para que no se detengan si uno falla
  9   | 
  10  | test.describe('US-01: Registrar Cliente', () => {
  11  |   let loginPage: LoginPage;
  12  |   let sidebar: SidebarMenu;
  13  |   let clientesPage: ClientesPage;
  14  | 
  15  |   test.beforeEach(async ({ page }) => {
  16  |     loginPage = new LoginPage(page);
  17  |     sidebar = new SidebarMenu(page);
  18  |     clientesPage = new ClientesPage(page);
  19  | 
  20  |     await loginPage.goto();
  21  |     // Inicia sesión con un usuario de pruebas. 
  22  |     // Si la contraseña es distinta en tu entorno, debemos ajustarla.
  23  |     await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
  24  |     
  25  |     // Esperar a que cargue el dashboard y navegar a clientes
  26  |     await page.waitForURL('**/dashboard*');
  27  |     await sidebar.irAClientes();
  28  |     await page.waitForURL('**/clientes*');
  29  |   });
  30  | 
  31  |   test('CLI-UAT-001: Registrar cliente con información requerida válida', async ({ page }) => {
  32  |     await clientesPage.abrirModalNuevoCliente();
  33  |     
  34  |     // Llenamos con los datos exactos del caso de prueba
  35  |     await clientesPage.llenarFormularioCliente({
  36  |       tipoDoc: 'RUC',
  37  |       numDoc: '20547896321',
  38  |       razonSocial: 'Translog Perú SAC',
  39  |       contacto: 'Carlos Ramírez',
  40  |       telefono: '+51987654321',
  41  |       email: 'contacto@translog.com',
  42  |       tipoCliente: 'importador',
  43  |       pais: 'Perú',
  44  |       direccion: 'Av. Los Olivos 123',
  45  |       vendedor: 'Ana Torres',
  46  |       condicionPago: 'Contado',
  47  |       creditoLimite: 0.00,
  48  |       observaciones: 'Cliente nuevo'
  49  |     });
  50  | 
  51  |     await clientesPage.guardarCliente();
  52  |     
  53  |     // Verificar que el modal se cerró (el cliente se guardó en la BD)
  54  |     await expect(page.locator('#modal-cliente')).not.toHaveClass(/visible/);
  55  |     
  56  |     // Verificar que el cliente aparece en el listado
  57  |     await clientesPage.buscarCliente('20547896321');
  58  |     await expect(page.locator('text=20547896321')).toBeVisible();
  59  |   });
  60  | 
  61  |   test('CLI-UAT-002: Registrar cliente con teléfono sin “+” inicial (inválido)', async ({ page }) => {
  62  |     await clientesPage.abrirModalNuevoCliente();
  63  |     
  64  |     // Llenamos con los datos exactos del caso de prueba
  65  |     await clientesPage.llenarFormularioCliente({
  66  |       tipoDoc: 'DNI',
  67  |       numDoc: '12345678',
  68  |       razonSocial: 'Andes',
  69  |       contacto: 'Ana',
  70  |       telefono: '51987654321', // Sin "+" como dice la descripción del caso
  71  |       email: 'aa@b.com',
  72  |       tipoCliente: 'exportador',
  73  |       pais: 'PE',
  74  |       direccion: 'Jr 1',
  75  |       vendedor: 'Luz',
  76  |       condicionPago: 'Contado',
  77  |       creditoLimite: 0.00,
  78  |       observaciones: ''
  79  |     });
  80  | 
  81  |     let alertaMostrada = false;
  82  |     let mensajeAlerta = '';
  83  |     page.on('dialog', async dialog => {
  84  |       alertaMostrada = true;
  85  |       mensajeAlerta = dialog.message();
  86  |       await dialog.accept(); 
  87  |     });
  88  | 
  89  |     await clientesPage.guardarCliente();
  90  |     
  91  |     // Verificación según el CA-02
> 92  |     expect(alertaMostrada, 'No se mostró la alerta nativa del navegador validando el teléfono').toBeTruthy();
      |                                                                                                 ^ Error: No se mostró la alerta nativa del navegador validando el teléfono
  93  |     expect(mensajeAlerta.toLowerCase()).toContain('teléfono');
  94  |     
  95  |     // El modal de creación debe seguir abierto porque no se guardó
  96  |     await expect(page.locator('#modal-cliente')).toHaveClass(/visible/);
  97  |   });
  98  | 
  99  |   test('CLI-UAT-003: Registrar cliente con teléfono válido y “+” inicial', async ({ page }) => {
  100 |     await clientesPage.abrirModalNuevoCliente();
  101 |     
  102 |     await clientesPage.llenarFormularioCliente({
  103 |       tipoDoc: 'RUC',
  104 |       numDoc: '20678945123',
  105 |       razonSocial: 'Exportaciones Lima SAC',
  106 |       contacto: 'Mariana López',
  107 |       telefono: '+51956789123',
  108 |       email: 'operaciones@exportlima.com',
  109 |       tipoCliente: 'ambos',
  110 |       pais: 'Perú',
  111 |       direccion: 'Calle Comercio 456',
  112 |       vendedor: 'Luis Rojas',
  113 |       condicionPago: 'Credito 30',
  114 |       creditoLimite: 15000.00,
  115 |       observaciones: 'Cliente con crédito aprobado'
  116 |     });
  117 | 
  118 |     await clientesPage.guardarCliente();
  119 |     
  120 |     // Verificar que registró exitosamente
  121 |     await expect(page.locator('#modal-cliente')).not.toHaveClass(/visible/);
  122 |     
  123 |     // Validar que aparezca
  124 |     await clientesPage.buscarCliente('20678945123');
  125 |     await expect(page.locator('text=20678945123')).toBeVisible();
  126 |   });
  127 | });
  128 | 
  129 | test.describe('US-02: Editar cliente', () => {
  130 |   let loginPage: LoginPage;
  131 |   let sidebar: SidebarMenu;
  132 |   let clientesPage: ClientesPage;
  133 |   let clienteDetallePage: ClienteDetallePage;
  134 | 
  135 |   test.beforeEach(async ({ page }) => {
  136 |     loginPage = new LoginPage(page);
  137 |     sidebar = new SidebarMenu(page);
  138 |     clientesPage = new ClientesPage(page);
  139 |     clienteDetallePage = new ClienteDetallePage(page);
  140 | 
  141 |     await loginPage.goto();
  142 |     await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
  143 |     
  144 |     // Esperar a que cargue el dashboard y navegar a clientes
  145 |     await page.waitForURL('**/dashboard*');
  146 |     await sidebar.irAClientes();
  147 |     await page.waitForURL('**/clientes*');
  148 |   });
  149 | 
  150 |   test('CLI-UAT-007: Editar cliente modificando número de documento y razón social válidos', async ({ page }) => {
  151 |     // Buscar y seleccionar el cliente original
  152 |     await clientesPage.buscarCliente('20547896321');
  153 |     await page.waitForTimeout(1000);
  154 |     
  155 |     await page.locator('a:has-text("Ver detalle")').first().click();
  156 |     await page.waitForURL('**/cliente-detalle*');
  157 | 
  158 |     await clienteDetallePage.abrirModalEditar();
  159 | 
  160 |     // Modificar RUC y Razón social
  161 |     await clienteDetallePage.llenarFormularioEdicion({
  162 |       numDoc: '20547896555',
  163 |       razonSocial: 'Translog Perú Cargo SAC'
  164 |     });
  165 | 
  166 |     await clienteDetallePage.guardarCambios();
  167 |     await expect(clienteDetallePage.modalEditar).not.toHaveClass(/visible/);
  168 |   });
  169 | 
  170 |   test('CLI-UAT-008: Editar cliente modificando correo y teléfono válidos', async ({ page }) => {
  171 |     // Buscar y seleccionar el cliente con el RUC editado en el paso anterior
  172 |     await clientesPage.buscarCliente('20547896555');
  173 |     await page.waitForTimeout(1000);
  174 |     
  175 |     await page.locator('a:has-text("Ver detalle")').first().click();
  176 |     await page.waitForURL('**/cliente-detalle*');
  177 | 
  178 |     await clienteDetallePage.abrirModalEditar();
  179 | 
  180 |     // Modificar correo y teléfono
  181 |     await clienteDetallePage.llenarFormularioEdicion({
  182 |       email: 'operaciones@translog.com',
  183 |       telefono: '+51999654321'
  184 |     });
  185 | 
  186 |     await clienteDetallePage.guardarCambios();
  187 |     await expect(clienteDetallePage.modalEditar).not.toHaveClass(/visible/);
  188 |   });
  189 | });
  190 | 
  191 | test.describe('US-03: Búsqueda de clientes', () => {
  192 |   let loginPage: LoginPage;
```