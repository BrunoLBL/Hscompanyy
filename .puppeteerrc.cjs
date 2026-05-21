const { join } = require('path');

module.exports = {
  // Força o Puppeteer a baixar o Chrome dentro da pasta do projeto
  // para que o Render não apague o arquivo após o build.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
