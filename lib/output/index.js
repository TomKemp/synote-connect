
var Handlebars = require("handlebars");
var _ = require("lodash");



module.exports = function(outputConfig,util,input){

	var implFunctions = {};

	//TODO: check permissions
	var funcs = {
		convertToOutputUser : function(){
			return implFunctions.convertToOutputUser.apply(this,arguments);
		},
		convertFromOutputUser : function(){
			return implFunctions.convertFromOutputUser.apply(this,arguments);
		},
		getCourseContents : function(courseId,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){
				implFunctions.getCourseContents(courseId,synoteUser,function(err,recordings){
					if(recordings === null){
						//Course not configured
						return cb(null,null);
					}

					var cloned = _.cloneDeep(recordings);
					util.canViewRecordings(cloned,synoteUser,function(err,permissions){
						if(err){
							return cb(err);
						}

						var permittedIds = [];

						_.forEach(permissions,function(rec){
							if(rec.canView && rec.canView === true){
								permittedIds.push(rec.inputId);
							}
						});

						var permissionFiltered = _.filter(recordings,function(rec){
							return _.includes(permittedIds,rec.inputId);
						});

						cb(null,permissionFiltered);
					});
				});
			});
		},
		getMappings : function(courseId,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){
				return implFunctions.getMappings(courseId,synoteUser,cb);
			});
		},
		createMapping : function(courseId,collectionId,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){

				input.getCollectionDetails(collectionId,synoteUser,function(err,collectionObj){
                    if(err){
                      return cb(err);
                    }

					implFunctions.createMapping(courseId,collectionObj,synoteUser,function(err, result){
						if(err){
							return cb(err);
						}
						input.trackCollection(collectionId,synoteUser,function(err,success){
	                      if(err){
	                        return cb(err);
	                      }
	                      return cb(null,result); 
	                    });
	                     
	                });

				});
			});
		},
		deleteMapping : function(courseId,collectionId,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){

				
					implFunctions.deleteMapping(courseId,collectionId,synoteUser,function(err, result){
						if(err){
							return cb(err);
						}
						//TODO: Untrack from input
	                    cb(null,result);
	                });

				
			});
		},
		configureCourse : function(details,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){
				return implFunctions.configureCourse(details,outputUser,cb);
			});
		},
		isSuggestedCollection : function(){
			return implFunctions.isSuggestedCollection.apply(this,arguments);
		},
		getPossibleMappings : function(courseId,outputUser,cb){
			funcs.convertFromOutputUser(outputUser,function(synoteUser){
				input.getUserCreatorCollections(synoteUser,function(err,response){
	              if(err){
	                return cb(err);
	              }

	              var result = {};
	              result.collections = response;

	              funcs.getMappings(courseId,outputUser,function(err,mappings){
	              	if(err){
	              		return cb(err);
	              	}

	              	var alreadyIds = _.pluck(mappings, 'inputId');
	              	result.suggested = _.filter(response,function(result){
	              		return funcs.isSuggestedCollection(result,courseId) && !(_.includes(alreadyIds,result.inputId));
	              	});
	              	
	              	result.current = mappings;

	              	return cb(null,result);

	              });

	            });
			});
		}
	}

	var outputModule = require(outputConfig.module)(outputConfig,funcs,input);
	var outputInternalConfig = outputModule.config;
	var routes = outputModule.routes;

	function init(cb){
		return outputModule.init(cb);
	}

	function setAllImp(funcArray){
		_.assign(implFunctions,funcArray);
	}

	function alertStudents(courseId,templateObject,fields,cb){
		var titleInput = templateObject.title;
		var bodyInput = templateObject.body;

		var titleTemplate = Handlebars.compile(titleInput);
		var title = titleTemplate(fields);

		var bodyTemplate = Handlebars.compile(bodyInput);
		var body = bodyTemplate(fields);

		var output = {
			title:title,
			body:body
		};

		return outputModule.alertStudents(courseId,output,cb);
	}


	function getUserAccessDetails(synoteUser,cb){
		funcs.convertToOutputUser(synoteUser,function(outputUser){
			return outputModule.getUserAccessDetails(outputUser,cb);
		});
	}

	function canViewByCourse(recordings,synoteUser,cb){
		funcs.convertToOutputUser(synoteUser,function(outputUser){
			return outputModule.canViewByCourse(recordings,outputUser,cb);
		});
	}

	var output = {
		alertStudents : alertStudents,
		getUserAccessDetails : getUserAccessDetails,
		canViewByCourse : canViewByCourse,
		setAllImp : setAllImp,
		routes : routes,
		init : init,
		util : funcs
	}

	//return _.assign(output,funcs);
	return output;
}