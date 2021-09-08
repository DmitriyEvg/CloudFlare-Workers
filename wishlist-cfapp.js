// URL settings
var main_url="https://sienna.co";
var check_url="https://check-url.mitch7013.workers.dev"
// CloudFlare API setttings
var zoneId="1482073148375da0df1a4b4d210277aa";
var cf_api_url = "https://cf-api.mitch7013.workers.dev/client/v4/zones/" + zoneId + "/workers/routes/"
var X_Auth_Email = "mail@domain.local"
var X_Auth_Key = "cf-api-key"
// Base auth key
baseAuthKey = "Basic paswd_hash";
// App settings
var xmlHttp = new XMLHttpRequest();
var processInterrupt;
var sitemap_urlList_raw = [];
var sitemap_urlList = [];
var mark_urlList = [];
var routesList = [];
var delete_routesList = [];
var create_routesList = [];
var update_routesList = [];
// Queue variables
var queue_request_busy;
var requestSimpleQueue_count;
var queue_counter;
var queue_request_counter = 0;

// Queue request handler
function queue_request(requestSimpleQueue, queueType) {
	queue_counter = 1;
	requestSimpleQueue_count = requestSimpleQueue.length;
	logObj = addLog("process status");
	var intervalTimeout = 100;
	var requestSimpleInterval = requestSimpleInterval || setInterval(function () {
		if (!queue_request_busy) {
			var dataObj = requestSimpleQueue.shift();
			if (dataObj) {
				queue_request_busy = true;
				// Queue for get status URL's
				if (queueType == "urlStatus") {
					get_call(dataObj.replace(main_url,check_url), "check-url");
				// Queue for disableRoutes
				} else if (queueType == "disableRoutes"){
					data = JSON.stringify(dataObj)
					post_call(cf_api_url + dataObj.id, "disableRoute", data);
					addLogComment(dataObj.pattern, logObj);
				// Queue for deleteRoutes
				} else if (queueType == "deleteRoutes"){
					data = JSON.stringify(dataObj)
					post_call(cf_api_url + dataObj.id, "deleteRoute", data)
					addLogComment(dataObj.pattern, logObj);
				// Queue for createRoutes
				} else if (queueType == "createRoutes"){
					data = JSON.stringify(dataObj)
					post_call(cf_api_url, "createRoute", data)
					addLogComment(dataObj.pattern, logObj);
				// Queue for updateRoutes
				} else if (queueType == "updateRoutes"){
					data = JSON.stringify(dataObj)
					post_call(cf_api_url + dataObj.id, "updateRoute", data)
					if (dataObj.script == "redirect-404-urls") {
						setLogStatus(addLogComment(dataObj.pattern, logObj), "redirect-404-urls", "warn");
					} else {
						addLogComment(dataObj.pattern, logObj);
					}
				}
				// **log and stop handler**
				if (!processInterrupt) {
					if (queue_counter > requestSimpleQueue_count) {
						clearInterval(requestSimpleInterval);
						setLogStatus(logObj, "Done", "success");
					} else {
						setLogStatus(logObj, "[" + queue_counter + " / " + requestSimpleQueue_count + "]", "info");
					}
				} else {
					clearInterval(requestSimpleInterval);
					setLogStatus(logObj,"interrupted by user","error");
				}
			}
		}
	}, intervalTimeout);
}

