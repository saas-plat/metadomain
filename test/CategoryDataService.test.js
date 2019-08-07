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

describe('分类档案', () => {

  it('创建供应商档案，添加行业分类和供应商数据', async () => {

    const PartnerCategory = MetaEntity.create(CategoryData, 'PartnerCategory', {
      "Code": 'string',
      "Name": 'string',
    }, [`rule has_date_cant_be_delete {
      when{
        evt: Event e.name == 'delete';
        e: Entity
      }
      then{

      }
    }`]);

    const Partner = MetaEntity.create(BaseData, 'Partner', {
      "ID": 'int',
      "Code": 'string',
      "Name": 'string',
      "PartnerType_Name": 'string',
      "SettlementPartner_Name": 'string',
      "PartnerClass_ID": 'int',
      "PriceGrade_Name": 'string',
      "PartnerDTO_AutoCreateMember": 'bool',
      "Saledepartment_Name": 'string',
      "Saleman_Name": 'string',
      "MadeRecordDate": 'date',
      "PartnerDTO_ARBalance": 'number',
      "PartnerDTO_APBalance": 'number',
      "PartnerDTO_AdvRBalance": 'number',
      "PartnerDTO_AdvPBalance": 'number',
      "PartnerDTO_Disabled": 'bool',
      "PartnerAddresDTOs_Position": 'string',
      "SellCustomer": 'bool',
      "SaleDepartment_id": 'int',
      "SaleMan_id": 'int',
      "SettlementPartner_id": 'number',
    }, [`rule not_end_cant_be_add {
      when{
        evt: Event e.name == 'save';
        a: Object d.$name == 'changes';
        e: Entity
      }
      then{

      }
    }`]);

    const user = {
      id: 'xxxx'
    };
    const PartnerCategoryRep = Repository.create(PartnerCategory);
    const PartnerRep = Repository.create(Partner);
    const reps = {
      PartnerCategory: PartnerCategoryRep,
      Partner: PartnerRep,
    }

    // 清理数据
    await PartnerCategoryRep.events.drop();
    await PartnerCategoryRep.snapshots.drop();
    await PartnerRep.events.drop();
    await PartnerRep.snapshots.drop();

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
      pid: categories[0].id,
    })[0];
    try {
      // 不是末级节点
      await categoryService.saveData({
        Code: '001',
        Name: '供应商1',
        cid: categories[0].id
      });
      expect.fail();
    } catch (err) {}
    const dats = await categoryService.saveData({
      Code: '001',
      Name: '供应商1',
      cid: cn.id
    }, {
      Code: '002',
      Name: '供应商2',
      cid: cn.id
    }, {
      Code: '003',
      Name: '供应商3',
      cid: cn.id
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

    const getAllPartnerCategory = util.promisify(PartnerCategoryRep.getAll);
    const getAllPartner = util.promisify(PartnerRep.getAll);
    const cateall = await getAllPartnerCategory();
    const depall = await getAllPartner();
    console.log(cateall, depall);

    expect(cateall).to.be.eql([]);
    expect(depall).to.be.eql([]);
  })

})
