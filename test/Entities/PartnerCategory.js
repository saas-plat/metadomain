const {
  MetaEntity,
  CategoryData,
} = require('../../lib');

module.exports = = MetaEntity.create(CategoryData, 'PartnerCategory', {
  "Code": 'string',
  "Name": 'string',
}, [`rule has_date_cant_be_delete {
  when{
    evt: Action e.name == 'delete';
    e: Entity
  }
  then{

  }
}`]);
