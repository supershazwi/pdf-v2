const express = require('express');
const moment = require('moment');
var bodyParser = require('body-parser');
const accounting = require('accounting');
const app = express();
let port = process.env.PORT;
var MongoClient = require('mongodb').MongoClient

const OAuthClient = require("intuit-oauth");
const pdf = require('pdfjs');
const fs = require('fs');

const qb = require('./updateqb.js');
const qboo = require('./updateotherqb.js');
const qbc = require('./updateqbcustomer.js');

const oauthClient = new OAuthClient({
	clientId: "ABvS6tge05o2bqEhaKGgx9BD7YUVbX1q5z762sXpEfhf8FskR1",
    clientSecret: "N1oqcbCEoNDIzqoqqlL9Mx2ptvWeY9ofN15QEuOQ",
    environment: "production",
    redirectUri: "https://evening-oasis-90021.herokuapp.com/qb-callback"
});

app.set('views', './views');
app.set('view engine', 'pug');

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/test', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('bookingprivileges').findOne({invoiceId: "123123121"}, function(err, test) {
			console.log(test);
		});
	});
	
	res.send("ok");
});

app.post('/update-qb-credentials', (req, res) => {

	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');

		db.collection('qbcredentials').findOneAndUpdate({_id: "5e30049837500f2406f6bd8b"}, {$set: {
			access_token: req.body.access_token, 
			refresh_token: req.body.refresh_token,
			token_type: req.body.token_type,
			expires_in: parseInt(req.body.expires_in),
			x_refresh_token_expires_in: parseInt(req.body.x_refresh_token_expires_in),
		}}, {}, (err, doc) => {			
			res.redirect('/');
		});
	});
});

app.get('/get-qb-credentials', (req, res) => {
	res.render('get-qb-credentials', {})
});

app.get('/customers', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');

		db.collection('customers').find({}, {_id: 1, name: 1, contact: 1, email: 1, company: 1}).toArray(function (err, result) {
			if(result.length == 0)
				res.render('customers', { customers: [] })
			else {
				customers = result
				res.render('customers', { customers: customers })
			}
		});
	});
});

app.get('/pending-others-invoices', function (req, res) {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		var pendingOthers = [];

		var counter = 0;
		var totalCounter = 0;

		db.collection('invoiceNeedingUpdate').find({bookingId: "0", customerIdd: "0", voidId: "0"}).toArray(function (err, result) {

			totalCounter = result.length;

			if(result.length == 0) {
				res.render('pending-others', { pendingOthers: pendingOthers });		
			}

			result.forEach(function(resultitem) {
				var arr = new Object();
				db.collection('others').findOne({_id: resultitem.otherId}, function(err, other) {
					arr.invoiceNumber = other.quickbooksInvoiceId;
					arr.otherId = other._id;
					arr.customerName = other.customerName;
					arr.customerId = other.customerId;
					arr.customerIdd = "0";

					pendingOthers.push(arr);
				});

				counter++;
			});

			var refreshCounter = setInterval(function() {
				if(counter == totalCounter) {
					clearInterval(refreshCounter);
					res.render('pending-others', { pendingOthers: pendingOthers });
				}
			}, 100);
		});
	});
})

app.get('/pending-invoices', function (req, res) {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		var pendingInvoices = [];

		var counter = 0;
		var totalCounter = 0;

		db.collection('invoiceNeedingUpdate').find({customerIdd: "0", voidId: "0", otherId: "0"}).toArray(function (err, result) {

			totalCounter = result.length;

			if(result.length == 0) {
				res.render('pending-invoices', { pendingInvoices: pendingInvoices });		
			}

			result.forEach(function(resultitem) {
				var arr = new Object();
				db.collection('bookingstatuses').findOne({invoiceId: resultitem.bookingId}, function(err, bookingstatus) {
					if(bookingstatus.quickbooksInvoiceId != "Pending") {
						arr.invoiceNumber = bookingstatus.quickbooksInvoiceId;
						arr.bookingId = resultitem.bookingId;

						db.collection('bookingcustomers').findOne({invoiceId: bookingstatus.invoiceId} , function(err, bookingcustomer) {
							db.collection('customers').findOne({_id: bookingcustomer.customerId}, function(err, customer) {
								arr.customerName = customer.name;
								arr.customerId = customer._id;
								arr.customerIdd = "0";

								pendingInvoices.push(arr);	

								counter++;					
							});	
						});	
					} else {
						counter++;
					}	
				});

				
			});

			var refreshCounter = setInterval(function() {
				if(counter == totalCounter) {
					clearInterval(refreshCounter);
					res.render('pending-invoices', { pendingInvoices: pendingInvoices });
				}
			}, 100);
		});
	});
})

