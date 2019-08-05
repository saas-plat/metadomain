const {BizEntity} = require('./BizEntity');

// 基础数据对象
const BaseData = exports.BaseData = class BaseData extends BizEntity {

}

BaseData.eventTypes = BizEntity.eventTypes.concat();
BaseData.fields = {
  ...BizEntity.fields,

}
