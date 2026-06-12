Feature: Gestión de Cotizaciones (US-04 a US-06)

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en la vista de ventas

  Scenario: COT-INT-019 Registrar cotización con cliente activo y datos válidos estándar
    When el usuario abre el modal de nueva cotización
    And llena el formulario de cotización con los siguientes datos generales:
      | cliente      | Translog Perú Cargo SAC                |
      | moneda       | USD                                    |
      | validez      | 2026-06-30                             |
      | lugar        | Callao, Lima, Perú                     |
      | tiempo       | 20 días hábiles                        |
      | observaciones| Servicio marítimo regular              |
      | condiciones  | Pago 50% adelanto y 50% contra entrega |
    And agrega un ítem a la cotización con los siguientes datos:
      | concepto    | Almacenaje depósito               |
      | descripcion | Transporte internacional marítimo |
      | cantidad    | 2                                 |
      | precio      | 1500.00                           |
    And guarda la cotización
    Then el modal de cotización se cierra exitosamente

  Scenario: COT-INT-020 Registrar cotización con valores mínimos válidos
    When el usuario abre el modal de nueva cotización
    And llena el formulario de cotización con los siguientes datos generales:
      | cliente      | Andina Cargo SAC |
      | moneda       | PEN              |
      | validez      | 2026-05-26       |
      | lugar        | Lima             |
      | tiempo       | 1 día hábil      |
      | observaciones| vacío            |
      | condiciones  | vacío            |
    And agrega un ítem a la cotización con los siguientes datos:
      | concepto    | Almacenaje depósito |
      | descripcion | Flete               |
      | cantidad    | 1                   |
      | precio      | 0.01                |
    And guarda la cotización
    Then el modal de cotización se cierra exitosamente

  Scenario: COT-INT-021 Registrar cotización con valores máximos válidos
    When el usuario abre el modal de nueva cotización
    And llena el formulario de cotización con los siguientes datos generales:
      | cliente      | Exportaciones Lima SAC                                         |
      | moneda       | USD                                                            |
      | validez      | 2026-12-31                                                     |
      | lugar        | texto válido de ubicación extensa permitida                    |
      | tiempo       | 90 días hábiles                                                |
      | observaciones| texto permitido sin HTML ni scripts                            |
      | condiciones  | texto comercial válido relacionado con pagos y notas adicionales|
    And agrega un ítem a la cotización con los siguientes datos:
      | concepto    | Almacenaje depósito            |
      | descripcion | texto válido de 255 caracteres |
      | cantidad    | 1000000                        |
      | precio      | 999999.99                      |
    And guarda la cotización
    Then el modal de cotización se cierra exitosamente

  Scenario: COT-UAT-026 Aprobar cotización enviada
    When busca la cotización "COT-260004"
    And hace clic en Aprobar en la primera cotización
    And selecciona "SEA" como tipo de orden a generar en el modal de estado
    And confirma el cambio de estado
    Then el modal de estado se cierra
    And se muestra un mensaje de alerta indicando "creada exitosamente"

  Scenario: COT-UAT-032 Buscar cotización por código de cotización existente
    When busca la cotización "COT-260004"
    Then se muestra el código "COT-260004" en la lista de resultados de cotizaciones

  Scenario: COT-UAT-033 Buscar cotización sin distinguir mayúsculas y minúsculas
    When busca la cotización "translog perú cargo sac"
    Then se muestra el cliente "Translog Perú Cargo SAC" en la lista de resultados de cotizaciones

