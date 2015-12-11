var LogAnalyzer = (function(){

    var _ = require('lodash');
    var jQuery = require('jquery');
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
        this.logFilesDict = {};
    }

    function getDescStats(arr, withoutZeros) {
        withoutZeros = withoutZeros || false;

        var total = arr.reduce(function(prev, current){ return prev + current }, 0);
        var mean = _.round(parseFloat(total / arr.length), 2);
        var squares = arr.reduce(function(prev, current){ return prev + Math.pow((current - mean), 2) }, 0);
        var std = _.round(Math.sqrt(squares / (arr.length - 1)), 2);
        var res =  { total: total, mean: mean, std: std, N: arr.length };
        if(withoutZeros) {
            arr = arr.filter(function(a){ return a > 0 });
            res['mean-WoZeros'] = _.round(parseFloat(total / arr.length), 2);
            squares = arr.reduce(function(prev, current){ return prev + Math.pow((current - res['mean-WoZeros']), 2) }, 0);
            res['std-WoZeros'] = _.round(Math.sqrt(squares / (arr.length - 1)), 2);
            res['N-WoZeros'] = arr.length;
        }
        return res;
    }

    function prettifyMilliseconds(millis) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }



    LogAnalyzer.prototype = {

        load: function(logs) {
            this.logFiles.push({
                file: logs.file || 'no-file',
                name: logs.name || 'no-name',
                data: logs.data || []
            });
            this.logFilesDict[logs.name] = { index: _this.logFiles.length - 1, file: logs.file, data: logs.data };
            return this;
        },

        fixLogs: function(name){
            var currentKeywords = [];
            var fixedData = [];
            var funcs = {};
            funcs[_this.action.tagDropped] = function(log) {
                currentKeywords.push(log.info);
            };
            funcs[_this.action.tagDeleted] = function(log) {
                var index = _.findIndex(currentKeywords, function(k){ return k.term === log.info.term });
                currentKeywords.splice(index, 1);
            };
            funcs[_this.action.tagWeightChanged] = function(log){
                var index = _.findIndex(currentKeywords, function(k){ return k.term === log.info.term });
                currentKeywords[index].weight = log.info.weight;
            }
            funcs[_this.action.multipleTagsDropped] = function(log) {
                log.info.forEach(function(k){ currentKeywords.push(k) });
            };

            _this.logFilesDict[name].data.forEach(function(log, i, dict){
                if(funcs[log.action]) {
                    funcs[log.action](log);
                } else {
                    if(log.action === _this.action.documentBookmarked) {
                        log.info.keywords = _.slice(currentKeywords);
                    }
                }
                fixedData.push(log);
            });
            _this.logFilesDict[name].data = fixedData;
            _this.logFiles[_this.logFilesDict[name].index].data = fixedData;
        },


        getLogList: function(name){

            function getFormatedDate(timestamp) {
                var date = new Date(parseInt(timestamp));
                var hours = date.getHours();
                var minutes = date.getMinutes();
                var seconds = date.getSeconds();
                var ampm = hours >= 12 ? 'pm' : 'am';
                //hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                minutes = minutes < 10 ? '0'+minutes : minutes;
                seconds = seconds < 10 ? '0'+seconds : seconds;
                var strTime = hours + ':' + minutes + ':' + seconds;// + ' ' + ampm;
                return date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear() + " " + strTime;
            }

            var actionsOfInterest = [this.action.topicSelected, this.action.tagDropped, this.action.multipleTagsDropped, this.action.tagWeightChanged, this.action.tagDeleted, this.action.documentBookmarked ];
            var list = [];
            var totBookmarks = 0;
            var funcs = {};
            funcs[_this.action.topicSelected] = function(log){ return log.action + ': ' + log.info.topic; };
            funcs[_this.action.tagDropped] = function(log) { return log.action + ' (' + log.info.term + ')'; };
            funcs[_this.action.tagDeleted] = function(log) { return log.action + ' (' + log.info.term + ')'; };
            funcs[_this.action.tagWeightChanged] = function(log){ return log.action + ' (' + log.info.term + ': ' + log.info.weight + ')'; }
            funcs[_this.action.multipleTagsDropped] = function(log) {
                var str = log.action + ' (';
                log.info.forEach(function(k){ str += k.term + ', '; });
                return str.substr(0, str.length - 2) + ')';
            };
            funcs[_this.action.documentBookmarked] = function(log){
                var str = log.action + ': bookmark#' + (++totBookmarks) + ' (';
                log.info.keywords.forEach(function(k){ str += k.term + ', ' });
                return str.substr(0, str.length - 2) + ')';
            };

            _this.logFilesDict[name].data.forEach(function(log){
                if(actionsOfInterest.indexOf(log.action) > -1) {
                    list.push(getFormatedDate(log.timestamp) + ' --> ' + funcs[log.action](log));
                }
            });
            return list;
        },

        getFullLogs: function(){
            return this.logFiles;
        },

        // processing

        getActionSummary: function(){
            var userActionInit = { user: '' }, userActionsArray = [];
            Object.keys(_this.action).forEach(function(actionKey){
                //actionSummary[_this.action[actionKey]] = { desc: _this.action[actionKey], total: 0, mean: 0, std: 0 };
                userActionInit[_this.action[actionKey]] = 0;
            });

            // counts actions by type and fills array useractionsArray, where each i = 1 user
            _this.logFiles.forEach(function(logFile, i){
                var user = logFile.name;
                var userActions = _.extend({}, userActionInit);
                userActions.user = user;

                logFile.data.forEach(function(log){ userActions[log.action]++; });
                userActionsArray.push(userActions);
            });

            // Obtain desriptive stats for each action type
            var actionSummary = {};
            Object.keys(_this.action).forEach(function(actionKey){
                var action = _this.action[actionKey];
                var descStats = getDescStats(userActionsArray.map(function(userActions){ return userActions[action] }), true);
                actionSummary[action] = _.extend({ desc: action }, descStats);
            });

            //  statKeys = keys of first object in actions
            var statKeys = _.keys(actionSummary[_.keys(actionSummary)[0]]);
            statKeys.forEach(function(statKey){
                if(statKey !== 'desc') {
                    userActionsArray.push({ user: statKey });
                    Object.keys(actionSummary).forEach(function(action){
                        userActionsArray[userActionsArray.length - 1][action] = actionSummary[action][statKey];
                    });
                }
            });

            return { long: userActionsArray, short: actionSummary };
        },

        getBookmarkSummary: function(){
            var bookmarkSummary = [];
            var initObj = { user: '', bookmarks: 0, keywordsPerBookmark: 0, uniqueKeywordsUsed: 0 };
            var stats = {
                bookmarks: {},
                keywordsPerBookmark: {},
                uniqueKeywordsUsed: {},
            };

            _this.logFiles.forEach(function(logFile, i){
                var obj =  _.extend({}, initObj, { user: logFile.name });
                var uniqueKwUsed = [];

                logFile.data.forEach(function(log) {
                    if(log.action === _this.action.documentBookmarked) {
                        obj.bookmarks++;
                        obj.keywordsPerBookmark += log.info.keywords.length;
                        var newUniqueKw = _.difference(log.info.keywords.map(function(k){ return k.term }), uniqueKwUsed);
                        uniqueKwUsed = uniqueKwUsed.concat(newUniqueKw);
                    }
                });
                obj.keywordsPerBookmark = _.round(parseFloat(obj.keywordsPerBookmark / obj.bookmarks), 2) || 0;
                obj.uniqueKeywordsUsed = uniqueKwUsed.length;
                bookmarkSummary.push(obj);
            });

            _.keys(stats).forEach(function(feature){
                stats[feature] = _.extend({ desc: feature }, getDescStats(bookmarkSummary.map(function(d){ return d[feature] }), true));
            });

            var statKeys = _.keys(stats.bookmarks);
            statKeys.forEach(function(statKey){
                if(statKey !== 'desc') {
                    bookmarkSummary.push({ user: statKey });
                    Object.keys(stats).forEach(function(feature){
                        bookmarkSummary[bookmarkSummary.length - 1][feature] = stats[feature][statKey];
                    });
                }
            });
            return {long: bookmarkSummary, short: stats };
        },


        getInterBookmarkStats: function(maxBookmarks){

            maxBookmarks = maxBookmarks || 2;
            var updateActions = [ _this.action.tagDropped, _this.action.multipleTagsDropped, _this.action.tagWeightChanged, _this.action.tagDeleted ];
            var actionCounterInit = {};
            updateActions.forEach(function(action){ actionCounterInit[action] = 0 });
            var interBookmarkStats = [];

            _this.logFiles.forEach(function(logFile){
                var file = logFile.name;
                var actionCount = _.merge({}, actionCounterInit);
                var actionTotalCount = _.merge({}, actionCounterInit);
                var bmCount = 0;
                var timeInit = parseInt(logFile.data[0].timestamp),
                    timeElapsed = 0;

                logFile.data.forEach(function(log){
                    // if is action of interest, count
                    if(updateActions.indexOf(log.action) > -1) {
                        actionCount[log.action]++;
                        actionCount[log.action];
                        actionTotalCount[log.action]++;
                    } else {
                        // Only keep records of users that bookmarked at leats one document
                        if(log.action === _this.action.documentBookmarked && bmCount < maxBookmarks) {
                            var timeElapsed = parseInt(log.timestamp) - timeInit;
                            // insert row for action up to current bookmark
                            var obj = { file: file, numBookmarks: bmCount, elapsedTime: timeElapsed, elapsedTimePretty: prettifyMilliseconds(timeElapsed) };
                            interBookmarkStats.push(_.merge(obj, actionCount));
                            timeInit = parseInt(log.timestamp);
                            bmCount++;
                            actionCount = _.merge({}, actionCounterInit);   // reset actionCount
                        }
                    }
                });

                if(bmCount > 0) {
                    timeElapsed = parseInt(logFile.data[logFile.data.length - 1].timestamp) - timeInit;
                    var obj = { file: file, numBookmarks: bmCount, elapsedTime: timeElapsed, elapsedTimePretty: prettifyMilliseconds(timeElapsed) };
                    interBookmarkStats.push(_.merge(obj, actionCount));      // insert last bookmark row
                    timeElapsed = parseInt(logFile.data[logFile.data.length - 1].timestamp) - parseInt(logFile.data[0].timestamp);
                    var obj = { file: file, numBookmarks: bmCount, elapsedTime: timeElapsed, elapsedTimePretty: prettifyMilliseconds(timeElapsed) };
                    interBookmarkStats.push(_.merge(obj, actionTotalCount)); // insert total count
                }
            });
            return interBookmarkStats;
        }
    };

    module.exports = new LogAnalyzer();

})();
