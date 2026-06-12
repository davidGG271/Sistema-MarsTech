Feature: Registro de Costos Operativos (US-14)
  Como personal de finanzas
  Quiero registrar costos operativos asociados a una orden operativa
  Para mantener el control financiero de cada expediente

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en el módulo de costos

  Scenario: FIN-INT-079 Registrar costo operativo con datos válidos estándar
    Given ha seleccionado la orden operativa "ADU-260092"
    When completa correctamente los campos concepto, proveedor, moneda, monto y tratamiento de IGV:
      | Concepto                 | Servicio de aduanas        |
      | Proveedor / beneficiario | Agencia Aduanera Lima SAC  |
      | Moneda                   | USD                        |
      | Monto                    | 1500.00                    |
      | Tratamiento de IGV       | No incluye IGV             |
      | Número de comprobante    | F001-000123                |
    And selecciona Guardar costo
    Then el sistema registra el costo exitosamente
    And actualiza el total de costos de la orden

  Scenario: FIN-INT-080 Registrar costo operativo con monto mínimo válido y comprobante vacío
    Given ha seleccionado la orden operativa "ADU-260092"
    When completa el formulario con un monto positivo mínimo:
      | Concepto                 | Almacenaje depósito |
      | Proveedor / beneficiario | APM                 |
      | Moneda                   | PEN                 |
      | Monto                    | 0.01                |
      | Tratamiento de IGV       | Exento de IGV       |
    And deja vacío el número de comprobante
    And selecciona Guardar costo
    Then el sistema registra el costo exitosamente
    And actualiza el total de costos de la orden
