const {
  Repository,
  BaseData,
  MetaEntity,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo/mongo');

describe('实体仓库', () => {

  before(async () => {
    const db = mongo.db;
    const keys = ['org001.TestObj2', 'org002.TestObj2', 'TestObjBig'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.deleteMany();
        await snapshots.deleteMany();
      }
    }
  })

  it('实体可以设置读取范围，一个组织只能操作一个组织内的实体', async () => {

    const TestObj = MetaEntity.create(BaseData, 'TestObj2', {
      "orgid": "string",
      "Code": "string"
    });

    // scope 和 schema 字段同名不冲突
    const testRepository1 = await Repository.create(TestObj, {
      ns: 'org001'
    });
    const testRepository2 = await Repository.create(TestObj, {
      ns: 'org002'
    });

    const test = await TestObj.create();
    await test.save({
      Code: 'test001',
      updateBy: 'aaa',
      ts: test.ts
    });
    await testRepository1.commitAll(test);

    // 不能读取其他组织的实体
    expect(await testRepository1.get(test.id)).to.not.null;
    expect(await testRepository2.get(test.id)).to.be.null;

    const test2 = await TestObj.create();
    await test2.save({
      orgid: 'xxxxxx',
      Code: 'test001',
      updateBy: 'aaa',
      ts: test2.ts
    });
    await testRepository2.commitAll(test2);

    expect(await testRepository1.get(test2.id)).to.be.null;
    expect(await testRepository2.get(test2.id)).to.not.null;
    expect((await testRepository2.get(test2.id)).orgid).to.be.eql('xxxxxx');
  });

  it('测试快照保存和加载能力', async () => {

    const TestObj = MetaEntity.create(BaseData, 'TestObjBig', {
      "orgid": "string",
      "Code": "string"
    });

    // scope 和 schema 字段同名不冲突
    const testRepository = await Repository.create(TestObj, {
      snapshotFrequency: 5
    });

    const test = await TestObj.create();
    for (let i = 0; i < 23; i++) {
      await test.save({
        Code: 'CODE_' + i,
        updateBy: 'aaa',
        ts: test.ts
      });

      if (i % 7 == 0) {
        await testRepository.commitAll(test);
      }
    }
    await testRepository.commitAll(test);
    expect((await testRepository.get(test.id)).toJS()).to.be.deep.include({
      Code: 'CODE_' + 22,
      updateBy: 'aaa'
    })
  })
})
