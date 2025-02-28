exports.handler = async function(event, context) {
    // Get the API key from environment variables
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    // Get the origin from the request headers
    const origin = event.headers.origin || '*';

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: ''
        };
    }

    if (!apiKey) {
        console.log('API key not found in environment variables');
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': origin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Google Places API key not configured'
            })
        };
    }

    console.log('Successfully retrieved API key');
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: apiKey
        })
    };
}; 