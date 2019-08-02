exports.BaseService = class BaseService {
  constructor(repository, context) {
    this.repository = repository;
    this.context = context;
  }

  async handleData(data) {
    return {
      ...this.context,
      ...data
    }
  }

  async save(...items) {
    const commits = [];
    for (const it of items) {
      let entity = await this.repository.get(it.id);
      if (!entity) {
        entity = await this.repository.entityType.create(it.id);
      }
      const params = await this.handleData(it);
      await entity.save(params);
      commits.push(entity);
    }
    await this.repository.commitAll(commits);
  }

  async delete(...ids) {
    const commits = [];
    for (const id of ids) {
      const entity = await this.repository.get(id);
      if (!entity) {
        break;
      }
      entity.delete({
        ...this.context
      });
      commits.push(entity);
    }
    await this.repository.commitAll(commits);
  }
}