app.get('/pending-customers', function (req, res) {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		var pendingCustomers;

		db.collection('customers').find({quickbooksId: 0}).toArray(function (err, result) {
			if(result.length == 0) {
				res.render('pending-customers', { pendingCustomers: [] })
			} else {
				pendingCustomers = result
				res.render('pending-customers', { pendingCustomers: pendingCustomers })
			}
		})
	});
})

app.get('/void-other-invoice', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('qbcredentials').findOne({_id: '5e30049837500f2406f6bd8b'}, function(err, qbcredential) {
			let authToken = new Object();

			authToken.token_type = qbcredential.token_type;
			authToken.access_token = qbcredential.access_token;
			authToken.expires_in = qbcredential.expires_in;
			authToken.refresh_token = qbcredential.refresh_token;
			authToken.x_refresh_token_expires_in = qbcredential.x_refresh_token_expires_in;

			oauthClient.setToken(authToken);

			if(oauthClient.isAccessTokenValid()) {
				let quickbooksInvoiceQueryId = req.query.id;

				db.collection('others').findOne({quickbooksInvoiceQueryId: quickbooksInvoiceQueryId}, function(err, other) {
					oauthClient.makeApiCall({
		  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice/'+other.quickbooksInvoiceQueryId,
		  			    method: 'GET',
		  			    headers: {
		  			      'Content-Type': 'application/json'
		  			    }
			  		}).then(function(response){
			  			const body = {
			  				Id: other.quickbooksInvoiceQueryId,
			  				SyncToken: response.json.Invoice.SyncToken
			  			};
		  				oauthClient.makeApiCall({
			  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice?operation=void',
			  			    method: 'POST',
			  			    headers: {
			  			      'Content-Type': 'application/json'
		  			    	},
		  			    	body: JSON.stringify(body)
				  		}).then(function(response){
		              		console.log('The API response is  : ' + response);
	              			db.collection('invoiceNeedingUpdate').remove({otherId: other._id});
	              			db.collection('others').findOneAndUpdate({_id: other._id}, {$set: {status: "Void"}}, {}, (err, doc) => {});
			          	}).catch(function(e) {
		              		console.log('The error is '+ JSON.stringify(e));
			          	});
		          	}).catch(function(e) {
	              		console.log('The error is '+ JSON.stringify(e));
		          	});
				});

				setTimeout(function() {
					res.redirect("/");
				}, 3000);
			} 

			if(!oauthClient.isAccessTokenValid()){
			    oauthClient.refresh()
		        .then(function(authResponse) {
		        })
		        .catch(function(e) {
		        	res.redirect("/get-qb-credentials");
		        });
			}
		});
	});
});

