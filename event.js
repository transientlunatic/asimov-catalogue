// Get event name from URL
const urlParams = new URLSearchParams(window.location.search);
const eventName = urlParams.get('name');

// Property metadata (same as in app.js)
const PROPERTY_METADATA = {
    // Mass properties
    'mass_1': { label: 'Mass 1', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_2': { label: 'Mass 2', unit: 'M☉', decimals: 2, group: 'mass' },
    'chirp_mass': { label: 'Chirp Mass', unit: 'M☉', decimals: 2, group: 'mass' },
    'total_mass': { label: 'Total Mass', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_ratio': { label: 'Mass Ratio', unit: '', decimals: 3, group: 'mass' },
    'mass_1_source': { label: 'Mass 1 Source', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_2_source': { label: 'Mass 2 Source', unit: 'M☉', decimals: 2, group: 'mass' },
    'total_mass_source': { label: 'Total Mass Source', unit: 'M☉', decimals: 2, group: 'mass' },
    'chirp_mass_source': { label: 'Chirp Mass Source', unit: 'M☉', decimals: 2, group: 'mass' },
    
    // Spin properties
    'chi_eff': { label: 'χ<sub>eff</sub>', unit: '', decimals: 3, group: 'spin' },
    'chi_p': { label: 'χ<sub>p</sub>', unit: '', decimals: 3, group: 'spin' },
    'a_1': { label: 'a<sub>1</sub>', unit: '', decimals: 3, group: 'spin' },
    'a_2': { label: 'a<sub>2</sub>', unit: '', decimals: 3, group: 'spin' },
    'spin_1z': { label: 'Spin 1z', unit: '', decimals: 3, group: 'spin' },
    'spin_2z': { label: 'Spin 2z', unit: '', decimals: 3, group: 'spin' },
    
    // Distance properties
    'luminosity_distance': { label: 'Luminosity Distance', unit: 'Mpc', decimals: 0, group: 'distance' },
    'comoving_distance': { label: 'Comoving Distance', unit: 'Mpc', decimals: 0, group: 'distance' },
    'redshift': { label: 'Redshift', unit: '', decimals: 3, group: 'distance' },
    
    // Other properties
    'final_mass': { label: 'Final Mass', unit: 'M☉', decimals: 2, group: 'other' },
    'final_spin': { label: 'Final Spin', unit: '', decimals: 3, group: 'other' },
    'radiated_energy': { label: 'Radiated Energy', unit: 'M☉c²', decimals: 2, group: 'other' },
    'geocent_time': { label: 'Geocentric Time', unit: 's', decimals: 3, group: 'other' },
    'ra': { label: 'Right Ascension', unit: 'rad', decimals: 3, group: 'other' },
    'dec': { label: 'Declination', unit: 'rad', decimals: 3, group: 'other' },
};

// Format value with uncertainty
function formatValueWithUncertainty(propData, metadata) {
    if (!propData || propData.median === undefined) return '-';
    
    const decimals = metadata?.decimals ?? 2;
    const median = propData.median.toFixed(decimals);
    
    if (propData.lower !== undefined && propData.upper !== undefined) {
        const lower = Math.abs(propData.lower).toFixed(decimals);
        const upper = Math.abs(propData.upper).toFixed(decimals);
        return `${median}<sub>−${lower}</sub><sup>+${upper}</sup>`;
    }
    
    return median;
}

// Load and display event details
async function loadEventDetails() {
    if (!eventName) {
        document.getElementById('eventDetails').innerHTML = 
            '<div class="alert alert-danger">No event name provided in URL.</div>';
        return;
    }

    try {
        // Load event data
        const response = await fetch('data/gwtc4-all.json');
        const events = await response.json();
        
        // Find the event
        const event = events.find(e => e.name === eventName);
        
        if (!event) {
            document.getElementById('eventDetails').innerHTML = 
                `<div class="alert alert-danger">Event "${eventName}" not found.</div>`;
            return;
        }

        // Update page title and headers
        document.title = `${event.name} - Event Details`;
        document.getElementById('eventTitle').textContent = event.name;
        document.getElementById('eventName').textContent = event.name;
        document.getElementById('breadcrumbEvent').textContent = event.name;

        // Group properties
        const groups = {
            mass: [],
            spin: [],
            distance: [],
            other: []
        };

        Object.keys(event.properties).forEach(prop => {
            const metadata = PROPERTY_METADATA[prop];
            if (metadata && event.properties[prop]?.median !== undefined) {
                groups[metadata.group].push(prop);
            } else if (event.properties[prop]?.median !== undefined) {
                groups.other.push(prop);
            }
        });

        // Render properties
        let html = '';

        const renderGroup = (title, props) => {
            if (props.length === 0) return '';
            
            let groupHtml = `<h4 class="mt-4 mb-3">${title}</h4><div class="row">`;
            
            props.forEach(prop => {
                const metadata = PROPERTY_METADATA[prop] || { label: prop, unit: '', decimals: 3 };
                const value = formatValueWithUncertainty(event.properties[prop], metadata);
                const unit = metadata.unit ? ` ${metadata.unit}` : '';
                
                groupHtml += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6 class="card-subtitle mb-2 text-muted">${metadata.label}</h6>
                                <p class="card-text fs-5">${value}${unit}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            groupHtml += '</div>';
            return groupHtml;
        };

        html += renderGroup('Mass Properties', groups.mass);
        html += renderGroup('Spin Properties', groups.spin);
        html += renderGroup('Distance & Position', groups.distance);
        html += renderGroup('Other Properties', groups.other);

        document.getElementById('eventDetails').innerHTML = html;

    } catch (error) {
        console.error('Error loading event details:', error);
        document.getElementById('eventDetails').innerHTML = 
            `<div class="alert alert-danger">Error loading event details: ${error.message}</div>`;
    }
}

// Load event details when page loads
document.addEventListener('DOMContentLoaded', loadEventDetails);
