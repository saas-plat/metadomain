const {
  Repository,
  MetaEntity,
  BaseData,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

before(async () => {
  await Repository.connect();
})

after(async () => {
  await Repository.close();
})

describe('数据迁移', () => {



  it('实体字段修改，增加、删除、更新类型', async () => {

  })
})
