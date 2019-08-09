const {
  DataTable,
  MetaTable
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('数据表', () => {

  it('只创建一个Schame给gql生成类型用', async () => {

    const DataTable1 = MetaTable.createSchame(  'DataTable1', {
      "id": "string",
      "Code": "string",
      "Str1": {
        type: 'string',
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'bool', // 布尔
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

  it('创建一个简单数据表，可以增删改数据', async () => {

    const DataTable1 = MetaTable.create(DataTable, 'DataTable1', {
      "id": "string",
      "Code": "string",
      "Str1": {
        type: 'string',
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'bool', // 布尔
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

    await test.upsert({
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

    await test.upsert({
      {
        id: 'aaaa',
        $addToSet: Details: [{
          REF2: {
            id: 'xxxxx'
          },
          Value: 200
        }]
      }
    });

    await test.upsert({
      {
        id: 'aaaa',
         Value: 100
      }
    });
  });

})
