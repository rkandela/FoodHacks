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
    console.log('Starting Google Places initialization...');
    
    // Add loading state to food category cards
    document.querySelectorAll('.food-grid-item').forEach(card => {
        const list = card.querySelector('ul');
        if (list) {
            list.innerHTML = `
                <li class="text-sm py-1 text-gray-500">
                    <div class="flex items-center space-x-2">
                        <svg class="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Initializing...</span>
                    </div>
                </li>`;
        }
    });

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log(`Fetching Google API key (attempt ${retryCount + 1})...`);
            const response = await fetch('/.netlify/functions/get-google-key');
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Google Places API Key Error:', error);
                throw new Error('Failed to fetch API key');
            }
            
            const data = await response.json();
            if (!data.key) {
                throw new Error('No API key received');
            }
            
            console.log('Successfully retrieved API key');
            
            // Remove any existing Google Maps scripts
            const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
            existingScripts.forEach(script => script.remove());
            
            // Create a promise to handle script loading
            const loadScript = new Promise((resolve, reject) => {
                window.initAutocomplete = () => {
                    console.log('Google Places API loaded successfully');
                    resolve();
                };
                
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&callback=initAutocomplete`;
                script.async = true;
                script.defer = true;
                script.onerror = () => reject(new Error('Failed to load Google Places API script'));
                document.head.appendChild(script);
            });
            
            // Wait for script to load with timeout
            await Promise.race([
                loadScript,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Script load timeout')), 10000))
            ]);
            
            // If we get here, initialization was successful
            console.log('Google Places API initialized successfully');
            return;
            
        } catch (error) {
            console.error(`Attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            
            if (retryCount === maxRetries) {
                console.error('All retry attempts failed');
                // Update food category cards with error state
                document.querySelectorAll('.food-grid-item').forEach(card => {
                    const list = card.querySelector('ul');
                    if (list) {
                        list.innerHTML = `
                            <li class="text-sm py-1 text-gray-500">
                                <div class="flex items-center space-x-2">
                                    <svg class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    <span>Failed to initialize. Please refresh the page.</span>
                                </div>
                            </li>`;
                    }
                });
                return;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
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

            // Store the full place data
            window.selectedRestaurant = {
                name: place.name,
                address: place.formatted_address,
                placeId: place.place_id,
                location: {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                }
            };

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
                state,
                placeId: place.place_id
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

// County Sales Tax Rates (2024)
const COUNTY_TAX_RATES = {
    'AL': {
        'Jefferson': 10.00,
        'Mobile': 10.00,
        'Madison': 9.00,
        'Montgomery': 10.00,
        'Shelby': 9.00
    },
    'AK': {
        'Anchorage': 0.00,
        'Fairbanks North Star': 8.00,
        'Matanuska-Susitna': 8.00,
        'Kenai Peninsula': 7.50,
        'Juneau': 5.00
    },
    'AZ': {
        'Maricopa': 8.30,
        'Pima': 8.70,
        'Pinal': 8.20,
        'Yavapai': 9.35,
        'Yuma': 8.85
    },
    'AR': {
        'Pulaski': 9.00,
        'Benton': 9.50,
        'Washington': 9.75,
        'Sebastian': 9.75,
        'Faulkner': 9.125
    },
    'CA': {
        'Los Angeles': 9.50,
        'Orange': 7.75,
        'San Diego': 7.75,
        'San Francisco': 8.625,
        'Santa Clara': 9.125,
        'Alameda': 10.25,
        'Sacramento': 8.75,
        'San Bernardino': 7.75,
        'Riverside': 7.75,
        'San Mateo': 9.375
    },
    'CO': {
        'Denver': 8.81,
        'El Paso': 8.20,
        'Arapahoe': 8.50,
        'Jefferson': 8.60,
        'Adams': 8.75
    },
    'CT': {
        'Fairfield': 6.35,
        'Hartford': 6.35,
        'New Haven': 6.35,
        'New London': 6.35,
        'Litchfield': 6.35
    },
    'DE': {
        'New Castle': 0.00,
        'Kent': 0.00,
        'Sussex': 0.00
    },
    'FL': {
        'Miami-Dade': 7.00,
        'Broward': 7.00,
        'Palm Beach': 7.00,
        'Hillsborough': 8.50,
        'Orange': 6.50
    },
    'GA': {
        'Fulton': 8.90,
        'Gwinnett': 8.00,
        'DeKalb': 8.00,
        'Cobb': 6.00,
        'Clayton': 8.00
    },
    'HI': {
        'Honolulu': 4.50,
        'Hawaii': 4.50,
        'Maui': 4.50,
        'Kauai': 4.50
    },
    'ID': {
        'Ada': 6.00,
        'Canyon': 6.00,
        'Kootenai': 6.00,
        'Bonneville': 6.00,
        'Bannock': 6.00
    },
    'IL': {
        'Cook': 10.25,
        'DuPage': 8.00,
        'Lake': 8.00,
        'Will': 8.00,
        'Kane': 8.00
    },
    'IN': {
        'Marion': 7.00,
        'Lake': 7.00,
        'Allen': 7.00,
        'Hamilton': 7.00,
        'St. Joseph': 7.00
    },
    'IA': {
        'Polk': 7.00,
        'Linn': 7.00,
        'Scott': 7.00,
        'Johnson': 7.00,
        'Black Hawk': 7.00
    },
    'KS': {
        'Johnson': 9.475,
        'Sedgwick': 9.00,
        'Shawnee': 9.15,
        'Wyandotte': 9.125,
        'Douglas': 9.25
    },
    'KY': {
        'Jefferson': 6.00,
        'Fayette': 6.00,
        'Kenton': 6.00,
        'Boone': 6.00,
        'Warren': 6.00
    },
    'LA': {
        'Orleans': 9.45,
        'Jefferson': 9.20,
        'East Baton Rouge': 9.45,
        'Caddo': 9.05,
        'St. Tammany': 9.20
    },
    'ME': {
        'Cumberland': 5.50,
        'York': 5.50,
        'Penobscot': 5.50,
        'Kennebec': 5.50,
        'Androscoggin': 5.50
    },
    'MD': {
        'Montgomery': 6.00,
        'Prince George\'s': 6.00,
        'Baltimore': 6.00,
        'Anne Arundel': 6.00,
        'Howard': 6.00
    },
    'MA': {
        'Middlesex': 6.25,
        'Worcester': 6.25,
        'Essex': 6.25,
        'Suffolk': 6.25,
        'Norfolk': 6.25
    },
    'MI': {
        'Wayne': 6.00,
        'Oakland': 6.00,
        'Macomb': 6.00,
        'Kent': 6.00,
        'Genesee': 6.00
    },
    'MN': {
        'Hennepin': 8.025,
        'Ramsey': 7.875,
        'Dakota': 7.375,
        'Anoka': 7.375,
        'Washington': 7.375
    },
    'MS': {
        'Hinds': 8.00,
        'Harrison': 7.00,
        'DeSoto': 7.00,
        'Jackson': 7.00,
        'Rankin': 7.00
    },
    'MO': {
        'St. Louis': 9.679,
        'Jackson': 8.850,
        'St. Charles': 8.450,
        'Greene': 8.100,
        'Clay': 8.225
    },
    'MT': {
        'Yellowstone': 0.00,
        'Missoula': 0.00,
        'Gallatin': 0.00,
        'Flathead': 0.00,
        'Cascade': 0.00
    },
    'NE': {
        'Douglas': 7.00,
        'Lancaster': 7.25,
        'Sarpy': 7.00,
        'Hall': 7.00,
        'Buffalo': 7.00
    },
    'NV': {
        'Clark': 8.375,
        'Washoe': 8.265,
        'Lyon': 7.10,
        'Elko': 6.85,
        'Douglas': 7.10
    },
    'NH': {
        'Hillsborough': 0.00,
        'Rockingham': 0.00,
        'Merrimack': 0.00,
        'Strafford': 0.00,
        'Grafton': 0.00
    },
    'NJ': {
        'Bergen': 6.625,
        'Middlesex': 6.625,
        'Essex': 6.625,
        'Hudson': 6.625,
        'Monmouth': 6.625
    },
    'NM': {
        'Bernalillo': 7.875,
        'Doña Ana': 8.3125,
        'Santa Fe': 8.4375,
        'Sandoval': 7.5625,
        'San Juan': 7.8125
    },
    'NY': {
        'New York': 8.875,
        'Kings': 8.875,
        'Queens': 8.875,
        'Erie': 8.75,
        'Monroe': 8.00
    },
    'NC': {
        'Mecklenburg': 7.25,
        'Wake': 7.25,
        'Guilford': 7.00,
        'Forsyth': 7.00,
        'Durham': 7.50
    },
    'ND': {
        'Cass': 7.50,
        'Burleigh': 7.50,
        'Grand Forks': 7.25,
        'Ward': 7.50,
        'Williams': 7.50
    },
    'OH': {
        'Franklin': 7.50,
        'Cuyahoga': 8.00,
        'Hamilton': 7.80,
        'Summit': 6.75,
        'Montgomery': 7.50
    },
    'OK': {
        'Oklahoma': 8.625,
        'Tulsa': 8.517,
        'Cleveland': 8.75,
        'Canadian': 8.00,
        'Comanche': 8.75
    },
    'OR': {
        'Multnomah': 0.00,
        'Washington': 0.00,
        'Clackamas': 0.00,
        'Lane': 0.00,
        'Marion': 0.00
    },
    'PA': {
        'Philadelphia': 8.00,
        'Allegheny': 7.00,
        'Montgomery': 6.00,
        'Bucks': 6.00,
        'Delaware': 6.00
    },
    'RI': {
        'Providence': 7.00,
        'Kent': 7.00,
        'Washington': 7.00,
        'Newport': 7.00,
        'Bristol': 7.00
    },
    'SC': {
        'Greenville': 7.00,
        'Richland': 8.00,
        'Charleston': 9.00,
        'Horry': 8.00,
        'Spartanburg': 7.00
    },
    'SD': {
        'Minnehaha': 6.50,
        'Pennington': 6.50,
        'Lincoln': 6.50,
        'Brown': 6.50,
        'Brookings': 6.50
    },
    'TN': {
        'Shelby': 9.75,
        'Davidson': 9.25,
        'Knox': 9.25,
        'Hamilton': 9.25,
        'Rutherford': 9.75
    },
    'TX': {
        'Harris': 8.25,
        'Dallas': 8.25,
        'Tarrant': 8.25,
        'Bexar': 8.25,
        'Travis': 8.25
    },
    'UT': {
        'Salt Lake': 7.75,
        'Utah': 7.25,
        'Davis': 7.25,
        'Weber': 7.25,
        'Washington': 7.25
    },
    'VT': {
        'Chittenden': 7.00,
        'Washington': 7.00,
        'Rutland': 7.00,
        'Windsor': 7.00,
        'Franklin': 7.00
    },
    'VA': {
        'Fairfax': 6.00,
        'Prince William': 6.00,
        'Virginia Beach': 6.00,
        'Loudoun': 6.00,
        'Henrico': 6.00
    },
    'WA': {
        'King': 10.10,
        'Pierce': 10.30,
        'Snohomish': 10.50,
        'Spokane': 9.00,
        'Clark': 8.50
    },
    'WV': {
        'Kanawha': 7.00,
        'Berkeley': 7.00,
        'Monongalia': 7.00,
        'Cabell': 7.00,
        'Wood': 7.00
    },
    'WI': {
        'Milwaukee': 5.60,
        'Dane': 5.50,
        'Waukesha': 5.10,
        'Brown': 5.50,
        'Racine': 5.10
    },
    'WY': {
        'Laramie': 6.00,
        'Natrona': 6.00,
        'Campbell': 6.00,
        'Sweetwater': 6.00,
        'Fremont': 6.00
    },
    'DC': {
        'District of Columbia': 6.00
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    
    // Initialize Google Places API
    initGooglePlaces().catch(error => {
        console.error('Failed to initialize Google Places:', error);
    });
    
    // Initialize form validation
    const form = document.getElementById('recommendationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Initialize budget range slider
    const budgetSlider = document.getElementById('budgetRange');
    if (budgetSlider) {
        budgetSlider.addEventListener('input', updateBudgetRange);
        // Initial update
        updateBudgetRange({ target: budgetSlider });
    }
    
    // Initialize tip slider
    const tipSlider = document.getElementById('tipRange');
    if (tipSlider) {
        tipSlider.addEventListener('input', updateTipPercentage);
        // Initial update
        updateTipPercentage({ target: tipSlider });
    }
});

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
        try {
            // First, try to get the county from Google Places API
            const geocoder = new google.maps.Geocoder();
            const result = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: `${city}, ${state}` }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK) {
                        resolve(results[0]);
                    } else {
                        reject(new Error('Failed to geocode address'));
                    }
                });
            });

            let county = '';
            // Extract county from address components
            for (const component of result.address_components) {
                if (component.types.includes('administrative_area_level_2')) {
                    county = component.long_name.replace(' County', '');
                    break;
                }
            }

            // If we found a county and have its tax rate, use it
            if (county && COUNTY_TAX_RATES[state]?.[county]) {
                const rate = COUNTY_TAX_RATES[state][county];
                taxRateSpan.textContent = `Sales Tax: ${rate}% (${county} County)`;
                return rate;
            }

            // Fallback to state rate if county not found
            const stateRate = STATE_TAX_RATES[state.toUpperCase()];
            if (stateRate !== undefined) {
                taxRateSpan.textContent = `Sales Tax: ${stateRate}% (State rate - county rate not available)`;
                return stateRate;
            }

            // Default fallback
            taxRateSpan.textContent = 'Tax rate not found';
            return 9.50; // Default to LA County rate as fallback
        } catch (error) {
            console.error('Error getting tax rate:', error);
            taxRateSpan.textContent = 'Error getting tax rate';
            return 9.50; // Default to LA County rate as fallback
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate that we have the correct restaurant data
        if (!window.selectedRestaurant) {
            displayError('Please select a restaurant from the suggestions list');
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Getting Recommendations...';
        submitButton.disabled = true;

        // Update form data to use the stored restaurant information
        currentFormData = {
            restaurant: window.selectedRestaurant.name,
            address: window.selectedRestaurant.address,
            placeId: window.selectedRestaurant.placeId,
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

        try {
            // First, get restaurant data from Yelp
            const response = await fetch('/.netlify/functions/get-yelp-business', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.restaurant,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    placeId: formData.placeId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch restaurant data from Yelp');
            }

            const yelpData = await response.json();
            
            // Include Yelp data in the prompt for more accurate recommendations
            const restaurantInfo = `
                Restaurant: ${formData.restaurant}
                Address: ${formData.address}
                Price Level: ${yelpData.price || 'Not available'}
                Categories: ${yelpData.categories?.map(c => c.title).join(', ') || 'Not available'}
                Rating: ${yelpData.rating || 'Not available'} (${yelpData.review_count || 0} reviews)
                Yelp URL: ${yelpData.url || 'Not available'}
            `;

            const budgetMessage = formData.includeTax 
                ? `- Total budget range (including ${formData.taxRate}% sales tax and ${formData.tipPercentage}% tip): $${formData.totalMinBudget} - $${formData.totalMaxBudget}\n  (This means the food total should be between $${formData.adjustedMinBudget} and $${formData.adjustedMaxBudget} before tax and tip)`
                : `- Budget range for food (before tax and tip): $${formData.adjustedMinBudget} - $${formData.adjustedMaxBudget}`;

            const coursesMessage = formData.courses.length
                ? `- Requested courses: ${formData.courses.join(', ')}`
                : '- No specific course preferences';

            const getFamilyStyleGuidelines = (partySize) => {
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

            const prompt = `As an AI restaurant menu expert, please provide recommendations for ${formData.restaurant} 
                based on the following verified information:
                
                ${restaurantInfo}
                
                CRITERIA:
                - Party size: ${formData.partySize} people
                ${budgetMessage}
                ${coursesMessage}
                ${formData.preferences.length ? `- Dietary preferences: ${formData.preferences.join(', ')}` : ''}
                ${formData.additional ? `- Additional preferences: ${formData.additional}` : ''}
                ${feedback ? `- Additional feedback: ${feedback}` : ''}
                
                ${diningStyle}
                
                IMPORTANT GUIDELINES:
                1. Base recommendations on the restaurant's price level (${yelpData.price || 'unknown'}) and cuisine types (${yelpData.categories?.map(c => c.title).join(', ') || 'unknown'})
                2. Try to get as close to the maximum budget as possible while staying within the range
                3. Only include courses that were specifically requested
                4. For each dish recommendation, include:
                   - Name of the dish (use typical names for this cuisine type and price level)
                   - Brief description of ingredients and preparation style
                   - Estimated price range based on the restaurant's price level
                   - ${formData.familyStyle ? 'Recommended serving size (how many people it typically serves)' : 'Whether it is an individual portion'}
                   ${formData.familyStyle ? '- Suggested number of orders for the group size' : ''}

                After listing the recommendations, please provide a detailed cost breakdown:
                - Subtotal for food (including multiple orders of shared dishes if needed)
                - Sales tax (${formData.taxRate}%)
                - Optional tip (${formData.tipPercentage}%)
                - Total with tax and tip

                Ensure the total cost (including tax and tip if specified) stays within the $${formData.totalMinBudget} - $${formData.totalMaxBudget} range.
                
                Note: These are AI-generated suggestions based on the restaurant's cuisine type, price level, and typical menu items for similar establishments. Actual menu items and prices may vary.`;

            const aiResponse = await fetch('/.netlify/functions/get-openai-recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json().catch(() => null);
                console.error('API Error:', errorData);
                throw new Error(`API Error: ${errorData?.error?.message || aiResponse.statusText}`);
            }

            const data = await aiResponse.json();
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
                <div class="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                    <h4 class="font-semibold mb-2">Important Note</h4>
                    <p class="text-sm">These recommendations are AI-generated suggestions based on similar restaurants and typical menu items. They may not reflect the actual current menu of ${window.selectedRestaurant?.name}. Please check with the restaurant directly for their current menu and prices.</p>
                </div>
                ${formatRecommendations(recommendations)}
                <div class="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 class="text-lg font-semibold mb-3">Want to refine these suggestions?</h3>
                    <p class="text-gray-600 mb-4">Let us know what you'd like to adjust:</p>
                    <textarea id="feedbackText" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        rows="3" placeholder="Example: I'd like more vegetarian options, or dishes with less spice..."></textarea>
                    <button onclick="handleFeedback()" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200">
                        Refine Suggestions
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
                                            onclick="selectRestaurant('${place.name.replace(/'/g, "\\'")}', '${place.vicinity?.replace(/'/g, "\\'")}', '${place.place_id}')">
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

    // Update the selectRestaurant function to get full place details
    window.selectRestaurant = (name, address, placeId) => {
        const restaurantInput = document.getElementById('restaurant');
        const locationInput = document.getElementById('location');
        
        // Get detailed place information
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.getDetails({
            placeId: placeId,
            fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                // Store the full place data
                window.selectedRestaurant = {
                    name: place.name,
                    address: place.formatted_address,
                    placeId: place.place_id,
                    location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    }
                };

                restaurantInput.value = place.name;
                locationInput.value = place.formatted_address || '';

                // Extract and set city and state
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

                document.getElementById('city').value = city;
                document.getElementById('state').value = state;

                // Scroll to the form
                document.getElementById('recommendationForm').scrollIntoView({ behavior: 'smooth' });
                
                // Add visual feedback
                restaurantInput.classList.add('ring-2', 'ring-black');
                setTimeout(() => {
                    restaurantInput.classList.remove('ring-2', 'ring-black');
                }, 1000);
            }
        });
    };
});
