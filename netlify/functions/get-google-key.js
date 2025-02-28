exports.handler = async function(event, context) {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!key) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Google Places API key not found'
            })
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            key: key
        })
    };
}; 