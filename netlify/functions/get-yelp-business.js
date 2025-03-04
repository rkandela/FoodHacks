const axios = require('axios');

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { name, address, city, state, placeId } = JSON.parse(event.body);
        const YELP_API_KEY = process.env.YELP_API_KEY;

        if (!YELP_API_KEY) {
            throw new Error('Yelp API key not configured');
        }

        // First try to match using the exact business data
        const matchResponse = await axios({
            method: 'get',
            url: 'https://api.yelp.com/v3/businesses/matches',
            headers: {
                'Authorization': `Bearer ${YELP_API_KEY}`,
                'Content-Type': 'application/json',
            },
            params: {
                name: name,
                address1: address,
                city: city,
                state: state,
                country: 'US',
                match_threshold: 'default'
            }
        });

        let businessId;
        if (matchResponse.data.businesses && matchResponse.data.businesses.length > 0) {
            // Use the first match if found
            businessId = matchResponse.data.businesses[0].id;
        } else {
            // If no exact match, search by name and location
            const searchResponse = await axios({
                method: 'get',
                url: 'https://api.yelp.com/v3/businesses/search',
                headers: {
                    'Authorization': `Bearer ${YELP_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                params: {
                    term: name,
                    location: `${address}, ${city}, ${state}`,
                    limit: 1
                }
            });

            if (searchResponse.data.businesses && searchResponse.data.businesses.length > 0) {
                businessId = searchResponse.data.businesses[0].id;
            } else {
                throw new Error('Restaurant not found on Yelp');
            }
        }

        // Get detailed business information
        const detailsResponse = await axios({
            method: 'get',
            url: `https://api.yelp.com/v3/businesses/${businessId}`,
            headers: {
                'Authorization': `Bearer ${YELP_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify(detailsResponse.data)
        };
    } catch (error) {
        console.error('Yelp API Error:', error);
        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({
                error: error.message,
                details: error.response?.data || 'Internal server error'
            })
        };
    }
}; 