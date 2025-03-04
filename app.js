// Configuration for OpenAI API
async function getOpenAIKey() {
    try {
        const response = await fetch('/.netlify/functions/get-openai-key');
        if (!response.ok) {
            const error = await response.json();
            console.error('API Key Error:', error);
            return null;
        }
        const data = await response.json();
        if (!data.key || !data.key.startsWith('sk-')) {
            console.error('Invalid API key format received');
            return null;
        }
        return data.key;
    } catch (error) {
        console.error('Failed to get API key:', error);
        return null;
    }
}

// Configuration for Google Places API
async function initGooglePlaces() {
    console.log('Starting Google Places initialization...'); // Debug log
    try {
        console.log('Fetching Google API key...'); // Debug log
        const response = await fetch('/.netlify/functions/get-google-key');
        if (!response.ok) {
            const error = await response.json();
            console.error('Google Places API Key Error:', error);
            return;
        }
        const data = await response.json();
        console.log('Successfully retrieved API key'); // Debug log
        
        // Remove any existing Google Maps scripts
        const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        existingScripts.forEach(script => script.remove());
        console.log('Removed existing Google Maps scripts'); // Debug log
        
        // Load the Google Places API script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&callback=initAutocomplete`;
        script.async = true;
        script.defer = true;
        
        // Add error handling for script loading
        script.onerror = () => {
            console.error('Failed to load Google Places API script');
        };
        
        document.head.appendChild(script);
        console.log('Added new Google Places API script to head'); // Debug log
    } catch (error) {
        console.error('Failed to initialize Google Places:', error);
    }
}

// Initialize Google Places Autocomplete
function initAutocomplete() {
    console.log('Initializing autocomplete...'); // Debug log
    const locationInput = document.getElementById('location');
    const restaurantInput = document.getElementById('restaurant');

    if (!locationInput || !restaurantInput) {
        console.error('Input elements not found');
        return;
    }

    try {
        // Initialize restaurant name autocomplete
        const restaurantAutocomplete = new google.maps.places.Autocomplete(restaurantInput, {
            fields: ['address_components', 'name', 'formatted_address', 'geometry', 'place_id', 'types'],
            types: ['restaurant', 'food', 'cafe', 'bar'] // Only show food establishments
        });

        // Initialize location autocomplete
        const locationAutocomplete = new google.maps.places.Autocomplete(locationInput, {
            fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
            types: ['address'] // Only show addresses
        });

        console.log('Autocomplete objects created successfully'); // Debug log

        // Handle restaurant selection
        restaurantAutocomplete.addListener('place_changed', () => {
            console.log('Restaurant selection detected'); // Debug log
            const place = restaurantAutocomplete.getPlace();
            console.log('Selected restaurant:', place); // For debugging

            if (!place.geometry) {
                console.error('No place geometry found');
                return;
            }

            // Extract and set location information
            let city = '';
            let state = '';
            let address = '';

            if (place.address_components) {
                for (const component of place.address_components) {
                    const type = component.types[0];
                    if (type === 'locality') {
                        city = component.long_name;
                    } else if (type === 'administrative_area_level_1') {
                        state = component.short_name;
                    } else if (type === 'street_number' || type === 'route') {
                        address += component.long_name + ' ';
                    }
                }
            }

            // Update form fields
            document.getElementById('city').value = city;
            document.getElementById('state').value = state;
            document.getElementById('location').value = place.formatted_address || '';

            console.log('Updated form with restaurant data:', { 
                name: place.name,
                address: place.formatted_address,
                city,
                state
            });
        });

        // Handle location selection
        locationAutocomplete.addListener('place_changed', () => {
            console.log('Location selection detected'); // Debug log
            const place = locationAutocomplete.getPlace();
            console.log('Selected location:', place); // For debugging

            if (!place.geometry) {
                console.error('No place geometry found');
                return;
            }

            // Extract city and state
            let city = '';
            let state = '';
            if (place.address_components) {
                for (const component of place.address_components) {
                    const type = component.types[0];
                    if (type === 'locality') {
                        city = component.long_name;
                    } else if (type === 'administrative_area_level_1') {
                        state = component.short_name;
                    }
                }
            }

            // Update hidden fields
            document.getElementById('city').value = city;
            document.getElementById('state').value = state;

            console.log('Updated location data:', { city, state });
        });

        console.log('Autocomplete initialization completed successfully'); // Debug log
    } catch (error) {
        console.error('Error initializing autocomplete:', error);
    }
}

