# file-smasher
![alt-text](http://s3.amazonaws.com/rapgenius/Gallagher-smashing-melon-550x378.jpg)

Smash a file into chunks and put it back together!

```
  npm install file-smasher -g
```
## Why?

Ever used a Fat32 storage device?  Ever needed to put something on it larger than 4 gb's? Now you can! Just smash the file into pieces, transfer them to the drive, boom, you're done.

## It is easy to use

``` bash
//smash a file into pieces
smash --break file.iso --count 10 --output tmpDir

//join the file back together
smash --join file.iso
```
##Break Tips
--output is optional.  defaults to /output/ in working directory

##Join Tips
Joining assumes the files are named in the following format (which they are when using the '--break' command):

```
file.iso.0
file.iso.1
file.iso.2
...
file.iso.10
```

Also, if file.iso already exists in the folder with the smashed files, joining will not be allowed.

## License

MIT
