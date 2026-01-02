// Global variables
let allEvents = [];
let filteredEvents = [];
let sortColumn = null;
let sortDirection = 'asc';

// Property metadata: units, display names, and grouping
const PROPERTY_METADATA = {
    // Mass properties
    'mass_1': { label: 'Mass 1 (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_2': { label: 'Mass 2 (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'chirp_mass': { label: 'Chirp Mass (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'total_mass': { label: 'Total Mass (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_ratio': { label: 'Mass Ratio', unit: '', decimals: 3, group: 'mass' },
    'mass_1_source': { label: 'Mass 1 Source (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'mass_2_source': { label: 'Mass 2 Source (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'total_mass_source': { label: 'Total Mass Source (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    'chirp_mass_source': { label: 'Chirp Mass Source (M☉)', unit: 'M☉', decimals: 2, group: 'mass' },
    
    // Spin properties
    'chi_eff': { label: 'χ<sub>eff</sub>', unit: '', decimals: 3, group: 'spin' },
    'chi_p': { label: 'χ<sub>p</sub>', unit: '', decimals: 3, group: 'spin' },
    'a_1': { label: 'a<sub>1</sub>', unit: '', decimals: 3, group: 'spin' },
    'a_2': { label: 'a<sub>2</sub>', unit: '', decimals: 3, group: 'spin' },
    'spin_1z': { label: 'Spin 1z', unit: '', decimals: 3, group: 'spin' },
    'spin_2z': { label: 'Spin 2z', unit: '', decimals: 3, group: 'spin' },
    
    // Distance properties
    'luminosity_distance': { label: 'Luminosity Distance (Mpc)', unit: 'Mpc', decimals: 0, group: 'distance' },
    'comoving_distance': { label: 'Comoving Distance (Mpc)', unit: 'Mpc', decimals: 0, group: 'distance' },
    'redshift': { label: 'Redshift', unit: '', decimals: 3, group: 'distance' },
    
    // Other properties
    'final_mass': { label: 'Final Mass (M☉)', unit: 'M☉', decimals: 2, group: 'other' },
    'final_spin': { label: 'Final Spin', unit: '', decimals: 3, group: 'other' },
    'radiated_energy': { label: 'Radiated Energy (M☉c²)', unit: 'M☉c²', decimals: 2, group: 'other' },
};

// Default columns to display
const DEFAULT_COLUMNS = ['mass_1', 'mass_2', 'chirp_mass', 'luminosity_distance', 'chi_eff', 'chi_p'];

// Current selected columns
let selectedColumns = [...DEFAULT_COLUMNS];

// Current plot axes
let plotXAxis = 'luminosity_distance';
let plotYAxis = 'total_mass';
let showUncertainties = true;

// Observing run mapping
function getObservingRun(eventName) {
    // Validate basic format: expect at least 6 characters so we can read YYMM
    if (typeof eventName !== 'string' || eventName.length < 6) {
        return 'Unknown';
    }

    const yearStr = eventName.substring(2, 4);
    const monthStr = eventName.substring(4, 6);

    // Ensure year and month substrings are numeric
    if (!/^\d{2}$/.test(yearStr) || !/^\d{2}$/.test(monthStr)) {
        return 'Unknown';
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // Validate month range
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return 'Unknown';
    }
    
    // O1: Sep 2015 - Jan 2016
    if ((year === 15 && month >= 9) || (year === 16 && month <= 1)) return 'O1';
    // O2: Nov 2016 - Aug 2017
    if ((year === 16 && month >= 11) || (year === 17 && month <= 8)) return 'O2';
    // O3a: Apr 2019 - Oct 2019
    if (year === 19 && month >= 4 && month <= 10) return 'O3a';
    // O3b: Nov 2019 - Mar 2020
    if ((year === 19 && month >= 11) || (year === 20 && month <= 3)) return 'O3b';
    // O4a: May 2023 - Jan 2024
    if ((year === 23 && month >= 5) || (year === 24 && month <= 1)) return 'O4a';
    return 'Unknown';
}

// URL State Management
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search') || '',
        minMass: params.get('minMass') || '',
        maxMass: params.get('maxMass') || '',
        minDistance: params.get('minDistance') || '',
        maxDistance: params.get('maxDistance') || '',
        observingRun: params.get('observingRun') || '',
        plotX: params.get('plotX') || 'luminosity_distance',
        plotY: params.get('plotY') || 'total_mass',
        showUncertainties: params.get('showUncertainties') !== 'false',
        columns: params.get('columns') ? params.get('columns').split(',') : null
    };
}

function updateURL() {
    const params = new URLSearchParams();
    
    // Add filter parameters
    const search = document.getElementById('search').value;
    if (search) params.set('search', search);
    
    const minMass = document.getElementById('minMass').value;
    if (minMass) params.set('minMass', minMass);
    
    const maxMass = document.getElementById('maxMass').value;
    if (maxMass) params.set('maxMass', maxMass);
    
    const minDistance = document.getElementById('minDistance').value;
    if (minDistance) params.set('minDistance', minDistance);
    
    const maxDistance = document.getElementById('maxDistance').value;
    if (maxDistance) params.set('maxDistance', maxDistance);
    
    const observingRun = document.getElementById('observingRun')?.value;
    if (observingRun && observingRun !== '') params.set('observingRun', observingRun);
    
    // Add plot parameters
    if (plotXAxis !== 'luminosity_distance') params.set('plotX', plotXAxis);
    if (plotYAxis !== 'total_mass') params.set('plotY', plotYAxis);
    if (!showUncertainties) params.set('showUncertainties', 'false');
    
    // Add column parameters
    const defaultCols = DEFAULT_COLUMNS.join(',');
    const currentCols = selectedColumns.join(',');
    if (currentCols !== defaultCols) params.set('columns', currentCols);
    
    // Update URL without reloading page
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
}

function restoreStateFromURL() {
    const urlParams = getURLParams();
    
    // Restore filters
    document.getElementById('search').value = urlParams.search;
    document.getElementById('minMass').value = urlParams.minMass;
    document.getElementById('maxMass').value = urlParams.maxMass;
    document.getElementById('minDistance').value = urlParams.minDistance;
    document.getElementById('maxDistance').value = urlParams.maxDistance;
    if (document.getElementById('observingRun')) {
        document.getElementById('observingRun').value = urlParams.observingRun;
    }
    
    // Restore plot settings
    plotXAxis = urlParams.plotX;
    plotYAxis = urlParams.plotY;
    showUncertainties = urlParams.showUncertainties;
    document.getElementById('showUncertainties').checked = showUncertainties;
    
    // Restore columns if specified
    if (urlParams.columns) {
        selectedColumns = urlParams.columns;
        // Update checkboxes
        document.querySelectorAll('.column-checkbox').forEach(cb => {
            cb.checked = selectedColumns.includes(cb.value);
        });
    }
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if D3.js is loaded (needed for visualization)
        if (typeof d3 === 'undefined') {
            console.warn('D3.js library not loaded. Visualization features will be disabled.');
            const plotContainer = document.getElementById('d3-plot');
            if (plotContainer) {
                plotContainer.innerHTML = 
                    '<div class="alert alert-warning" role="alert">' +
                    '<strong>Visualization Unavailable:</strong> D3.js library failed to load. ' +
                    'This may be due to ad blockers or network issues. The event table will still work.' +
                    '</div>';
            }
        }
        
        // Load GWTC-4 data
        const response = await fetch('data/gwtc4-all.json');
        const rawData = await response.json();
        
        // Process the data to extract median values
        allEvents = rawData.map(event => ({
            name: event.name,
            properties: event.properties
        }));
        
        filteredEvents = [...allEvents];
        
        // Restore state from URL (e.g., plot axes, filters) before initializing UI
        restoreStateFromURL();
        
        // Populate plot axis dropdowns using restored axis selections
        populatePlotAxisDropdowns();
        
        // Apply filters based on restored state
        applyFilters();
        
        // Render initial view
        renderTable();
        
        // Only render plot if D3.js is available
        if (typeof d3 !== 'undefined') {
            renderD3Plot();
        }
        
        updateEventCount();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        const errorCell = document.createElement('td');
        errorCell.setAttribute('colspan', '10');
        errorCell.style.textAlign = 'center';
        errorCell.style.color = 'red';
        errorCell.textContent = `Error loading event data: ${error.message}`;
        const errorRow = document.createElement('tr');
        errorRow.appendChild(errorCell);
        document.getElementById('eventTableBody').innerHTML = '';
        document.getElementById('eventTableBody').appendChild(errorRow);
    }
});

// Populate plot axis dropdowns with available properties
function populatePlotAxisDropdowns() {
    const xAxisSelect = document.getElementById('plotXAxis');
    const yAxisSelect = document.getElementById('plotYAxis');
    
    // Get all available numeric properties (those with median values)
    if (allEvents.length === 0) {
        console.error('No events loaded');
        // Add disabled placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.textContent = 'No data available';
        placeholderOption.disabled = true;
        xAxisSelect.appendChild(placeholderOption.cloneNode(true));
        yAxisSelect.appendChild(placeholderOption);
        xAxisSelect.disabled = true;
        yAxisSelect.disabled = true;
        return;
    }
    const sampleEvent = allEvents[0];
    const numericProps = Object.keys(sampleEvent.properties).filter(prop => {
        const val = sampleEvent.properties[prop];
        return val && typeof val.median === 'number';
    });
    
    // Group properties
    const groups = {
        mass: [],
        spin: [],
        distance: [],
        other: []
    };
    
    numericProps.forEach(prop => {
        const metadata = PROPERTY_METADATA[prop];
        if (metadata) {
            groups[metadata.group].push(prop);
        } else {
            groups.other.push(prop);
        }
    });
    
    // Helper to create optgroup
    const createOptGroup = (label, props, select) => {
        if (props.length === 0) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        props.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            const metadata = PROPERTY_METADATA[prop];
            option.textContent = metadata ? metadata.label : prop;
            if (prop === plotXAxis && select === xAxisSelect) option.selected = true;
            if (prop === plotYAxis && select === yAxisSelect) option.selected = true;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    };
    
    // Populate both selects
    [xAxisSelect, yAxisSelect].forEach(select => {
        select.innerHTML = '';
        createOptGroup('Mass Properties', groups.mass, select);
        createOptGroup('Spin Properties', groups.spin, select);
        createOptGroup('Distance & Position', groups.distance, select);
        createOptGroup('Other Properties', groups.other, select);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search filter
    document.getElementById('search').addEventListener('input', applyFilters);
    
    // Numeric filters
    document.getElementById('minMass').addEventListener('input', applyFilters);
    document.getElementById('maxMass').addEventListener('input', applyFilters);
    document.getElementById('minDistance').addEventListener('input', applyFilters);
    document.getElementById('maxDistance').addEventListener('input', applyFilters);
    
    // Observing run filter
    if (document.getElementById('observingRun')) {
        document.getElementById('observingRun').addEventListener('change', applyFilters);
    }
    
    // Reset button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Plot axis selection
    document.getElementById('plotXAxis').addEventListener('change', (e) => {
        plotXAxis = e.target.value;
        if (typeof d3 !== 'undefined') {
            renderD3Plot();
        }
        updateURL();
    });
    
    document.getElementById('plotYAxis').addEventListener('change', (e) => {
        plotYAxis = e.target.value;
        if (typeof d3 !== 'undefined') {
            renderD3Plot();
        }
        updateURL();
    });
    
    document.getElementById('showUncertainties').addEventListener('change', (e) => {
        showUncertainties = e.target.checked;
        if (typeof d3 !== 'undefined') {
            renderD3Plot();
        }
        updateURL();
    });
    
    // Column selection checkboxes
    document.querySelectorAll('.column-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedColumns);
    });
    
    // Table header click handler using event delegation
    document.getElementById('tableHeaderRow').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const column = th.dataset.sort;
            sortTable(column);
        }
    });
}

// Update selected columns based on checkboxes
function updateSelectedColumns() {
    selectedColumns = Array.from(document.querySelectorAll('.column-checkbox:checked'))
        .map(cb => cb.value);
    renderTable();
    updateURL();
}

// Apply filters
function applyFilters() {
    const search = document.getElementById('search').value.toLowerCase();
    const minMass = parseFloat(document.getElementById('minMass').value) || 0;
    const maxMass = parseFloat(document.getElementById('maxMass').value) || Infinity;
    const minDistance = parseFloat(document.getElementById('minDistance').value) || 0;
    const maxDistance = parseFloat(document.getElementById('maxDistance').value) || Infinity;
    const observingRun = document.getElementById('observingRun')?.value || '';
    
    filteredEvents = allEvents.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(search);
        
        const totalMass = event.properties.total_mass?.median;
        const distance = event.properties.luminosity_distance?.median;
        
        const matchesMass = totalMass ? (totalMass >= minMass && totalMass <= maxMass) : true;
        const matchesDistance = distance ? (distance >= minDistance && distance <= maxDistance) : true;
        const matchesRun = observingRun ? getObservingRun(event.name) === observingRun : true;
        
        return matchesSearch && matchesMass && matchesDistance && matchesRun;
    });
    
    renderTable();
    if (typeof d3 !== 'undefined') {
        renderD3Plot();
    }
    updateEventCount();
    updateURL();
}

