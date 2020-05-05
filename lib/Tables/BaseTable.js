const {
  mapto,
} = require('../util');
const {
  t
} = require('../i18n');
const mongoose = require('mongoose');
const {
  MetaTable
} = require('../MetaTable');

// 数据查询对象基类
const BaseTable = exports.BaseTable = class BaseTable extends MetaTable {

}

BaseTable.fields = {

}
