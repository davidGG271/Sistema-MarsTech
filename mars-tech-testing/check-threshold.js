const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'test-results', 'report.json');

if (!fs.existsSync(reportPath)) {
  console.error("❌ No se encontró report.json.");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

let totalTests = 0;
let passedTests = 0;

report.suites.forEach(fileSuite => {
  fileSuite.suites.forEach(describeSuite => {
    describeSuite.specs.forEach(spec => {
      spec.tests.forEach(test => {
        // En Playwright, cada test tiene 'expectedStatus' (normalmente 'passed')
        // y un arreglo de 'results' con el status actual.
        // Tomamos el status del último resultado (por si hubo reintentos).
        if (test.results && test.results.length > 0) {
          totalTests++;
          const finalResult = test.results[test.results.length - 1];
          if (finalResult.status === 'passed') {
            passedTests++;
          }
        }
      });
    });
  });
});

if (totalTests === 0) {
  console.error("❌ No se encontraron pruebas en el reporte.");
  process.exit(1);
}

const passPercentage = (passedTests / totalTests) * 100;
console.log(`📊 Total de pruebas: ${totalTests}`);
console.log(`✅ Pruebas exitosas: ${passedTests}`);
console.log(`📈 Porcentaje de éxito: ${passPercentage.toFixed(2)}%`);

const MIN_THRESHOLD = 95.0;

if (passPercentage >= MIN_THRESHOLD) {
  console.log(`\n🎉 ÉXITO: El porcentaje (${passPercentage.toFixed(2)}%) cumple con el mínimo requerido de ${MIN_THRESHOLD}%.`);
  process.exit(0);
} else {
  console.error(`\n❌ FALLO: El porcentaje de éxito (${passPercentage.toFixed(2)}%) es menor al mínimo requerido del ${MIN_THRESHOLD}%.`);
  process.exit(1);
}
