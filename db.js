/************** DOCS **********************
**	Simple database wrapper in order to	 **
**	make life easier when applying a db	 **
**	query.							   	 **
******************************************/ 

var mysql = require('mysql')
var connection;

exports.connect = function(host, user, pw, db){
	connection = mysql.createConnection({
	  host     : host,
	  user     : user,
	  password : pw,
	  database : db
	});
	connection.connect()
}

exports.query = function(query, data, callback){
	connection.query(query, data, function(error, results, fields){
		if(error) throw error;
		callback(results);
	});
}

exports.disconnect = function(){
	connection.end();
}