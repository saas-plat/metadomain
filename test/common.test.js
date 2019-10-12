const {
  connect,
  disconnect
} = require('../lib/db');

before(async () => {
  await connect({
    data: true,
    entity: true
  });
})

after(async () => {
  await setTimeout(async () => await disconnect({
    data: true,
    entity: true
  }), 100)
})
