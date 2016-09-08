'use strict';

var oo = require('substance/util/oo');
var Err = require('substance/util/SubstanceError');

/*
  Implements the NotesEngine API.
*/
function NotesEngine(config) {
  this.config = config;
  this.db = config.db.connection;
}

NotesEngine.Prototype = function() {
  
  this._enhanceDocs = function(docs) {
    docs.forEach(function(doc) {
      if (!doc.collaborators) {
        doc.collaborators = [];
      } else {
        // Turn comma separated values into array
        doc.collaborators = doc.collaborators.split(',');
      }
      if (!doc.creator) {
        doc.creator = 'Anonymous';
      }
      doc.updatedBy = doc.updatedBy || 'Anonymous';
    });
    return docs;
  };

  this.getUserDashboard = function(userId, cb) {

    var userDocsQuery = '(SELECT \
      d.title as title, \
      d."documentId" as "documentId", \
      u.name as creator, \
      (SELECT string_agg(name, \',\') \
        FROM (SELECT DISTINCT u.name FROM changes c INNER JOIN users u ON (c."userId" = u."userId") WHERE c."documentId" = d."documentId" AND c."userId" != d."userId") AS authors \
      ) AS collaborators, \
      d."updatedAt" as "updatedAt", \
      (SELECT name FROM users WHERE "userId"=d."updatedBy") AS "updatedBy" \
    FROM documents d \
    INNER JOIN users u ON (d."userId" = u."userId") \
    WHERE d."userId" = $1)';

    var collabDocsQuery = '(SELECT \
      d.title as title, \
      d."documentId" as "documentId", \
      u.name as creator, \
      (SELECT string_agg(name, \',\') \
        FROM (SELECT DISTINCT u.name FROM changes c INNER JOIN users u ON (c."userId" = u."userId") WHERE c."documentId" = d."documentId" AND c."userId" != d."userId") AS authors \
      ) AS collaborators, \
      d."updatedAt" as "updatedAt", \
      (SELECT name FROM users WHERE "userId"=d."updatedBy") AS "updatedBy" \
    FROM documents d \
    INNER JOIN users u ON (d."userId" = u."userId") \
    WHERE d."documentId" IN (SELECT "documentId" FROM changes WHERE "userId" = $1) AND d."userId" != $1 ORDER BY d."updatedAt" DESC)';

    // Combine the two queries
    var query = [userDocsQuery, 'UNION', collabDocsQuery].join(' ');

    this.db.run(query, [userId], function(err, docs) {
      if (err) {
        return cb(new Err('ReadError', {
          cause: err
        }));
      }
      cb(null, this._enhanceDocs(docs));
    }.bind(this));
  };
};

oo.initClass(NotesEngine);

module.exports = NotesEngine;