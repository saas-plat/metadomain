const fs = require('fs');
const entitles = {};
fs.readdirSync(__dirname).forEach(filename => {
  if (filename.endsWith('index.js') || !filename.endsWith('.js')) {
    return;
  }
  entitles[filename.substr(0, filename.length - 3)] = require(__dirname + '/' + filename);
})
module.exports = entitles;
