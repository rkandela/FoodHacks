exports.handler = async function(event, context) {
    // Log all environment variables (excluding their values for security)
    console.log('Available environment variables:', Object.keys(process.env));
    
    // Check if the API key exists in environment variables
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        console.log('API key not found in environment variables');
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Google Places API key not found',
                availableVars: Object.keys(process.env)
            })
        };
    }
    
    console.log('API key found, returning response');
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