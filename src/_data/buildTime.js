// A fresh value every build, used to cache-bust /css/style.css and
// /js/desktop.js in base.njk -- without this, a browser or Cloudflare's
// edge can keep serving an old cached copy of those files across
// deploys, since their URLs never change on their own.
module.exports = () => Date.now();
