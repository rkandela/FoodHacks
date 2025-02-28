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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
        script.async = true;
        
        // Add error handling for script loading
        script.onerror = () => {
            console.error('Failed to load Google Places API script');
        };
        
        script.onload = () => {
            console.log('Google Places API script loaded successfully'); // Debug log
            initAutocomplete();
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
    if (!locationInput) {
        console.error('Location input element not found');
        return;
    }

    try {
        const autocomplete = new google.maps.places.Autocomplete(locationInput, {
            fields: ['address_components', 'name', 'formatted_address', 'geometry', 'place_id', 'types'],
            types: ['establishment', 'geocode'] // Allow both establishments and addresses
        });
        console.log('Autocomplete object created successfully'); // Debug log

        // Update placeholder to indicate functionality
        locationInput.setAttribute('placeholder', 'Start typing a restaurant name or address...');

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
            console.log('Place selection detected'); // Debug log
            const place = autocomplete.getPlace();
            console.log('Selected place:', place); // For debugging

            if (!place.address_components) {
                console.error('No address components found in selected place');
                return;
            }

            // Extract city and state
            let city = '';
            let state = '';
            for (const component of place.address_components) {
                const type = component.types[0];
                if (type === 'locality') {
                    city = component.long_name;
                } else if (type === 'administrative_area_level_1') {
                    state = component.short_name;
                }
            }

            console.log('Extracted location data:', { city, state }); // Debug log

            // Update hidden fields
            document.getElementById('city').value = city;
            document.getElementById('state').value = state;

            // If it's a restaurant or food establishment, update the restaurant name
            if (place.types && (place.types.includes('restaurant') || 
                place.types.includes('food') || 
                place.types.includes('cafe') ||
                place.types.includes('bar'))) {
                document.getElementById('restaurant').value = place.name || '';
                console.log('Updated restaurant name:', place.name); // Debug log
            }

            // Update location input to show full address
            locationInput.value = place.formatted_address || '';
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
            budget: document.getElementById('budget').value,
            includeTax: document.getElementById('includeTax').checked,
            tipPercentage: parseInt(document.getElementById('tipSlider').value),
            familyStyle: document.getElementById('familyStyle').checked,
            preferences: Array.from(document.querySelectorAll('input[name="preferences"]:checked'))
                .map(checkbox => checkbox.value),
            additional: document.getElementById('additional').value
        };

        try {
            // Get tax rate for the location
            const taxRate = await getSalesTaxRate(currentFormData.city, currentFormData.state);
            currentFormData.taxRate = taxRate;
            
            // Calculate budget limits
            const totalBudget = parseFloat(currentFormData.budget);
            if (currentFormData.includeTax) {
                const taxMultiplier = 1 + (taxRate / 100);
                const tipMultiplier = 1 + (currentFormData.tipPercentage / 100);
                // Work backwards from total to get food budget
                const foodBudget = totalBudget / (taxMultiplier * tipMultiplier);
                currentFormData.adjustedBudget = foodBudget.toFixed(2);
                currentFormData.totalBudget = totalBudget;
            } else {
                currentFormData.adjustedBudget = totalBudget.toFixed(2);
                currentFormData.totalBudget = totalBudget;
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
            ? `- Total maximum budget (including ${formData.taxRate}% sales tax and ${formData.tipPercentage}% tip): $${formData.totalBudget}\n  (This means the food total should be under $${formData.adjustedBudget} before tax and tip)`
            : `- Maximum budget for food (before tax and tip): $${formData.adjustedBudget}`;

        const diningStyle = formData.familyStyle
            ? "Please recommend shareable dishes suitable for family-style dining. Include a mix of appetizers, mains, and sides that can be shared among the group. The total cost of all dishes combined should not exceed the budget."
            : "Please recommend individual dishes, aiming to keep the per-person cost within the budget while ensuring everyone gets a complete meal.";

        const prompt = `As an AI restaurant menu expert, please recommend dishes from ${formData.restaurant} 
            located in ${formData.city}, ${formData.state}, with the following criteria:
            - Party size: ${formData.partySize} people
            ${budgetMessage}
            ${formData.preferences.length ? `- Dietary preferences: ${formData.preferences.join(', ')}` : ''}
            ${formData.additional ? `- Additional preferences: ${formData.additional}` : ''}
            ${feedback ? `- Additional feedback: ${feedback}` : ''}
            
            ${diningStyle}
            
            Please provide enough dishes to serve ${formData.partySize} people ${formData.familyStyle ? 'family-style' : 'individually'}. For each dish, include:
            1. Name of the dish
            2. Brief description and why it matches the criteria
            3. Price (in USD)
            4. ${formData.familyStyle ? 'Recommended serving size (how many people it typically serves)' : 'Whether it is an individual portion'}

            After listing the recommendations, please provide a detailed cost breakdown:
            - Subtotal for food
            - Sales tax (${formData.taxRate}%)
            - Optional tip (${formData.tipPercentage}%)
            - Total with tax and tip

            IMPORTANT: Ensure the total cost (including tax and tip if specified) stays within the $${formData.totalBudget} budget.
            Format each recommendation with a clear price at the end of each item.`;

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
});
