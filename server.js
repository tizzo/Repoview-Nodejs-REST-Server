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

var GIT_DIRECTORY = 16384;
var GIT_SUBMODULE = 160000;

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
  var pathParts = objectPath.split('/');
  // Asynchronously make all the disk calls to find our top level tree.
  gitteh.openRepository(repoPath, function(error, repository) {
    // TODO: make this work with something other than HEAD.
    repository.getReference("HEAD", function(error, ref) {
      ref.resolve(function(error, ref) {
        repository.getCommit(ref.target, function(error, commit) {
          // TODO: This was useful here for testing but should really be served
          // called by findObjectFromPath().
          //serveTreeData(repository, commit.tree, response);
          repository.getTree(commit.tree, function(error, tree) {
            findObjectFromPath(pathParts, tree, repository, request, response);
          });
        });
      });
    });
  });
}

/**
 * @param pathParts
 *   A linear array of path segments.
 * @param tree
 *   A gitteh tree object to search within.
 * @param repository
 *   The repository from which to fetch to objects.
 * @param request
 *   A response object for this request.
 * @param response
 *   A request object for this request.
 */
var findObjectFromPath = function(pathParts, tree, repository, request, response) {
  // Determine if we have the last part.
  var currentPart = pathParts.shift();
  // If there are no remaining path parts, this is the final object.
  var finalObject = (pathParts.length == 0);
  var matchItem = false;
  var isDirectory = false;
  for (var i in tree.entries) {
    var item = tree.entries[i];
    if (item.name == currentPart) {
      matchItem = item;
      // TODO: create constants for magic numbers.
      if (item.attributes == GIT_DIRECTORY) {
        isDirectory = true;
      }
      break;
    }
  }
  if (matchItem == false) {
    console.log(currentPart);
    send404(request, response);
  }
  // No match was found, send an error.
  else {
    if (isDirectory) {
      repository.getTree(item.id, function(error, tree) {
        if (finalObject) {
          serveTreeData(tree, response);
        }
        else {
          findObjectFromPath(pathParts, tree, repository, request, response);
        }
      });
    }
  }
}

/**
 * Serve the raw blob object.
 */
var serveObjectData = function (repository, hash) {
}

/**
 * Serve the data from a tree.
 */
var serveTreeData = function(tree, response) {
  var treeData = {};
  // Asynchronously load a tree and return its data.
  treeData.type = 'directory';
  treeData.contents = {};
  for (var i in tree.entries) {
    var item = tree.entries[i];
    var isSubmodule = false;
    var isDirectory = false;
    switch (item.attributes) {
      case GIT_DIRECTORY:
        isDirectory = true;
        break;
      case GIT_SUBMODULE:
        isSubmodule = true;
        break;
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
}

var getObject = function (repository, path) {
  return path;
}

var getCommit = function (repository, path) {
  /*
  // TODO: Figure out the best way to get a diff.
  exec("git show " + commit.id, function (error, stdout, stderr) {
    response.seld(stdout);
  });
  */
}

server = express.createServer();
server.get('/getObject', getObjectCallback);
server.get('*', send404);
server.listen(settings.port, settings.host);
