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
        max: 10,
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

    const TestReference1Rep = await Repository.create(TestReference1);
    const TestReference2Rep = await Repository.create(TestReference2);

    const ref1 = await TestReference1.create();
    await ref1.save({
      Code: '10000',
      ts: ref1.ts
    });
    const ref21 = await TestReference2.create();
    await ref21.save({
      Code: '10001',
      ts: ref21.ts
    });
    const ref22 = await TestReference2.create();
    await ref22.save({
      Code: 'xxxxxxx',
      ts: ref22.ts
    });
    await TestReference1Rep.commitAll(ref1);
    await TestReference2Rep.commitAll(ref21, ref22);

    const testRepository = await Repository.create(TestObj);
    const test = await TestObj.create();

    await test.save({
      Code: 'test001',
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
      }],
      ts: test.ts
    });
    await testRepository.commitAll(test);
  });

  it('一个实体可以自定义行为和行为的处理规则', async () => {
    let ec = 0;
    const TestObj = MetaEntity.create(BaseData, 'TestObj2', {
      "Code": "string"
    }, [`rule custom_action1{
      when{
        e: Action e.name == 'TestObj2.action1ing';
      }
      then{
        if (!e.data.Code  ){
          throw new Error('error')
        }
      }
    }`, `rule custom_action2{
      when{
        e: Action e.name == 'TestObj2.action2';
        d: EventData;
      }
      then{
        console.log('----dododo---');
         d.Code = e.data.Code;
         //modify(d);
      }
    }`], {
      action1ed: (...args) => {
        ec++;
        console.log(...args);
      },
      action2ed: (...args) => {
        ec++;
        console.log(...args);
      }
    });
    const testRepository = await Repository.create(TestObj);
    const test = await TestObj.create();
    await test.save({
      Code: 'xxxxxxxxx',
      ts: test.ts
    });
    expect(test.Code).to.be.eql('xxxxxxxxx');
    // 默认自定义行为不修改数据
    await test.customAction('action1', {
      Code: 'bbbbbbbbbb',
      ts: test.ts
    });
    expect(test.Code).to.be.eql('xxxxxxxxx');

    await test.customAction('action2', {
      Code: 'cccccccccc',
      ts: test.ts
    });
    expect(test.Code).to.be.eql('cccccccccc');
    await testRepository.commitAll(test);

    // 收到两个自定义业务事件
    expect(ec).to.be.eql(2);
  })

  it('实体支持字段名称映射，但是也不影响基类的写法', async () => {

    const MappingObj = MetaEntity.create(BaseData, 'MappingObj1', {
      "ID": {
        type: 'string',
        mapping: 'id'
      },
      "times": {
        type: 'string',
        mapping: 'ts'
      },
      "Code": "string"
    });
    const testRepository = await Repository.create(MappingObj);
    const test = await MappingObj.create({
      ID: new Date().getTime().toString()
    });
    //console.log(111,test)
    await test.save({
      ...test,
      Code: 'xxxxxxxxx',
    });
    //console.log(111,test)
    expect(test.times).to.not.undefined;
    expect(test.times).to.be.eql(test.ts);

    await testRepository.commitAll(test);
    expect(test.id).to.not.null;
    const obj = await testRepository.get(test.id);

    console.log(test, obj)
    expect(obj).to.include({
      ID: test.id,
      times: test.ts,
      Code: 'xxxxxxxxx',
      status: 'invalid',
      createBy: null,
      //createAt: 2019-08-24T00:44:28.521Z,
      updateBy: null,
      //updateAt: 2019-08-24T00:44:28.529Z,
      deleteBy: undefined,
      deleteAt: undefined
    })
  })

  it('测试快照保存和加载能力', async () => {

  })
})