// Reset filters
function resetFilters() {
    document.getElementById('search').value = '';
    document.getElementById('minMass').value = '';
    document.getElementById('maxMass').value = '';
    document.getElementById('minDistance').value = '';
    document.getElementById('maxDistance').value = '';
    if (document.getElementById('observingRun')) {
        document.getElementById('observingRun').value = '';
    }
    
    filteredEvents = [...allEvents];
    renderTable();
    if (typeof d3 !== 'undefined') {
        renderD3Plot();
    }
    updateEventCount();
    updateURL();
}

// Sort table
function sortTable(column) {
    // Toggle sort direction if same column
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Sort the filtered events
    filteredEvents.sort((a, b) => {
        let aVal, bVal;
        
        if (column === 'name') {
            aVal = a.name;
            bVal = b.name;
        } else {
            aVal = a.properties[column]?.median;
            bVal = b.properties[column]?.median;
        }
        
        // Handle null or undefined values
        if (aVal === null || aVal === undefined) {
            if (bVal === null || bVal === undefined) return 0;
            return sortDirection === 'asc' ? 1 : -1;
        }
        if (bVal === null || bVal === undefined) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        
        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Update sort indicators
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        th.setAttribute('aria-sort', 'none');
    });
    
    const activeTh = document.querySelector(`th[data-sort="${column}"]`);
    if (activeTh) {
        activeTh.classList.add(`sort-${sortDirection}`);
        activeTh.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
    }
    
    renderTable();
}

