var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  _ = require('lodash'),
  StreamBouncer = require('stream-bouncer');

var _bouncer = new StreamBouncer({
  streamsPerTick: 1,
  poll: 100
});

var _break = function(fileName, count) {

  var chunkingStreams = require('chunking-streams'),
    SizeChunker = chunkingStreams.SizeChunker,
    size = fs.statSync(fileName).size,
    counter = 1,
    output,
    source = fs.createReadStream(fileName);

  var chunker = new SizeChunker({
    chunkSize: size / count,
    flushTail: true
  });

  chunker.on('chunkStart', function(id, done) {
    output = fs.createWriteStream(fileName + "." + id);
    done();
  });

  chunker.on('chunkEnd', function(id, done) {
    output.end();
    if(fs.statSync(output.path).size == 0){
      debugger;
      fs.unlink(output.path, function(err){
        if(err)
          console.log(err);
      });
    }
    done();
  });

  chunker.on('data', function(chunk) {
    if(chunk.data.length)
      output.write(chunk.data);
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

      //debugger;

      var files = fs.readdirSync(path.dirname(basename));

      files = _.filter(files, function(file) {
        return file.indexOf(path.basename(basename) + '.') != -1;
      });

      memo = files.length || 0;

      return memo;

    };

    return getCount;
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
        file.close();
      });

      offset += data.length;

    };
  }

  var getCount = _getFileCount(basename);
  for (var i = 0; i < getCount(); i++) {

    var name = basename + '.' + i;

    if (!fs.existsSync(name)) {
      console.log(name + ' missing :/');
      continue;
    }

    _bouncer.push({
      source: fs.createReadStream(name),
      destination: new through(_onChunk(offset, name))
    });

    offset += fs.statSync(name).size;
  }

};

argv.break = argv.break || argv.b;
argv.join = argv.join || argv.j;

if (argv.break) {
  _break(argv.break, argv.count || 2)
} else if (argv.join) {
  _join(argv.join)
}