app.get('/void-invoice', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('qbcredentials').findOne({_id: '5e30049837500f2406f6bd8b'}, function(err, qbcredential) {
			let authToken = new Object();

			authToken.token_type = qbcredential.token_type;
			authToken.access_token = qbcredential.access_token;
			authToken.expires_in = qbcredential.expires_in;
			authToken.refresh_token = qbcredential.refresh_token;
			authToken.x_refresh_token_expires_in = qbcredential.x_refresh_token_expires_in;

			oauthClient.setToken(authToken);

			if(oauthClient.isAccessTokenValid()) {
				let invoiceId = req.query.id;

				db.collection('bookingstatuses').findOne({quickbooksInvoiceQueryId: invoiceId}, function(err, bookingStatus) {
					oauthClient.makeApiCall({
		  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice/'+bookingStatus.quickbooksInvoiceQueryId,
		  			    method: 'GET',
		  			    headers: {
		  			      'Content-Type': 'application/json'
		  			    }
			  		}).then(function(response){
			  			const body = {
			  				Id: bookingStatus.quickbooksInvoiceQueryId,
			  				SyncToken: response.json.Invoice.SyncToken
			  			};
		  				oauthClient.makeApiCall({
			  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice?operation=void',
			  			    method: 'POST',
			  			    headers: {
			  			      'Content-Type': 'application/json'
		  			    	},
		  			    	body: JSON.stringify(body)
				  		}).then(function(response){
		              		console.log('The API response is  : ' + response);
	              			db.collection('invoiceNeedingUpdate').remove({bookingId: invoiceId});
	              			db.collection('bookingstatuses').findOneAndUpdate({quickbooksInvoiceQueryId: invoiceId}, {$set: {status: "Void"}}, {}, (err, doc) => {});
			          	}).catch(function(e) {
		              		console.log('The error is '+ JSON.stringify(e));
			          	});
		          	}).catch(function(e) {
	              		console.log('The error is '+ JSON.stringify(e));
		          	});
				});

				setTimeout(function() {
					res.redirect("/");
				}, 3000);
			} 

			if(!oauthClient.isAccessTokenValid()){
			    oauthClient.refresh()
		        .then(function(authResponse) {
		        })
		        .catch(function(e) {
		        	res.redirect("/get-qb-credentials");
		        });
			}
		});
	});
});

app.get('/sync-customer', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('qbcredentials').findOne({_id: '5e30049837500f2406f6bd8b'}, function(err, qbcredential) {
			let authToken = new Object();

			authToken.token_type = qbcredential.token_type;
			authToken.access_token = qbcredential.access_token;
			authToken.expires_in = qbcredential.expires_in;
			authToken.refresh_token = qbcredential.refresh_token;
			authToken.x_refresh_token_expires_in = qbcredential.x_refresh_token_expires_in;

			oauthClient.setToken(authToken);

			if(oauthClient.isAccessTokenValid()) {
				let customerId = req.query.id;
				qbc.synccustomer(customerId, oauthClient);
				
				setTimeout(function() {
					db.collection('customers').findOne({_id: customerId}, function(err, customer) {
						if(customer.quickbooksId == null || customer.quickbooksId == 0 || customer.quickbooksId == "0" || customer.quickbooksId == "") {
							res.redirect('/get-qb-credentials');
						} else {
							res.redirect("/");
						}
					});

					
				}, 3000);
			} 

			if(!oauthClient.isAccessTokenValid()){
			    oauthClient.refresh()
		        .then(function(authResponse) {
		        })
		        .catch(function(e) {
		        	res.redirect("/get-qb-credentials");
		        });
			}
		});
	});
});

app.get('/sync-others-invoice', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('qbcredentials').findOne({_id: '5e30049837500f2406f6bd8b'}, function(err, qbcredential) {
			let authToken = new Object();

			authToken.token_type = qbcredential.token_type;
			authToken.access_token = qbcredential.access_token;
			authToken.expires_in = qbcredential.expires_in;
			authToken.refresh_token = qbcredential.refresh_token;
			authToken.x_refresh_token_expires_in = qbcredential.x_refresh_token_expires_in;

			oauthClient.setToken(authToken);

			if(oauthClient.isAccessTokenValid()) {
				let otherId = req.query.id;
				qboo.syncotherinvoice(otherId, oauthClient);
				

				setTimeout(function() {
					db.collection('others').findOne({_id: otherId}, function(err, other) {
						if(other.quickbooksInvoiceQueryId == "Pending" || other.quickbooksInvoiceQueryId == null) {
							res.redirect('/get-qb-credentials');
						} else {
							res.redirect("/");
						}
					});

				}, 3000);
			} 

			if(!oauthClient.isAccessTokenValid()){
			    oauthClient.refresh()
		        .then(function(authResponse) {
		        })
		        .catch(function(e) {
		        	res.redirect("/get-qb-credentials");
		        });
			}
		});
	});
});

