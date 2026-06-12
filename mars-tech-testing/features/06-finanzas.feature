Feature: Registro de Comprobantes de Ingreso (US-13)
  Como personal de finanzas
  Quiero registrar comprobantes de ingreso asociados a una orden operativa
  Para mantener el control financiero de cada expediente

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en la página de Finanzas

  Scenario: FIN-INT-073 Registrar comprobante de ingreso con datos válidos estándar
    Given ha seleccionado la orden operativa "ADU-260092"
    And posee permisos para registrar comprobantes
    When registra un comprobante con los siguientes datos:
      | Tipo de comprobante | Factura                |
      | Serie / número      | F001-000123            |
      | Concepto            | Servicio de aduanas    |
      | Moneda              | USD                    |
      | Monto               | 1500.00                |
      | Tratamiento de IGV  | No incluye IGV         |
      | Vencimiento         | 2026-06-30             |
      | Estado de pago      | Pendiente              |
    And selecciona Guardar comprobante
    Then el sistema registra el comprobante exitosamente
    And actualiza el total de ingresos de la orden

  Scenario: FIN-INT-074 Registrar comprobante con monto mínimo válido y vencimiento posterior
    Given ha seleccionado la orden operativa "ADU-260092"
    When registra un comprobante con los siguientes datos:
      | Tipo de comprobante | Boleta                 |
      | Serie / número      | B01                    |
      | Concepto            | Almacenaje depósito    |
      | Moneda              | PEN                    |
      | Monto               | 0.01                   |
      | Tratamiento de IGV  | Exento de IGV          |
      | Vencimiento         | 2026-05-28             |
      | Estado de pago      | Pendiente              |
    And selecciona Guardar comprobante
    Then el sistema registra el comprobante exitosamente
    And actualiza el total de ingresos de la orden

  Scenario: FIN-INT-077 Registrar comprobante sin ingresar monto y verificar error
    Given ha seleccionado la orden operativa "ADU-260092"
    When registra un comprobante con los siguientes datos:
      | Tipo de comprobante | Factura                |
      | Serie / número      | F001-000124            |
      | Concepto            | Servicio de aduanas    |
      | Moneda              | USD                    |
      | Monto               |                        |
      | Tratamiento de IGV  | No incluye IGV         |
      | Vencimiento         | 2026-06-30             |
      | Estado de pago      | Pendiente              |
    And selecciona Guardar comprobante
    Then el sistema muestra un mensaje de error indicando que el monto es obligatorio
    And no registra el comprobante en el sistema
