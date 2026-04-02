const { extractMedicinesAndReminders } = require('./ocr');

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: node demo.js <image-path>');
    process.exit(1);
  }

  const result = await extractMedicinesAndReminders(imagePath, { debug: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
