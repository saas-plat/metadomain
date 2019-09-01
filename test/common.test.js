const {
  connect,
  close
} = require('../lib/db');
const t = require('../lib/MetaTable');

before(async () => {
  await connect();
  await t.connect();
})

after(async () => {
  await setTimeout(async () => await t.close(), 100)
  await setTimeout(async () => await close(), 100)
})
