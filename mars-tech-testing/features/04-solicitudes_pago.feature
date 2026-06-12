Feature: Registro de Solicitudes de Pago (US-X)
  Como personal de finanzas
  Quiero registrar solicitudes de pago asociadas a una orden operativa
  Para que sean procesadas por tesorería

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en el módulo de solicitudes de pago

  Scenario: FIN-INT-085 Registrar solicitud de pago con datos válidos estándar
    Given ha seleccionado la orden operativa "ADU-260092"
    When completa correctamente los campos concepto, beneficiario, moneda, monto, tratamiento de IGV y sustento:
      | Concepto                 | Servicio de aduanas                                                |
      | Beneficiario             | Agencia Aduanera Lima SAC                                          |
      | Moneda                   | USD                                                                |
      | Monto                    | 1500.00                                                            |
      | Tratamiento de IGV       | No incluye IGV                                                     |
      | Sustento / descripción   | Pago solicitado por servicio de aduanas asociado a la operación    |
    And selecciona la opción Solicitar pago
    Then el sistema registra la solicitud exitosamente
    And muestra una notificación de confirmación

  Scenario: FIN-INT-086 Registrar solicitud de pago con monto mínimo válido
    Given ha seleccionado la orden operativa "ADU-260092"
    When completa el formulario de solicitud con un monto positivo mínimo:
      | Concepto                 | Almacenaje depósito                               |
      | Beneficiario             | APM                                               |
      | Moneda                   | PEN                                               |
      | Monto                    | 0.01                                              |
      | Tratamiento de IGV       | Exento de IGV                                     |
      | Sustento / descripción   | Pago mínimo por servicio operativo registrado     |
    And selecciona la opción Solicitar pago
    Then el sistema registra la solicitud exitosamente
    And muestra una notificación de confirmación
