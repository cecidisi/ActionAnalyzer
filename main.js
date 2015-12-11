
var glob = require('glob');
var fs = require('fs');
var fsSync = require('fs-sync');
var _ = require('lodash');
var logAnalyzer = require('./logAnalyzer');


function getCsv(arr) {
    if(!Array.isArray(arr)) {
        var obj = arr;
        arr = [];
        Object.keys(obj).forEach(function(i){ arr.push(obj[i]) });
    }
    var keys = _.keys(arr[0]);
    var csv = keys.join(',') + '\n';
    arr.forEach(function(a){
        var values = [];
        keys.forEach(function(key){ values.push(a[key]); });
        csv += values.join(',') + '\n';
    });
    return csv;
}

function writeFile(fileName, data){
    fs.writeFile('./results/'+fileName, data, { flags: 'w' }, function(err){
        if(err) {
            return console.log('Error writing file --> ', err);
        }
    });
}


function process() {
//    var actionSummary = logAnalyzer.getActionSummary();
//    console.log('Writing --> "Action Summary"');
//    writeFile('Actions Summary SHORT.csv', getCsv(actionSummary.short));
//    writeFile('Actions Summary LONG.csv', getCsv(actionSummary.long));
//
//    var bookmarksSummary = logAnalyzer.getBookmarkSummary();
//    console.log('Writing --> "Bookmarks Summary"');
//    writeFile('Bookmarks Summary SHORT.csv', getCsv(bookmarksSummary.short));
//    writeFile('Bookmarks Summary LONG.csv', getCsv(bookmarksSummary.long));
//
//
//    var beforeandAfterStats = logAnalyzer.getBeforeAndAfterFirstBookmarkStats();
//    console.log('Writing --> "Before and After 1st Bookmark Summary"');
//    writeFile('Before and After 1st Bookmark Summary.csv', getCsv(beforeandAfterStats));

    var maxBookmarks = 3;
    var aux =  logAnalyzer.getInterBookmarkStats(maxBookmarks);
    console.log('Writing --> "Inter-bookmark Stats (maxBookmarks = ' + maxBookmarks + ')"');
    writeFile('Inter-bookmark Stats (maxBookmarks = ' + maxBookmarks + ').csv', getCsv(aux));


}

fsSync.mkdir('results', function(err){
    if(err) console.log('Cannot create folder --> ', err);
    else console.log('Folder created');
});
fsSync.mkdir('txt', function(err){
    if(err) console.log('Cannot create folder --> ', err);
    else console.log('Folder created');
});


var loadedFiles = 0;

glob('logs/*.json', function(err, files) {
    if(err) {
        console.log('Error reading file, something wrong with glob --> ', err);
    }
    else {
        files.forEach(function(file){
            fs.readFile(file, 'utf-8', function(err, data){
                if(err){
                    console.log('Something wrong with the file --> ', err);
                }
                else {
                    console.log('Loading file --> ' + file);
                    var name = file.replace('logs/', '').replace('.json', '');
                    logAnalyzer.load({ file: file, name: name, data: JSON.parse(data) }).fixLogs(name);

                    var logList = logAnalyzer.getLogList(name).join('\n');
                    console.log('Writing .txt with logs of interest --> ' + name);
                    fs.writeFile('./txt/'+name+'.txt', logList, { flags: 'write' }, function(err){
                        if(err) { console.log('Cannot write .txt file --> ', err); }
                    });

                    loadedFiles++;
                    if(loadedFiles == files.length)
                        process();
                }
            });
        });
    }
});

