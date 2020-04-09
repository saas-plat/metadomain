const {
  BizError,
  Repository,
  CategoryDataService,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo/mongo');
const {
  wait
} = require('./util');

describe('分类数据', () => {
  before(async () => {
    console.log('wait...')
    //await wait(1000);

    const db = mongo.db;
    const keys = ['Partner', 'PartnerCategory'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.countDocuments() > 0) {
        await events.deleteMany();
        await snapshots.deleteMany();
        console.log('-------clear-------');
      }
    }
  })

  it('创建部门档案，添加部门分类和部门数据', async () => {
    const user = {
      id: 'xxxx'
    };

    const PartnerCategory = require('./Entities/PartnerCategory');
    expect(PartnerCategory.references).to.have.property('Parent');
    expect(PartnerCategory.fields.find(it => it.key === 'Partners')).to.be.eql({
      "key": "Partners",
      "src": "Partner",
      "description":undefined,
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

    const Partner = require('./Entities/Partner');
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
    } catch (err) {
      expect(err).to.be.an.instanceof(BizError);
    }
    expect(dit).to.be.undefined;
    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

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
    await PartnerCategoryRep.commitAll();
    let cate_cn = await PartnerCategoryRep.get(cn.id);
    expect(cate_cn.Partners.length).to.be.eql(3);

    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    console.log('----------------2-------------------')

    const remit1 = await categoryService.deleteData(dats[1].id);
    // 不提交获取的也是对的
    // await PartnerRep.commitAll();
    // await PartnerCategoryRep.commitAll();
    expect(remit1).to.not.undefined;
    cate_cn = await PartnerCategoryRep.get(cn.id);
    expect(cate_cn.Partners.length).to.be.eql(2);
    await PartnerRep.commitAll();
    await PartnerCategoryRep.commitAll();

    let remit;
    try {
      // 有数据时，分类不能删除
      remit = await categoryService.deleteCategory(cn.id);
    } catch (err) {
      expect(err).to.be.a.instanceof(BizError);
    }
    expect(remit).to.be.undefined;

    try {
      // 不是末级无数据的分类
      remit = await categoryService.deleteCategory(categories[0].id);
    } catch (err) {
      expect(err).to.be.an.instanceof(BizError);
    }
    expect(remit).to.be.undefined;

    remit = await categoryService.deleteCategory(categories[1].id);
    expect(remit).to.not.undefined;

    await PartnerRep.commitAll();
    await PartnerCategoryRep.commitAll();
    expect((await PartnerCategoryRep.getAll()).length).to.eql(4);

    console.log('----------------3-------------------')
    const cateall = (await PartnerCategoryRep.getAll()).sort((a, b) => a.Code - b.Code).map(({
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
    }));
    const depall = (await PartnerRep.getAll()).filter(s => s.status !== 'abandoned').sort((a, b) => a.Code - b.Code).map(({
      Name,
      Code,
      PartnerClass,
      id
    }) => ({
      Name,
      Code,
      PartnerClass,
      id
    }));

    expect(cateall).to.have.deep.members([{
        Name: '大中华区',
        Code: '001',
        Parent: undefined,
        Partners: [],
        status: "invalid",
        createBy: 'xxxx',
        updateBy: 'xxxx',
        deleteBy: undefined,
      },
      {
        Name: '东南亚区',
        Code: '002',
        Parent: null,
        Partners: [],
        status: 'abandoned',
        createBy: 'xxxx',
        updateBy: undefined,
        deleteBy: 'xxxx'
      },
      {
        Name: '欧美',
        Code: '003',
        Parent: undefined,
        Partners: [],
        status: 'invalid',
        createBy: 'xxxx',
        updateBy: undefined,
        deleteBy: undefined
      },
      {
        //id: cn.id,
        Name: '中国内地',
        Code: '001001',
        Parent: {
          id: categories[0].id
        },
        Partners: [{
          id: dats[0].id,
        }, {
          id: dats[2].id,
        }],
        status: "invalid",
        createBy: 'xxxx',
        updateBy: 'xxxx',
        deleteBy: undefined,
      }
    ])
    console.log(JSON.stringify(depall, null, 2))
    expect(depall).to.be.eql([{
      id: dats[0].id,
      Code: '001',
      Name: '供应商1',
      PartnerClass: {
        id: cn.id
      }
    }, {
      id: dats[2].id,
      Code: '003',
      Name: '供应商3',
      PartnerClass: {
        id: cn.id
      }
    }])
  })
})
