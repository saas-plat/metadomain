const {
  connect,
  close
} = require('../lib/db');

before(async () => {
  await connect();
})

after(async () => {
  await close();
})
