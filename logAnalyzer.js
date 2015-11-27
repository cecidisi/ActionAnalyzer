var LogAnalyzer = (function(){

    var _ = require('underscore');

    if(!Math.roundTo)
        Math.roundTo = function(value, places) { return +(Math.round(value + "e+" + places)  + "e-" + places); }

    var _this;

    function LogAnalyzer(){
        _this = this;
        this.action = {
            // urank
            tagHovered: 'tag hovered',
            tagClicked: 'tag clicked',
            tagDropped: 'tag dropped',
            multipleTagsDropped: 'multiple tags dropped',
            tagWeightChanged: 'tag weight changed',
            tagDeleted: 'tag deleted',
            documentClicked: 'document clicked',
            documentBookmarked: 'document bookmarked',
            documentUnbookmarked: 'document unbookmarked',
            documentWatched: 'document watched',
            documentUnwatched: 'document unwatched',
            frequencyChanged: 'frequency range changed',
            wordSearched: 'keyword searched',
            reset: 'reset',
            // misc
            ipLogged: 'IP logged',
            topicSelected: 'topic selected'
        };
        this.logFiles = [];
    }

    function getStdv(arr, mean) {
        var sum = 0;
        arr.forEach(function(a){
            sum += Math.pow((a - mean), 2);
        });
        return Math.sqrt(sum / arr.length);
    }

    LogAnalyzer.prototype = {

        load: function(logs) {
            this.logFiles.push({
                file: logs.file || 'no-file',
                data: logs.data || []
            });
            return 'File '+logs.file+' loaded';
        },

        getActionSummary: function(){
            var actionSummary = {}, userActionInit = { user: '' }, userActionsArray = [];
            Object.keys(_this.action).forEach(function(actionKey){
                actionSummary[_this.action[actionKey]] = { desc: _this.action[actionKey], total: 0, mean: 0, std: 0 };
                userActionInit[_this.action[actionKey]] = 0;
            });

            _this.logFiles.forEach(function(logFile, i){
                var user = (i+1) < 10 ? 'user_0'+(i+1) : 'user_'+(i+1);
                var userActions = _.extend({}, userActionInit);
                userActions.user = user;

                logFile.data.forEach(function(log){
                    actionSummary[log.action].total++;
                    userActions[log.action]++;
                });
                userActionsArray.push(userActions);
            });

            Object.keys(actionSummary).forEach(function(action){
                actionSummary[action].mean = Math.roundTo(parseFloat(actionSummary[action].total / _this.logFiles.length), 2),
                actionSummary[action].std = Math.roundTo(getStdv(userActionsArray.map(function(userActions){ return userActions[action] }), actionSummary[action].mean), 2)
            });

            userActionsArray.push({ user: 'total' });
            userActionsArray.push({ user: 'mean' });
            userActionsArray.push({ user: 'std' });
            Object.keys(actionSummary).forEach(function(action){
                userActionsArray[userActionsArray.length - 3][action] = actionSummary[action].total;
                userActionsArray[userActionsArray.length - 2][action] = actionSummary[action].mean;
                userActionsArray[userActionsArray.length - 1][action] = actionSummary[action].std;
            });

            return userActionsArray;
        },



        getActionCount: function(){

            var logFiles = [];
            for(var i=1; i<=16; ++i)
                logFiles.push('test-'+i+'.json');


            var actionCount = {}, actionsByUser = [], logStats = {}, logStatsArray = [], loadedFiles = 0;
            Object.keys(_this.action).forEach(function(action){
                var a = _this.action[action];
                actionCount[a] = Array.apply(null, Array(logFiles.length)).map(Number.prototype.valueOf,0);;
            });
            logFiles.forEach(function(file, i){
                actionsByUser.push({ user: (i+1), file: file});
            });

            $.when(
                logFiles.forEach(function(file, i){
                    $.getJSON('./logs/' + file, function(logs){
                        logs.forEach(function(log, j){
                            actionCount[log.action][i]++;
                        });

                        loadedFiles++;

                        if(loadedFiles === logFiles.length) {
                            Object.keys(actionCount).forEach(function(a){
                                logStats[a] = {};
                                logStats[a].total = actionCount[a].reduce(function(previous, current){ return previous+current }, 0);
                                logStats[a].mean = Math.roundTo(logStats[a].total / logFiles.length, 2);
                                logStats[a].std = Math.roundTo(getStdv(actionCount[a], logStats[a].mean), 2);

                                logStatsArray.push({
                                    action: a,
                                    total: logStats[a].total,
                                    mean: logStats[a].mean,
                                    std: logStats[a].std
                                });

                                for(i=0; i<logFiles.length;i++) {
                                    actionsByUser[i][a] = actionCount[a][i];
                                }
                            });
//                            console.log('LOG STATS');
//                            console.log(logStats);
                            console.log('LOG STATS ARRAY');
                            console.log(logStatsArray);
                            console.log(JSON.stringify(logStatsArray));
                            console.log('LOG STATS BY USER');
                            console.log(actionsByUser);
                            console.log(JSON.stringify(actionsByUser));
                        }
                    })
                })

            ).then(function(){
//                console.log('Action Count');
//                console.log(actionCount);
            });

        },
        getActionCountByUser: function(){


        },
        getFullLogs: function(){
            return this.logFiles;
        },
        saveLogs: function(path){


        }
    };
    module.exports = new LogAnalyzer();
})();


/*
    function(){};

LogAnalyzer.prototype.action = function(){

    console.log('analyzer');
};

module.exports = new LogAnalyzer();
*/
