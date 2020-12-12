var MongoClient = require('mongodb').MongoClient;
const moment = require('moment');

const synccustomer = (customerId, oauthClient) => {

    MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');

		console.log("???");
		console.log(customerId);

		db.collection('customers').findOne({_id: customerId}, function(err, customer) {
			var billobj = new Object();
			billobj.Line1 = customer.address;
			if(customer.quickbooksId == null || customer.quickbooksId == 0 || customer.quickbooksId == "0" || customer.quickbooksId == "") {
				const body = {
	  				BillAddr: billobj,
					CompanyName: customer.company, 
					DisplayName: customer.name,
					FamilyName: customer.lastName,
					GivenName: customer.firstName,
					MiddleName: customer.middleName,
					Active: true,
					PrimaryPhone: {
						FreeFormNumber: customer.contact
					},
					PrimaryEmailAddr: {
						Address: customer.email
					}
	  			};

	  			oauthClient.makeApiCall({
	  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/customer',
	  			    method: 'POST',
	  			    headers: {
	  			      'Content-Type': 'application/json'
	  			    },
	  			    body: JSON.stringify(body)
		  		}).then(function(response){
		  				
		  			db.collection('invoiceNeedingUpdate').remove({customerIdd: customerId});

		  			db.collection('customers').findOneAndUpdate({_id: customerId}, {$set: {quickbooksId: response.json.Customer.Id}}, {}, (err, doc) => {		

		  			});

	          		console.log('The API response is  : ' + response);
	          	}).catch(function(e) {
	          		console.log('The error is '+ JSON.stringify(e));
	          	});
			} else {
				oauthClient.makeApiCall({
  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/customer/'+customer.quickbooksId,
  			    method: 'GET',
  			    headers: {
  			      'Content-Type': 'application/json'
  			    }
		  		}).then(function(response){
	  			const body = {
	  				Id: customer.quickbooksId,
	  				SyncToken: response.json.Customer.SyncToken,
	  				BillAddr: billobj,
					CompanyName: customer.company, 
					DisplayName: customer.name,
					FamilyName: customer.lastName,
					GivenName: customer.firstName,
					MiddleName: customer.middleName,
					Active: true,
					PrimaryPhone: {
						FreeFormNumber: customer.contact
					},
					PrimaryEmailAddr: {
						Address: customer.email
					}
	  			};

	  			oauthClient.makeApiCall({
	  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/customer',
	  			    method: 'POST',
	  			    headers: {
	  			      'Content-Type': 'application/json'
	  			    },
	  			    body: JSON.stringify(body)
			  		}).then(function(response){
	              		console.log('The API response is  : ' + response);
              			db.collection('invoiceNeedingUpdate').remove({customerIdd: customerId});
		          	}).catch(function(e) {
	              		console.log('The error is '+ JSON.stringify(e));
		          	});
	          	}).catch(function(e) {
              		console.log('The error is '+ JSON.stringify(e));
	          	});
			}
		});
	});
};

exports.synccustomer = synccustomer;