// Format value with uncertainty
function formatValueWithUncertainty(propData, metadata) {
    if (!propData || propData.median === undefined) {
        return '<span class="text-muted">N/A</span>';
    }
    
    const decimals = metadata?.decimals ?? 2;
    const median = propData.median.toFixed(decimals);
    const lower = propData.lower !== undefined ? Math.abs(propData.lower).toFixed(decimals) : null;
    const upper = propData.upper !== undefined ? Math.abs(propData.upper).toFixed(decimals) : null;
    
    if (lower !== null && upper !== null) {
        return `${median}<sub class="text-muted small">−${lower}</sub><sup class="text-muted small">+${upper}</sup>`;
    }
    
    return median;
}

// Render table
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const tbody = document.getElementById('eventTableBody');
    
    // Build table headers
    let headers = '<th data-sort="name" class="sortable" aria-sort="none">Event Name <span class="sort-icon">↕</span></th>';
    
    selectedColumns.forEach(col => {
        const metadata = PROPERTY_METADATA[col];
        const label = metadata ? metadata.label : col;
        headers += `<th data-sort="${col}" class="sortable" aria-sort="none">${label} <span class="sort-icon">↕</span></th>`;
    });
    
    headerRow.innerHTML = headers;
    
    // Build table rows
    if (filteredEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${selectedColumns.length + 1}" style="text-align: center;">No events match the current filters</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filteredEvents.map(event => {
        let row = `<tr><td><strong><a href="event.html?name=${encodeURIComponent(event.name)}" class="text-decoration-none">${event.name}</a></strong></td>`;
        
        selectedColumns.forEach(col => {
            const propData = event.properties[col];
            const metadata = PROPERTY_METADATA[col];
            row += `<td>${formatValueWithUncertainty(propData, metadata)}</td>`;
        });
        
        row += '</tr>';
        return row;
    }).join('');
}

