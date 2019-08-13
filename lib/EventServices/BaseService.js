const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

exports.BaseService = class BaseService {
  constructor(model){
    this.model = model;
  }


}
