const i18n = {
  t: txt => txt
}

module.exports = i18n;
module.exports.registerProvider = ({
  t
}) => {
  i18n.t = t;
}
