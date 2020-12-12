var MongoClient = require('mongodb').MongoClient;
const moment = require('moment');

const syncotherinvoice = (otherId, oauthClient) => {
  	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');

		var bookingId = otherId;
		var lineArray = [];
		var other;
		var chartOfAccounts;
		var chartOfAccountsArray = [];
		var customer2;

		db.collection('others').findOne({_id: bookingId}, function(err, other) {
			other = other;

			db.collection('chartofaccounts').find({}).toArray(function (err, chartofaccounts) {
				chartOfAccounts = chartofaccounts;

				db.collection('customers').findOne({_id: other.customerId}, function(err, customer) {
					customer2 = customer;

					if(other.status == "Void") {
						var lineObject = new Object();
						lineObject.Amount = 0;
						lineObject.DetailType = "SalesItemLineDetail";
						lineObject.Description = "Cancellation";
						lineObject.SalesItemLineDetail = new Object();
						lineObject.SalesItemLineDetail.ItemRef = new Object();
						lineObject.SalesItemLineDetail.ItemRef.value = "23";
						lineObject.SalesItemLineDetail.ItemRef.name = "VOID";
						lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
						lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
						lineObject.SalesItemLineDetail.UnitPrice = 0;
						lineObject.SalesItemLineDetail.Qty = 1;
						lineArray.push(lineObject);
		            }

		            if(other.equipmentDetails[0].items.length > 0) {
		          		other.equipmentDetails[0].items.forEach(function(otherLineItem, index) {
		                    db.collection('chartofaccounts').findOne({category: otherLineItem.category}, function(err, coa) {
		                    	var lineObject = new Object();
			          			if(other.status == "Void") {
			          			  lineObject.Amount = 0;
			          			} else {
			          			  lineObject.Amount = otherLineItem.price * otherLineItem.quantity;
			          			} 

			          			lineObject.DetailType = "SalesItemLineDetail";
			                    lineObject.Description = otherLineItem.item;
			                    lineObject.SalesItemLineDetail = new Object();
			                    lineObject.SalesItemLineDetail.ItemRef = new Object();
		                    	lineObject.SalesItemLineDetail.ItemRef.value = coa.qbValue;
		                    	lineObject.SalesItemLineDetail.ItemRef.name = coa.qbName;
		                    	lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
		                    	lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";

		                    	if(other.status == "Void") {
		                      		lineObject.SalesItemLineDetail.UnitPrice = 0;
			                    } else {
		                      		lineObject.SalesItemLineDetail.UnitPrice = otherLineItem.price;
			                    } 

			                    lineObject.SalesItemLineDetail.Qty = otherLineItem.quantity;
                    			lineArray.push(lineObject);

                    			if(otherLineItem.discount > 0) {
									var lineObject = new Object();
									if(other.status == "Void") {
										lineObject.Amount = 0;
									} else {
										lineObject.Amount = -(otherLineItem.discount);
									} 
									lineObject.DetailType = "SalesItemLineDetail";
									lineObject.Description = otherLineItem.item + " - DISCOUNT";
									lineObject.SalesItemLineDetail = new Object();
									lineObject.SalesItemLineDetail.ItemRef = new Object();
									lineObject.SalesItemLineDetail.ItemRef.value = "37";
									lineObject.SalesItemLineDetail.ItemRef.name = "Rental Discounts";
									lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
									lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
									if(other.status == "Void") {
										lineObject.SalesItemLineDetail.UnitPrice = 0;
									} else {
										lineObject.SalesItemLineDetail.UnitPrice = -otherLineItem.discount;
									}
									lineObject.SalesItemLineDetail.Qty = 1;
									lineArray.push(lineObject);
								}
		                    });
		          		});
			        } else {
			        	var lineObject = new Object();
						lineObject.Amount = 0;
						lineObject.DetailType = "SalesItemLineDetail";
						lineObject.Description = "Application Query";
						lineObject.SalesItemLineDetail = new Object();
						lineObject.SalesItemLineDetail.ItemRef = new Object();
						lineObject.SalesItemLineDetail.ItemRef.value = "44";
						lineObject.SalesItemLineDetail.ItemRef.name = "Application Query";
						lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
						lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
						lineObject.SalesItemLineDetail.UnitPrice = 0;
						lineObject.SalesItemLineDetail.Qty = 0;
						lineArray.push(lineObject);
			        }

			        var txn = new Object();
		            txn.TxnTaxDetail = new Object();
		            if(other.status == "Void") {
		                txn.TxnTaxDetail.TotalTax = 0;
		            } else {
		                txn.TxnTaxDetail.TotalTax = other.gst;
		            }
		            txn.TxnTaxDetail.TaxLine = [];
		            var taxLineObject = new Object();
		            if(other.status == "Void") {
		                taxLineObject.Amount = 0;
		            } else {
		                taxLineObject.Amount = other.gst;
		            }
		            taxLineObject.DetailType = "TaxLineDetail"; 
		            taxLineObject.TaxLineDetail = new Object();
		            taxLineObject.TaxLineDetail.TaxRateRef = new Object();
		            taxLineObject.TaxLineDetail.TaxRateRef.value = "5";
		            taxLineObject.TaxLineDetail.PercentBased = true;
		            taxLineObject.TaxLineDetail.TaxPercent = 7;
		            if(other.status == "Void") {
		                taxLineObject.TaxLineDetail.NetAmountTaxable = 0;
		            } else {
		                taxLineObject.TaxLineDetail.NetAmountTaxable = parseFloat(other.total - other.gst);
		            }
		            txn.TxnTaxDetail.TaxLine.push(taxLineObject);

		            var currencyRef = new Object();
		            currencyRef.value = "SGD";
		            currencyRef.name = "Singapore Dollar";

		            var billObject = new Object();
		            billObject.Address = customer2.email;

		            var billAddr = new Object();
		            billAddr.Id = parseInt(customer2.quickbooksId) + 1;
		            billAddr.Line1 = customer2.name;
		            billAddr.Line2 = customer2.address;

		            if(other.quickbooksInvoiceQueryId == "Pending") {
		            	console.log("HERE 1");
		            	db.collection('quickbooksInvoices').findOne({latest: true}, function(err, quickbooksinvoice) {
		            		latestDocNumber = quickbooksinvoice;

		            		latestDocNumber.invoiceDocNumber = parseInt(latestDocNumber.invoiceDocNumber) + 1;  

		            		// change latestDocNumber if its next year
		            		// check first two digits with current year
		            		var int = latestDocNumber.invoiceDocNumber;
		            		var str = int.toString();
		            		var first2digits = str.substring(0, 2);
		            		var last4digits = str.substring(2, 6);
		            		var today = new Date();
		            		var year = today.getFullYear();
		            		year = year.toString();
		            		var yearlast2digits = year.substring(2, 4);

		            		if(first2digits != yearlast2digits) {
		            			str = yearlast2digits + "00000";
		            			latestDocNumber.invoiceDocNumber = parseInt(str);
    				  			const body = {
    				  				DocNumber: latestDocNumber.invoiceDocNumber,
    				  				Line: lineArray,
    				  				CurrencyRef: currencyRef,
    				  				CustomerRef: {
				  				  		value: customer.quickbooksId
    				  				},
    				  				BillAddr: billAddr,
		                            BillEmail: billObject,
		                            TxnTaxDetail: txn.TxnTaxDetail
    				  			};
    				  			oauthClient.makeApiCall({
    				  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice',
    				  			    method: 'POST',
    				  			    headers: {
    				  			      'Content-Type': 'application/json'
    				  			    },
    				  			    body: JSON.stringify(body)
			  			  		}).then(function(response){
	  			              		console.log('The API response is  : ' + response);
  			              			db.collection('invoiceNeedingUpdate').remove({otherId: otherId});
  			              			db.collection('others').findOneAndUpdate({_id: otherId}, {$set: {quickbooksInvoiceId: latestDocNumber.invoiceDocNumber.toString(), quickbooksInvoiceQueryId: response.json.Invoice.Id}}, {}, (err, doc) => {});
  			              			db.collection('quickbooksInvoices').findOneAndUpdate({latest: true}, {$set: latestDocNumber}, {}, (err, doc) => {});
		  			          	}).catch(function(e) {
	  			              		console.log('The error is '+ JSON.stringify(e));
		  			          	});
		            		} else {
    				  			const body = {
    				  				DocNumber: latestDocNumber.invoiceDocNumber,
    				  				Line: lineArray,
    				  				CurrencyRef: currencyRef,
    				  				CustomerRef: {
				  				  		value: customer.quickbooksId
    				  				},
    				  				BillAddr: billAddr,
		                            BillEmail: billObject,
		                            TxnTaxDetail: txn.TxnTaxDetail
    				  			};
    				  			oauthClient.makeApiCall({
    				  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice',
    				  			    method: 'POST',
    				  			    headers: {
    				  			      'Content-Type': 'application/json'
    				  			    },
    				  			    body: JSON.stringify(body)
			  			  		}).then(function(response){
	  			              		console.log('The API response is  : ' + response);
  			              			db.collection('invoiceNeedingUpdate').remove({otherId: otherId});
  			              			db.collection('others').findOneAndUpdate({_id: otherId}, {$set: {quickbooksInvoiceId: latestDocNumber.invoiceDocNumber.toString(), quickbooksInvoiceQueryId: response.json.Invoice.Id}}, {}, (err, doc) => {});
  			              			db.collection('quickbooksInvoices').findOneAndUpdate({latest: true}, {$set: latestDocNumber}, {}, (err, doc) => {});
		  			          	}).catch(function(e) {
	  			              		console.log('The error is '+ JSON.stringify(e));
		  			          	});		
		            		}
		            	});
		            } else {
		            	console.log("HERE 2");
                    	oauthClient.makeApiCall({
			  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice/'+other.quickbooksInvoiceQueryId,
			  			    method: 'GET',
			  			    headers: {
			  			      'Content-Type': 'application/json'
			  			    }
	  			  		}).then(function(response){
	  			  			const body = {
				  				Id: other.quickbooksInvoiceQueryId,
				  				DocNumber: other.quickbooksInvoiceId,
				  				SyncToken: response.json.Invoice.SyncToken,
				  				Line: lineArray,
				  				CurrencyRef: currencyRef,
				  				CustomerRef: {
			  				  		value: customer.quickbooksId
				  				},
				  				BillAddr: billAddr,
	                            BillEmail: billObject,
	                            TxnTaxDetail: txn.TxnTaxDetail
				  			};
				  			oauthClient.makeApiCall({
				  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice',
				  			    method: 'POST',
				  			    headers: {
				  			      'Content-Type': 'application/json'
				  			    },
				  			    body: JSON.stringify(body)
		  			  		}).then(function(response){
  			              		console.log('The API response is  : ' + response);
		              			db.collection('invoiceNeedingUpdate').remove({otherId: otherId});
	  			          	}).catch(function(e) {
  			              		console.log('The error is '+ JSON.stringify(e));
	  			          	});
  			          	}).catch(function(e) {
			              		console.log('The error is '+ JSON.stringify(e));
  			          	});
		            }
				});
			});
		});
	});
};

exports.syncotherinvoice = syncotherinvoice;