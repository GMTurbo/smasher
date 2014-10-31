var fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.args.slice(2)),
  StreamBouncer = require('stream-bouncer'),
  chunkingStreams = require('chunking-streams'),
  SizeChunker = chunkingStreams.SizeChunker;


var _break = function(fileName, count) {

  var source = fs.createReadStream(fileName),
    counter = 0;


  var chunker = new SizeChunker({
    chunkSize: count,
    flushTail: true
  });

  var _savetoDisk = function(filename, buffer, fileSuffix) {
    var name = filename + "." + fileSuffix;
    fs.writeFile(name, chunk, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log(path.basename(name) + " saved.");
      }
    });
  };

  chunker.on('data', function(chunk) {
    _savetoDisk(fileName, chunk, counter++);
  });

  _bouncer.push({
    source: source,
    destination: chunker
  });

};

var _join = function() {

};

argv.break = argv.break || argv.b;
argv.join = argv.join || argv.j;

if (argv.break) {
  _break(argv.break, argv.count || 2)
} else if (argv.join) {
  _join(argv.join)
}
