var MongoClient = require('mongodb').MongoClient;
const moment = require('moment');

const sync = (invoiceId, oauthClient) => {
  	MongoClient.connect('mongodb://localhost:3001/meteor', function (err, client) {
		var db = client.db('meteor');

		var bookingId;
		var bookingCustomer;
		var bookingStatus;
		var bookingStatus2;
		var bookingStatus2id;
		var bookingProject;
		var bookingLineItems;
		var customer;
		var customer2;
		var chartOfAccounts;

		var privilegeAdded = [];
		var lineArray = [];
		var chartOfAccountsArray = [];

		db.collection('bookings').findOne({_id: invoiceId}, function(err, booking) {
			bookingId = booking._id;

			db.collection('bookingcustomers').findOne({invoiceId: invoiceId}, function(err, bookingcustomer) {
				bookingCustomer = bookingcustomer;
				
				db.collection('bookingstatuses').findOne({invoiceId: invoiceId}, function(err, bookingstatus) {
					bookingStatus2 = bookingstatus;
					
					for(abc in bookingStatus2.displayDates) {
					  for(def = (bookingStatus2.displayDates[abc].dateArray.length-1); def >= 0; def--) {
					    if(bookingStatus2.displayDates[abc].dateArray[def] == null) {
					      bookingStatus2.displayDates[abc].dateArray.splice(def, 1);
					    }
					  }
					}

					bookingStatus2id = bookingStatus2._id;
					db.collection('bookingstatuses').findOneAndUpdate({_id: bookingStatus2id}, {$set: bookingStatus2}, {}, (err, doc) => {			
					
						db.collection('bookingstatuses').findOne({invoiceId: invoiceId}, function(err, bookingstatus) {
							bookingStatus = bookingstatus;

							db.collection('bookingprojects').findOne({invoiceId: invoiceId}, function(err, bookingproject) {
								bookingProject = bookingproject;

								db.collection('bookinglineitems').find({invoiceId: invoiceId}, {sort: {sortNumber: 1}}).toArray(function (err, bookinglineitems) {
									bookingLineItems = bookinglineitems;

									db.collection('customers').findOne({_id: bookingCustomer.customerId}, function(err, customer) {
										customer2 = customer;

										db.collection('chartofaccounts').find({}).toArray(function (err, chartofaccounts) {
											chartOfAccounts = chartofaccounts;

											customer = customer2;
											if(bookingStatus.status == "Void") {
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

											  console.log(lineArray.length);
											}

											console.log("77");
											console.log(bookingLineItems.length);

											if(bookingLineItems.length > 0) {
												for(x in bookingLineItems) {
													var bookingGroupPrice;

													db.collection('bookinggroupprices').findOne({invoiceId: bookingId, groupId: parseInt(bookingLineItems[x].groupCounter)}, function(err, bookinggroupprice) {
														bookingGroupPrice = bookinggroupprice;

														if(privilegeAdded[parseInt(bookingLineItems[x].groupCounter)] == undefined) {
													  		privilegeAdded[parseInt(bookingLineItems[x].groupCounter)] = false;
														}

														if(bookingGroupPrice.privilege != undefined && privilegeAdded[parseInt(bookingLineItems[x].groupCounter)] == false) {
														    privilegeAdded[parseInt(bookingLineItems[x].groupCounter)] = true;
														    
														    if(bookingGroupPrice.privilege.value > 0) {
												      			var customerArray = [];
														      	customerArray.push(bookingCustomer.customerId);

														      	var privilege;

														      	db.collection('privileges').findOne({customerId: {$in: customerArray}}, function(err, privilege) {
														      		privilege = privilege

													      			var lineObject = new Object();
													      			if(bookingStatus.status == "Void") {
													      		  	lineObject.Amount = 0;
													      			} else {
													      		  	lineObject.Amount = -(bookingGroupPrice.privilege.value);
													      			}              
													      			lineObject.DetailType = "SalesItemLineDetail";
													      			lineObject.Description = "Privilege - " + privilege.name + " - " + bookingGroupPrice.privilege.percentage + "% off";
													      			lineObject.SalesItemLineDetail = new Object();
													      			lineObject.SalesItemLineDetail.ItemRef = new Object();
													      			lineObject.SalesItemLineDetail.ItemRef.value = "37";
													      			lineObject.SalesItemLineDetail.ItemRef.name = "Rental Discounts";
													      			lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
													      			lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
													      			if(bookingStatus.status == "Void") {
													      		  	lineObject.SalesItemLineDetail.UnitPrice = 0;
													      			} else {
													      		  	lineObject.SalesItemLineDetail.UnitPrice = -(bookingGroupPrice.privilege.value);
													      			} 

													      			console.log("123");
													      		
													      			lineObject.SalesItemLineDetail.Qty = 1;
													      			lineArray.push(lineObject);

													      			console.log(lineArray.length);

													      			var lineObject = new Object();
													      			if(bookingStatus.status == "Void") {
													      			  lineObject.Amount = 0;
													      			} else {
													      			  lineObject.Amount = (bookingLineItems[x].discount + bookingLineItems[x].rate) * bookingLineItems[x].days * bookingLineItems[x].booked;
													      			} 

													      			lineObject.DetailType = "SalesItemLineDetail";
													      			if(bookingLineItems[x].category == "Custom Item Rental") {
													      			  lineObject.Description = "(Group " + (parseInt(bookingLineItems[x].groupCounter)+1) + ") " + bookingLineItems[x].item + " (" + bookingLineItems[x].booked + " units X " + bookingLineItems[x].days + "days) - CUSTOM";
													      			} else {
													      			  lineObject.Description = "(Group " + (parseInt(bookingLineItems[x].groupCounter)+1) + ") " + bookingLineItems[x].brand + " " + bookingLineItems[x].item + " (" + bookingLineItems[x].booked + " units X " + bookingLineItems[x].days + "days)";
													      			}
													      			lineObject.SalesItemLineDetail = new Object();
													      			lineObject.SalesItemLineDetail.ItemRef = new Object();

													      			var coa;

													      			db.collection('chartofaccounts').findOne({category: bookingLineItems[x].category}, function(err, coa) {
													      				coa = coa;

													      				lineObject.SalesItemLineDetail.ItemRef.value = coa.qbValue;
													      				lineObject.SalesItemLineDetail.ItemRef.name = coa.qbName;
													      				lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
													      				lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
													      				if(bookingStatus.status == "Void") {
												      				  		lineObject.SalesItemLineDetail.UnitPrice = 0;
													      				} else {
													      				  	lineObject.SalesItemLineDetail.UnitPrice = (bookingLineItems[x].discount + bookingLineItems[x].rate);
													      				} 

													      				lineObject.SalesItemLineDetail.Qty = bookingLineItems[x].booked * bookingLineItems[x].days;
													      				lineArray.push(lineObject);

													      				console.log(lineArray.length);

													      				if(bookingLineItems[x].category == "Custom Item Rental" && bookingLineItems[x].discountOverwrite > 0) {
													      				  	var lineObject = new Object();
													      				  	if(bookingStatus.status == "Void") {
													      				    	lineObject.Amount = 0;
													      				  	} else {
													      				    	lineObject.Amount = -bookingLineItems[x].discountOverwrite;
													      				  	}
													      				  	lineObject.DetailType = "SalesItemLineDetail";
													      				  	lineObject.Description = "(Group " + (parseInt(x)+1) + ") " + bookingLineItems[x].item + " (" + bookingLineItems[x].booked + " units X " + bookingLineItems[x].days + "days) - DISCOUNT - CUSTOM";
													      				  	lineObject.SalesItemLineDetail = new Object();
													      				  	lineObject.SalesItemLineDetail.ItemRef = new Object();
													      				  	lineObject.SalesItemLineDetail.ItemRef.value = "37";
													      				  	lineObject.SalesItemLineDetail.ItemRef.name = "Rental Discounts";
													      				  	lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
													      				  	lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
													      				  	if(bookingStatus.status == "Void") {
													      				    	lineObject.SalesItemLineDetail.UnitPrice = 0;
													      				  	} else {
													      				    	lineObject.SalesItemLineDetail.UnitPrice = -bookingLineItems[x].discountOverwrite;
													      				  	}
													      				  	lineObject.SalesItemLineDetail.Qty = 1;
													      				  	lineArray.push(lineObject);

													      				  	console.log(lineArray.length);
												      					} else if(bookingLineItems[x].discountOverwrite > 0) {
										                                  	var lineObject = new Object();
										                                  	if(bookingStatus.status == "Void") {
										                                    	lineObject.Amount = 0;
										                                  	} else {
										                                    	lineObject.Amount = -bookingLineItems[x].discountOverwrite;
										                                  	} 
										                                  	lineObject.DetailType = "SalesItemLineDetail";
										                                  	lineObject.Description = "(Group " + (parseInt(bookingLineItems[x].groupCounter)+1) + ") " + bookingLineItems[x].brand + " " + bookingLineItems[x].item + " (" + bookingLineItems[x].booked + " units X " + bookingLineItems[x].days + "days) - DISCOUNT";
										                                  	lineObject.SalesItemLineDetail = new Object();
										                                  	lineObject.SalesItemLineDetail.ItemRef = new Object();
										                                  	lineObject.SalesItemLineDetail.ItemRef.value = "37";
										                                  	lineObject.SalesItemLineDetail.ItemRef.name = "Rental Discounts";
										                                  	lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
										                                  	lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
										                                  	if(bookingStatus.status == "Void") {
										                                    	lineObject.SalesItemLineDetail.UnitPrice = 0;
										                                  	} else {
										                                    	lineObject.SalesItemLineDetail.UnitPrice = -bookingLineItems[x].discountOverwrite;
										                                  	}
										                                  	lineObject.SalesItemLineDetail.Qty = 1;
										                                  	lineArray.push(lineObject);

										                                  	console.log(lineArray.length);
										                                } else if(bookingLineItems[x].discountPriced > 0) {
									                                 	 	var lineObject = new Object();
										                                  	if(bookingStatus.status == "Void") {
										                                    	lineObject.Amount = 0;
										                                  	} else {
										                                    	lineObject.Amount = -(bookingLineItems[x].discount * bookingLineItems[x].discountPriced);
										                                  	} 
										                                  	lineObject.DetailType = "SalesItemLineDetail";
										                                  	lineObject.Description = "(Group " + (parseInt(bookingLineItems[x].groupCounter)+1) + ") " + bookingLineItems[x].brand + " " + bookingLineItems[x].item + " (" + bookingLineItems[x].booked + " units X " + bookingLineItems[x].days + "days) - DISCOUNT";
										                                  	lineObject.SalesItemLineDetail = new Object();
										                                  	lineObject.SalesItemLineDetail.ItemRef = new Object();
										                                  	lineObject.SalesItemLineDetail.ItemRef.value = "37";
										                                  	lineObject.SalesItemLineDetail.ItemRef.name = "Rental Discounts";
										                                  	lineObject.SalesItemLineDetail.TaxCodeRef = new Object();
										                                  	lineObject.SalesItemLineDetail.TaxCodeRef.value = "6";
										                                  	if(bookingStatus.status == "Void") {
										                                    	lineObject.SalesItemLineDetail.UnitPrice = 0;
										                                  	} else {
										                                    	lineObject.SalesItemLineDetail.UnitPrice = -bookingLineItems[x].discount;
										                                  	}
										                                  	lineObject.SalesItemLineDetail.Qty = bookingLineItems[x].discountPriced;
										                                  	lineArray.push(lineObject);

										                                  	console.log(lineArray.length);
									                                	}
													      			});
														      	});
														    }
														}
													});
												}
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

												console.log(lineArray.length);
											}

											var txn = new Object();
					                        txn.TxnTaxDetail = new Object();
					                        if(bookingStatus.status == "Void") {
					                            txn.TxnTaxDetail.TotalTax = 0;
					                        } else {
					                        	var subsubtotal = 0;

					                        	for(r in bookingLineItems) {
					                        	    subsubtotal += (bookingLineItems[r].originalPriced * bookingLineItems[r].rate);
					                        	}

					                        	var gstgst = 0;
					                        	var subsubdiscount = 0;
					                        	var bookingprivilege;

					                        	db.collection('bookingprivileges').findOne({invoiceId: invoiceId}, function(err, bookingprivilege) {
					                        		bookingprivilege = bookingprivilege;

					                        		for(r in bookingLineItems) {
				                        		  		if(bookingLineItems[r].discountOverwrite != undefined) {
					                        		    	subsubdiscount += bookingLineItems[r].discountOverwrite;
					                        		  	}
					                        		}

					                        		var bookinggroupprices;

					                        		db.collection('bookinggroupprices').find({invoiceId: invoiceId}).toArray(function (err, bookinggroupprices) {
					                        			bookinggroupprices = bookinggroupprices;

					                        			for(x in bookinggroupprices) {
					                        				subsubtotal -= bookinggroupprices[x].privilege.value;
					                        			}

					                        			if(bookingprivilege != undefined && bookingprivilege.status == true) {
				                        			  		var bookinggroupprices;
				                        			  		var privilegepercentage;

				                        			  		db.collection('bookinggroupprices').findOne({invoiceId: invoiceId}, function(err, bookinggroupprices) {
				                        			  			bookinggroupprices = bookinggroupprices;

				                        			  			privilegepercentage = parseFloat(bookinggroupprices.privilege.percentage);
				                        			  		});
					                        			} 

					                        			gstgst = (subsubtotal - subsubdiscount) * 0.07;
					                        			txn.TxnTaxDetail.TotalTax = gstgst;
					                        		});
					                        	});
					                        }

					                        txn.TxnTaxDetail.TaxLine = [];
					                        var taxLineObject = new Object();
					                        if(bookingStatus.status == "Void") {
					                            taxLineObject.Amount = 0;
					                        } else {
					                        	var subsubtotal = 0;

					                        	for(r in bookingLineItems) {
					                        	    subsubtotal += (bookingLineItems[r].originalPriced * bookingLineItems[r].rate);
					                        	}

					                        	var gstgst = 0;
					                        	var subsubdiscount = 0;
					                        	var bookingprivilege;

					                        	db.collection('bookingprivileges').findOne({invoiceId: invoiceId}, function(err, bookingprivilege) {
					                        		bookingprivilege = bookingprivilege;

					                        		for(r in bookingLineItems) {
					                        		  	if(bookingLineItems[r].discountOverwrite != undefined) {
					                        		    	subsubdiscount += bookingLineItems[r].discountOverwrite;
					                        		  	}
					                        		}

					                        		var bookinggroupprices;

					                        		db.collection('bookinggroupprices').find({invoiceId: invoiceId}).toArray(function (err, bookinggroupprices) {
					                        			bookinggroupprices = bookinggroupprices;

					                        			for(x in bookinggroupprices) {
					                        			  	subsubtotal -= bookinggroupprices[x].privilege.value;
					                        			}

					                        			if(bookingprivilege != undefined && bookingprivilege.status == true) {
				                        			  		var bookinggroupprices;
				                        			  		var privilegepercentage;

				                        			  		db.collection('bookinggroupprices').findOne({invoiceId: invoiceId}, function(err, bookinggroupprices) {
				                        			  			bookinggroupprices = bookinggroupprices;

				                        			  			privilegepercentage = parseFloat(bookinggroupprices.privilege.percentage);
				                        			  		});
					                        			} 

					                        			gstgst = (subsubtotal - subsubdiscount) * 0.07;
					                        			taxLineObject.Amount = gstgst;
					                        		});
					                        	});
					                        }

					                        taxLineObject.DetailType = "TaxLineDetail"; 
					                        taxLineObject.TaxLineDetail = new Object();
					                        taxLineObject.TaxLineDetail.TaxRateRef = new Object();
					                        taxLineObject.TaxLineDetail.TaxRateRef.value = "5";
					                        taxLineObject.TaxLineDetail.PercentBased = true;
					                        taxLineObject.TaxLineDetail.TaxPercent = 7;
					                        if(bookingStatus.status == "Void") {
					                            taxLineObject.TaxLineDetail.NetAmountTaxable = 0;
					                        } else {
					                            var subsubtotal = 0;

					                            for(r in bookingLineItems) {
					                                subsubtotal += (bookingLineItems[r].originalPriced * bookingLineItems[r].rate);
					                            }

					                            var gstgst = 0;
					                            var subsubdiscount = 0;
					                            var bookingprivilege;

					                            db.collection('bookingprivileges').findOne({invoiceId: invoiceId}, function(err, bookingprivilege) {
					                        		bookingprivilege = bookingprivilege;

					                        		for(r in bookingLineItems) {
					                        		  	if(bookingLineItems[r].discountOverwrite != undefined) {
					                        		    	subsubdiscount += bookingLineItems[r].discountOverwrite;
					                        		  	}
					                        		}

					                        		var bookinggroupprices;

					                        		db.collection('bookinggroupprices').find({invoiceId: invoiceId}).toArray(function (err, bookinggroupprices) {
					                        			bookinggroupprices = bookinggroupprices;

					                        			for(x in bookinggroupprices) {
				                        			  		subsubtotal -= bookinggroupprices[x].privilege.value;
					                        			}

					                        			if(bookingprivilege != undefined && bookingprivilege.status == true) {
				                        			  		var bookinggroupprices;
				                        			  		var privilegepercentage;

				                        			  		db.collection('bookinggroupprices').findOne({invoiceId: invoiceId}, function(err, bookinggroupprices) {
				                        			  			bookinggroupprices = bookinggroupprices;

				                        			  			privilegepercentage = parseFloat(bookinggroupprices.privilege.percentage);
				                        			  		});
					                        			} 

					                        			gstgst = (subsubtotal - subsubdiscount) * 0.07;
					                        			taxLineObject.TaxLineDetail.NetAmountTaxable = subsubtotal - subsubdiscount;
					                        		});
					                        	});
					                        }

					                        txn.TxnTaxDetail.TaxLine.push(taxLineObject);

					                        var currencyRef = new Object();
					                        currencyRef.value = "SGD";
					                        currencyRef.name = "Singapore Dollar";

					                        var string = "";

					                        if(bookingProject.projectName != undefined) {
					                            string = string.concat("Project Name: " + bookingProject.projectName + ".");
					                        }

					                        for(d in bookingStatus.displayDates) {
					                          	string = string.concat("Group " + (parseInt(bookingStatus.displayDates[d].id) + 1) + ": ");

					                          	for(e in bookingStatus.displayDates[d].dateArray) {
					                            	if(bookingStatus.displayDates[d].dateArray[e].length > 1) {
					                              		string = string.concat(bookingStatus.displayDates[d].dateArray[e][0] + " - " + bookingStatus.displayDates[d].dateArray[e][bookingStatus.displayDates[d].dateArray[e].length - 1]) + ",";
					                            	} else {
					                              		string = string.concat(bookingStatus.displayDates[d].dateArray[e][0]) + ",";
					                            	}
					                          	}
					                        }

					                        console.log("436");

					                        var customerMemo = new Object();

					                        string = string.concat(" --- Generated at: " + moment().format('Do MMMM YYYY, h:mma'));

					                        customerMemo.value = string;

					                        var billObject = new Object();
					                        billObject.Address = customer.email;
					                        
					                        var billAddr = new Object();
					                        billAddr.Id = parseInt(customer2.quickbooksId) + 1;
					                        billAddr.Line1 = customer2.name;
					                        billAddr.Line2 = customer2.address;

					                        if(bookingStatus.quickbooksInvoiceQueryId == "Pending") {
					                        	var latestDocNumber;

			                        			db.collection('quickbooksInvoices').findOne({latest: true}, function(err, quickbooksinvoice) {
			                        				latestDocNumber = quickbooksinvoice;

			                        				console.log("456")

			                        				latestDocNumber.invoiceDocNumber = parseInt(latestDocNumber.invoiceDocNumber);  

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

		                        				  		db.collection('quickbooksInvoices').findOneAndUpdate({latest: true}, {$set: latestDocNumber}, {}, (err, doc) => {
		                        				  			const body = {
		                        				  				DocNumber: latestDocNumber.invoiceDocNumber,
		                        				  				Line: lineArray,
		                        				  				CurrencyRef: currencyRef,
		                        				  				CustomerRef: {
	                        				  				  		value: customer.quickbooksId
		                        				  				},
		                        				  				BillAddr: billAddr,
									                            BillEmail: billObject,
									                            TxnTaxDetail: txn.TxnTaxDetail,
									                            CustomerMemo: customerMemo
		                        				  			};

		                        				  			console.log(lineArray.length);

		                        				  			oauthClient.makeApiCall({
		                        				  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice',
		                        				  			    method: 'POST',
		                        				  			    headers: {
		                        				  			      'Content-Type': 'application/json'
		                        				  			    },
		                        				  			    body: JSON.stringify(body)
                        				  			  		}).then(function(response){
                				  			              		console.log('The API response is  : ' + response);
                    				  			          	}).catch(function(e) {
                				  			              		console.log('The error is '+ JSON.stringify(e));
                    				  			          	});
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
								                            TxnTaxDetail: txn.TxnTaxDetail,
								                            CustomerMemo: customerMemo
	                        				  			};

	                        				  			console.log("516");
	                        				  			console.log(lineArray.length);

	                        				  			oauthClient.makeApiCall({
	                        				  			    url: 'https://quickbooks.api.intuit.com/v3/company/412738331/invoice',
	                        				  			    method: 'POST',
	                        				  			    headers: {
	                        				  			      'Content-Type': 'application/json'
	                        				  			    },
	                        				  			    body: JSON.stringify(body)
                    				  			  		}).then(function(response){
            				  			              		console.log('The API response is  : ' + response);
                				  			          	}).catch(function(e) {
            				  			              		console.log('The error is '+ JSON.stringify(e));
                				  			          	});
			                        				}
					                        	});
					                        }
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
};

exports.sync = sync;