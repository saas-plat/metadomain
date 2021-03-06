const metaschema = require('@saas-plat/metaschema');
const {
  connect,
  disconnect
} = require('../lib/db');
const {
  MetaEntity,
} = require('../lib');
require('i18next').init();

global.createModel = (Type, name, schema, opts = {}) => {
  const model = metaschema[Type.name](name, schema);
  return MetaEntity.createModel(model.name, model.schema, opts);
}

before(async () => {
  await connect( );
})

after(async () => {
  await setTimeout(async () => await disconnect( ), 100)
})
