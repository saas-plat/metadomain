const {
  BaseData,
  MetaEntity,
  Repository
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('业务实体', () => {

  it('创建一个业务实体,数据类型转换和规则检查', async () => {
    const TestReference1 = MetaEntity.create(BaseData, 'TestReference1', {
      "Code": "string",
    });

    const TestReference2 = MetaEntity.create(BaseData, 'TestReference2', {
      "Code": "string",
    });

    const TestObj = MetaEntity.create(BaseData, 'TestObj', {
      "Code": {
        type: "string",
        required: true, // 必录
        min: 1,
        max: 4,
        unique: true
      }, // 字符串
      "Str1": {
        type: 'string',
        length: 2,
        pattern: '[a-z]*'
      },
      "Date": "date",
      "Value": {
        type: 'number', // 数值
        enum: [100, 200]
      },
      "Bool1": 'bool', // 布尔
      "Ref": 'Persion', // 引用员工档案
      "Ref1": { // 引用 另一种写法
        type: 'reference',
        reference: 'TestReference1'
      },
      "Obj1": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'Array1': [{ // 对象数组
        "Value": "number",
        "REF2": 'TestReference2' // 数组中的引用
      }]
    });

    const TestReference1Rep = Repository.create(TestReference1);
    const TestReference2Rep = Repository.create(TestReference2);
    const ref1 = TestReference1.create();
    await ref1.save({
      Code: '10000'
    });
    const ref21 = TestReference2.create();
    await ref21.save({
      Code: '10001'
    });
    const ref22 = TestReference2.create();
    await ref22.save({
      Code: 'xxxxxxx'
    });
    await TestReference1Rep.commitAll(ref1);
    await TestReference2Rep.commitAll(ref21, ref22);

    const testRepository = Repository.create(TestObj);
    const test = TestObj.create();

    await test.save({
      Name: 'test001',
      Str1: 'abcxyz',
      Bool1: true,
      Obj1: {
        Code: 'eeeeeeeeee'
      },
      Ref1: ref1,
      Array1: [{
        REF2: ref21,
        Value: 100
      }, {
        REF2: ref22,
        Value: 200
      }]
    });
    testRepository.commitAll(test);
  });

  it('一个实体可以自定义行为和行为的处理规则', async () => {
    const TestObj = MetaEntity.create(BaseData, 'TestObj2', {
      "Code": "string"
    }, [`rule custom_action1{
      when{
        e: Event e.name == 'action1ing';
        d: Object
      }
      then{
        if (!d.Code  ){
          throw new Error('error')
        }
      }
    }`,`rule custom_action2{
      when{
        e: Event e.name == 'action2ed';
        d: Object d.name === 'changes';
        p: Object p.name === 'parsms';
      }
      then{
         d.Code = p.Code;
         modify(d);
      }
    }`]);
    const testRepository = Repository.create(TestObj);
    const test = TestObj.create();
    await test.save({
      Code: 'xxxxxxxxx'
    });
    // 默认自定义行为不修改数据
    await test.customAction('action1', {
      Code: 'bbbbbbbbbb'
    });
    expect(test.Code).to.be.eql('xxxxxxxxx');

    await test.customAction('action2', {
      Code: 'cccccccccc'
    });
    expect(test.Code).to.be.eql('cccccccccc');
    testRepository.commitAll(test);


  })

})
