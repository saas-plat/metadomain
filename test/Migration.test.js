const {
  MetaEntity,
  BaseData,
  Repository,
  Migration
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
    const Department = MetaEntity.create(BaseData, "Department2", {
      "Code": "string",
      "Name": "string"
    })
  const DepartmentRep = Repository.create(Department,{orgid:'test001'});
    // 给每个实体的event进行迁移， 每个实体可以写一个升级脚本
    // 通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交
    const migration = new Migration('test001');
    await migration.lock();
    await migration.up('Department2', [`rule update_sciprt1{
      when{
        e: Event e.method == 'saved'
      }
      then{
          e.data.Code2 = e.data.Code+'xxxxx';
          modify(e);
      }
    }`]);
    await migration.unlock();
  })
})
