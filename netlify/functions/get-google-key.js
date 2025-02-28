exports.handler = async function(event, context) {
    // Check if the API key exists in environment variables
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Google Places API key not found'
            })
        };
    }
    
    // Return the API key with CORS headers
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: apiKey
        })
    };
}; 