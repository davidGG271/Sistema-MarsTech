Feature: Trazabilidad Hitos (US-07 a US-09)

  Background:
    Given el usuario ha iniciado sesión correctamente
    And se encuentra en el módulo de Hitos

  Scenario: TRA-UAT-037 Buscar y seleccionar orden operativa válida por código exacto
    When ingresa el código "ADU-260092" en el buscador
    And selecciona la orden "ADU-260092"
    Then el sistema carga la trazabilidad correspondiente a "ADU-260092"

  Scenario: TRA-UAT-038 Buscar orden utilizando coincidencia parcial válida
    When ingresa una coincidencia parcial "ADU-260"
    And selecciona una orden de la lista mostrada
    Then el sistema carga correctamente la trazabilidad

  Scenario: TRA-UAT-039 Filtrar órdenes por tipo de operación SEA y seleccionar orden
    When selecciona el filtro "SEA"
    And selecciona una orden de la lista mostrada
    Then el sistema muestra únicamente órdenes "SEA" y carga su trazabilidad

  Scenario: TRA-UAT-044 Registrar hito utilizando fecha y hora autocompletada
    Given ingresa el código "AIR-000001" en el buscador
    And selecciona la orden "AIR-000001"
    And selecciona un hito pendiente
    When completa la observación requerida "Documentación validada"
    And confirma el hito utilizando la fecha autocompletada
    Then el sistema registra correctamente el hito

  Scenario: TRA-UAT-045 Registrar hito con observación de longitud mínima válida
    Given ingresa el código "AIR-000002" en el buscador
    And selecciona la orden "AIR-000002"
    And selecciona un hito pendiente
    When registra una observación con longitud mínima válida "Listo"
    And confirma el hito
    Then el sistema registra correctamente el hito

  Scenario: TRA-UAT-047 Intentar registrar hito con observación menor al mínimo permitido
    Given ingresa el código "AIR-000002" en el buscador
    And selecciona la orden "AIR-000002"
    And selecciona un hito pendiente
    When ingresa una observación menor al mínimo permitido "OK"
    And confirma el hito
    Then el sistema muestra validación correspondiente indicando que la observación no cumple con la longitud mínima requerida

  Scenario: TRA-UAT-049 Visualizar progreso de una orden con hitos registrados
    Given ingresa el código "AIR-000002" en el buscador
    And selecciona la orden "AIR-000002"
    When el sistema carga la información de la orden
    Then muestra el resumen de la orden
    And muestra la barra de progreso actualizada
    And muestra la línea de tiempo con los hitos completados y pendientes

  Scenario: TRA-UAT-050 Visualizar barra de progreso actualizada según hitos completados
    Given ingresa el código "AIR-000001" en el buscador
    And selecciona la orden "AIR-000001"
    When el sistema carga la trazabilidad de la orden
    Then muestra la barra de progreso actualizada según los hitos registrados

  Scenario: TRA-UAT-054 Visualizar progreso inicial con porcentaje de avance en 0%
    Given ingresa el código "ADU-260092" en el buscador
    And selecciona la orden "ADU-260092"
    And la orden no tiene hitos registrados
    When el sistema carga el progreso de la operación
    Then muestra el porcentaje inicial de "0%" correspondiente
