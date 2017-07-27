var db = require('./db');
db.connect('localhost', 'skafferi', 'CHANGE_THIS_TO_YOUR_PASSWORD', 'skafferi');
var barcodes = require('./barcodes');
var dateformat = require('dateformat');

exports.getAvailablePlaces = function(callback){
	db.query("SELECT name, img FROM places", [], callback);
};

exports.getAvailableStashes = function(place, callback){
	db.query("SELECT count(id) AS count FROM places WHERE name = ?", [place], function(results){
		if(results[0]["count"] > 0){
			db.query("SELECT S.name, S.img FROM stashes S LEFT JOIN places P ON P.name = ? WHERE P.id = S.place_id", [place], callback);
		}else{
			callback({error: true, msg: "The given place does not exist"});
		}
	});
};

exports.getAvailableItems = function(place, stash, callback){
	db.query("SELECT count(S.id) AS count FROM stashes S LEFT JOIN places P ON P.id = S.place_id WHERE P.name = ? AND S.name = ?", [place, stash], function(results){
		if(results[0]["count"] > 0){
			db.query("SELECT S.name AS stash, P.name AS place, I.product AS product, I.manufacturer AS manufacturer, I.unit AS unit, SUM(I.size*IF(E.action = 'add', E.amount, -E.amount)) AS amount FROM events E LEFT JOIN items I ON I.id = E.item_id LEFT JOIN places P ON P.name = ? LEFT JOIN stashes S ON S.name = ? AND S.place_id = P.id WHERE E.stash_id = S.id GROUP BY I.id", [place, stash], callback);
		}else{
			callback({error: true, msg: "The given stash does not exist"});
		}
	});
};

exports.searchItemAvailability = function(searchword, callback){
	searchword = '%'+searchword+'%';
	db.query("SELECT S.name AS stash, P.name AS place, I.product AS product, SUM(I.size*IF(E.action = 'add', E.amount, -E.amount)) AS amount, I.unit AS unit FROM events E LEFT JOIN items I ON I.id = E.item_id LEFT JOIN stashes S ON S.id = E.stash_id LEFT JOIN places P ON P.id = S.place_id WHERE I.product LIKE ? OR I.manufacturer LIKE ? ORDER BY P.name ASC, S.name ASC", [searchword, searchword], callback);
};

exports.addPlace = function(name, imgPath, callback){
	db.query("INSERT INTO places (id, name, img) VALUES (NULL, ?, ?)", [name, imgPath], callback);
};

exports.addStash = function(place, name, imgPath, callback){
	db.query("INSERT INTO stashes (id, place_id, name, img) VALUES (NULL, (SELECT id FROM places WHERE name = ? LIMIT 1), ?, ?)", [place, name, imgPath], callback);
};

exports.addEventByBarcode = function(place, stash, action, barcode, amount, callback){
	barcodes.getDataFromBarcode(db, barcode, function(result){
		if(!result.error){
			addEvent(place, stash, action, result['item_id'], amount, function(queryresult){
				callback({error:false, product:result.product, size:result.size, unit:result.unit, amount:amount});
			});
		}else{
			callback(result);
		}
	});
};

exports.addEventByManual = function(place, stash, action, barcode, product, manufacturer, size, unit, amount, callback){
	barcodes.getDataFromBarcode(db, barcode, function(result){
		if(!result.error){
			callback({error:true, msg:"Barcode already exists in DB!"});
		}else{
			db.query("INSERT INTO items (id, barcode, product, manufacturer, size, unit) VALUES (NULL, ?, ?, ?, ?, ?)", [barcode, product, manufacturer, size, unit], function(results){
				addEvent(place, stash, action, results.insertId, amount, function(result){
					callback({error:false, product: product, size:size, unit:unit, amount:amount});
				});
			});
		}
	});
};

function addEvent(place, stash, action, item_id, amount, callback){
	var date = dateformat(new Date(), "YYYY-mm-dd HH:MM:ss");
	db.query("INSERT INTO events (id, action, item_id, stash_id, amount, created) VALUES (NULL, ?, ?, (SELECT S.id FROM stashes S LEFT JOIN places P ON P.name = ? WHERE S.name = ? AND S.place_id = P.id), ?, ?)", [action, item_id, place, stash, amount, date], callback);
}