// GET request handler
function get_call(url, type){
	if (type == "sitemap") {
		// get "sitemap" sync
		xmlHttp.open("GET", url, false);
		xmlHttp.setRequestHeader('Cookies' , 'region=US');
		// "sitemap" callback
		var logObj = addLogComment(url);
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					setLogStatus(logObj, "OK", "success");
					parser = new DOMParser();
					xmlDoc = parser.parseFromString(response, "text/xml");
					sitemapList = xmlDoc.getElementsByTagName("sitemap");
					for (var index = 0; index < sitemapList.length; ++index) {
						var url = sitemapList[index].getElementsByTagName("loc")[0].childNodes[0].data;
						if ( url.includes("post-sitemap.xml") ) {
							setLogStatus(addLogComment(url), "Exclude", "warn");
						} else {
							get_call(url, "sitemap-item");
						}
					}
					function onlyUnique(value, index, self) {
						return self.indexOf(value) === index;
					}
					sitemap_urlList = sitemap_urlList_raw.filter(onlyUnique);
					addHeadline("Verify redirect URLs && mark URLs status");
					queue_request(sitemap_urlList, "urlStatus");
				}
			}
		}
	} else if (type == "sitemap-item") {
		// get "sitemap-item" sync
		xmlHttp.open("GET", url, false);
		xmlHttp.setRequestHeader('Cookies' , 'region=US');
		// "sitemap-item" callback
		var logObj = addLogComment(url);
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					setLogStatus(logObj, "OK", "success");
					parser = new DOMParser();
					xmlDoc = parser.parseFromString(response, "text/xml");
					urlList = xmlDoc.getElementsByTagName("loc");
					for (var index = 0; index < urlList.length; ++index) {
						sitemap_urlList_raw.push(urlList[index].childNodes[0].data);
					}
				}
			}
		}
	} else if (type == "check-url") {
		// get "url-status" async
		xmlHttp.open("GET", url, true);
		xmlHttp.setRequestHeader('Cookies' , 'region=US');
		// "check-url" callback
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState == 2){
				if ( xmlHttp.status == 404 ) {
					script = "redirect-404-urls";
				} else {
					script = "redirect-valid-urls";
				}
				var urlObj = {};
				urlObj.pattern = url.replace(check_url, main_url);
				urlObj.script = script;
				mark_urlList.push(urlObj)
				queue_request_busy = false;
				queue_counter += 1;
				if (queue_counter > requestSimpleQueue_count ) {
					get_call(cf_api_url, "deleteNullRoutes");
				}
			}
		}
	} else if (type == "deleteNullRoutes" || type == "disableAllRoutes") {
		// get "routesList" sync
		xmlHttp.open("GET", url, false);
		addHeadline("Get currentRoutesList from CloudFlare API");
		logObj = addLog("process status");
		xmlHttp.setRequestHeader("Authorization", baseAuthKey);
		// "deleteNullRoutes || disableAllRoutes" callback
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					setLogStatus(logObj, "Done", "success");
					parser = new DOMParser();
					jsonDoc = JSON.parse(response);
					routesList = jsonDoc.result
					// "deleteNullRoutes" callback
					if (type == "deleteNullRoutes") {
						deleteNullRoutes();
					// "disableAllRoutes" callback
					} else if (type == "disableAllRoutes") {
						disableRoutes();
					}
				}
			}
		}
	} else {
		// get "default" sync
		xmlHttp.open("GET", url, false);
		xmlHttp.setRequestHeader('User-Agent', 'urlStatusBot');
		xmlHttp.onreadystatechange = function(){
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					console.log(xmlHttp.status);
				}
			}
		}
	}
	xmlHttp.send();
}

// POST request handler
function post_call(url, type, data){
	if (type == "updateRoute" || type == "disableRoute") {
		xmlHttp.open("PUT", url, true);
		xmlHttp.setRequestHeader("Authorization", baseAuthKey);
		// "updateRoute || disableRoute" callback
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					queue_request_busy = false;
					queue_counter += 1;
					if (queue_counter > requestSimpleQueue_count) {
						successApp();
					}
				}
			}
		}
	} else if (type == "deleteRoute") {
		xmlHttp.open("DELETE", url, true);
		xmlHttp.setRequestHeader("Authorization", baseAuthKey);
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					queue_request_busy = false;
					queue_counter += 1;
					if (queue_counter > requestSimpleQueue_count) {
						
						compareRoutes();
					}
				}
			}
		}
	} else if (type == "createRoute") {
		xmlHttp.open("POST", url, true);
		xmlHttp.setRequestHeader("Authorization", baseAuthKey);
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					queue_request_busy = false;
					queue_counter += 1;
					if (queue_counter > requestSimpleQueue_count) {
						updateRoutes();
					}
				}
			}
		}
	} else {
		xmlHttp.open("POST", url, false);
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState == 4){
				var response = xmlHttp.responseText;
				if (response.length > 0) {
					console.log(xmlHttp.status);
				}
			}
		}
	}
	xmlHttp.send(data);
}


