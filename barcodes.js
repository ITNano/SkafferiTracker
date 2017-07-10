var http = require('http');
var https = require('https');
var htmlparser = require("htmlparser2");

exports.getDataFromBarcode = function(db, barcode, callback){	
	getBarcodeFromDb(db, barcode, function(results){
		if(!results.error && results.length == 1){
			data = results[0];
			data.error = false;
			data.inDatabase = true;
			callback(data);
		}else{
			getBarcodeDataFromWeb(barcode, [getDabasData, getUPCData], function(result){
				if(result.error){
					callback(result);
				}else{
					if(db){
						addBarcodeToDb(db, barcode, result, callback);
					}else{
						callback(result)
					}
				}
			});
		}
	});
};


function getBarcodeFromDb(db, barcode, callback){
	if(!db){
		callback({error:true, msg:'No database link supplied'});
		return;
	}
	
	db.query('SELECT id AS item_id, product, manufacturer, size, unit FROM items WHERE barcode = ?', [barcode], function(results){
		callback(results);
	});
}

function addBarcodeToDb(db, barcode, data, callback){
	if(!db){
		callback({error:true, msg:'No database link supplied'});
		return;
	}
	
	db.query("INSERT INTO items (id, barcode, product, manufacturer, size, unit) VALUES (NULL, ?, ?, ?, ?, ?)", [barcode, data.product, data.manufacturer, data.size, data.unit], function(results){
		console.log("Added item %s (barcode: %s)", data.product, barcode);
		data['item_id'] = results.insertId;
		callback(data);
	});
}

function getBarcodeDataFromWeb(barcode, webHandlers, callback){
	if(webHandlers.length == 0){
		callback({error:true, msg:'Barcode not found'});
	}else{
		webHandlers[0](barcode, function(result){
			if(result.product.length == 0){
				getBarcodeDataFromWeb(barcode, webHandlers.slice(1), callback);
			}else{
				callback(result);
			}
		});
	}
}

function getDabasData(barcode, callback){
	getDataFromWeb('http://api.dabas.com/DABASService/V2/article/gtin/'+(barcode[0]=='0'?'':'0')+barcode+'/JSON?apikey=8a0ee73a-08e3-49fb-bc2a-c4f0712edb1f', function(response){
		var result = {barcode: barcode, product:'', manufacturer:'', size:0, unit:''};
		if(!response.error){
			var data = JSON.parse(response.data);
			if(data['GTIN']){
				result.product = data['Artikelbenamning'];
				result.manufacturer = data['Varumarke']['Varumarke'];
				setSizeAndUnit(result, data['Storlek']);
			}
		}
		callback(result);
	});
}

function getUPCData(barcode, callback){
	getDataFromWeb('https://www.upcdatabase.com/item/'+barcode, function(response){
		var result = {barcode:barcode, product:'', manufacturer:'', size:0, unit:''};
		if(!response.error){
			var inTable = false;
			var propName = '';
			var mode = -1;
			var parser = new htmlparser.Parser({
				onopentag: function(name, attribs){
					if(name === "table" && attribs['class'] === "data"){
						inTable = true;
					}else if(inTable && name == "tr"){
						mode = -1;
					}else if(inTable && name == "td"){
						mode++;
					}
				},
				ontext: function(text){
					if(mode == 0){
						propName = text;
					}else if(mode == 2){
						if(propName == 'Description'){
							result.product = (result.product+text).trim();
						}else if(propName == 'Size/Weight'){
							if(result.size <= 0){
								setSizeAndUnit(result, text.trim());
							}
						}
					}
				},
				onclosetag: function(tagname){
					if(tagname == "table"){
						inTable = false;
					}
				}
			}, {decodeEntities: true});
			parser.write(response.data);
			parser.end();
		}
		callback(result);
	});
}

function getDataFromWeb(url, callback){
	var data = '';
	var protocol = (url.substring(0, 5) == 'https' ? https : http);
	protocol.get(url, function(res){
		if(res.statusCode == 200){
			res.on('data', function(d){
				data += d;
			});
			res.on('end', function(){
				callback({error:false, data:data});
			});
		}else{
			console.log('Got failure response code: '+res.statusCode+' ['+url+']');
			callback({error:true});
		}
	}).on('error', function(e){
		console.log('Could not fetch web page data: '+e.message);
		callback({error:true});
	});
}

function setSizeAndUnit(container, data){
	console.log('getting : '+data);
	const matches = data.match(/\d+(\.?\d+)?/);
	if(matches){
		container.size = matches[0];
		container.unit = data.replace(container.size, '').trim();
	}else{
		console.log('found no match');
	}
}



