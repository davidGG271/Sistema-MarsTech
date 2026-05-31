import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SidebarMenu } from '../pages/SidebarMenu';
import { ClientesPage } from '../pages/ClientesPage';
import { ClienteDetallePage } from '../pages/ClienteDetallePage';

// Asegurar que las pruebas se ejecuten secuencialmente para que Editar encuentre el cliente creado en Registrar
// Se removió el modo serial para que no se detengan si uno falla

test.describe('US-01: Registrar Cliente', () => {
  let loginPage: LoginPage;
  let sidebar: SidebarMenu;
  let clientesPage: ClientesPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    sidebar = new SidebarMenu(page);
    clientesPage = new ClientesPage(page);

    await loginPage.goto();
    // Inicia sesión con un usuario de pruebas. 
    // Si la contraseña es distinta en tu entorno, debemos ajustarla.
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    
    // Esperar a que cargue el dashboard y navegar a clientes
    await page.waitForURL('**/dashboard*');
    await sidebar.irAClientes();
    await page.waitForURL('**/clientes*');
  });

  test('CLI-UAT-001: Registrar cliente con información requerida válida', async ({ page }) => {
    await clientesPage.abrirModalNuevoCliente();
    
    // Llenamos con los datos exactos del caso de prueba
    await clientesPage.llenarFormularioCliente({
      tipoDoc: 'RUC',
      numDoc: '20547896321',
      razonSocial: 'Translog Perú SAC',
      contacto: 'Carlos Ramírez',
      telefono: '+51987654321',
      email: 'contacto@translog.com',
      tipoCliente: 'importador',
      pais: 'Perú',
      direccion: 'Av. Los Olivos 123',
      vendedor: 'Ana Torres',
      condicionPago: 'Contado',
      creditoLimite: 0.00,
      observaciones: 'Cliente nuevo'
    });

    await clientesPage.guardarCliente();
    
    // Verificar que el modal se cerró (el cliente se guardó en la BD)
    await expect(page.locator('#modal-cliente')).not.toHaveClass(/visible/);
    
    // Verificar que el cliente aparece en el listado
    await clientesPage.buscarCliente('20547896321');
    await expect(page.locator('text=20547896321')).toBeVisible();
  });

  test('CLI-UAT-002: Registrar cliente con teléfono sin “+” inicial (inválido)', async ({ page }) => {
    await clientesPage.abrirModalNuevoCliente();
    
    // Llenamos con los datos exactos del caso de prueba
    await clientesPage.llenarFormularioCliente({
      tipoDoc: 'DNI',
      numDoc: '12345678',
      razonSocial: 'Andes',
      contacto: 'Ana',
      telefono: '51987654321', // Sin "+" como dice la descripción del caso
      email: 'aa@b.com',
      tipoCliente: 'exportador',
      pais: 'PE',
      direccion: 'Jr 1',
      vendedor: 'Luz',
      condicionPago: 'Contado',
      creditoLimite: 0.00,
      observaciones: ''
    });

    let alertaMostrada = false;
    let mensajeAlerta = '';
    page.on('dialog', async dialog => {
      alertaMostrada = true;
      mensajeAlerta = dialog.message();
      await dialog.accept(); 
    });

    await clientesPage.guardarCliente();
    
    // Verificación según el CA-02
    expect(alertaMostrada, 'No se mostró la alerta nativa del navegador validando el teléfono').toBeTruthy();
    expect(mensajeAlerta.toLowerCase()).toContain('teléfono');
    
    // El modal de creación debe seguir abierto porque no se guardó
    await expect(page.locator('#modal-cliente')).toHaveClass(/visible/);
  });

  test('CLI-UAT-003: Registrar cliente con teléfono válido y “+” inicial', async ({ page }) => {
    await clientesPage.abrirModalNuevoCliente();
    
    await clientesPage.llenarFormularioCliente({
      tipoDoc: 'RUC',
      numDoc: '20678945123',
      razonSocial: 'Exportaciones Lima SAC',
      contacto: 'Mariana López',
      telefono: '+51956789123',
      email: 'operaciones@exportlima.com',
      tipoCliente: 'ambos',
      pais: 'Perú',
      direccion: 'Calle Comercio 456',
      vendedor: 'Luis Rojas',
      condicionPago: 'Credito 30',
      creditoLimite: 15000.00,
      observaciones: 'Cliente con crédito aprobado'
    });

    await clientesPage.guardarCliente();
    
    // Verificar que registró exitosamente
    await expect(page.locator('#modal-cliente')).not.toHaveClass(/visible/);
    
    // Validar que aparezca
    await clientesPage.buscarCliente('20678945123');
    await expect(page.locator('text=20678945123')).toBeVisible();
  });
});