// compareRoutes function
function compareRoutes() {
	addHeadline("Compare all valid URL's and CloudFlare routes");
	function findRoutes(url) {
		for (var index = 0; index < routesList.length; ++index) {
			if ( routesList[index].pattern == url) {
				return routesList[index]
			}
		}
		return false
	}
	for (var index = 0; index < mark_urlList.length; ++index) {
		route = findRoutes(mark_urlList[index].pattern);
		if ( !route ) {
			create_routesList.push(mark_urlList[index])
		} else {
			if (mark_urlList[index].script != route.script) {
				mark_urlList[index].id = route.id;
				update_routesList.push(mark_urlList[index])
			}
		}
	}
	setLogStatus(addLog("process status"), "Done", "success");
	createRoutes();
}
// deleteNullRoutes function
function deleteNullRoutes() {
	var clear_routesList = [];
	addHeadline("Find && Remove empty routes from CloudFlare");
	function find_nullRoutes(url) {
		for (var index = 0; index < mark_urlList.length; ++index) {
			if ( mark_urlList[index].pattern == url) {
				return true
			}
		}
		return false
	}
	for (var index = 0; index < routesList.length; ++index) {
		if ( !find_nullRoutes(routesList[index].pattern) ) {
			delete_routesList.push(routesList[index])
		} else {
			clear_routesList.push(routesList[index])
		}
	}
	if (delete_routesList.length > 0) {
		queue_request(delete_routesList, "deleteRoutes");
	} else {
		setLogStatus(addLog("process status"), "Done", "success");
		compareRoutes(clear_routesList);
	}
}
// createRoutes function
function createRoutes() {
	addHeadline("Create new routes");
	if (create_routesList.length > 0) {
		queue_request(create_routesList, "createRoutes");
	} else {
		setLogStatus(addLog("process status"), "Done", "success");
		updateRoutes();
	}
}
// updateRoutes function
function updateRoutes() {
	addHeadline("Update not match routes");
	if (update_routesList.length > 0) {
		queue_request(update_routesList, "updateRoutes");
	} else {
		setLogStatus(addLog("process status"), "Done", "success");
		successApp();
	}
}
// disableAllRoutes function
function disableRoutes() {
	addHeadline("Disable all routes from currentRoutesList");
	var disable_routesList = [];
	for (var index = 0; index < routesList.length; ++index) {
		if (routesList[index].script) {
			routeObj = {};
			routeObj.id = routesList[index].id;
			routeObj.pattern = routesList[index].pattern;
			disable_routesList.push(routeObj);
		}
	}
	if (disable_routesList.length == 0){
		successApp();
	} else {
		queue_request(disable_routesList, "disableRoutes");
	}
}


// Application handler's
function successApp() {
	addHeadline("All operations done");
	document.getElementById("btn1").disabled=false;
	document.getElementById("btn2").disabled=false;
	document.getElementById("btn3").disabled=true;
}
function initApp() {
	clearLog();
	queue_counter = 1;
	queue_request_busy = false;
	processInterrupt = false;
	sitemap_urlList_raw = [];
	sitemap_urlList = [];
	mark_urlList = [];
	routesList = [];
	delete_routesList = [];
	create_routesList = [];
	update_routesList = [];	
	document.getElementById("btn1").disabled=true;
	document.getElementById("btn2").disabled=true;
	document.getElementById("btn3").disabled=false;
}
function stopApp() {
	processInterrupt = true;
	document.getElementById("btn1").disabled=false;
	document.getElementById("btn2").disabled=false;
	document.getElementById("btn3").disabled=true;
}
// Log's handler's
function clearLog(){
	var div_content = document.getElementById("log");
	div_content.innerHTML = '';
}
function addHeadline(msg) {
	var div_content = document.getElementById("log");
	let newStr = document.createElement("h2");
	newStr.innerHTML = msg;
	div_content.appendChild(newStr);
	div_content.scrollTop = div_content.scrollHeight;
	return newStr
}
function addLog(msg) {
	var div_content = document.getElementById("log");
	let newStr = document.createElement('p');
	newStr.innerHTML = msg;
	div_content.appendChild(newStr);
	setLogStatus(newStr, "...");
	div_content.scrollTop = div_content.scrollHeight;
	return newStr
}
function setLogStatus(el, msg, msgType) {
	spanList = el.getElementsByTagName("span");
	if (spanList.length == 0) {
		let statusElem = document.createElement("span");
		el.appendChild(drawStatusLog(statusElem, msg, msgType));
	} else {
		let statusElem = spanList[0];
		el.appendChild(drawStatusLog(statusElem, msg, msgType));
	}
}
function addLogComment(msg, el) {
	var div_content = document.getElementById("log");
	let commentElem = document.createElement("h3");
	commentElem.innerHTML = msg;
	if (el) {
		div_content.insertBefore(commentElem, el);
	} else {
		div_content.appendChild(commentElem);
	}
	div_content.scrollTop = div_content.scrollHeight;
	return commentElem;
}
function drawStatusLog(el, msg, msgType) {
	el.innerHTML = msg
	if (msgType == "info") {
		el.style.color = "blue"
	} else if (msgType == "success") {
		el.style.color = "SeaGreen";
	} else if (msgType == "warn") {
		el.style.color = "white";
		el.style.backgroundColor = "OrangeRed";
	} else if (msgType == "error") {
		el.style.color = "white";
		el.style.backgroundColor = "red";
	}
	return el
}
// onClick handler's
function updateWorkerRoutes() {
	// application init
	initApp();
	// start process
	addHeadline("Get all URLs from sitemap.xml");
	get_call(main_url + "/sitemap_index.xml", "sitemap");
}
function disableAllRoutes() {
	// application init
	initApp();
	// start process
	addHeadline("Disable all worker routes");
	get_call(cf_api_url, "disableAllRoutes");
}