const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'test-results', 'report.json');
const outputDir = path.join(__dirname, 'Evidencias');

if (!fs.existsSync(reportPath)) {
  console.error("No se encontró report.json. Asegúrate de correr las pruebas primero.");
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

let extracciones = 0;

report.suites.forEach(fileSuite => {
  fileSuite.suites.forEach(describeSuite => {
    describeSuite.specs.forEach(spec => {
      // Usamos el título completo limpiando caracteres inválidos
      const testId = spec.title.replace(/[<>:"/\\|?*]/g, '').trim();

      spec.tests.forEach(test => {
        test.results.forEach(result => {
          if (result.attachments) {
            result.attachments.forEach(attachment => {
              if (attachment.name === 'video' && attachment.path) {
                const dest = path.join(outputDir, `${testId}.webm`);
                fs.copyFileSync(attachment.path, dest);
                console.log(`🎥 Video copiado: ${testId}.webm`);
                extracciones++;
              }
              if (attachment.name === 'screenshot' && attachment.path) {
                const dest = path.join(outputDir, `${testId}.png`);
                fs.copyFileSync(attachment.path, dest);
                console.log(`📸 Captura copiada: ${testId}.png`);
                extracciones++;
              }
            });
          }
        });
      });
    });
  });
});

console.log(`\n✅ ¡Proceso completado! Se exportaron ${extracciones} evidencias a la carpeta /Evidencias`);
