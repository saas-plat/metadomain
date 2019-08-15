const {
  BizEntity
} = require('./BizEntity');

// 基础数据对象
const BaseData = exports.BaseData = class BaseData extends BizEntity {

}

BaseData.actionMethods = [...BizEntity.actionMethods];
BaseData.eventTypes = [...BizEntity.eventTypes];
BaseData.fields = {
  ...BizEntity.fields,

}
