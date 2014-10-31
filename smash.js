var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  StreamBouncer = require('stream-bouncer'),
  zlib;

// if (argv.compress || argv.c) {
//   var zlib = require('zlib');
// }

var _bouncer = new StreamBouncer({
  streamsPerTick: 1,
  poll: 100
});

var _break = function(fileName, count) {

  var chunkingStreams = require('chunking-streams'),
    SizeChunker = chunkingStreams.SizeChunker,
    output;

  var chunker = new SizeChunker({
    chunkSize: fs.statSync(fileName).size / count,
    flushTail: true
  });

  chunker.on('chunkStart', function(id, done) {
    output = fs.createWriteStream(fileName + "." + id + (zlib !== undefined ? ".zip" : ""));
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
    middle: zlib !== undefined ? zlib.createGzip() : undefined,
    destination: chunker
  });

};

var _join = function(basename) {

  var randomAccessFile = require('random-access-file'),
    //through = require('through'),
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

  // var _onZippedChunk = function(filename) {
  //
  //   var globalOffset = 0;
  //
  //   return function() {
  //
  //     return function(data) {
  //
  //       var file = randomAccessFile(basename);
  //
  //       file.write(globalOffset, data, function(err) {
  //
  //         if (err)
  //           console.error(err);
  //         file.close();
  //
  //       });
  //
  //       globalOffset += data.length;
  //     }
  //   };
  //
  // };

  // var _onChunk = function(globalOffset, filename) {
  //
  //   var offset = 0;
  //
  //   return function(data) {
  //
  //     var file = randomAccessFile(basename);
  //
  //     file.write(globalOffset + offset, data, function(err) {
  //       // write a buffer to offset 10
  //       if (err)
  //         console.error(err);
  //       file.close();
  //     });
  //
  //     offset += data.length;
  //   };
  // }

  var getCount = _getFileCount(basename);

  //var unzipper = _onZippedChunk();

  if(fs.existsSync(basename)){
    console.log(path.basename(basename) + ' already exists on disk : (');
    return;
  }

  for (var i = 0; i < getCount(); i++) {

    var name = basename + '.' + i + (zlib !== undefined ? ".zip" : "");

    if (!fs.existsSync(name)) {
      console.log(name + ' missing :/');
      continue;
    }

    if (!zlib) {

      _bouncer.push({
        source: fs.createReadStream(name),
        destination: fs.createWriteStream(basename, {'flags':'a'})//new through(_onChunk(offset, name))
      });

    } else {
      _bouncer.push({
        source: fs.createReadStream(name),
        middle: zlib.createGunzip(),
        destination: fs.createWriteStream(basename, {'flags':'a'})
      });
    }

  }

};

argv.break = argv.break || argv.b;
argv.join = argv.join || argv.j;

if (argv.break) {
  _break(argv.break, argv.count || 2)
} else if (argv.join) {
  _join(argv.join)
}
