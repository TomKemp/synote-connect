
var _ = require("lodash");


module.exports = function(config,inputInterface,storage){

	var polling;

	function init(cb){
		polling = setInterval(checkForChanges, config.poll_rate*1000);
		return cb();
	}

	var listeners = {
		newRecording : [],
		removeRecording : [],
		pollingError :[],
		pollingSuccess :[]
	}

	function addListener(name,func){
		if(_.has(listeners,name)){
			if(_.isArray(func)){
				listeners[name] = listeners[name].concat(func);
			}else{
				listeners[name].push(func);
			}
		}
	}

	function informListeners(name){
		console.log("Inform:"+name);
		var obj = this;
		if(_.has(listeners,name)){
			//Remove first argument
			var args = _.values(arguments);
			args.shift();
			console.log(args);
			var list = listeners[name];
			console.log(list);
			async.nextTick(function(){
   				_.forEach(list,function(func){
					func.apply(obj,args);
				});
			});
			
		}
	}

	function possibleListeners(){
		return _.keys(listeners);
	}
 
	function findById(array,id){
		return _.find(array, {inputId:id});
	}

	function toIdList(array){
		return _.map(array,function(element){
			return element.inputId;
		});
	}


	function checkForChanges(){
		console.log("Checking for changes");

		storage.getTrackedCollections(function(err,trackedCollections){
			if(err){
				console.log("ERR");
				console.log(err);
				return;
			}

			var trackedIds = toIdList(trackedCollections);
		
			if(trackedIds.length === 0){
				console.log("NONE");
				return;
			}

			var wait = 0;
			var increment = 10;

			_.forEach(trackedIds,function(id){
				console.log("loop");
				setTimeout(function(){
					inputInterface.getCollectionContents(id,function(err,collection){
						if(err){
							return informListeners("pollingError",id);
						}

						informListeners("pollingSuccess",id);

						var previousContents = findById(trackedCollections,id).knownRecordings;
						var currentContents = toIdList(collection.recordings);

						console.log("Before");
						console.log(previousContents);
						console.log("After");
						console.log(currentContents);

						var added = _.difference(currentContents,previousContents);
						var removed = _.difference(previousContents,currentContents);

						var allAdded = _.filter(collection.recordings,function(recording){
							return  _.includes(added,recording.inputId);
						});

						storage.updateTrackedCollection(id,currentContents,function(err,done){
							if(err){
								return;
							}

							if(allAdded.length > 0){
								informListeners("newRecording",id,allAdded);
							}
							
							if(removed.length >0){
								informListeners("removeRecording",id,removed);
							}
						});

					});
				},wait);
				wait += increment;
			});

		});
		

		/*
		//TODO: What if tracked is deleted?
		inputInterface.getCollectionContents(trackedIds,function(err,results){
			if(err){
				throw "Error getting collection contents"
			}

			var toRetrieve = [];
			var changes = {};

			_.forEach(results,function(value){
				var previousContents = findById(trackedCollections,value.id).recordings;
				var currentContents = value.recordings;

				console.log("Previous");
				console.log(previousContents);

				console.log("Current");
				console.log(currentContents);

				var added = _.difference(currentContents,previousContents);
				var removed = _.difference(previousContents,currentContents);



				changes[value.id] = {};
				changes[value.id].added = added;
				changes[value.id].removed = removed;
				_.merge(toRetrieve,added);

				storage.updateTrackedCollection(value.id,currentContents);

			});

			if(toRetrieve.length === 0){
				return;
			}

			//Only want one call if possible
			inputInterface.getRecordings(toRetrieve,function(err,result){
				if(err){
					return cb(err);
				}
				_.forEach(changes,function(value,id){
					var allAdded = _.filter(result, function(recording){
						return _.includes(value.added,recording.id);
					});
					
					
				});
			})

			*/	

			

			/*
			[
				{
					"id":"ab-cd-ed",
					"name":"COMP1234",
					"description":"This is a description",
					"recordings":[
						{
							"id":"de-fg-hi",
							"name":"This is the name",
							"creator":""
						},
						{
		
						}
					]
				}
			]
			

		});
		*/


		//loop through each tracked folder
		//Get list of recordings
		//Sort by id
		//Find which recordings have been added or removed - using _.difference
		//Call method to inform 
	}


	return{
		stopPolling : function(){
			clearInterval(polling);
		},
		informListeners : informListeners,
		addListener : addListener,
		possibleListeners : possibleListeners,
		init : init
	}



}