test.describe('US-02: Editar cliente', () => {
  let loginPage: LoginPage;
  let sidebar: SidebarMenu;
  let clientesPage: ClientesPage;
  let clienteDetallePage: ClienteDetallePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    sidebar = new SidebarMenu(page);
    clientesPage = new ClientesPage(page);
    clienteDetallePage = new ClienteDetallePage(page);

    await loginPage.goto();
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    
    // Esperar a que cargue el dashboard y navegar a clientes
    await page.waitForURL('**/dashboard*');
    await sidebar.irAClientes();
    await page.waitForURL('**/clientes*');
  });

  test('CLI-UAT-007: Editar cliente modificando número de documento y razón social válidos', async ({ page }) => {
    // Buscar y seleccionar el cliente original
    await clientesPage.buscarCliente('20547896321');
    await page.waitForTimeout(1000);
    
    await page.locator('a:has-text("Ver detalle")').first().click();
    await page.waitForURL('**/cliente-detalle*');

    await clienteDetallePage.abrirModalEditar();

    // Modificar RUC y Razón social
    await clienteDetallePage.llenarFormularioEdicion({
      numDoc: '20547896555',
      razonSocial: 'Translog Perú Cargo SAC'
    });

    await clienteDetallePage.guardarCambios();
    await expect(clienteDetallePage.modalEditar).not.toHaveClass(/visible/);
  });

  test('CLI-UAT-008: Editar cliente modificando correo y teléfono válidos', async ({ page }) => {
    // Buscar y seleccionar el cliente con el RUC editado en el paso anterior
    await clientesPage.buscarCliente('20547896555');
    await page.waitForTimeout(1000);
    
    await page.locator('a:has-text("Ver detalle")').first().click();
    await page.waitForURL('**/cliente-detalle*');

    await clienteDetallePage.abrirModalEditar();

    // Modificar correo y teléfono
    await clienteDetallePage.llenarFormularioEdicion({
      email: 'operaciones@translog.com',
      telefono: '+51999654321'
    });

    await clienteDetallePage.guardarCambios();
    await expect(clienteDetallePage.modalEditar).not.toHaveClass(/visible/);
  });
});

test.describe('US-03: Búsqueda de clientes', () => {
  let loginPage: LoginPage;
  let sidebar: SidebarMenu;
  let clientesPage: ClientesPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    sidebar = new SidebarMenu(page);
    clientesPage = new ClientesPage(page);

    await loginPage.goto();
    await loginPage.login('henryhuaman52@gmail.com', 'henry123'); 
    
    await page.waitForURL('**/dashboard*');
    await sidebar.irAClientes();
    await page.waitForURL('**/clientes*');
  });

  test('CLI-UAT-013: Buscar cliente por razón social completa existente', async ({ page }) => {
    // Usamos el nombre modificado en UAT-007 para asegurar que el test pase si corren en orden
    await clientesPage.buscarCliente('Translog Perú Cargo SAC');
    await expect(page.locator('text=Translog Perú Cargo SAC').first()).toBeVisible();
  });

  test('CLI-UAT-014: Buscar cliente por razón social parcial existente', async ({ page }) => {
    await clientesPage.buscarCliente('Translog');
    await expect(page.locator('text=Translog').first()).toBeVisible();
  });

  test('CLI-UAT-015: Buscar cliente por razón social sin distinguir mayúsculas y minúsculas', async ({ page }) => {
    await clientesPage.buscarCliente('translog perú cargo sac');
    // Verificamos que aunque busquemos en minúsculas, aparece el registro original
    await expect(page.locator('text=Translog Perú Cargo SAC').first()).toBeVisible();
  });
});
