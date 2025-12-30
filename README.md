# Gravitational Wave Event Catalogue

A web-based catalogue for gravitational wave detection events, providing an interactive interface to explore and analyze gravitational wave data.

## Features

- **Filterable Event Table**: Search and filter events by name, mass, and distance
- **Sortable Columns**: Click on column headers to sort events
- **Interactive D3.js Visualization**: Mass vs. Distance scatter plot with event details on hover
- **HDF5 Data Viewer**: View and analyze posterior sample distributions from HDF5 files
- **Responsive Design**: Built with Bootstrap 5 for mobile and desktop compatibility
- **Test Data**: Currently uses sample gravitational wave event data

## Event Types

- **BBH**: Binary Black Hole mergers
- **BNS**: Binary Neutron Star mergers
- **NSBH**: Neutron Star-Black Hole mergers

## Technology Stack

- **HTML5**: Structure and content
- **Bootstrap 5**: Responsive CSS framework
- **JavaScript (ES6+)**: Application logic
- **D3.js v7**: Data visualization
- **h5wasm**: HDF5 file reading in the browser
- **GitHub Pages**: Hosting and deployment

## Local Development

To run the website locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/transientlunatic/asimov-catalogue.git
   cd asimov-catalogue
   ```

2. Serve the files using a local web server. You can use Python's built-in server:
   ```bash
   python3 -m http.server 8000
   ```
   Or Node.js `http-server`:
   ```bash
   npx http-server
   ```

3. Open your browser and navigate to `http://localhost:8000`

## Deployment

The website is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow is configured in `.github/workflows/deploy.yml`.

## Data Format

The catalogue uses JSON format for event data. Each event includes:

- `name`: Event identifier (e.g., "GW150914")
- `detectionTime`: ISO 8601 timestamp
- `mass1`: Primary object mass in solar masses (M☉)
- `mass2`: Secondary object mass in solar masses (M☉)
- `totalMass`: Combined mass in solar masses (M☉)
- `distance`: Distance in megaparsecs (Mpc)
- `significance`: Detection significance in sigma (σ)
- `type`: Event type (BBH, BNS, or NSBH)
- `samplesUrl`: URL to HDF5 posterior samples file (optional)

## HDF5 Data Viewer

The HDF5 data viewer allows you to explore posterior probability distributions from gravitational wave event analyses. Features include:

- **Direct HDF5 Loading**: Loads HDF5 files directly in the browser using h5wasm (no server-side conversion needed)
- **Interactive Histograms**: View posterior distributions for any parameter with adjustable bin sizes
- **Statistical Summary**: Displays mean, median, standard deviation, and 90% credible intervals
- **Parameter Selection**: Browse all available parameters in the posterior samples
- **Custom URL Support**: Load any HDF5 file by providing a direct URL
- **Separate Page**: Loads in its own page to keep the main catalogue fast

To access the viewer:
- Click the "View Data" button next to any event in the catalogue table that has posterior samples available
- Or load a custom HDF5 file directly: `viewer.html?samplesUrl=https://example.com/samples.h5`

### Using the Viewer

The viewer supports two URL parameters:

1. **Load from catalogue**: `viewer.html?event=GW150914`
   - Loads the event data and HDF5 file from the catalogue

2. **Load custom HDF5 file**: `viewer.html?samplesUrl=https://example.com/samples.h5`
   - Directly loads any HDF5 file from a URL
   - Useful for analyzing custom or external datasets

### Troubleshooting

All required libraries (h5wasm and D3.js) are now self-hosted to avoid CDN-related issues. If you still encounter problems:

- **Network connectivity issues**: Ensure you have a stable internet connection to load HDF5 files from external sources.
- **CORS restrictions**: The HDF5 file URL must support CORS (Cross-Origin Resource Sharing).
- **Browser security settings**: Some strict security settings may prevent loading external files.

**Solutions:**
1. Ensure the HDF5 file is hosted on a server that supports CORS
2. Check your internet connection
3. Try a different browser (Chrome, Firefox, Edge, or Safari)
4. Ensure JavaScript is enabled in your browser

## Future Enhancements

- Integration with actual asimov catalogue data
- Instructions for reproducing events with asimov
- Interface to identify exceptional events
- List of publications containing each event
- Advanced filtering and analysis tools
- Multi-parameter scatter plots in the HDF5 viewer
- Corner plots for parameter correlations

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