app.get('/sync-invoice', (req, res) => {
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');
		db.collection('qbcredentials').findOne({_id: '5e30049837500f2406f6bd8b'}, function(err, qbcredential) {
			let authToken = new Object();

			authToken.token_type = qbcredential.token_type;
			authToken.access_token = qbcredential.access_token;
			authToken.expires_in = qbcredential.expires_in;
			authToken.refresh_token = qbcredential.refresh_token;
			authToken.x_refresh_token_expires_in = qbcredential.x_refresh_token_expires_in;

			oauthClient.setToken(authToken);

			if(oauthClient.isAccessTokenValid()) {
				let invoiceId = req.query.id;
				qb.syncinvoice(invoiceId, oauthClient);
				

				setTimeout(function() {
					db.collection('bookingstatuses').findOne({invoiceId: invoiceId}, function(err, bookingstatus) {
						if(bookingstatus.quickbooksInvoiceQueryId == "Pending" || bookingstatus.quickbooksInvoiceQueryId == null) {
							res.redirect('/get-qb-credentials');
						} else {
							res.redirect("/");
						}
					});
				}, 3000);
			} 

			if(!oauthClient.isAccessTokenValid()){
			    oauthClient.refresh()
		        .then(function(authResponse) {
		        })
		        .catch(function(e) {
		        	res.redirect("/get-qb-credentials");
		        });
			}
		});
	});
});

app.get('/', (req, res) =>  {
	res.render('index', {})
});

app.get('/connect', (req, res) =>  {
	

	let authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: "testState"
  	});

	res.redirect(authUri);
});

