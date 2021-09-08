/**
 * Last update Wed Oct 14 12:12:12 UTC 2020
 */
async function redirect(request) {
	// Set home URL
	let homeURL = "https://sienna.co"
	// Get URL from request
	let currentURL = request.url
    // Get Cookie from request
	let cookies = request.headers.get('Cookie') || ""
	// Check "region=US" or "wordpress_logged_in" in cookies
	if (cookies.includes("region=US") || cookies.includes("wordpress_logged_in")) {
		return await fetch(request)
	} else {
		// Get "cf-ipcountry" header from request
		const country = request.headers.get("cf-ipcountry") || ""
		// Get User-Agent from request
		let userAgent = request.headers.get("User-Agent") || ""
		// Bot detect func
		function botDetect(botName) {
			return userAgent.includes(botName)
		}
		// Check botdetect or countrycode detect !botList.some(botDetect)
		if ( !botList.some(botDetect) && country != null && country in countryMap) {
			// Set locale URL
			let modifyURL = currentURL.replace(homeURL, countryMap[country])
			return Response.redirect(modifyURL)
		} else {
			return await fetch(request)
		}
	}
}


/**
 * A map of the URLs to redirect to
 * @param {Object} countryMap
 */
const countryMap = {
  US: "https://us.sienna.co",
  RU: "https://us.sienna.co"
}

/**
 * Valid UserAgent botList
 */
const botList = [
"AdsBot-Google",
"AdsBot-Google-Mobile",
"AdsBot-Google-Mobile-Apps",
"APIs-Google",
"DuplexWeb-Google",
"FeedFetcher-Google",
"Googlebot",
"Googlebot-Image",
"Googlebot-News",
"Googlebot-Video",
"Google Favicon",
"Google-Read-Aloud",
"googleweblight",
"Mediapartners-Google",
"Adsbot",
"Applebot",
"bingbot",
"bot@linkfluence.com",
"bots@awario.com",
"coccocbot-image",
"coccocbot-web",
"CrowdTanglebot",
"Facebot",
"Googlebot",
"linkdexbot",
"MJ12bot",
"pingbot",
"Pinterestbot",
"robots",
"trendictionbot",
"Twitterbot",
"UptimeRobot",
"zoominfobot",
"urlStatusBot"
]


async function handleRequest(request) {
  return redirect(request)
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})