#!/usr/bin/env node

var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  StreamBouncer = require('stream-bouncer'),
  mkdirp = require('mkdirp'),
  colors = require('colors');

var _bouncer = new StreamBouncer({
  streamsPerTick: 1,
  poll: 100
});

var _break = function(fileName, count) {

  var _getOutputPath = function() {

    if (argv.output) {
      return argv.output + '/';
    }

    mkdirp.sync(path.dirname(fileName) + '/output/');

    return path.dirname(fileName) + '/output/';
  };

  var chunkingStreams = require('chunking-streams'),
    SizeChunker = chunkingStreams.SizeChunker,
    output,
    chunker = new SizeChunker({
      chunkSize: fs.statSync(fileName).size / count,
      flushTail: true
    });

  chunker.on('chunkStart', function(id, done) {
    output = fs.createWriteStream(_getOutputPath() + path.basename(fileName) + "." + id);
    done();
  });

  chunker.on('chunkEnd', function(id, done) {
    output.end();
    if (fs.statSync(output.path).size == 0) {
      fs.unlink(output.path, function(err) {
        if (err)
          console.log(err);
      });
    }
    done();
  });

  chunker.on('data', function(chunk) {
    if (chunk.data.length) {
      output.write(chunk.data);
    }
  });

  _bouncer.push({
    source: fs.createReadStream(fileName),
    destination: chunker
  });

};

var _join = function(basename) {

  var randomAccessFile = require('random-access-file'),
    _ = require('lodash'),
    offset = 0;

  var _getFileCount = function(basename) {

    var memo;

    var getCount = function() {

      if (memo)
        return memo;

      var files = fs.readdirSync(path.dirname(basename));

      files = _.filter(files, function(file) {
        return file.indexOf(path.basename(basename) + '.') != -1;
      });

      memo = files.length || 0;

      return memo;

    };

    return getCount;
  }

  var getCount = _getFileCount(basename);

  if (fs.existsSync(basename)) {
    console.log(path.basename(basename) + ' already exists on disk : (');
    return;
  }

  for (var i = 0; i < getCount(); i++) {

    var name = basename + '.' + i;

    if (!fs.existsSync(name)) {
      console.log(name + ' missing :/');
      process.exit();
    }

    _bouncer.push({
      source: fs.createReadStream(name),
      destination: fs.createWriteStream(basename, {
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