app.get('/generateOtherPDF', async (req, res) =>  {

	let customer;
	let invoiceNumber;
	let projectName;
	let bookingGroups;
	let bookingLineItems = [];
	let totalBeforeGst = 0;
	let totalAfterGst = 0;
	let gst = 0;

	const otherId = req.query.otherId;
	
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		if (err) throw err
		var db = client.db('meteor')

		// get customer details
		db.collection('others').findOne({_id: otherId}, function (err, other) {
			setTimeout(async function() {
				var doc = new pdf.Document({ font: pdf.Font.Helvetica });

				const logo = new pdf.Image(fs.readFileSync('camwerkz-icon-converted.pdf'))

				var table = doc.table({
				  widths: [400, null],
				  paddingBottom: 0*pdf.cm
				})

				var row = table.row()
				row.cell().text()
					.add('RENTAL ACKNOWLEDGEMENT', { fontSize: 16, font: pdf.Font.HelveticaBold })
					.add('--------------------------------------------------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('Important Details', { underline: true })
					.add('-------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('• All equipment must be returned between 9.30am - 10.30am on the following day after usage.')
					.add('--------------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('• A late return fee of 1/2 day rental shall be chargeable after 10.30am and full day rate shall be chargeable after 12 noon.')
					.add('--------------------------------------------------------', { color: 0xffffff })
					.add('• Extension of usage is subjected to availability of equipment.')
					.add('--------------------------------------------------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('Other Details', { underline: true })
					.add('--------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('Location:')
					.add('---------------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('Blk 115A Commonwealth Drive #05-07/08/09 Singapore 149596')
					.add('--------------', { color: 0xffffff })
					.add('Operating Hours:')
					.add('-----------------------------------------------------------------------------', { color: 0xffffff })
					.add('Monday - Friday: 9.30am - 6.30pm, Saturday & Sunday: 9.30am - 3.30pm')
					.add('------', { color: 0xffffff })
					.add('Public Holiday: Closed (By special arrangement only)')
					.add('---------------------------------', { color: 0xffffff })
					.add('Enquiry:')
					.add('---------------------------------------------------------------------------------------------', { color: 0xffffff })
					.add('For quotation & advanced booking, kindly email us: admin@camwerkz.com')
					.add('------', { color: 0xffffff })
					.add('Office: +65 6474 4787 Mobile: +65 9040 6463 Fax: +65 6474 4052')

				row.cell().image(logo, { align: 'right', height: 3*pdf.cm })

				doc.text('-', { color: 0xffffff })

				var table = doc.table({
				  widths: [null, null, null],
				  paddingBottom: 0*pdf.cm
				})

				var row = table.row()
				row.cell('Customer Details', { underline: true, font: pdf.Font.HelveticaBold })
				row.cell('Invoice Number', { underline: true, font: pdf.Font.HelveticaBold })
				row.cell('Project Name', { underline: true, font: pdf.Font.HelveticaBold })

				var row = table.row()
				row.cell(other.customerName)
				row.cell(other.quickbooksInvoiceId)
				row.cell(other.projectName)

				var row = table.row()
				row.cell(other.customerEmail)

				var row = table.row()
				row.cell(other.customerNumber)

				doc.text('-', { color: 0xffffff })


				var table = doc.table({
	  				widths: [256, null],
	  				paddingBottom: 0.25*pdf.cm
				})	

				var row = table.row()
				row.cell('Line items')

				var table = doc.table({
				  widths: [null, 2.5*pdf.cm, 2.5*pdf.cm, 2.5*pdf.cm, 2.5*pdf.cm, 2.5*pdf.cm],
				  borderHorizontalWidths: function(i) { return i < 2 ? 1 : 0.1 },
				  padding: 5
				})

				var tr = table.header({ font: pdf.Font.HelveticaBold, borderBottomWidth: 1.5 })
				tr.cell('Item')
				tr.cell('Category')
				tr.cell('Quantity', { textAlign: 'right' })
				tr.cell('Price', { textAlign: 'right' })
				tr.cell('Discount', { textAlign: 'right' })
				tr.cell('Sub Amount', { textAlign: 'right' })

				function addRow(lineItem, category, quantity, rate, discount, subAmount) {
				  var tr = table.row()
				  tr.cell(lineItem)
				  tr.cell(category)
				  tr.cell(quantity.toString(), { textAlign: 'right' })

				  tr.cell('$' + rate.toFixed(2), { textAlign: 'right' })
				  tr.cell('$' + discount.toFixed(2), { textAlign: 'right' })
				  tr.cell('$' + subAmount.toFixed(2), { textAlign: 'right' })
				}

				for (var j = 0; j < other.equipmentDetails[0].items.length; j++) {
				addRow(other.equipmentDetails[0].items[j].item, other.equipmentDetails[0].items[j].category, other.equipmentDetails[0].items[j].quantity, other.equipmentDetails[0].items[j].price, other.equipmentDetails[0].items[j].discount, other.equipmentDetails[0].items[j].price * other.equipmentDetails[0].items[j].quantity)	
				}

				let subdiscount = 0;
				let subtotal = 0;

				subdiscount = other.equipmentDetails[0].subDiscount;
			    subtotal = other.equipmentDetails[0].subTotal;

				var tr = table.row()
			    tr.cell('')
			    tr.cell('')
			    tr.cell('', { textAlign: 'right' })

			    tr.cell('Sub Disc:', { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(subdiscount), { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(subtotal), { textAlign: 'right' })

			    let aftertotal = 0;

			    if((subtotal - subdiscount) < 0) {
			      	aftertotal = 0;
			    } else {
			    	aftertotal = subtotal - subdiscount;
			    }

			    var tr = table.row()
			    tr.cell('')
			    tr.cell('')
			    tr.cell('', { textAlign: 'right' })

			    tr.cell('', { textAlign: 'right' })
			    tr.cell('Sub Total:', { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(aftertotal), { textAlign: 'right' })

			    doc.text('-', { color: 0xffffff })

			    totalBeforeGst += aftertotal;


			    doc.text('-', { color: 0xffffff })

			    var table = doc.table({
				  widths: [null, 2.5*pdf.cm, 5*pdf.cm, 2.5*pdf.cm],
				  borderHorizontalWidths: function(i) { return i < 2 ? 1 : 0.1 },
				  padding: 5
				})

				var tr = table.row()
			    tr.cell('')
			    tr.cell('', { textAlign: 'right' })

			    tr.cell('Total before GST', { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(totalBeforeGst), { textAlign: 'right' })

			    gst = totalBeforeGst * 0.07;

			    var tr = table.row()
			    tr.cell('')
			    tr.cell('', { textAlign: 'right' })

			    tr.cell('GST', { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(gst), { textAlign: 'right' })

			    totalAfterGst = totalBeforeGst + gst;

			    var tr = table.row()
			    tr.cell('')
			    tr.cell('', { textAlign: 'right' })

			    tr.cell('Total after GST', { textAlign: 'right' })
			    tr.cell(accounting.formatMoney(totalAfterGst), { textAlign: 'right' })

			    doc.footer()
				   .pageNumber(function(curr, total) { return curr + ' / ' + total }, { textAlign: 'center' })

				doc.pipe(fs.createWriteStream('OtherInvoice_'+invoiceNumber+'.pdf'));
				await doc.end();
				res.redirect("/outputOtherPDF?id="+invoiceNumber);	
			}, 1000);	
		});
	})
});

app.get('/generatePDF', async (req, res) =>  {

	let customer;
	let invoiceNumber;
	let projectName;
	let bookingGroups;
	let displayDates;
	let bookingLineItems = [];
	let totalBeforeGst = 0;
	let totalAfterGst = 0;
	let gst = 0;

	const bookingId = req.query.bookingId;
	
	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		if (err) throw err
		var db = client.db('meteor')

		// get customer details
		db.collection('bookingcustomers').find({invoiceId: bookingId}).toArray(function (err, result) {
			if (err) throw err
			db.collection('customers').find({_id: result[0].customerId}).toArray(function (err, result) {
				if (err) throw err
				customer = result[0]

				// get invoice number
				db.collection('bookingstatuses').find({invoiceId: bookingId}).toArray(function (err, result) {
					if (err) throw err
					invoiceNumber = result[0].quickbooksInvoiceId
					displayDates = result[0].displayDates;

					db.collection('bookingprojects').find({invoiceId: bookingId}).toArray(function (err, result) {
						if (err) throw err
						if(result[0].projectName == null || result[0].projectName == "")
							projectName = "NA";
						else
							projectName = result[0].projectName;

						db.collection('bookinggroups').find({invoiceId: bookingId}).toArray(function (err, result) {
							if (err) throw err
							bookingGroups = result;		

							db.collection('bookinggroupprices').find({invoiceId: bookingId}).toArray(function (err, bookinggroupprices) {
								if (err) throw err
								bookingGroupPrices = bookinggroupprices;

								db.collection('bookinglineitems').find({invoiceId: bookingId}).toArray(function (err, result) {
									if (err) throw err
									bookingLineItems = result;	

									setTimeout(async function() {
										var doc = new pdf.Document({ font: pdf.Font.Helvetica });

										const logo = new pdf.Image(fs.readFileSync('camwerkz-icon-converted.pdf'))

										var table = doc.table({
										  widths: [400, null],
										  paddingBottom: 0*pdf.cm
										})

										var row = table.row()
										row.cell().text()
											.add('RENTAL ACKNOWLEDGEMENT', { fontSize: 16, font: pdf.Font.HelveticaBold })
											.add('--------------------------------------------------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('Important Details', { underline: true })
											.add('-------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('• All equipment must be returned between 9.30am - 10.30am on the following day after usage.')
											.add('--------------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('• A late return fee of 1/2 day rental shall be chargeable after 10.30am and full day rate shall be chargeable after 12 noon.')
											.add('--------------------------------------------------------', { color: 0xffffff })
											.add('• Extension of usage is subjected to availability of equipment.')
											.add('--------------------------------------------------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('Other Details', { underline: true })
											.add('--------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('Location:')
											.add('---------------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('Blk 115A Commonwealth Drive #05-07/08/09 Singapore 149596')
											.add('--------------', { color: 0xffffff })
											.add('Operating Hours:')
											.add('-----------------------------------------------------------------------------', { color: 0xffffff })
											.add('Monday - Friday: 9.30am - 6.30pm, Saturday & Sunday: 9.30am - 3.30pm')
											.add('------', { color: 0xffffff })
											.add('Public Holiday: Closed (By special arrangement only)')
											.add('---------------------------------', { color: 0xffffff })
											.add('Enquiry:')
											.add('---------------------------------------------------------------------------------------------', { color: 0xffffff })
											.add('For quotation & advanced booking, kindly email us: admin@camwerkz.com')
											.add('------', { color: 0xffffff })
											.add('Office: +65 6474 4787 Mobile: +65 9040 6463 Fax: +65 6474 4052')

										row.cell().image(logo, { align: 'right', height: 3*pdf.cm })

										doc.text('-', { color: 0xffffff })

										var table = doc.table({
										  widths: [null, null, null],
										  paddingBottom: 0*pdf.cm
										})

										var row = table.row()
										row.cell('Customer Details', { underline: true, font: pdf.Font.HelveticaBold })
										row.cell('Invoice Number', { underline: true, font: pdf.Font.HelveticaBold })
										row.cell('Project Name', { underline: true, font: pdf.Font.HelveticaBold })

										var row = table.row()
										row.cell(customer.name)
										row.cell(invoiceNumber)
										row.cell(projectName)

										var row = table.row()
										row.cell(customer.email)

										var row = table.row()
										row.cell(customer.contact)

										doc.text('-', { color: 0xffffff })

										for (var i = 0; i < bookingGroups.length; i++) {
											var table = doc.table({
								  				widths: [256, null],
								  				paddingBottom: 0.25*pdf.cm
											})	

											var row = table.row()
											row.cell('Equipment Details - Group ' + (parseInt(i)+1))

											let dateCombined = [];

											console.log(displayDates[i].dateArray);

											for (var dd = 0; dd < displayDates[i].dateArray.length; dd++) {
												dateCombined.push(displayDates[i].dateArray[dd][0] + ' - ' + displayDates[i].dateArray[dd][displayDates[i].dateArray[dd].length - 1]);
											}



											row.cell(dateCombined.join(", "));

											var table = doc.table({
											  widths: [null, 2.5*pdf.cm, 2.5*pdf.cm, 2.5*pdf.cm, 2.5*pdf.cm],
											  borderHorizontalWidths: function(i) { return i < 2 ? 1 : 0.1 },
											  padding: 5
											})

											var tr = table.header({ font: pdf.Font.HelveticaBold, borderBottomWidth: 1.5 })
											tr.cell('Equipment')
											tr.cell('Quantity', { textAlign: 'right' })
											tr.cell('Rate', { textAlign: 'right' })
											tr.cell('Discount', { textAlign: 'right' })
											tr.cell('Sub Amount', { textAlign: 'right' })

											function addRow(equipmentName, quantity, rate, discount, subAmount) {
											  var tr = table.row()
											  tr.cell(equipmentName)
											  tr.cell(quantity.toString(), { textAlign: 'right' })

											  tr.cell('$' + rate.toFixed(2), { textAlign: 'right' })
											  tr.cell('$' + discount.toFixed(2), { textAlign: 'right' })
											  tr.cell('$' + subAmount.toFixed(2), { textAlign: 'right' })
											}

											var subsubtotal = 0;
											var subsubdiscount = 0;

											for (var j = 0; j < bookingLineItems.length; j++) {
												if(bookingLineItems[j].groupCounter == i) {
													if(bookingLineItems[j].discountOverwrite == null) {
														if(bookingLineItems[j].category == "Custom Item Rental") {
															addRow("(CUSTOM) " + bookingLineItems[j].item, bookingLineItems[j].booked, parseInt(bookingLineItems[j].rate), 0, parseInt(bookingLineItems[j].rate) * bookingLineItems[j].days * bookingLineItems[j].booked)
														} else {
															addRow(bookingLineItems[j].brand + " " + bookingLineItems[j].item, bookingLineItems[j].booked, parseInt(bookingLineItems[j].rate), 0, parseInt(bookingLineItems[j].rate) * bookingLineItems[j].days * bookingLineItems[j].booked)
														}
													} else {
														if(bookingLineItems[j].category == "Custom Item Rental") {
															addRow("(CUSTOM) " + bookingLineItems[j].item, bookingLineItems[j].booked, parseInt(bookingLineItems[j].rate), bookingLineItems[j].discountOverwrite, parseInt(bookingLineItems[j].rate) * bookingLineItems[j].days * bookingLineItems[j].booked - bookingLineItems[j].discountOverwrite)
														} else {
															addRow(bookingLineItems[j].brand + " " + bookingLineItems[j].item, bookingLineItems[j].booked, parseInt(bookingLineItems[j].rate), bookingLineItems[j].discountOverwrite, parseInt(bookingLineItems[j].rate) * bookingLineItems[j].days * bookingLineItems[j].booked - bookingLineItems[j].discountOverwrite)
														}
													}

													
													subsubtotal += (bookingLineItems[j].originalPriced * bookingLineItems[j].rate);
													if(bookingLineItems[j].discountOverwrite != undefined) {
												  		subsubdiscount += bookingLineItems[j].discountOverwrite;
													}

												  	
												}	
											}

											subsubtotal -= bookingGroupPrices[i].privilege.value;

											subsubtotal = subsubtotal - subsubdiscount;

											let subdiscount = 0;
											let subtotal = 0;

											for(xx in bookingLineItems) {
												if(bookingLineItems[xx].groupCounter == i) {
													if(bookingLineItems[xx].discountOverwrite != undefined) {
												        subdiscount += bookingLineItems[xx].discountOverwrite;
												      }
												}
										    }

										    for(xx in bookingLineItems) {
												if(bookingLineItems[xx].groupCounter == i) {
											        subtotal += (bookingLineItems[xx].originalPriced * parseInt(bookingLineItems[xx].rate));
											    }
										    }

											var tr = table.row()
										    tr.cell('')
										    tr.cell('', { textAlign: 'right' })

										    tr.cell('Sub Disc:', { textAlign: 'right' })
										    tr.cell(accounting.formatMoney(subdiscount), { textAlign: 'right' })
										    tr.cell(accounting.formatMoney(subtotal), { textAlign: 'right' })

										    if(bookingGroupPrices[i].privilege.value > 0) {
									    		var tr = table.row()
									    	    tr.cell('')
									    	    tr.cell('', { textAlign: 'right' })

									    	    tr.cell('Privilege:', { textAlign: 'right' })
									    	    tr.cell(accounting.formatMoney(bookingGroupPrices[i].privilege.value), { textAlign: 'right' })
									    	    tr.cell((Math.round(bookingGroupPrices[i].privilege.percentage * 100) / 100).toString() +'%', { textAlign: 'right' })
									    	}

										    var tr = table.row()
										    tr.cell('')
										    tr.cell('', { textAlign: 'right' })

										    tr.cell('', { textAlign: 'right' })
										    tr.cell('Sub Total:', { textAlign: 'right' })
										    tr.cell(accounting.formatMoney(subsubtotal), { textAlign: 'right' })

										    doc.text('-', { color: 0xffffff })

										    totalBeforeGst += subsubtotal;
										}

									    doc.text('-', { color: 0xffffff })

									    var table = doc.table({
										  widths: [null, 2.5*pdf.cm, 5*pdf.cm, 2.5*pdf.cm],
										  borderHorizontalWidths: function(i) { return i < 2 ? 1 : 0.1 },
										  padding: 5
										})

										var tr = table.row()
									    tr.cell('')
									    tr.cell('', { textAlign: 'right' })

									    tr.cell('Total before GST', { textAlign: 'right' })
									    tr.cell(accounting.formatMoney(totalBeforeGst), { textAlign: 'right' })

									    gst = totalBeforeGst * 0.07;

									    var tr = table.row()
									    tr.cell('')
									    tr.cell('', { textAlign: 'right' })

									    tr.cell('GST', { textAlign: 'right' })
									    tr.cell(accounting.formatMoney(gst), { textAlign: 'right' })

									    totalAfterGst = totalBeforeGst + gst;

									    var tr = table.row()
									    tr.cell('')
									    tr.cell('', { textAlign: 'right' })

									    tr.cell('Total after GST', { textAlign: 'right' })
									    tr.cell(accounting.formatMoney(totalAfterGst), { textAlign: 'right' })

									    doc.footer()
										   .pageNumber(function(curr, total) { return curr + ' / ' + total }, { textAlign: 'center' })

										doc.pipe(fs.createWriteStream('Invoice_'+invoiceNumber+'.pdf'));
										await doc.end();
										res.redirect("/outputPDF?id="+invoiceNumber);	
									}, 1000);
								})
							})
						})
					})	
				})
			})
		})
	})
});

app.get('/outputOtherPDF', function(req, res) {
  res.sendFile(__dirname + "/OtherInvoice_" + req.query.id + ".pdf");
});

app.get('/outputPDF', function(req, res) {
  res.sendFile(__dirname + "/Invoice_" + req.query.id + ".pdf");
});

if (port == null || port == "") {
  port = 5000;
}
app.listen(port);