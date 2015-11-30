var LogAnalyzer = (function(){

    var _ = require('underscore');
    var jQuery = require('jquery');

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
        return Math.sqrt(sum / (arr.length - 1));
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

        getBookmarkSummary: function(){
            _this.bookmarkSummary = [];
            var initObj = { user: '', totalBookmarks: 0, avgKeywordsPerBM: 0, totalUniqueKeywords: 0 };
            var stats = {
                total: 0,
                mean: 0,
                std: 0,
                userWithBookmarks: 0,
                meanWithoutOutliers: 0,
                stdWithoutOutliers: 0,
                avgKeywordsPerBM: 0,
                stdKeywordsPerBM: 0,
                avgUniqueKeywords: 0,
                stdUniqueKeywords: 0,
            };

//            var stats = { bookmarks: { total: 0, mean: 0, std: 0, meanWithoutOutliers: 0, stdWithoutOutliers: 0 }, keywordsPerBookmark: { total: 0, mean: 0, std: 0 } };

            _this.logFiles.forEach(function(logFile, i){
                var obj =  _.extend({}, initObj, { user: logFile.file });
                var uniqueKwUsed = [];
                var firstBookmarkFlag = false;

//                console.log('********* USER : ' + logFile.file);
                logFile.data.forEach(function(log) {
                    if(log.action === _this.action.documentBookmarked) {
                        obj.totalBookmarks++;
                        obj.avgKeywordsPerBM += log.info.keywords.length;

                        var newUniqueKw = _.difference(log.info.keywords.map(function(k){ return k.term }), uniqueKwUsed);
                        uniqueKwUsed = uniqueKwUsed.concat(newUniqueKw);
                    }
                });
                obj.avgKeywordsPerBM = (obj.avgKeywordsPerBM / obj.totalBookmarks) || 0;
                obj.totalUniqueKeywords += uniqueKwUsed.length;
                _this.bookmarkSummary.push(obj);

                stats.total += obj.totalBookmarks;
                stats.userWithBookmarks = obj.totalBookmarks > 0 ? stats.userWithBookmarks + 1 : stats.userWithBookmarks;
                stats.avgKeywordsPerBM += obj.avgKeywordsPerBM;
                stats.avgUniqueKeywords += obj.totalUniqueKeywords;
            });

            stats.mean = Math.roundTo(stats.total / _this.logFiles.length, 2);
            stats.std = Math.round(getStdv(_this.bookmarkSummary.map(function(d){ return d.totalBookmarks }), stats.mean), 2);
            stats.meanWithoutOutliers = Math.roundTo(stats.total / stats.userWithBookmarks, 2);
            stats.stdWithoutOutliers = Math.roundTo(getStdv(_this.bookmarkSummary.map(function(d){ return d.totalBookmarks }).filter(function(n){ return n > 0 }), stats.meanWithoutOutliers), 2);
            stats.avgKeywordsPerBM = Math.roundTo(stats.avgKeywordsPerBM / stats.userWithBookmarks, 2);
            stats.stdKeywordsPerBM = Math.roundTo(getStdv(_this.bookmarkSummary.map(function(d){ return d.avgKeywordsPerBM }).filter(function(n){ return n > 0 }), stats.avgKeywordsPerBM), 2);
            stats.avgUniqueKeywords = Math.roundTo(stats.avgUniqueKeywords / stats.userWithBookmarks, 2);
            stats.stdUniqueKeywords = Math.roundTo(getStdv(_this.bookmarkSummary.map(function(d){ return d.totalUniqueKeywords }).filter(function(n){ return n > 0 }), stats.avgUniqueKeywords), 2);
//            console.log(_this.bookmarkSummary);
            console.log(stats);
            return _this.bookmarkSummary;


        },

        getBeforeAndAfterFirstBookmarkStats: function(){

            var stats = {
                userWithBookmarks: 0,
                meanWithoutOutliers: 0,
                stdWithoutOutliers: 0,
                avgKeywordsPerBM: 0,
                stdKeywordsPerBM: 0,
                avgUniqueKeywords: 0,
                stdUniqueKeywords: 0,
                updatesBeforeFirstBM: 0,
                simpleTagDropsBeforeFirstBM: 0,
                multiTagDropsBeforeFirstBM: 0,
                weightChangesBeforeFirstBM: 0,
                tagDeletionsBeforeFirstBM: 0,
                simpleTagDropsAfterFirstBM: 0,
                multiTagDropsAfterFirstBM: 0,
                weightChangesAfterFirstBM: 0,
                tagDeletionsAfterFirstBM: 0
            };



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
