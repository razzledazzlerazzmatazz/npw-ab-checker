#!/usr/bin/env node

var chalk = require('chalk');
var program = require('commander');
var FetchStream = require('fetch').FetchStream;

const parseJson = require('parse-json');
//const prettyprint = require('prettyprint').default;

var scramble = ['b', 'n', 'b', 'r', 'i', 'a' ];
var masterURLPart = scramble.reverse().join('');

program
	.version('1.0.0')
	.option('-u, --user [username]', 'SMTP username for Gmail')
	.option('-p, --password [password]', 'SMTP password for Gmail')
	.option('-t, --to [email_address]', 'Email address to send the report to')
	.description('This program loads all ' + masterURLPart + ' properties in New Providence Wharf')
	.parse(process.argv);

console.log(chalk.bold.green('Welcome to the NPM ' + masterURLPart + ' checker!\n'));

var fetchOptions = {
	headers: {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36' 
	}
};

var masterURL = 'https://www.'+masterURLPart+'.co.uk/api/v2/explore_tabs';
var masterURLParams = {
	'version': '1.3.1',
	'_format': 'for_explore_search_web',
	'experiences_per_grid': '100',
	'items_per_grid': '100',
	'guidebooks_per_grid': '200',
	'auto_ib': 'false',
	'fetch_filters': 'true',
	'is_guided_search': 'true',
	'is_new_trips_cards_experiment': 'true',
	'is_new_homes_cards_experiment': 'true',
	'luxury_pre_launch': 'false',
	'screen_size': 'medium',
	'show_groupings': 'false',
	'supports_for_you_v3': 'true',
	'timezone_offset': '0',
	'metadata_only': 'false',
	'is_standard_search': 'true',
	'tab_id': 'home_tab',
	'location': 'E14',
	'refinement_path': '%2Fhomes',
	'allow_override%5B%5D': '',
	'ne_lat': '51.50727439523784',
	'ne_lng': '-0.0034767416224212866',
	'sw_lat': '51.50482846357064',
	'sw_lng': '-0.0063252475962372046',
	'search_by_map': 'true',
	'room_types%5B%5D': 'Entire+home%2Fapt',
	's_tag': 'Ju9qi_O8',
	'section_offset': '0',
	'_intents': 'p1',
	'key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
	'currency': 'GBP',
	'locale': 'en-GB',
};

var finalURL = masterURL + '?' + Object.entries(masterURLParams).map(function(k) { return k[0]+'='+k[1]; }).join('&');

console.log(chalk.bold.green('Will fetch the following URL:\n'));
console.log(chalk.bold.yellow(finalURL+'\n\n'));

var response = '';

var fetch = new FetchStream(finalURL, fetchOptions);

fetch.on('data', function(chunk){
	response += chunk.toString();
});

var jsonResponse = {};

fetch.on('end', function() {
	console.log(chalk.bold.yellow('Finished receiving data.\n'));

	try {
		jsonResponse = parseJson(response);
	} catch (err) {
		console.log(chalk.bold.red(err));
		throw err;
	}

	try {
		var accumulator = (acc, cur) => {
			if(cur.hasOwnProperty('listings')) {
				for(var x in cur.listings) {
					acc.push(cur.listings[x]);
				}
			}
			return acc;
		};
		var listings = new Array();
		jsonResponse.explore_tabs[0].sections.reduce(accumulator, listings);
		console.log(chalk.bold.green('Found ' + listings.length + ' listings:\n\n'));
		listings.map(function (val) {
			console.log('https://www.'+masterURLPart+'.co.uk/rooms/' + val.listing.id + '\t' + val.listing.name);
		});

		// send email
		sendReportEmail(listings);
	} catch (exc) {
		console.log(chalk.bold.red('Exception: '+ exc +'\n'));
	}
});

fetch.on('error', function(error) {
	console.log(chalk.bold.red('Error: '+ error +'\n'));
});

var sendReportEmail = function(listings) {
	var send = require('gmail-send')({
		user: program.user,
		pass: program.password,
		to:   program.to,
		from: program.user,
		subject: 'NPW Checker',
		text:    'gmail-send example 1',         // Plain text
		html:    '<b>html text</b>'            // HTML
	});

	var text = listings.map(function (val) {
		return 'https://www.'+masterURLPart+'.co.uk/rooms/' + val.listing.id + '\t' + val.listing.name;
	}).join('\n');

	var html = listings.map(function (val) {
		return '<p>https://www.'+masterURLPart+'.co.uk/rooms/' + val.listing.id + ' - ' + val.listing.name + '</p>';
	}).join('\n');

	send({ text: text, html: html }, function (err, res) { // eslint-disable-line myrule
		if(err === null) {
			console.log('\nEmail sent\n');
		} else {
			console.log(chalk.bold.red('\nError sending email: '+ err +'\n'));
		}
	});
};
