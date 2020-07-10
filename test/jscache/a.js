module.exports = function (who) {
  const b = require('./b');
  console.log('hello ' + who + ' ' + b());
}