// Make initAutocomplete available globally
window.initAutocomplete = initAutocomplete;

// State Sales Tax Rates (2024)
const STATE_TAX_RATES = {
    'AL': 4.00,
    'AK': 0.00,
    'AZ': 5.60,
    'AR': 6.50,
    'CA': 7.25,
    'CO': 2.90,
    'CT': 6.35,
    'DE': 0.00,
    'FL': 6.00,
    'GA': 4.00,
    'HI': 4.00,
    'ID': 6.00,
    'IL': 6.25,
    'IN': 7.00,
    'IA': 6.00,
    'KS': 6.50,
    'KY': 6.00,
    'LA': 4.45,
    'ME': 5.50,
    'MD': 6.00,
    'MA': 6.25,
    'MI': 6.00,
    'MN': 6.875,
    'MS': 7.00,
    'MO': 4.225,
    'MT': 0.00,
    'NE': 5.50,
    'NV': 6.85,
    'NH': 0.00,
    'NJ': 6.625,
    'NM': 5.125,
    'NY': 4.00,
    'NC': 4.75,
    'ND': 5.00,
    'OH': 5.75,
    'OK': 4.50,
    'OR': 0.00,
    'PA': 6.00,
    'RI': 7.00,
    'SC': 6.00,
    'SD': 4.50,
    'TN': 7.00,
    'TX': 6.25,
    'UT': 6.10,
    'VT': 6.00,
    'VA': 5.30,
    'WA': 6.50,
    'WV': 6.00,
    'WI': 5.00,
    'WY': 4.00,
    'DC': 6.00
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, initializing application...'); // Debug log
    const form = document.getElementById('recommendationForm');
    const recommendationsDiv = document.getElementById('recommendations');
    const resultsDiv = document.getElementById('recommendationResults');
    const tipSlider = document.getElementById('tipSlider');
    const tipPercentage = document.getElementById('tipPercentage');
    const taxRateSpan = document.getElementById('taxRate');
    let currentFormData = null;

    // Initialize Google Places
    initGooglePlaces();

    // Load saved favorites from localStorage
    const savedFavorites = JSON.parse(localStorage.getItem('taxTipFavorites')) || [];

    // Add favorites section to the form
    const taxTipSection = document.querySelector('.mb-6.space-y-4');
    const favoritesHtml = `
        <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between">
                <label class="text-gray-700">Saved Combinations</label>
                <button type="button" id="saveCurrent" class="text-sm text-black hover:text-gray-600">
                    Save Current →
                </button>
            </div>
            <div id="favoritesList" class="space-y-2">
                ${savedFavorites.map((fav, index) => `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span class="text-sm">Tax: ${fav.tax}% | Tip: ${fav.tip}%</span>
                        <div class="flex space-x-2">
                            <button type="button" data-index="${index}" class="apply-favorite text-sm text-black hover:text-gray-600">
                                Apply
                            </button>
                            <button type="button" data-index="${index}" class="delete-favorite text-sm text-red-600 hover:text-red-800">
                                ×
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    taxTipSection.insertAdjacentHTML('beforeend', favoritesHtml);

    // Handle saving current combination
    document.getElementById('saveCurrent').addEventListener('click', () => {
        const newFavorite = {
            tax: parseFloat(currentFormData?.taxRate || 0).toFixed(2),
            tip: tipSlider.value
        };
        
        // Check if this combination already exists
        if (!savedFavorites.some(fav => fav.tax === newFavorite.tax && fav.tip === newFavorite.tip)) {
            savedFavorites.push(newFavorite);
            localStorage.setItem('taxTipFavorites', JSON.stringify(savedFavorites));
            updateFavoritesList();
        }
    });

    // Handle applying and deleting favorites
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('apply-favorite')) {
            const index = e.target.dataset.index;
            const favorite = savedFavorites[index];
            tipSlider.value = favorite.tip;
            tipPercentage.textContent = `${favorite.tip}%`;
        } else if (e.target.classList.contains('delete-favorite')) {
            const index = e.target.dataset.index;
            savedFavorites.splice(index, 1);
            localStorage.setItem('taxTipFavorites', JSON.stringify(savedFavorites));
            updateFavoritesList();
        }
    });

    function updateFavoritesList() {
        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = savedFavorites.map((fav, index) => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span class="text-sm">Tax: ${fav.tax}% | Tip: ${fav.tip}%</span>
                <div class="flex space-x-2">
                    <button type="button" data-index="${index}" class="apply-favorite text-sm text-black hover:text-gray-600">
                        Apply
                    </button>
                    <button type="button" data-index="${index}" class="delete-favorite text-sm text-red-600 hover:text-red-800">
                        ×
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Update tip percentage display when slider moves
    tipSlider.addEventListener('input', (e) => {
        tipPercentage.textContent = `${e.target.value}%`;
    });

    // Function to fetch sales tax rate for a given location
    async function getSalesTaxRate(city, state) {
        const stateCode = state.toUpperCase();
        const rate = STATE_TAX_RATES[stateCode];
        
        if (rate === undefined) {
            taxRateSpan.textContent = 'Tax rate not found';
            return 8.0; // Default rate if state not found
        }
        
        taxRateSpan.textContent = `Sales Tax: ${rate}%`;
        return rate;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Getting Recommendations...';
        submitButton.disabled = true;

        // Gather form data
        currentFormData = {
            restaurant: document.getElementById('restaurant').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            partySize: parseInt(document.getElementById('partySize').value) || 1,
            minBudget: document.getElementById('minBudget').value,
            maxBudget: document.getElementById('maxBudget').value,
            includeTax: document.getElementById('includeTax').checked,
            tipPercentage: parseInt(document.getElementById('tipSlider').value),
            familyStyle: document.getElementById('familyStyle').checked,
            courses: Array.from(document.querySelectorAll('input[name="courses"]:checked'))
                .map(checkbox => checkbox.value),
            preferences: Array.from(document.querySelectorAll('input[name="preferences"]:checked'))
                .map(checkbox => checkbox.value),
            additional: document.getElementById('additional').value
        };

        try {
            // Get tax rate for the location
            const taxRate = await getSalesTaxRate(currentFormData.city, currentFormData.state);
            currentFormData.taxRate = taxRate;
            
            // Calculate budget limits
            const minBudget = parseFloat(currentFormData.minBudget);
            const maxBudget = parseFloat(currentFormData.maxBudget);
            
            if (currentFormData.includeTax) {
                const taxMultiplier = 1 + (taxRate / 100);
                const tipMultiplier = 1 + (currentFormData.tipPercentage / 100);
                // Work backwards from total to get food budget range
                const minFoodBudget = minBudget / (taxMultiplier * tipMultiplier);
                const maxFoodBudget = maxBudget / (taxMultiplier * tipMultiplier);
                currentFormData.adjustedMinBudget = minFoodBudget.toFixed(2);
                currentFormData.adjustedMaxBudget = maxFoodBudget.toFixed(2);
                currentFormData.totalMinBudget = minBudget;
                currentFormData.totalMaxBudget = maxBudget;
            } else {
                currentFormData.adjustedMinBudget = minBudget.toFixed(2);
                currentFormData.adjustedMaxBudget = maxBudget.toFixed(2);
                currentFormData.totalMinBudget = minBudget;
                currentFormData.totalMaxBudget = maxBudget;
            }

            const recommendations = await getAIRecommendations(currentFormData);
            displayRecommendations(recommendations);
        } catch (error) {
            displayError(error.message);
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    async function getAIRecommendations(formData, feedback = '') {
        const OPENAI_API_KEY = await getOpenAIKey();
        if (!OPENAI_API_KEY) {
            throw new Error('Please configure your OpenAI API key first');
        }

        const budgetMessage = formData.includeTax 
            ? `- Total budget range (including ${formData.taxRate}% sales tax and ${formData.tipPercentage}% tip): $${formData.totalMinBudget} - $${formData.totalMaxBudget}\n  (This means the food total should be between $${formData.adjustedMinBudget} and $${formData.adjustedMaxBudget} before tax and tip)`
            : `- Budget range for food (before tax and tip): $${formData.adjustedMinBudget} - $${formData.adjustedMaxBudget}`;

        const coursesMessage = formData.courses.length
            ? `- Requested courses: ${formData.courses.join(', ')}`
            : '- No specific course preferences';

        const getFamilyStyleGuidelines = (partySize) => {
            // Calculate recommended number of dishes based on party size
            const appetizers = Math.max(3, Math.min(5, Math.ceil(partySize * 0.7)));
            const entrees = Math.max(3, Math.min(5, Math.ceil(partySize * 0.6)));
            const desserts = Math.max(2, Math.min(3, Math.ceil(partySize * 0.4)));
            
            return `For a group of ${partySize} people sharing family style:
            - Recommend ${appetizers} different appetizers that can be shared
            - Recommend ${entrees} different entrees to accommodate various tastes
            - If desserts are requested, recommend ${desserts} different options
            - Ensure dishes complement each other and provide a variety of flavors and ingredients
            - Each dish should serve 2-4 people on average
            - Include a mix of proteins, vegetables, and starches across the selections`;
        };

        const diningStyle = formData.familyStyle
            ? getFamilyStyleGuidelines(formData.partySize)
            : "Please recommend individual dishes for each person, aiming to get as close to the maximum budget as possible while staying within range. Ensure everyone gets their requested courses.";

        const prompt = `As an AI restaurant menu expert, please recommend dishes from ${formData.restaurant} 
            located in ${formData.city}, ${formData.state}, with the following criteria:
            - Party size: ${formData.partySize} people
            ${budgetMessage}
            ${coursesMessage}
            ${formData.preferences.length ? `- Dietary preferences: ${formData.preferences.join(', ')}` : ''}
            ${formData.additional ? `- Additional preferences: ${formData.additional}` : ''}
            ${feedback ? `- Additional feedback: ${feedback}` : ''}
            
            ${diningStyle}
            
            IMPORTANT GUIDELINES:
            1. Try to get as close to the maximum budget as possible while staying within the range
            2. Only include courses that were specifically requested
            3. For each dish, include:
               - Name of the dish
               - Brief description and why it matches the criteria
               - Price (in USD)
               - ${formData.familyStyle ? 'Recommended serving size (how many people it typically serves)' : 'Whether it is an individual portion'}
               ${formData.familyStyle ? '- Suggested number of orders for the group size' : ''}

            After listing the recommendations, please provide a detailed cost breakdown:
            - Subtotal for food (including multiple orders of shared dishes if needed)
            - Sales tax (${formData.taxRate}%)
            - Optional tip (${formData.tipPercentage}%)
            - Total with tax and tip

            Ensure the total cost (including tax and tip if specified) stays within the $${formData.totalMinBudget} - $${formData.totalMaxBudget} range.`;

        try {
            const response = await fetch('/.netlify/functions/get-openai-recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('API Error:', errorData);
                throw new Error(`API Error: ${errorData?.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.content;
        } catch (error) {
            console.error('Full error:', error);
            throw new Error(`Failed to get recommendations: ${error.message}`);
        }
    }

    function displayRecommendations(recommendations) {
        recommendationsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = `
            <div class="prose">
                ${formatRecommendations(recommendations)}
                <div class="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 class="text-lg font-semibold mb-3">Want to refine these recommendations?</h3>
                    <p class="text-gray-600 mb-4">Let us know what you'd like to adjust:</p>
                    <textarea id="feedbackText" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        rows="3" placeholder="Example: I'd like more vegetarian options, or dishes with less spice..."></textarea>
                    <button onclick="handleFeedback()" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200">
                        Refine Recommendations
                    </button>
                </div>
            </div>
        `;
        recommendationsDiv.scrollIntoView({ behavior: 'smooth' });

        // Add the feedback handler to window scope
        window.handleFeedback = async () => {
            const feedbackText = document.getElementById('feedbackText').value;
            if (!feedbackText.trim()) return;

            const feedbackButton = document.querySelector('#recommendationResults button');
            const originalButtonText = feedbackButton.textContent;
            feedbackButton.textContent = 'Getting Refined Recommendations...';
            feedbackButton.disabled = true;

            try {
                const newRecommendations = await getAIRecommendations(currentFormData, feedbackText);
                displayRecommendations(newRecommendations);
            } catch (error) {
                displayError(error.message);
            } finally {
                feedbackButton.textContent = originalButtonText;
                feedbackButton.disabled = false;
            }
        };
    }

    function formatRecommendations(text) {
        // Convert the text to HTML with price highlighting
        return text.split('\n').map(line => {
            // Highlight prices that match the pattern $XX.XX or $X
            line = line.replace(/\$\d+(\.\d{2})?/g, match => 
                `<span class="text-green-600 font-semibold">${match}</span>`);
            
            // Add special styling for the cost breakdown section
            if (line.includes('cost breakdown') || line.includes('Subtotal') || 
                line.includes('Sales tax') || line.includes('tip') || line.includes('Total')) {
                return `<p class="mb-2 font-medium ${line.includes('Total') ? 'text-lg border-t pt-2' : ''}">${line}</p>`;
            }
            
            if (line.startsWith('-')) {
                return `<p class="ml-4 mb-2">${line}</p>`;
            }
            return `<p class="mb-2">${line}</p>`;
        }).join('');
    }

    function displayError(message) {
        recommendationsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                <p>${message}</p>
            </div>
        `;
        recommendationsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    // Add event listeners for food category cards
    document.querySelectorAll('.food-grid-item').forEach(card => {
        card.addEventListener('click', async function() {
            this.classList.toggle('flipped');
            
            if (this.classList.contains('flipped')) {
                const category = this.querySelector('h3').textContent;
                const restaurantsList = this.querySelector('ul');
                
                // Show loading state
                restaurantsList.innerHTML = `
                    <li class="text-sm py-1 text-gray-500">
                        <div class="flex items-center space-x-2">
                            <svg class="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Finding restaurants near you...</span>
                        </div>
                    </li>`;
                
                try {
                    // Get user's location
                    const position = await getCurrentPosition();
                    const { latitude, longitude } = position.coords;
                    
                    // Search for restaurants
                    const service = new google.maps.places.PlacesService(document.createElement('div'));
                    const request = {
                        location: new google.maps.LatLng(latitude, longitude),
                        radius: '5000',
                        type: ['restaurant'],
                        keyword: category
                    };
                    
                    service.nearbySearch(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                            const topRestaurants = results.slice(0, 5);
                            restaurantsList.innerHTML = topRestaurants.map(place => `
                                <li class="text-sm py-2 border-b border-gray-100 last:border-0">
                                    <button class="w-full text-left hover:bg-gray-50 transition-colors duration-200 rounded px-2 -mx-2"
                                            onclick="selectRestaurant('${place.name.replace(/'/g, "\\'")}', '${place.vicinity?.replace(/'/g, "\\'")}')">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <strong class="text-black">${place.name}</strong>
                                                <div class="text-gray-600 flex items-center mt-1">
                                                    <span class="mr-2">${place.rating || 'N/A'} ⭐</span>
                                                    ${place.user_ratings_total ? `<span>(${place.user_ratings_total} reviews)</span>` : ''}
                                                </div>
                                                <div class="text-gray-500 text-xs mt-1">${place.vicinity || ''}</div>
                                            </div>
                                            ${place.price_level ? `<span class="text-gray-500">${'$'.repeat(place.price_level)}</span>` : ''}
                                        </div>
                                    </button>
                                </li>
                            `).join('');
                        } else {
                            restaurantsList.innerHTML = `
                                <li class="text-sm py-1 text-gray-500">
                                    <div class="flex items-center space-x-2">
                                        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                        </svg>
                                        <span>No restaurants found nearby</span>
                                    </div>
                                </li>`;
                        }
                    });
                } catch (error) {
                    console.error('Error fetching restaurants:', error);
                    let errorMessage = 'Failed to load restaurants';
                    if (error.code === 1) { // PERMISSION_DENIED
                        errorMessage = 'Please enable location access to see nearby restaurants';
                    } else if (error.code === 2) { // POSITION_UNAVAILABLE
                        errorMessage = 'Unable to determine your location';
                    } else if (error.code === 3) { // TIMEOUT
                        errorMessage = 'Location request timed out';
                    }
                    
                    restaurantsList.innerHTML = `
                        <li class="text-sm py-1 text-gray-500">
                            <div class="flex items-center space-x-2">
                                <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                <span>${errorMessage}</span>
                            </div>
                        </li>`;
                }
            }
        });
    });

    // Helper function to get current position
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
            } else {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            }
        });
    }

    // Add this function to handle restaurant selection
    window.selectRestaurant = (name, address) => {
        const restaurantInput = document.getElementById('restaurant');
        const locationInput = document.getElementById('location');
        
        restaurantInput.value = name;
        locationInput.value = address || '';
        
        // Trigger the place_changed event on the restaurant autocomplete
        const event = new Event('place_changed');
        restaurantInput.dispatchEvent(event);
        
        // Scroll to the form
        document.getElementById('recommendationForm').scrollIntoView({ behavior: 'smooth' });
        
        // Add visual feedback
        restaurantInput.classList.add('ring-2', 'ring-black');
        setTimeout(() => {
            restaurantInput.classList.remove('ring-2', 'ring-black');
        }, 1000);
    };
});
