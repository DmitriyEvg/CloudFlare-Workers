async function handleRequest(request) {
    const workerURL = 'https://cf-api.mitch7013.workers.dev'
    const apiURL = 'https://api.cloudflare.com'
    let url = request.url.replace(workerURL, apiURL)
    const headers = new Headers
    headers.append("Content-Type", "application/json")
    headers.append("X-Auth-Email", "mail@domain.local")
    headers.append("X-Auth-Key", "cf-api-key")

    if (request.method == 'OPTIONS') {
        response = new Response(null, { status: 204} )
        response.headers.append("content-type",	"text/plain charset=UTF-8")
    } else if (request.method == 'GET') {
        response = await fetch(url, {
            method: request.method,
            headers: headers
        })
        response = new Response(response.body, response)
    } else {
        response = await fetch(url, {
            method: request.method,
            headers: headers,
            body: request.body
        })
        response = new Response(response.body, response)
    }
    response.headers.append("Access-Control-Allow-Origin", "https://sienna.co")
    response.headers.append("Access-Control-Allow-Headers", "Access-Control-Allow-Origin,content-type,authorization, cookies")
    response.headers.append("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    console.log(response.status)
    return response
}
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})


