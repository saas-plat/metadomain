const {
  BaseService
} = require('./BaseService');

// 复合数据，可以在一个实体保存时同时创建多个相关实体
exports.CompositeService = class CompositeService extends BaseService {
  constructor(...args){
    super(...args);
    this.newEntities = [];
  }

  async _handleReference(refData, refRepository, data, mainEntity, ...other) {
    let entity = await super._handleReference(refData, refRepository, data, ...other);
    if (entity) {
      return entity;
    }
    // 如果要是一个没有id的实体，可以自动生成一个
    const service = new CompositeService(refRepository.entityType, this.context, this.findRepsitory);
    entity = await service.save({
      ...data,
      ...refData,
      srcId: mainEntity.id
    });
    this.newEntities.push(entity);
    return entity;
  }

  // 拷贝
  async copy(id) {

  }

}
