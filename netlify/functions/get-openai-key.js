exports.handler = async function(event, context) {
    const key = process.env.OPENAI_API_KEY;
    console.log('Key starts with:', key ? key.substring(0, 7) : 'undefined');
    
    if (!key) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'API key not found'
            })
        };
    }

    // Verify the key by making a test request to OpenAI
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: `API key verification failed: ${error.error?.message || 'Unknown error'}`
                })
            };
        }

        // If we get here, the key is valid
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
    } catch (error) {
        console.error('Error verifying API key:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: `Error verifying API key: ${error.message}`
            })
        };
    }
}; 