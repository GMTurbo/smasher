var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  _ = require('lodash'),
  StreamBouncer = require('stream-bouncer');

var _break = function(fileName, count) {

  var chunkingStreams = require('chunking-streams'),
    SizeChunker = chunkingStreams.SizeChunker,
    size = fs.statSync(fileName).size,
    counter = 0,
    source = fs.createReadStream(fileName);

  var _bouncer = new StreamBouncer({
    streamsPerTick: 1,
    poll: 100
  });

  var chunker = new SizeChunker({
    chunkSize: size / count
  });

  var _savetoDisk = function(filename, buffer, fileSuffix) {
    //  debugger;
    var memo = {};

    return (function() {
      var name = filename + "." + fileSuffix;
      // if (!memo[name]) {
      //   memo[name] = name;
        fs.writeFile(name, buffer, function(err) {
          if (err) {
            console.log(err);
          } else {
            console.log(path.basename(name) + " saved.");
          }
        })
      // } else {
      //   fs.appendFile(name, buffer, function(err) {
      //
      //   });
      // }
    })()
  };

  chunker.on('data', function(chunk) {
    _savetoDisk(fileName, chunk.data, counter++);
  });

  _bouncer.push({
    source: source,
    destination: chunker
  });

};

var _join = function(basename) {

  randomAccessFile = require('random-access-file'),
    through = require('through'),
    _ = require('lodash'),
    file = randomAccessFile('my-file.txt'),
    offset = 0;

  var _getFileCount = function(basename) {

    var memo;

    var getCount = function() {

      if (memo)
        return memo;

      debugger;

      var files = fs.readdirSync(path.dirname(basename));

      files = _.filter(files, function(file) {
        return basename.indexOf(path.basename(file)) != -1;
      });

      memo = files.length || 0;

    };

    return getCount();
  }

  var _onChunk = function(globalOffset, filename) {

    var size = fs.statSync(filename).size,
      offset = 0;

    return function(data) {

      var file = randomAccessFile(basename);

      file.write(globalOffset + offset, data, function(err) {
        // write a buffer to offset 10
        if (err)
          console.error(err);

      });

      offset += data.length;

    };
  }

  for (var i = 0; i < _getFileCount(path.dirname(basename)); i++) {

    var name = basename + '.' + i;

    if (!fs.existsSync(name)) {
      console.log(name + ' missing :/');
      continue;
    }

    var tr = new through(_onChunk(offset, name));

    _bouncer.push({
      source: fs.createReadStream(name),
      destination: chunker
    });

    offset += fs.statSync(filename).size;
  }

};

argv.break = argv.break || argv.b;
argv.join = argv.join || argv.j;

if (argv.break) {
  _break(argv.break, argv.count || 2)
} else if (argv.join) {
  _join(argv.join)
}
