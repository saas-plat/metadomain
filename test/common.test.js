const {
  connect,
  close
} = require('../lib/db');
const t = require('../lib/MetaTable');
const {
  wait
} = require('./util');

before(async () => {
  await connect();
  await t.connect();
})

after(async () => {
  await setTimeout(async () => await t.close(), 100)
  await setTimeout(async () => await close(), 100)
})

beforeEach(async()=>{
  await wait(1000);
})
