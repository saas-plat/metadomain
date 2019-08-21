const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData,
  CategoryDataService,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo/mongo');

describe('分类数据', () => {
  before(async () => {
    const db = mongo.db;

    const keys = ['Partner', 'PartnerCategory'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.drop();
        await snapshots.drop();
        console.log('-------clear-------');
      }
    }
  })

  it('创建部门档案，添加部门分类和部门数据', async () => {
    const user = {
      id: 'xxxx'
    };

    const PartnerCategory = require('./entities/PartnerCategory');
    const Partner = require('./entities/Partner');
    const PartnerCategoryRep = Repository.create(PartnerCategory);
    const PartnerRep = Repository.create(Partner);
    const reps = {
      PartnerCategory: PartnerCategoryRep,
      Partner: PartnerRep,
    }

    const categoryService = new CategoryDataService(PartnerCategory, Partner, {
      user,
    }, (entityName) => {
      return reps[entityName];
    });
    const categories = await categoryService.saveCategory({
      Code: '001',
      Name: '大中华区',
    }, {
      Code: '002',
      Name: '东南亚区',
    });
    await categoryService.saveCategory({
      Code: '003',
      Name: '欧美',
    });
    const cn = await categoryService.saveCategory({
      Code: '001001',
      Name: '中国内地',
      parent: {
        id: categories[0].id
      },
    })[0];
    try {
      // 不是末级节点
      await categoryService.saveData({
        Code: '001',
        Name: '供应商1',
        category: {
          id: categories[0].id
        }
      });
      expect.fail();
    } catch (err) {}
    const dats = await categoryService.saveData({
      Code: '001',
      Name: '供应商1',
      category: {
        id: cn.id
      }
    }, {
      Code: '002',
      Name: '供应商2',
      category: {
        id: cn.id
      }
    }, {
      Code: '003',
      Name: '供应商3',
      category: {
        id: cn.id
      }
    });
    await categoryService.deleteData(dats[1].id);
    try {
      // 有数据分类不能删除
      await categoryService.deleteCategory(categories[0].id);
      expect.fail();
    } catch (err) {}
    try {
      // 有数据分类不能删除
      await categoryService.deleteCategory(categories[1].id);
      expect.fail();
    } catch (err) {}
    await categoryService.deleteCategory(categories[3].id);

    const cateall = await PartnerCategoryRep.getAll();
    const depall = await PartnerRep.getAll();
    console.log(cateall, depall);

    expect(cateall).to.be.eql([]);
    expect(depall).to.be.eql([]);
  })

})
