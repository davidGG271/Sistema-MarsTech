const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'test-results', 'report.json');
const outputDirFallos = path.join(__dirname, 'Evidencias_Fallos');
const outputDirExitos = path.join(__dirname, 'Evidencias_Exitos');

if (!fs.existsSync(reportPath)) {
  console.error("No se encontró report.json. Asegúrate de correr las pruebas primero.");
  process.exit(1);
}

if (!fs.existsSync(outputDirFallos)) fs.mkdirSync(outputDirFallos);
if (!fs.existsSync(outputDirExitos)) fs.mkdirSync(outputDirExitos);

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

let extraccionesFallos = 0;
let extraccionesExitos = 0;

report.suites.forEach(fileSuite => {
  fileSuite.suites.forEach(describeSuite => {
    describeSuite.specs.forEach(spec => {
      const testId = spec.title.replace(/[<>:"/\\|?*]/g, '').trim();

      spec.tests.forEach(test => {
        test.results.forEach(result => {
          const isSuccess = result.status === 'passed';
          const targetDir = isSuccess ? outputDirExitos : outputDirFallos;
          
          if (result.attachments) {
            result.attachments.forEach(attachment => {
              if (attachment.name === 'video' && attachment.path) {
                const dest = path.join(targetDir, `${testId}.webm`);
                fs.copyFileSync(attachment.path, dest);
                console.log(`🎥 Video copiado a ${isSuccess ? 'Exitos' : 'Fallos'}: ${testId}.webm`);
                if (isSuccess) extraccionesExitos++; else extraccionesFallos++;
              }
              if (attachment.name === 'screenshot' && attachment.path) {
                const dest = path.join(targetDir, `${testId}.png`);
                fs.copyFileSync(attachment.path, dest);
                console.log(`📸 Captura copiada a ${isSuccess ? 'Exitos' : 'Fallos'}: ${testId}.png`);
                if (isSuccess) extraccionesExitos++; else extraccionesFallos++;
              }
            });
          }
        });
      });
    });
  });
});

console.log(`\n✅ ¡Proceso completado! Se exportaron ${extraccionesFallos} evidencias a /Evidencias_Fallos y ${extraccionesExitos} a /Evidencias_Exitos`);
