exports.handler = async function(event, context) {
    const key = process.env.OPENAI_API_KEY;
    console.log('Key starts with:', key ? key.substring(0, 7) : 'undefined');
    
    if (!key || !(key.startsWith('sk-proj-') || key.startsWith('sk-None-') || key.startsWith('sk-svcacct-') || key.startsWith('sk-'))) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Invalid API key format'
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