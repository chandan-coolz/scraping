var express = require('express');
var request = require('request');
var async = require("async");
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var fs = require('fs');
var app = express();

app.get('/', function(req, res) {

    url = 'https://medium.com';
    /***********make first request***********************************************/
    request(url, function(error, response, html) {
        if (!error) {

            $ = cheerio.load(html);
            var links = $('a'); 
            var hyperlinks = [];
            $(links).each(function(i, link) {
                hyperlinks.push({
                    "Hperlink": $(link).attr('href')
                });
            });



            /***********now make the next five request using the data  we got from first link***************/
            var lookup_list = [];
            var currentUrlTracker = -1; //track the current url
            for (var i = 0; i < 5 && i < hyperlinks.length; i++) {

                if (hyperlinks[i].Hperlink.indexOf("https://") == -1) {
                    hyperlinks[i].Hperlink = "https://medium.com" + hyperlinks[i].Hperlink;
                }
                lookup_list.push(hyperlinks[i].Hperlink);
                currentUrlTracker++;
            }

            async.map(lookup_list, function(url, callback) {
                request(url, function(error, response, html) {
                    if (!error && response.statusCode == 200) {

                        $ = cheerio.load(html);
                        var links = $('a'); 
                        $(links).each(function(i, link) {
                            hyperlinks.push({
                                "Hperlink": $(link).attr('href')
                            });
                        });
                        if (currentUrlTracker < hyperlinks.length) {
                            //call it successor request 
                            successorRequest(hyperlinks[++currentUrlTracker].Hperlink);
                        }
                        // do any further processing of the data here
                        callback(null, html);

                    }
                });
            }, function(err, results) {
                // completion function
                if (!err) {
                    //write a csv file here
                    var fields = ['Hperlink'];
                    var csv = json2csv({
                        data: hyperlinks,
                        fields: fields
                    });
                    fs.writeFile('hyperlink.csv', csv, function(err) {
                        if (err) {
                            res.send("unable to create file");
                        } else {
                            res.send("file saved");
                        }
                    });
                }
            });


            /*************************now to replace the competed req with new request, to maintain the 
            concurency of 5 request****************************************************/
            function successorRequest(url) {
                request(url, function(error, response, html) {
                    if (!error) {

                        $ = cheerio.load(html);
                        var links = $('a');
                        $(links).each(function(i, link) {
                            hyperlinks.push({
                                "Hperlink": $(link).attr('href')
                            });
                        });

                        if (currentUrlTracker < hyperlinks.length) {
                            //call it successor request
                             successorRequest(hyperlinks[++currentUrlTracker].Hperlink) ;

                        }


                    }

                }); //request


            } //successorRequest


        } else {
            res.end(error);
        }

    });


});

app.listen('3000');
console.log("listening to port 3000");