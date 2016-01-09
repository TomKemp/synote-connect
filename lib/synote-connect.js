/*

{
	"synote_connect":{
		input:{
			"module":"synote-connect-panopto-input",
			"server_protocol":"https",
			"server_base":"coursecast.devdomain.soton.ac.uk",
			"userConvert":function(user){
				if(user.provider === "blackboard"){
					return user.blackboard_id;
				}else{
					return false;
				}
			}

		},
		output:{
			"module":"synote-connect-blackboard-output",
			"userConvert":function(user){
				if(user.provider === "blackboard"){
					return user.blackboard_id;
				}else{
					return false;
				}
			}
		}
	}
}

*/

module.exports = function(config){

	var inputConfig = config.input;
	var outputConfig = config.output;

	var result = {};
	result.util = {};

	var initFunctions = [];

	var input;
	var output;

	if(inputConfig){
		input = require("./input")(inputConfig,result.util);

		initFunctions.push(input.init);
		initFunctions.push(function(cb){
			var inputInterface = config.input.interface_imp(input,output);
			input.setAllImp(inputInterface);

			var inputListeners = config.input.listeners(input,output);
			input.addAllListeners(inputListeners);

			return cb();
		});
		result.input = input;
	}

	if(outputConfig){
		if(input){
			output = require("./output")(outputConfig,result.util,input);
		}else{
			output = require("./output")(outputConfig,result.util);
		}
		
		initFunctions.push(output.init);
		initFunctions.push(function(cb){
			var outputImp = config.output.interface_imp(input,output);
			output.setAllImp(outputImp);

			return cb();
		});
		result.output = output;
	}

	var util = config.util(input,output);
	_.assign(result.util,util);
	
	function init(cb){
		async.series(initFunctions,cb);
	}

	result.init = init;


	return result;


};
