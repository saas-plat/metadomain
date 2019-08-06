const {
  Repository，
  BaseData,
  MetaEntity,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('实体仓库', () => {

  it('实体可以设置读取范围，一个组织只能操作一个组织内的实体', async () => {

    const TestObj = MetaEntity.create(BaseData, 'TestObj2', {
      "orgid": "string",
      "Code": "string"
    });

    // scope 和 schema 字段同名不冲突
    const testRepository1 = Repository.create(TestObj, {
      orgid: 'org001'
    });
    const testRepository2 = Repository.create(TestObj, {
      orgid: 'org002'
    });

    const test = TestObj.create();
    await test.save({
      Code: 'test001',
    });
    testRepository1.commitAll(test);

    // 不能读取其他组织的实体
    expect(testRepository2.get(test.id)).to.be.null;
    expect(testRepository1.get(test.id)).to.not.null;

    const test2 = TestObj.create();
    await test2.save({
      orgid: 'xxxxxx',
      Code: 'test001',
    });
    testRepository2.commitAll(test2);

    expect(testRepository1.get(test2.id)).to.be.null;
    expect(testRepository2.get(test2.id)).to.not.null;
    expect(testRepository2.get(test2.id).orgid).to.be.eql('xxxxxx');
  });

})
