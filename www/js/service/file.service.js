"use strict";


app.service('fileService', function () {

    this.dirEntry = null;
    this.fileEntry = null;
    var self = this;

    function fileSystemValid() {
        if (window.requestFileSystem){
            return true;
        }
        return false;
    }

    function requestFileSystem(onSuccess) {
        console.log('request file system');
        if (!window.requestFileSystem){
            console.log(' file system is not ready');
            return;
        }

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            console.log('file system open: ' + fs.name);
            self.dirEntry = fs.root;
            onSuccess && onSuccess(fs.root);
        }, function (fileError) {
            console.log('request file system error: ' + fileError);
        });
    }

    this.openOrCreateFile = function(fileName, onSuccess) {
        if (!fileSystemValid()){
            return;
        }
        var dirEntry = self.dirEntry;
        if (!dirEntry){
            requestFileSystem(function () {
                self.openOrCreateFile(fileName, onSuccess);
            });
            return;
        }

        // Creates a new file or returns the file if it already exists.
        dirEntry.getFile(fileName, {create: true, exclusive: false}, function(fileEntry) {
            self.fileEntry = fileEntry;
            onSuccess && onSuccess(fileEntry);
        }, function (error) {
            console.log('error create file: ' + error);
        });
    };

    this.writeFile = function(data, isAppend) {
        // Create a FileWriter object for our FileEntry (log.txt).
        if (!fileSystemValid()){
            return;
        }

        var fileEntry = self.fileEntry;
        if (!fileEntry){
            self.openOrCreateFile('log.txt', function (fileEntry) {
                self.writeFile(data, isAppend);
            });
            return;
        }
        fileEntry.createWriter(function (fileWriter) {

            fileWriter.onwriteend = function() {
                console.log("Successful file write:" + data);
            };

            fileWriter.onerror = function (e) {
                console.log("Failed file write: " + e.toString());
            };

            // If we are appending data to file, go to the end of the file.
            if (isAppend) {
                try {
                    fileWriter.seek(fileWriter.length);
                }
                catch (e) {
                    console.log("file doesn't exist!");
                }
            }
            var dataObj = new Blob([data+'\n'], { type: 'text/plain' });
            fileWriter.write(dataObj);
        });
    };

    this.readFile = function() {
        if (!fileSystemValid()){
            return;
        }

        var fileEntry = self.fileEntry;
        if (!fileEntry){
            self.openOrCreateFile('log.txt', function (fileEntry) {
                self.readFile();
            });
            return;
        }
        fileEntry.file(function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
                console.log("Successful file read: " + this.result);
            };

            reader.readAsText(file);

        }, function (error) {
            console.log('read fail error: ' + error);
        });
    };

    this.log = function (message) {
        this.writeFile('[' + new Date().toISOString() + ']: ' + message + '\n');
    };

    requestFileSystem();
});


// app.config(function(fileProviderProvider){
//     fileProviderProvider.init();
// });