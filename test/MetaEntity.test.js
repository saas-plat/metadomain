const {
  BaseData,
  MetaEntity,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('业务实体', () => {

      it('创建一个业务实体，数据类型转换和规则检查', async () => {
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
            enum: [100,200]
          },
          "Bool1": 'bool', // 布尔
          "Ref": 'Persion', // 引用员工档案
          "Ref1": { // 引用 另一种写法
            type: 'reference',
            reference: 'WarehouseType'
          },
          "Obj1": { // 对象类型
            "Code": "string",
            "Name": "string"
          },
          'Array1': [{ // 对象数组
            "Code": "string",
            "Name": "string"
          }]
        });

      });
