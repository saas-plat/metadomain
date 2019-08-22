const {
  BaseService
} = require('./BaseService');
const debug = require('debug')('saas-plat:CompositeService');

// 复合数据，可以在一个实体保存时同时创建多个相关实体
exports.CompositeService = class CompositeService extends BaseService {

}
