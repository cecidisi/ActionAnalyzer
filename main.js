
var glob = require('glob');
var fs = require('fs');
var _ = require('underscore');
var logAnalyzer = require('./logAnalyzer.js');


function getCsv(arr) {
    var keys = _.keys(arr[0]),
        csv = keys.join(',') + '\n';

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
//    var summary = logAnalyzer.getActionSummary();
//    console.log('Writing summary');
//    writeFile('actions summary.csv', getCsv(summary));

    logAnalyzer.getBookmarkSummary();

}



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
//                    console.log(logAnalyzer.load({ file: file, data: JSON.parse(data) }));
                    logAnalyzer.load({ file: file, data: JSON.parse(data) });
                    loadedFiles++;
                    if(loadedFiles == files.length)
                        process();
                }
            });
        });
    }
});

