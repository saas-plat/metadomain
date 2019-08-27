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
      "index": undefined,
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

    expect(await PartnerCategoryRep.getAll()).to.eql([]);
    expect(await PartnerRep.getAll()).to.eql([]);

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
      Parent: null
    });
    //console.log(categories)
    expect(categories[0]).to.deep.include({
      "Code": "001",
      "Name": "大中华区",
      "Parent": undefined, // 默认
      "Partners": [], // 默认为[]
    });
    expect(categories[1]).to.deep.include({
      "Code": "002",
      "Name": "东南亚区",
      "Parent": null,
      "Partners": [],
    })
    // --------------------------

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
    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    console.log('----------------1-------------------')
    let dit;
    try {
      // 不是末级节点
      dit = await categoryService.saveData({
        Code: '001',
        Name: '供应商1',
        PartnerClass: {
          id: categories[0].id
        }
      });
    } catch (err) {}
    expect(dit).to.be.undefined;
    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    const dats = await categoryService.saveData({
      Code: '001',
      Name: '供应商1',
      PartnerClass: {
        id: categories[1].id
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

    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    console.log('----------------2-------------------')
    const remit1 = await categoryService.deleteData(dats[1].id);
    expect(remit1).to.not.undefined;

    let remit;
    try {
      // 有数据时，分类不能删除
      remit = await categoryService.deleteCategory(categories[1].id);
    } catch (err) {}
    expect(remit).to.be.undefined;

    try {
      // 不是末级无数据的分类
      remit = await categoryService.deleteCategory(categories[0].id);
    } catch (err) {}
    expect(remit).to.be.undefined;

    await categoryService.deleteCategory(cn.id);
    await PartnerCategoryRep.commitAll();
    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    console.log('----------------3-------------------')
    const cateall = await PartnerCategoryRep.getAll();
    const depall = await PartnerRep.getAll();
    //console.log(cateall);

    expect(cateall.sort((a, b) => a.Code - b.Code).map(({
      Name,
      Code,
      Parent,
      Partners,
      status,
      createBy,
      updateBy,
      deleteBy,
    }) => ({
      Name,
      Code,
      Parent,
      Partners,
      status,
      createBy,
      updateBy,
      deleteBy,
    }))).to.have.deep.members([{
      //id: 'qTfZ3MwlM',
      Name: '大中华区',
      Code: '001',
      Parent: undefined,
      Partners: [],

      status: 'abandoned',
      createBy: 'xxxx',
      //createAt: 2019-08-27T05:24:25.286Z,
      updateBy: null,
      //updateAt: 2019-08-27T05:24:26.634Z,
      deleteBy: 'xxxx',
      //deleteAt: 2019-08-27T05:24:26.636Z,
      //  ts: '1566883466634'
    }, {
      "Code": "002",
      "Name": "东南亚区",
      "Parent": null,
      "Partners": [],
      //"createAt": [Date: 2019 - 08 - 27 T01: 59: 23.713 Z],
      "createBy": "xxxx",
      "deleteBy": undefined,
      //"id": "xGnkwcKZWt",
      "status": "invalid",
      //"ts": "1566871163712",
      //"updateAt": [Date: 2019 - 08 - 27 T01: 59: 23.713 Z],
      "updateBy": "xxxx",
    }, {
      //id: 'Y6h6q9w63I',
      Name: '欧美',
      Code: '003',
      Parent: undefined,
      Partners: [],

      status: 'invalid',
      createBy: 'xxxx',
      //  createAt: 2019-08-27T05:24:25.357Z,
      updateBy: 'xxxx',
      //  updateAt: 2019-08-27T05:24:25.357Z,
      deleteBy: undefined,
      //  ts: '1566883465356'
    }, {
      //  id: 'nEoxOe4u_K',
      Name: '中国内地',
      Code: '001001',
      Parent: {
        id: cn.id
      },
      Partners: [],

      status: 'abandoned',
      createBy: 'xxxx',
      //  createAt: 2019-08-27T05:24:25.502Z,
      updateBy: 'xxxx',
      //  updateAt: 2019-08-27T05:24:26.217Z,
      deleteBy: 'xxxx',
      //  deleteAt: 2019-08-27T05:24:26.768Z,
      //  ts: '1566883466217'
    }])
    expect(depall).to.be.eql([]);
  })

})
