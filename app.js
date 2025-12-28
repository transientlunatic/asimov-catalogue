// Global variables
let allEvents = [];
let filteredEvents = [];
let sortColumn = null;
let sortDirection = 'asc';

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        allEvents = await response.json();
        filteredEvents = [...allEvents];
        
        renderTable();
        renderD3Plot();
        updateEventCount();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('eventTableBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; color: red;">Error loading event data</td></tr>';
    }
});

// Setup event listeners
function setupEventListeners() {
    // Search filter
    document.getElementById('search').addEventListener('input', applyFilters);
    
    // Numeric filters
    document.getElementById('minMass').addEventListener('input', applyFilters);
    document.getElementById('maxMass').addEventListener('input', applyFilters);
    document.getElementById('minDistance').addEventListener('input', applyFilters);
    document.getElementById('maxDistance').addEventListener('input', applyFilters);
    
    // Reset button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Column sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            sortTable(column);
        });
    });
}

// Apply filters
function applyFilters() {
    const search = document.getElementById('search').value.toLowerCase();
    const minMass = parseFloat(document.getElementById('minMass').value) || 0;
    const maxMass = parseFloat(document.getElementById('maxMass').value) || Infinity;
    const minDistance = parseFloat(document.getElementById('minDistance').value) || 0;
    const maxDistance = parseFloat(document.getElementById('maxDistance').value) || Infinity;
    
    filteredEvents = allEvents.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(search);
        const matchesMass = event.totalMass >= minMass && event.totalMass <= maxMass;
        const matchesDistance = event.distance >= minDistance && event.distance <= maxDistance;
        
        return matchesSearch && matchesMass && matchesDistance;
    });
    
    renderTable();
    renderD3Plot();
    updateEventCount();
}

// Reset filters
function resetFilters() {
    document.getElementById('search').value = '';
    document.getElementById('minMass').value = '';
    document.getElementById('maxMass').value = '';
    document.getElementById('minDistance').value = '';
    document.getElementById('maxDistance').value = '';
    
    filteredEvents = [...allEvents];
    renderTable();
    renderD3Plot();
    updateEventCount();
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
        let aVal = a[column];
        let bVal = b[column];
        
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
    });
    
    const activeTh = document.querySelector(`th[data-sort="${column}"]`);
    if (activeTh) {
        activeTh.classList.add(`sort-${sortDirection}`);
    }
    
    renderTable();
}

// Render table
function renderTable() {
    const tbody = document.getElementById('eventTableBody');
    
    if (filteredEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No events match the current filters</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredEvents.map(event => `
        <tr>
            <td><strong>${event.name}</strong></td>
            <td>${formatDateTime(event.detectionTime)}</td>
            <td>${event.mass1.toFixed(2)}</td>
            <td>${event.mass2.toFixed(2)}</td>
            <td>${event.totalMass.toFixed(2)}</td>
            <td>${event.distance.toFixed(0)}</td>
            <td>${event.significance.toFixed(1)}</td>
        </tr>
    `).join('');
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

// Update event count
function updateEventCount() {
    const count = filteredEvents.length;
    const total = allEvents.length;
    document.getElementById('eventCount').textContent = 
        `Showing ${count} of ${total} events`;
}

// Render D3 plot
function renderD3Plot() {
    // Clear previous plot and tooltips
    d3.select('#d3-plot').selectAll('*').remove();
    d3.selectAll('.d3-tooltip').remove();
    
    if (filteredEvents.length === 0) {
        d3.select('#d3-plot')
            .append('p')
            .style('text-align', 'center')
            .style('padding', '50px')
            .text('No data to display');
        return;
    }
    
    // Set dimensions
    const margin = { top: 20, right: 120, bottom: 60, left: 60 };
    const width = Math.min(900, window.innerWidth - 100) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#d3-plot')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(filteredEvents, d => d.distance) * 1.1])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredEvents, d => d.totalMass) * 1.1])
        .range([height, 0]);
    
    // Color scale by type
    const colorScale = d3.scaleOrdinal()
        .domain(['BBH', 'BNS', 'NSBH'])
        .range(['#667eea', '#f093fb', '#4facfe']);
    
    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text('Distance (Mpc)');
    
    svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -45)
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('text-anchor', 'middle')
        .text('Total Mass (M☉)');
    
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
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('font-size', '12px');
    
    // Add circles
    svg.selectAll('circle')
        .data(filteredEvents)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.distance))
        .attr('cy', d => yScale(d.totalMass))
        .attr('r', d => Math.sqrt(d.significance) * 2)
        .attr('fill', d => colorScale(d.type))
        .attr('opacity', 0.7)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('opacity', 1)
                .attr('stroke-width', 3);
            
            tooltip
                .style('opacity', 1)
                .html(`
                    <strong>${d.name}</strong><br/>
                    Type: ${d.type}<br/>
                    Total Mass: ${d.totalMass.toFixed(2)} M☉<br/>
                    Distance: ${d.distance} Mpc<br/>
                    Significance: ${d.significance.toFixed(1)}σ
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
                .attr('stroke-width', 2);
            
            tooltip.style('opacity', 0);
        });
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 10}, 0)`);
    
    const types = ['BBH', 'BNS', 'NSBH'];
    const typeNames = {
        'BBH': 'Binary Black Hole',
        'BNS': 'Binary Neutron Star',
        'NSBH': 'Neutron Star-Black Hole'
    };
    
    types.forEach((type, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('circle')
            .attr('r', 6)
            .attr('fill', colorScale(type))
            .attr('opacity', 0.7);
        
        legendRow.append('text')
            .attr('x', 15)
            .attr('y', 5)
            .attr('font-size', '11px')
            .text(typeNames[type]);
    });
}

// Redraw plot on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        renderD3Plot();
    }, 250);
});
