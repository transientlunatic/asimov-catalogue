// Global variables
let eventData = null;
let hdf5Data = null;
let currentParameter = null;
let allParameters = [];

// Initialize the viewer when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get event name from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const eventName = urlParams.get('event');
        
        if (!eventName) {
            showError('No event specified in URL');
            return;
        }
        
        // Load event data from catalogue
        const response = await fetch('data.json');
        const allEvents = await response.json();
        eventData = allEvents.find(e => e.name === eventName);
        
        if (!eventData) {
            showError(`Event "${eventName}" not found in catalogue`);
            return;
        }
        
        if (!eventData.samplesUrl) {
            showError(`No HDF5 samples file available for event "${eventName}"`);
            return;
        }
        
        // Update page title
        document.getElementById('eventName').textContent = `Event: ${eventData.name}`;
        document.title = `${eventData.name} - HDF5 Data Viewer`;
        
        // Load HDF5 file
        await loadHDF5File(eventData.samplesUrl);
        
    } catch (error) {
        console.error('Error initializing viewer:', error);
        showError(`Failed to initialize viewer: ${error.message}`);
    }
});

// Load HDF5 file
async function loadHDF5File(url) {
    try {
        // Initialize h5wasm
        const { FS, ready } = await h5wasm.ready;
        
        // Fetch the HDF5 file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch HDF5 file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Write file to virtual filesystem
        const filename = '/data.h5';
        FS.writeFile(filename, uint8Array);
        
        // Open the file
        const file = new h5wasm.File(filename, 'r');
        hdf5Data = file;
        
        // Extract parameters and samples
        await extractParameters(file);
        
        // Hide loading, show content
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('eventInfo').classList.remove('d-none');
        document.getElementById('parameterSelection').classList.remove('d-none');
        document.getElementById('plotContainer').classList.remove('d-none');
        
        // Setup event listeners
        setupEventListeners();
        
        // Display first parameter by default
        if (allParameters.length > 0) {
            currentParameter = allParameters[0];
            updatePlot();
        }
        
    } catch (error) {
        console.error('Error loading HDF5 file:', error);
        showError(`Failed to load HDF5 file: ${error.message}`);
    }
}

