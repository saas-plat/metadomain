const {
  Repository,
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
    expect(PartnerCategory.references).to.have.property('Parent');
    expect(PartnerCategory.fields.find(it => it.key === 'Partners')).to.be.eql({
      "key": "Partners",
      "src": "Partner",
      "subtype": "reference",
      "type": "array",
      "rules": {
        "type": "array"
      },
      "mapping": "details",
      "defValue": [],
      "fields": undefined
    });

    // 数组必须是[]结尾
    expect(PartnerCategory.references).to.have.property('Partners[]');

    const Partner = require('./entities/Partner');
    const PartnerCategoryRep = await Repository.create(PartnerCategory);
    const PartnerRep = await Repository.create(Partner);
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
    const cate2 = await categoryService.saveCategory({
      Code: '003',
      Name: '欧美',
    });
    await PartnerCategoryRep.commitAll();

    expect(categories[0].id).to.be.ok;
    const cn = await categoryService.saveCategory({
      Code: '001001',
      Name: '中国内地',
      Parent: {
        id: categories[0].id
      },
    });
    cn.on('created', ({
      Partners
    }) => {
      expect(Partners).to.be.eql([]);
    })
    await PartnerCategoryRep.commitAll();

    console.log('----------------1-------------------')
    try {
      // 不是末级节点
      await categoryService.saveData({
        Code: '001',
        Name: '供应商1',
        PartnerClass: {
          id: categories[0].id
        }
      });
      expect.fail();
    } catch (err) {}
    const dats = await categoryService.saveData({
      Code: '001',
      Name: '供应商1',
      PartnerClass: {
        id: cn.id
      }
    }, {
      Code: '002',
      Name: '供应商2',
      PartnerClass: {
        id: cn.id
      }
    }, {
      Code: '003',
      Name: '供应商3',
      PartnerClass: {
        id: cn.id
      }
    });
    await PartnerRep.commitAll();

    console.log('----------------2-------------------')
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
    await categoryService.deleteCategory(cn.id);
    await PartnerCategoryRep.commitAll();

    console.log('----------------3-------------------')
    const cateall = await PartnerCategoryRep.getAll();
    const depall = await PartnerRep.getAll();
    //console.log(cateall, depall);

    expect(cateall).to.have.deep.members([{
      "Code": "002",
      "Name": "东南亚区",
      "Parent": null,
      "Partners": [],
      //"createAt": [Date: 2019 - 08 - 27 T01: 59: 23.713 Z],
      "createBy": "xxxx",
      "deleteAt": undefined,
      "deleteBy": undefined,
      //"id": "xGnkwcKZWt",
      "status": "invalid",
      //"ts": "1566871163712",
      //"updateAt": [Date: 2019 - 08 - 27 T01: 59: 23.713 Z],
      "updateBy": "xxxx",
    }])
    expect(depall).to.be.eql([]);
  })

})