// Update event count
function updateEventCount() {
    const count = filteredEvents.length;
    const total = allEvents.length;
    document.getElementById('eventCount').textContent = 
        `Showing ${count} of ${total} events`;
}

// Render D3 plot
function renderD3Plot() {
    // Clear previous plot completely
    d3.select('#d3-plot').selectAll('*').remove();
    
    if (filteredEvents.length === 0) {
        d3.select('#d3-plot')
            .append('p')
            .style('text-align', 'center')
            .style('padding', '50px')
            .text('No data to display');
        return;
    }
    
    // Filter events that have both x and y values
    const plotData = filteredEvents.filter(e => 
        e.properties[plotXAxis]?.median !== undefined &&
        e.properties[plotYAxis]?.median !== undefined
    );
    
    if (plotData.length === 0) {
        d3.select('#d3-plot')
            .append('p')
            .style('text-align', 'center')
            .style('padding', '50px')
            .text('No data available for selected axes');
        return;
    }
    
    // Set dimensions
    const isSmallScreen = window.innerWidth < 768;
    const margin = { top: 20, right: 20, bottom: 60, left: 70 };
    const width = Math.min(900, window.innerWidth - (isSmallScreen ? 100 : 400)) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#d3-plot')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get axis metadata
    const xMetadata = PROPERTY_METADATA[plotXAxis] || { label: plotXAxis, decimals: 2 };
    const yMetadata = PROPERTY_METADATA[plotYAxis] || { label: plotYAxis, decimals: 2 };
    
    // Calculate data extents including uncertainties if shown
    let xMin, xMax, yMin, yMax;
    
    if (showUncertainties) {
        // Include error bars in the extent calculation
        const xValues = plotData.flatMap(d => {
            const median = d.properties[plotXAxis].median;
            const lower = d.properties[plotXAxis].lower || 0;
            const upper = d.properties[plotXAxis].upper || 0;
            return [median - Math.abs(lower), median + Math.abs(upper)];
        });
        const yValues = plotData.flatMap(d => {
            const median = d.properties[plotYAxis].median;
            const lower = d.properties[plotYAxis].lower || 0;
            const upper = d.properties[plotYAxis].upper || 0;
            return [median - Math.abs(lower), median + Math.abs(upper)];
        });
        xMin = d3.min(xValues);
        xMax = d3.max(xValues);
        yMin = d3.min(yValues);
        yMax = d3.max(yValues);
    } else {
        const xExtent = d3.extent(plotData, d => d.properties[plotXAxis].median);
        const yExtent = d3.extent(plotData, d => d.properties[plotYAxis].median);
        xMin = xExtent[0];
        xMax = xExtent[1];
        yMin = yExtent[0];
        yMax = yExtent[1];
    }
    
    // Add padding to the domain, ensuring non-negative values for mass properties
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xPadding = xRange * 0.1;
    const yPadding = yRange * 0.1;
    
    // For mass properties, ensure domain doesn't go below 0
    const isMassProperty = (prop) => PROPERTY_METADATA[prop]?.group === 'mass';
    xMin = isMassProperty(plotXAxis) ? Math.max(0, xMin - xPadding) : xMin - xPadding;
    yMin = isMassProperty(plotYAxis) ? Math.max(0, yMin - yPadding) : yMin - yPadding;
    
    const xScale = d3.scaleLinear()
        .domain([xMin, xMax + xPadding])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([yMin, yMax + yPadding])
        .range([height, 0]);
    
    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 45)
        .attr('fill', 'black')
        .attr('font-size', '12px')
        .attr('text-anchor', 'middle')
        .html(xMetadata.label);
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -50)
        .attr('fill', 'black')
        .attr('font-size', '12px')
        .attr('text-anchor', 'middle')
        .html(yMetadata.label);
    
    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat('')
        );
    
    // Add tooltip
    let tooltip = d3.select('body').select('.d3-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'd3-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('font-size', '12px')
            .style('z-index', '1000');
    }
    
    // Add error bars if uncertainties are enabled
    if (showUncertainties) {
        // X error bars
        svg.selectAll('.error-bar-x')
            .data(plotData)
            .enter()
            .append('line')
            .attr('class', 'error-bar-x')
            .attr('x1', d => {
                const median = d.properties[plotXAxis].median;
                const lower = d.properties[plotXAxis].lower || 0;
                return xScale(median - Math.abs(lower));
            })
            .attr('x2', d => {
                const median = d.properties[plotXAxis].median;
                const upper = d.properties[plotXAxis].upper || 0;
                return xScale(median + Math.abs(upper));
            })
            .attr('y1', d => yScale(d.properties[plotYAxis].median))
            .attr('y2', d => yScale(d.properties[plotYAxis].median))
            .attr('stroke', '#667eea')
            .attr('stroke-width', 1)
            .attr('opacity', 0.3);
        
        // Y error bars
        svg.selectAll('.error-bar-y')
            .data(plotData)
            .enter()
            .append('line')
            .attr('class', 'error-bar-y')
            .attr('x1', d => xScale(d.properties[plotXAxis].median))
            .attr('x2', d => xScale(d.properties[plotXAxis].median))
            .attr('y1', d => {
                const median = d.properties[plotYAxis].median;
                const lower = d.properties[plotYAxis].lower || 0;
                return yScale(median - Math.abs(lower));
            })
            .attr('y2', d => {
                const median = d.properties[plotYAxis].median;
                const upper = d.properties[plotYAxis].upper || 0;
                return yScale(median + Math.abs(upper));
            })
            .attr('stroke', '#667eea')
            .attr('stroke-width', 1)
            .attr('opacity', 0.3);
    }
    
    // Helper function to format value for tooltip (plain text, no HTML)
    const formatTooltipValue = (propData, metadata) => {
        if (!propData || propData.median === undefined) {
            return 'N/A';
        }
        const decimals = metadata?.decimals ?? 2;
        const median = propData.median.toFixed(decimals);
        const lower = propData.lower !== undefined ? Math.abs(propData.lower).toFixed(decimals) : null;
        const upper = propData.upper !== undefined ? Math.abs(propData.upper).toFixed(decimals) : null;
        
        if (lower !== null && upper !== null) {
            return `${median} (−${lower}, +${upper})`;
        }
        return median;
    };
    
    // Add circles
    svg.selectAll('circle')
        .data(plotData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.properties[plotXAxis].median))
        .attr('cy', d => yScale(d.properties[plotYAxis].median))
        .attr('r', 5)
        .attr('fill', '#667eea')
        .attr('opacity', 0.7)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('opacity', 1)
                .attr('stroke-width', 2.5)
                .attr('r', 7);
            
            const xVal = d.properties[plotXAxis];
            const yVal = d.properties[plotYAxis];
            
            // Create plain text tooltip content
            const xLabel = xMetadata.label.replace(/<[^>]*>/g, ''); // Strip HTML tags
            const yLabel = yMetadata.label.replace(/<[^>]*>/g, ''); // Strip HTML tags
            
            tooltip
                .style('opacity', 1)
                .html(`
                    <strong>${d.name}</strong><br/>
                    ${xLabel}: ${formatTooltipValue(xVal, xMetadata)}<br/>
                    ${yLabel}: ${formatTooltipValue(yVal, yMetadata)}
                `);
        })
        .on('mousemove', function(event) {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('opacity', 0.7)
                .attr('stroke-width', 1.5)
                .attr('r', 5);
            
            tooltip.style('opacity', 0);
        });
}

// Redraw plot on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Only redraw plot if D3.js is available
        if (typeof d3 !== 'undefined') {
            renderD3Plot();
        }
    }, 250);
});
