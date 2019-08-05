const {
  BaseService
} = require('./BaseService');

// 复合数据，可以在一个实体保存时同时创建多个相关实体
exports.CompositeService = class CompositeService extends BaseService {

  async _handleReference(refData, refRepository, data, mainEntity, ...other) {
    let entity = await super._handleReference(refData, refRepository, data, ...other);
    if (entity) {
      return entity;
    }
    // 创建一个新实体
    const service = new CompositeService(refRepository.entityType, this.context, this.findRepsitory);
    entity = await service.save({
      ...data,
      ...refData,
      srcId: mainEntity.id
    });
    return entity;
  }


}
