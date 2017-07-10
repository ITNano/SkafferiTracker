var express = require('express'), http = require('http');
var app = express();
var httpServer = http.createServer(app);
var api = require('./skafferi');

var bodyParser = require('body-parser')
//app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

var flash = require('express-flash'), cookieParser = require('cookie-parser'), session = require('express-session');
app.use(cookieParser('keyboard cat'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', function(req, res, next){ res.redirect('/places'); });
app.get('/places', function(req, res, next){
	api.getAvailablePlaces(function(places){
		res.render('pages/places', {title: 'Select place', places:places});
	});
});
app.get('/places/add', function(req, res, next){
res.render('pages/addplace', {title: 'Add place'});
});
app.post('/places/add', function(req, res, next){
	api.addPlace(req.params.name, function(result){
		res.sendStatus(!result.error?200:406);		// HTTP 200: OK or 406: Not acceptable
	});
});
app.get('/places/:place', function(req, res, next){
	api.getAvailableStashes(req.params.place, function(stashes){
		res.render('pages/stashes', {title: 'Select stash', place: req.params.place, stashes: stashes});
	});
});
app.get('/places/:place/add', function(req, res, next){
	res.render('pages/addstash', {title: 'Add stash', place: req.params.place});
});
app.post('/places/:place/add', function(req, res, next){
	api.addStash(req.params.place, req.params.name, function(result){
		res.sendStatus(!result.error?200:406);		// HTTP 200: OK or 406: Not acceptable
	});
});
app.get('/places/:place/:stash', function(req, res, next){
	api.getAvailableItems(req.params.place, req.params.stash, function(items){
		res.render('pages/list', {title: 'List stash contents', place: req.params.place, stash: req.params.stash, items: items});
	});
});

app.post('/places/:place/:stash', function(req, res, next){
	const onDone = function(result){
		req.flash(!result.error?'msg':'error', !result.error?'Added '+result.amount+'x'+result.size+result.unit+' '+result.product+'!':result.msg);
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

httpServer.listen(1339, function(){
	console.log("Server running at port %s", httpServer.address().port)
});