var couchapp = require('couchapp');
var path = require('path');

var ddoc = {_id:'_design/app'}

ddoc.rewrites = [
  {from:"/", to:'index.html'},
  {from:"/api", to:'../../'},
  {from:"/api/*", to:'../../*'},
  {from:"/*", to:'*'}
];

ddoc.views = {};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'dist'));

module.exports = ddoc;