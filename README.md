# 领域模型
使用领域元数据提供通过配置的方式快速定义业务模型

## 实体的定义
```js
const {
  MetaEntity
} = require('@saas-plat/metadomain');

const BankAccount = MetaEntity.createModel('BankAccount', {
  fields:{
    "Code": {type:"string",mapping:'code'},
    "Name": {type:"string",mapping:'name'},
    "NewBalance": "number"
  }
});

```

## 实体类型与服务

- 基础实体
- 层级实体
- 分类实体
- 复合实体


## 事件的迁移
给每个实体的event进行迁移， 每个实体可以写一个升级脚本
通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交

```js
const migration = new Migration([Department1Rep, WarehouseRep], [Department2Rep, WarehouseRep]);
await db.lock(ns);
migration.onAction(objs => {
  // 执行升级规则
   ...
})
await migration.up('v1','v2');
await db.unlock(ns);
```
