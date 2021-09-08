const NAME = "1"
const PASS = "1"
const html = `<!doctype html>
 <html>
	<head>
		<title>CloudFlare redirection control</title>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		<style type="text/css"> 
			p { margin: 0; margin-top: .4em; } 
			span { margin-left: 4em;}
			h1 { color: slateblue; font-size: 1.1em; }
			h2 { color: slateblue; font-size: 1em; margin-bottom: .4em; }
			h3 { color: DarkSlateGray; font-size: 0.95em; margin: 0px; font-style: italic; }
		</style>
		<script type="text/javascript" src="https://sienna.co/wishlist-cfapp.js"></script>
	</head>
	<body>
		<form method="post" action="">
			<input id="btn1" type='button' value='updateWorkerRoutes' onclick='updateWorkerRoutes();'>
			<input id="btn2" type='button' value='disableAllRoutes' onclick='disableAllRoutes();'>
			<input id="btn3" type='button' value='stopProccess' disabled onclick='stopApp();'>
		</form>
		<div id="log" style="margin: 0 auto;width: 95%; padding: 1em 1em 1em 1em; border: 1px inset #d9d9d9;background-color: #eee; height: 80%; overflow-y: scroll;">
		<p>select action for start</p>
		</div>
	</body>
</html>`
/**
 * RegExp for basic auth credentials
 *
 * credentials = auth-scheme 1*SP token68
 * auth-scheme = "Basic" ; case insensitive
 * token68     = 1*( ALPHA / DIGIT / "-" / "." / "_" / "~" / "+" / "/" ) *"="
 */

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/

/**
 * RegExp for basic auth user/pass
 *
 * user-pass   = userid ":" password
 * userid      = *<TEXT excluding ":">
 * password    = *TEXT
 */

const USER_PASS_REGEXP = /^([^:]*):(.*)$/

/**
 * Object to represent user credentials.
 */

const Credentials = function(name, pass) {
  this.name = name
  this.pass = pass
}

/**
 * Parse basic auth to object.
 */

const parseAuthHeader = function(string) {
  if (typeof string !== 'string') {
    return undefined
  }

  // parse header
  const match = CREDENTIALS_REGEXP.exec(string)

  if (!match) {
    return undefined
  }

  // decode user pass
  const userPass = USER_PASS_REGEXP.exec(atob(match[1]))

  if (!userPass) {
    return undefined
  }

  // return credentials object
  return new Credentials(userPass[1], userPass[2])
}


const unauthorizedResponse = function(body) {
  return new Response(
    body, {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="User Visible Realm"'
      }
    }
  )
}

/**
 * Handle request
 */

async function handle(request) {
  const credentials = parseAuthHeader(request.headers.get("Authorization"))
  if ( !credentials || credentials.name !== NAME ||  credentials.pass !== PASS) {
    return unauthorizedResponse("Unauthorized")
  } else {
      return new Response(html, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
    })
  }
}

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})