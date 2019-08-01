const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData,
  CategoryDataService,
  LevelDataService,
  VoucherService,
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

describe('基础档案', () => {
 

  it('创建采购订单，保存同时生成订金的付款单 ', async () => {

  })

  it('采购订单，保存审核生效、生成进货单，保存审核', async () => {

  })

  it('实体字段修改，增加、删除、更新类型', async () => {

  })
})
