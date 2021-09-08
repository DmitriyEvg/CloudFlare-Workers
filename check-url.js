async function handleRequest(request) {
    const workerURL = 'https://check-url.mitch7013.workers.dev'
    const apiURL = 'https://us.sienna.co'
    let url = request.url.replace(workerURL, apiURL)
    const headers = new Headers

    if (request.method == 'OPTIONS') {
        response = new Response(null, { status: 204} )
    } else {
        response = await fetch(url, {
            method:'GET',
            headers: headers
        })
        response = new Response(response.body, { status: response.status})
    }

    response.headers.append("Access-Control-Allow-Origin", "https://sienna.co")
    response.headers.append("Access-Control-Allow-Headers", "cookies")
    response.headers.append("content-type",	"text/plain charset=UTF-8")
    console.log(response.status)
    return response
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})


