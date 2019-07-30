const i18n = require('i18next');
const Backend = require('i18next-xhr-backend');

i18n
  .use(Backend)
  .init({
    backend: {
      loadPath: '{{lng}}/{{ns}}',
      parse: (data) => data,
      ajax: (url, options, callback) => {
        try {
          fetch('https://static.saas-plat.com/locales/' + url + '.json').then(res => {
            if (res.status === 404) {
              // 有可能文件没有
              return null;
            }
            return res.json();
          }).then(locale => callback(locale, {
            status: '200'
          })).catch(() => callback(null, {
            status: '404'
          }));
        } catch (e) {
          callback(null, {
            status: '404'
          });
        }
      }
    },
    preload: ['zh'], // must know what languages to use
    fallbackLng: 'zh'
  })
const oldt = (i18n.t).bind(i18n);
module.exports = i18n;
module.exports.t = (...args) => oldt(...args);
