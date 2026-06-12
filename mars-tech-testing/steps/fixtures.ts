import { test as base } from 'playwright-bdd';
import { LoginPage } from '../pages/LoginPage';
import { ClientesPage } from '../pages/ClientesPage';
import { CotizacionesPage } from '../pages/CotizacionesPage';
import { HitosPage } from '../pages/hitos.page';
import { SidebarMenu } from '../pages/SidebarMenu';
import { FinanzasPage } from '../pages/finanzas.page';

// Declarar los fixtures personalizados
type Fixtures = {
  loginPage: LoginPage;
  clientesPage: ClientesPage;
  cotizacionesPage: CotizacionesPage;
  hitosPage: HitosPage;
  sidebarMenu: SidebarMenu;
  finanzasPage: FinanzasPage;
};

// Extender el test base de playwright-bdd con nuestros Page Objects
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  clientesPage: async ({ page }, use) => {
    await use(new ClientesPage(page));
  },
  cotizacionesPage: async ({ page }, use) => {
    await use(new CotizacionesPage(page));
  },
  hitosPage: async ({ page }, use) => {
    await use(new HitosPage(page));
  },
  sidebarMenu: async ({ page }, use) => {
    await use(new SidebarMenu(page));
  },
  finanzasPage: async ({ page }, use) => {
    await use(new FinanzasPage(page));
  },
});
