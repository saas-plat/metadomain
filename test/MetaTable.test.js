const {
  BaseTable,
  TableCache,
  MetaTable
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('./util');
const mongoose = require('mongoose');

describe('数据表', () => {

  it('元数据定义，支持description等', async () => {

    const TestModel = MetaTable.createModel(BaseTable, 'TestModel', {
      "id": "string",
      "Code": "string",
      "Str1": {
        type: 'string',
        description: '这是一个字符串'
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'boolean', // 布尔
      "Ref": 'mixed',
      "Obj1": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'Details': [{ // 子表
        "Value": "number",
        "REF2": {
          "id": "string",
          "Code": "string",
          "Name": "string"
        }
      }]
    }, null, {
      description: '测试Model'
    });
    //const  {name, description, fields} = TestMode.schema.paths
    expect(TestModel.schema.path('Str1').options.description).to.be.eq('这是一个字符串');
    //console.log({name, description, fields})

  });

  it('创建一个简单数据表，可以增删改数据', async () => {

    await mongoose.connection.db.collection('DataTable1.tables').deleteMany();

    const DataTable1 = MetaTable.createModel(BaseTable, 'DataTable1', {
      "id": "string",
      "Code": "string",
      "Str1": {
        type: 'string',
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'boolean', // 布尔
      "Ref": 'mixed',
      "Obj1": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'Details': [{ // 子表
        "Value": "number",
        "REF2": {
          "id": "string",
          "Code": "string",
          "Name": "string"
        }
      }]
    });

    const dt1 = new DataTable1({
      id: 'aaaa',
      Name: 'test001',
      Str1: 'abcxyz',
      Bool1: true,
      Obj1: {
        Code: 'eeeeeeeeee'
      },
      Ref1: {
        id: '100'
      },
      Details: [{
        REF2: {
          id: 'xxxxx'
        },
        Value: 100
      }]
    });
    await dt1.save();
    //await DataTable1.commitAll();

    await DataTable1.findOneAndUpdate({
      id: 'aaaa'
    }, {
      $addToSet: {
        Details: [{
          REF2: {
            id: 'xxxxx'
          },
          Value: 200
        }]
      }
    });

    await DataTable1.findOneAndUpdate({
      id: 'aaaa'
    }, {
      id: 'aaaa',
      Value: 100
    });

  });

  it('只创建一个Schame给gql生成类型用', async () => {
    await mongoose.connection.db.collection('DataTable1.tables').deleteMany();

    const DataTable1 = MetaTable.createSchema('DataTable1', {
      "id": "string",
      "Code": "string",
      "Str1": {
        type: 'string',
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'boolean', // 布尔
      "Ref": 'mixed',
      "Obj1": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'Details': [{ // 子表
        "Value": "number",
        "REF2": {
          "id": "string",
          "Code": "string",
          "Name": "string"
        }
      }]
    });

  })

  it('相同schema模型，不同租户需要通过集合隔离', async () => {

    await mongoose.connection.db.collection('org001.SamellModel.tables').deleteMany();
    await mongoose.connection.db.collection('org002.SamellModel.tables').deleteMany();

    const schema = {
      "Name": "string",
    }

    const SamellModel1 = MetaTable.createModel(BaseTable, 'SamellModel', schema, null, {
      ns: 'org001'
    });

    await new SamellModel1({
      Name: 'aaaaa',
    }).save();

    console.log('----------------')

    expect((await SamellModel1.find({
      Name: 'aaaaa'
    })).map(it => it.toObject())).to.be.eql([{
      Name: 'aaaaa'
    }])

    const SamellModel2 = MetaTable.createModel(BaseTable, 'SamellModel', schema, null, {
      ns: 'org002'
    });

    expect((await SamellModel1.find({
      Name: 'aaaaa'
    })).map(it => it.toObject())).to.be.eql([{
      Name: 'aaaaa'
    }])

    expect((await SamellModel2.find({
      Name: 'aaaaa'
    })).map(it => it.toObject())).to.be.eql([])
  })

  it('同时支持多版本的相同数据对象，相同版本采用存储隔离', async () => {

    const VersionModel = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string'
    }, null, {
      version: '1'
    });
    const VersionModel2 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string',
      code: 'string'
    }, null, {
      version: '2'
    });
    const VersionModel1 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string'
    }, null, {
      version: '1'
    });

    expect(VersionModel).to.be.equal(VersionModel1);
    expect(VersionModel).to.not.equal(VersionModel2);

    const VersionModel_org001 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string'
    }, null, {
      version: '1',
      ns: 'org001'
    });

    expect(VersionModel).to.not.equal(VersionModel_org001);
    expect(VersionModel_org001).to.not.equal(VersionModel);

    // 继承关系
    //expect(VersionModel_org001).to.not.equal(VersionModel);

    TableCache.ttl('VersionModel_1', .3);
    TableCache.ttl('VersionModel_2', .3);

    // 3s后回收
    await util.wait(200);
    const VersionModel22 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string',
      code: 'string'
    }, null, {
      version: '2'
    });
    await util.wait(200);

    const VersionModel11 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string'
    }, null, {
      version: '1'
    });
    const VersionModel222 = MetaTable.createModel(BaseTable, 'VersionModel', {
      name: 'string',
      code: 'string'
    }, null, {
      version: '2'
    });
    expect(VersionModel2).to.be.equal(VersionModel222);
    expect(VersionModel).to.not.equal(VersionModel11);

  })

  it('自定义事件的处理，根据事件名称执行规则', async () => {

  })

})
