var fs = require('fs');
var mime = require('mime');
var gitteh = require('gitteh');
var express = require('express');
var path = require('path');

// TODO: Add a settings file.
var settings = {
  port : 8081,
  host : '127.0.0.1'
};

/**
 * Sends a 404 message.
 */
var send404 = function (request, response) {
  response.send({error: 'Item not found.'}, 404);
}

var getObjectCallback = function(request, response) {
  var repoPath = request.query.path;
  var objectPath = request.query.objectPath;
  var ref = request.params.ref || '';
  var parts = objectPath.split('/');
  gitteh.openRepository(repoPath, function(error, repository) {
    repository.getReference("HEAD", function(error, ref) {
      ref.resolve(function(error, ref) {
        repository.getCommit(ref.target, function(error, commit) {
          serveTreeData(repository, commit.tree, response);
          /*
          repository.getTree(commit.tree, function(error, tree) {
          });
          */
        });
      });
    });
  });
}

/**
 * @param parts
 *   A linear array of path segments.
 * @param tree
 *   A gitteh tree object to search within.
 * @param repository
 *   The repository from which to fetch to objects.
 * @param next
 *   The function to call when the function completes.
 *   Defaults to this function itself.
 */
var findObjectFromPath = function(parts, tree, repository, next) {
  // Determine if we 
  if (lastPart) {
    getObjectHash(parts, repository);
  }
  var someError = false;
  if (someError) {
    send404();
  }
}

var checkObject = function(item, repository) {

}

/**
 * Serve the data from a tree.
 */
var serveTreeData = function(repository, hash, response) {
  var treeData = {};
  // Asynchronously load a tree and return its data.
  var output = repository.getTree(hash, function (error, tree) {
    treeData.type = 'directory';
    treeData.contents = {};
    for (var i in tree.entries) {
      var item = tree.entries[i];
      var isSubmodule = false;
      var isDirectory = false;
      switch (item.attributes) {
        case 16383:
          isDirectory = true;
          break;
        case 160000:
          isSubmodule = true;
          break;
      }
      if (item.attributes == 16383) {
        var isDirectory = true;
      }
      else {
        var isDirectory = false;
      }
      treeData.contents[item.name] = {
        name : item.name,
        attributes : item.attributes,
        directory : isDirectory,
        mode : item.attributes,
        submodule : isSubmodule,
        object_id : item.id
      };
    }
    response.send(treeData);
  });
}

var getObject = function (repository, path) {
  return path;
}

var getCommit = function (repository, path) {
  /*
  exec("git show " + commit.id, function (error, stdout, stderr) {
    response.seld(stdout);
  });
  */
}

server = express.createServer();
server.get('/getObject', getObjectCallback);
server.get('*', send404);
server.listen(settings.port, settings.host);
