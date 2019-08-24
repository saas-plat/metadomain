const {
  connect,
  close
} = require('../lib/db');

before(async () => {
  await connect();
})

after(async () => {
  await setTimeout(async () => await close(), 100)
})
