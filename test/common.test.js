const {
  connect,
  disconnect
} = require('../lib/db');
const {MetaTable} = require('../lib/MetaTable');


before(async () => {
  await connect();
  await MetaTable.connect();
})

after(async () => {
  await setTimeout(async () => await MetaTable.disconnect(), 100)
  await setTimeout(async () => await disconnect(), 100)
})
