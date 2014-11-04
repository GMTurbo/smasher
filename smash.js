#!/usr/bin/env node
//github.com/GMTurbo/smasher/blob/master/smash.js
var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  StreamBouncer = require('stream-bouncer'),
  mkdirp = require('mkdirp'),
  colors = require('colors'),
  _ = require('lodash');

var _bouncer = new StreamBouncer({
  streamsPerTick: 1,
  poll: 100
});

var _getFileCount = function(filepath) {

  var memo;

  var getCount = function() {

    if (memo)
      return memo;

    var files = fs.readdirSync(path.dirname(filepath));

    files = _.filter(files, function(file) {
      return file.indexOf(path.basename(filepath) + '.') != -1;
    });

    memo = files.length || 0;

    return memo;

  };

  return getCount;
}

var createPath = function(dir, file) {
  return dir + '/' + path.basename(file);
};

var _checkForOut = function(targetRoot) {
  if (argv.output) {
    return argv.output + '/';
  }
  return '/';
};

var _getOutputPath = function(fileName) {

  var ret = _checkForOut(fileName);
  if (ret != '/') {
    return ret;
  }

  mkdirp.sync(path.dirname(fileName) + '/output/');

  return path.dirname(fileName) + '/output/';
};

var _break = function(fileName, count) {

  var chunkingStreams = require('chunking-streams'),
    SizeChunker = chunkingStreams.SizeChunker,
    output,
    chunker = new SizeChunker({
      chunkSize: fs.statSync(fileName).size / count,
      flushTail: true
    });

  chunker.on('chunkStart', function(id, done) {
    mkdirp.sync(_getOutputPath(fileName));
    output = fs.createWriteStream(_getOutputPath(fileName) + '/'+ path.basename(fileName) + "." + id);
    done();
  });

  chunker.on('chunkEnd', function(id, done) {
    output.end();
    done();
  });

  chunker.on('data', function(chunk) {
    if (chunk.data.length) {
      output.write(chunk.data);
    }
  });

  _bouncer.on('close', function(str){

    var bname = _getOutputPath(fileName) + '/'+ path.basename(fileName);
    var getCount = _getFileCount(bname);

    for (var i = 0; i < getCount(); i++) {

      var name = bname + "." + i;

      if (!fs.existsSync(name)) {
        console.log(name + ' missing :/');
        continue;
      }

      if (fs.statSync(name).size == 0) {
        fs.unlink(name, function(err) {
          if (err)
            console.log(err);
        });
      }
    }

  });

  _bouncer.push({
    source: fs.createReadStream(fileName),
    destination: chunker
  });

};

var _join = function(targetRoot) {

  var randomAccessFile = require('random-access-file');

  var getCount = _getFileCount(targetRoot),
    outputFile = createPath(_getOutputPath(targetRoot), targetRoot);

  if (fs.existsSync(outputFile)) {
    console.log(outputFile + ' already exists on disk : (');
    return;
  }

  for (var i = 0; i < getCount(); i++) {

    var name = targetRoot + '.' + i;

    if (!fs.existsSync(name)) {
      console.log(name + ' missing :/');
      continue;
    }

    _bouncer.push({
      source: fs.createReadStream(name),
      destination: fs.createWriteStream(outputFile, {
        'flags': 'a'
      })
    });

  }

};

argv.break = argv.break;
argv.join = argv.join;

if (argv.break) {
  _break(argv.break, argv.count || 2)
} else if (argv.join) {
  _join(argv.join)
} else {
  printHelp();
}

function printHelp() {
  var message = [
    ['smash'.red,
      ' --break'.green,
      ' path/file.txt'.cyan,
      ' --count'.green,
      ' 5'.cyan
    ].join(' '), ['smash'.red,
      ' --join'.green,
      ' path/file.txt'.cyan,
      '<-- file name and extention must match chunks'.grey
    ].join(' ')
  ];
  console.log(message.join('\n'));
}
