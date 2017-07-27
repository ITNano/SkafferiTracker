var express = require('express'), http = require('http');
var app = express();
var httpServer = http.createServer(app);

var api = require('./skafferi');
var crypto = require("crypto"), fs = require('fs');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

var multer = require('multer');
var upload = multer({ dest:'public/uploads/' });
app.use(upload.any());

var flash = require('express-flash'), cookieParser = require('cookie-parser'), session = require('express-session');
app.use(cookieParser('keyboard cat'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());

app.use(express.static('public'));
app.set('view engine', 'ejs');

/* Places */
app.get('/', function(req, res, next){ res.redirect('/places'); });
app.get('/places', function(req, res, next){
	api.getAvailablePlaces(function(places){
		res.render('pages/places', {title: 'Select place', places:places});
	});
});
app.post('/places', function(req, res, next){
	if(req.files && req.files.length == 1 && req.files[0].fieldname == "icon"){
		api.addPlace(req.body.name, getUploadPath(req.files[0].filename), function(result){
			passMessage(req, result.error, result.msg, 'Added place '+req.body.name);
			res.redirect('/places');
		});
	}else{
		passMessage(req, true, "No image selected", "This should not happen");
		res.redirect('/places');
	}
});

/* Stashes */
app.get('/places/:place', function(req, res, next){
	api.getAvailableStashes(req.params.place, function(stashes){
		if(!stashes.error){
			res.render('pages/stashes', {title: 'Select stash', parentPath: '/places', place: req.params.place, stashes: stashes});
		}else{
			res.render('pages/404', {msg: stashes.msg});
		}
	});
});
app.post('/places/:place', function(req, res, next){
	if(req.files && req.files.length == 1 && req.files[0].fieldname == "icon"){
		api.addStash(req.params.place, req.body.name, getUploadPath(req.files[0].filename), function(result){
			passMessage(req, result.error, result.msg, 'Added stash '+req.body.name);
			res.redirect('/places/'+req.params.place);
		});
	}else{
		passMessage(req, true, "No image selected", "This should not happen");
		res.redirect('/places/'+req.params.place);
	}
});

/* At selected location */
app.get('/places/:place/:stash', function(req, res, next){
	api.getAvailableItems(req.params.place, req.params.stash, function(items){
		if(!items.error){
			res.render('pages/list', {title: 'List stash contents', parentPath: '/places/'+req.params.place, place: req.params.place, stash: req.params.stash, items: items});
		}else{
			res.render('pages/404', {msg: items.msg});
		}
	});
});
app.post('/places/:place/:stash', function(req, res, next){
	const onDone = function(result){
		passMessage(req, result.error, result.msg, 'Added '+result.amount+'x'+result.size+result.unit+' '+result.product+'!');
		res.redirect('/places/'+req.params.place+'/'+req.params.stash);
	};
	
	if(req.body.inputtype == "barcode"){
		api.addEventByBarcode(req.params.place, req.params.stash, req.body.action, req.body.barcode, req.body.amount, onDone);
	}else if(req.body.inputtype == "manual"){
		api.addEventByManual(req.params.place, req.params.stash, req.body.action, req.body.manualbarcode, req.body.product, req.body.manufacturer, req.body.size, req.body.unit, req.body.amount, onDone);
	}else{
		console.log("Trying to add event without valid input type: %s", req.body.inputtype);
	}
});

/* Test environment */
app.get('/barcodetest', function(req, res, next){
	res.render('pages/barcodetest', {title: 'Barcode testing'});
});
app.post('/barcodetest', function(req, res, test){
	var barcode = require('./barcodes');
	barcode.getDataFromBarcode(undefined, req.body.barcode, function(result){
		req.flash('msg', JSON.stringify(result));
		req.flash('dabaslink', result.url);
		res.redirect('/barcodetest');
	});
});
app.get('/searchtest', function(req, res, next){
	res.render('pages/searchtest', {title: 'Search testing'});
});
app.post('/searchtest', function(req, res, test){
	api.searchItemAvailability(req.body.searchword, function(result){
		req.flash('msg', JSON.stringify(result));
		res.redirect('/searchtest');
	});
});

var port = (process.argv.length>2?parseInt(process.argv[2]):1339);
httpServer.listen(port, function(){
	console.log("Server running at port %s", httpServer.address().port)
});

function passMessage(req, error, onError, onSuccess){
	if(error) req.flash('error', onError);
	else req.flash('msg', onSuccess);
}

function getRandomString(len){
	return crypto.randomBytes(len).toString('hex')
}

function getUploadPath(filename){
	return '/uploads/'+filename;
}