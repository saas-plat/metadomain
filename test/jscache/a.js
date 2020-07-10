module.exports = function (who) {
  const b = require('./b');
  return 'hello ' + who + ' ' + b()
}
