var fs = require('fs');
var mime = require('mime');
var gitteh = require('gitteh');
var express = require('express');
var path = require('path');
var exec = require("child_process").exec;

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

var getCommitCallback = function(request, response) { 
  var repoPath = request.query.path || '';
  var objectPath = request.query.objectPath || '';
  var sha = request.query.commit || '';
  if (sha == '') {
    send404(request, response);
    return;
  }
  var pathParts = objectPath.split('/');
  var commitData = {};

  gitteh.openRepository(repoPath, function(error, repository) {
    // TODO: make this work with something other than HEAD.
    repository.exists(sha, function(error, exists) {
      if (!exists) {
        send404(request, response);
      }
      else {
        repository.getCommit(sha, function(error, commit) {
          commitData.message = commit.message;
          commitData.author = commit.author;
          commitData.committer = commit.author;
          commitData.tree = commit.tree;
          commitData.diff = '';
          commitData.parents = commit.parents;
          exec("git --work-tree='" + repoPath + "' --git-dir='" + repoPath + "'show " + commit.id, function (error, stdout, stderr) {
            commitData.diff = stdout;
            response.send(commitData); 
          });
        });
      }
    });
  });
}

var getObjectCallback = function(request, response) {
  var repoPath = request.query.path || '';
  var objectPath = request.query.objectPath || '';
  var ref = request.query.ref || '';
  var pathParts = objectPath.split('/');
  if (!repoPath) {
    send404(request, response);
    return;
  }
  // Asynchronously make all the disk calls to find our top level tree.
  gitteh.openRepository(repoPath, function(error, repository) {
    // TODO: make this work with something other than HEAD.
    repository.getReference("HEAD", function(error, ref) {
      ref.resolve(function(error, ref) {
        repository.getCommit(ref.target, function(error, commit) {
          // If we had an empty string on a slash (producing 2 parts, both empty) grab the root.
          if ((pathParts.length == 1 || pathParts.length == 2) && pathParts[0] == '') {
            repository.getTree(commit.tree, function(error, tree) {
              serveTreeData(tree, response);
            });
          }
          else {
            repository.getTree(commit.tree, function(error, tree) {
              serveObjectFromPath(pathParts, tree, repository, request, response);
            });
          }
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
var serveObjectFromPath = function(pathParts, tree, repository, request, response) {
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
      if (item.attributes == GIT_DIRECTORY) {
        isDirectory = true;
      }
      break;
    }
  }
  if (matchItem == false || (!finalObject && !isDirectory)) {
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
          serveObjectFromPath(pathParts, tree, repository, request, response);
        }
      });
    }
    else {
      repository.getBlob(item.id, function(error, buffer) {
        serveObjectData(item.name, buffer, response);
      });
    }
  }
}

/**
 * Serve the raw blob object.
 */
var serveObjectData = function (name, buffer, response) {
  var file = {};
  file.type = 'file';
  file.name = name;
  // TODO: does this (or streaming it) need to be async?;
  file.contents = new Buffer(buffer.data, 'binary').toString('base64');
  response.send(file);
  return;

  // When we get a blob from
  var file = buf.data;
  // fs.open() will actually retrieve the contents of said file.
  // We have the file in memory at that point (I think).
  // We can ask the buffer to render itself as a string.
  var fileContents = buf.data.toString();
  // This would print the commit.
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
  */
}

server = express.createServer();
server.get('/getObject', getObjectCallback);
server.get('/getCommit', getCommitCallback);
server.get('*', send404);
server.listen(settings.port, settings.host);
