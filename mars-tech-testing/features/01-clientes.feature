Feature: Gestión de Clientes (US-01 a US-03)

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en la vista de clientes

  Scenario: CLI-UAT-001 Registrar cliente con información requerida válida
    When el usuario abre el modal de nuevo cliente
    And llena el formulario general de cliente con los siguientes datos:
      | tipoDoc      | RUC                         |
      | numDoc       | 20547896321                 |
      | razonSocial  | Translog Perú SAC           |
      | contacto     | Carlos Ramírez              |
      | telefono     | +51987654321                |
      | email        | contacto@translog.com       |
      | tipoCliente  | Importador                  |
      | pais         | Perú                        |
      | direccion    | Av. Los Olivos 123          |
      | vendedor     | Ana Torres                  |
      | condicionPago| Contado                     |
      | creditoLimite| 0.00                        |
      | observaciones| Cliente nuevo               |
    And guarda el cliente
    Then el sistema registra el cliente correctamente
    And la lista de clientes se actualiza

  Scenario: CLI-UAT-002 Registrar cliente con teléfono sin “+” inicial (inválido)
    When el usuario abre el modal de nuevo cliente
    And llena el formulario general de cliente con los siguientes datos:
      | tipoDoc      | DNI                         |
      | numDoc       | 12345678                    |
      | razonSocial  | Andes                       |
      | contacto     | Ana                         |
      | telefono     | 51987654321                 |
      | email        | aa@b.com                    |
      | tipoCliente  | Exportador                  |
      | pais         | PE                          |
      | direccion    | Jr 1                        |
      | vendedor     | Luz                         |
      | condicionPago| Contado                     |
      | creditoLimite| 0.00                        |
      | observaciones| vacío                       |
    And guarda el cliente
    Then se debería mostrar una alerta de validación nativa

  Scenario: CLI-UAT-003 Registrar cliente con teléfono válido y “+” inicial
    When el usuario abre el modal de nuevo cliente
    And llena el formulario general de cliente con los siguientes datos:
      | tipoDoc      | RUC                         |
      | numDoc       | 20678945123                 |
      | razonSocial  | Exportaciones Lima SAC      |
      | contacto     | Mariana López               |
      | telefono     | +51956789123                |
      | email        | operaciones@exportlima.com  |
      | tipoCliente  | Ambos                       |
      | pais         | Perú                        |
      | direccion    | Calle Comercio 456          |
      | vendedor     | Luis Rojas                  |
      | condicionPago| Crédito 30 días             |
      | creditoLimite| 15000.00                    |
      | observaciones| Cliente con crédito aprobado|
    And guarda el cliente
    Then el sistema registra el cliente correctamente

  Scenario: CLI-UAT-013 Buscar cliente por razón social completa existente
    When el usuario busca "Translog Perú SAC" en la barra de búsqueda de clientes
    Then el cliente "Translog Perú SAC" con RUC "20547896321" debe ser visible en los resultados

  Scenario: CLI-UAT-014 Buscar cliente por razón social parcial existente
    When el usuario busca "Translog" en la barra de búsqueda de clientes
    Then el cliente "Translog Perú SAC" con RUC "20547896321" debe ser visible en los resultados

  Scenario: CLI-UAT-015 Buscar cliente por razón social sin distinguir mayúsculas y minúsculas
    When el usuario busca "translog perú sac" en la barra de búsqueda de clientes
    Then el cliente "Translog Perú SAC" con RUC "20547896321" debe ser visible en los resultados

  Scenario: CLI-UAT-007 Editar cliente modificando número de documento y razón social válidos
    When edita el cliente con RUC "20547896321" y Razón Social "Translog Perú SAC"
    And llena el formulario general de cliente con los siguientes datos:
      | numDoc       | 20547896555                 |
      | razonSocial  | Translog Perú Cargo SAC     |
    And guarda el cliente
    Then el sistema registra el cliente correctamente

  Scenario: CLI-UAT-008 Editar cliente modificando correo y teléfono válidos
    When edita el cliente con RUC "20547896555" y Razón Social "Translog Perú Cargo SAC"
    And llena el formulario general de cliente con los siguientes datos:
      | email        | operaciones@translog.com    |
      | telefono     | +51999654321                |
    And guarda el cliente
    Then el sistema registra el cliente correctamente