// Extract parameters from HDF5 file
async function extractParameters(file) {
    try {
        // Common paths where posterior samples might be stored in HDF5 files
        const possiblePaths = [
            'posterior_samples',
            'posterior',
            'samples',
            'IMRPhenomPv2/posterior_samples',
            'C01:IMRPhenomPv2/posterior_samples',
            'PublicationSamples/posterior_samples'
        ];
        
        let samplesGroup = null;
        let samplesPath = null;
        
        // Try to find the samples group
        for (const path of possiblePaths) {
            try {
                if (file.get(path)) {
                    samplesGroup = file.get(path);
                    samplesPath = path;
                    break;
                }
            } catch (e) {
                // Path doesn't exist, continue
                continue;
            }
        }
        
        if (!samplesGroup) {
            // Fallback: list all top-level groups and datasets
            const keys = file.keys();
            console.log('Available top-level keys:', keys);
            
            // Try to find a group with 'posterior' or 'samples' in the name
            for (const key of keys) {
                if (key.toLowerCase().includes('posterior') || key.toLowerCase().includes('samples')) {
                    try {
                        samplesGroup = file.get(key);
                        samplesPath = key;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        
        if (!samplesGroup) {
            throw new Error('Could not find posterior samples in HDF5 file. Please check the file structure.');
        }
        
        // Get parameter names
        const paramNames = samplesGroup.keys();
        
        // Filter out non-numeric parameters and sort
        allParameters = paramNames.filter(name => {
            try {
                const dataset = samplesGroup.get(name);
                // Check if it's a dataset with numeric data
                return dataset && dataset.value && Array.isArray(dataset.value);
            } catch (e) {
                return false;
            }
        }).sort();
        
        if (allParameters.length === 0) {
            throw new Error('No valid numeric parameters found in HDF5 file');
        }
        
        // Store the samples path for later use
        hdf5Data.samplesPath = samplesPath;
        
        // Populate parameter dropdown
        const select = document.getElementById('parameterSelect');
        select.innerHTML = allParameters.map(param => 
            `<option value="${param}">${formatParameterName(param)}</option>`
        ).join('');
        
        // Get sample count from first parameter
        const firstParam = samplesGroup.get(allParameters[0]);
        const sampleCount = firstParam.value.length;
        
        // Update event info
        document.getElementById('infoEventName').textContent = eventData.name;
        document.getElementById('infoEventType').textContent = eventData.type;
        document.getElementById('infoDetectionTime').textContent = formatDateTime(eventData.detectionTime);
        document.getElementById('infoSampleCount').textContent = sampleCount.toLocaleString();
        
    } catch (error) {
        throw new Error(`Error extracting parameters: ${error.message}`);
    }
}

// Format parameter name for display
function formatParameterName(name) {
    // Convert snake_case or camelCase to Title Case
    return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim();
}

// Format date time
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('parameterSelect').addEventListener('change', (e) => {
        currentParameter = e.target.value;
    });
    
    document.getElementById('updatePlot').addEventListener('click', updatePlot);
    
    document.getElementById('binsInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            updatePlot();
        }
    });
}

// Update plot
function updatePlot() {
    try {
        const parameter = currentParameter || document.getElementById('parameterSelect').value;
        const bins = parseInt(document.getElementById('binsInput').value) || 50;
        
        if (!parameter) {
            showError('Please select a parameter');
            return;
        }
        
        // Get the data for this parameter
        const samplesGroup = hdf5Data.get(hdf5Data.samplesPath);
        const dataset = samplesGroup.get(parameter);
        const values = Array.from(dataset.value);
        
        // Update plot title
        document.getElementById('plotTitle').textContent = 
            `Posterior Distribution: ${formatParameterName(parameter)}`;
        
        // Calculate statistics
        const stats = calculateStatistics(values);
        updateStatistics(stats);
        
        // Render histogram
        renderHistogram(values, bins, parameter);
        
    } catch (error) {
        console.error('Error updating plot:', error);
        showError(`Failed to update plot: ${error.message}`);
    }
}

// Calculate statistics
function calculateStatistics(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const median = sorted[Math.floor(n / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const ci5 = sorted[Math.floor(n * 0.05)];
    const ci95 = sorted[Math.floor(n * 0.95)];
    
    return { mean, median, stdDev, ci5, ci95 };
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('statMean').textContent = stats.mean.toExponential(3);
    document.getElementById('statMedian').textContent = stats.median.toExponential(3);
    document.getElementById('statStdDev').textContent = stats.stdDev.toExponential(3);
    document.getElementById('statCI').textContent = 
        `[${stats.ci5.toExponential(3)}, ${stats.ci95.toExponential(3)}]`;
}

// Render histogram using D3
function renderHistogram(values, numBins, parameter) {
    // Clear previous plot
    d3.select('#histogram').selectAll('*').remove();
    
    // Set dimensions
    const isSmallScreen = window.innerWidth < 768;
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const width = Math.min(900, window.innerWidth - 100) - margin.left - margin.right;
    const height = (isSmallScreen ? 350 : 400) - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#histogram')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create histogram bins
    const x = d3.scaleLinear()
        .domain(d3.extent(values))
        .nice()
        .range([0, width]);
    
    const histogram = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(numBins));
    
    const bins = histogram(values);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .nice()
        .range([height, 0]);
    
    // Add bars
    svg.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + 1)
        .attr('y', d => y(d.length))
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
        .attr('height', d => height - y(d.length))
        .attr('fill', '#667eea')
        .attr('opacity', 0.7)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    
    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(8))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 45)
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text(formatParameterName(parameter));
    
    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -50)
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text('Count');
    
    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        );
}

// Show error message
function showError(message) {
    document.getElementById('loadingIndicator').classList.add('d-none');
    document.getElementById('errorMessage').classList.remove('d-none');
    document.getElementById('errorText').textContent = message;
}

// Redraw plot on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentParameter && hdf5Data) {
            updatePlot();
        }
    }, 250);
});
