const DonationCenter = require('../models/donationCenter.model');
const axios = require('axios');

// Google Places API endpoints
exports.searchPlaces = async (req, res) => {
  try {
    const { location, radius, type, keyword, query } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    let url;
    let params;

    if (query) {
      // Text search
      url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      params = { query, key: apiKey };
    } else {
      // Nearby search
      url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      params = { location, radius, type, keyword, key: apiKey };
    }

    const response = await axios.get(url, { params });
    res.json(response.data);
  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching places',
      error: error.message
    });
  }
};

exports.getPlaceDetails = async (req, res) => {
  try {
    const { place_id, fields } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const response = await axios.get(url, {
      params: {
        place_id,
        fields,
        key: apiKey
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error getting place details:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting place details',
      error: error.message
    });
  }
};

// Get all donation centers
exports.getAllCenters = async (req, res) => {
  try {
    const { 
      bloodType, 
      city, 
      state, 
      latitude, 
      longitude, 
      radius = 50, // km
      limit = 50,
      page = 1 
    } = req.query;

    let query = { status: 'active' };
    
    // Filter by blood type if provided
    if (bloodType) {
      query.bloodTypesAccepted = bloodType;
    }
    
    // Filter by city if provided
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    
    // Filter by state if provided
    if (state) {
      query['address.state'] = new RegExp(state, 'i');
    }

    let centers;
    
    // If coordinates provided, find nearby centers
    if (latitude && longitude) {
      const maxDistance = radius * 1000; // Convert km to meters
      centers = await DonationCenter.findNearby(
        parseFloat(longitude), 
        parseFloat(latitude), 
        maxDistance
      );
      
      // Apply additional filters after geospatial query
      if (bloodType || city || state) {
        centers = centers.filter(center => {
          if (bloodType && !center.bloodTypesAccepted.includes(bloodType)) return false;
          if (city && !new RegExp(city, 'i').test(center.address.city)) return false;
          if (state && !new RegExp(state, 'i').test(center.address.state)) return false;
          return true;
        });
      }
    } else {
      // Regular query without geospatial search
      const skip = (parseInt(page) - 1) * parseInt(limit);
      centers = await DonationCenter.find(query)
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ 'rating.average': -1, createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      data: centers,
      count: centers.length
    });
  } catch (error) {
    console.error('Error fetching donation centers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donation centers',
      error: error.message
    });
  }
};

// Get center by ID
exports.getCenterById = async (req, res) => {
  try {
    const center = await DonationCenter.findById(req.params.id);
    
    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Donation center not found'
      });
    }

    res.status(200).json({
      success: true,
      data: center
    });
  } catch (error) {
    console.error('Error fetching donation center:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donation center',
      error: error.message
    });
  }
};

// Calculate route using Google Maps Routes API
exports.calculateRoute = async (req, res) => {
  try {
    const { originLat, originLng, destinationLat, destinationLng, travelMode = 'DRIVE' } = req.body;

    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination coordinates are required'
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    // Prepare the request payload for Google Routes API
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: parseFloat(originLat),
            longitude: parseFloat(originLng)
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: parseFloat(destinationLat),
            longitude: parseFloat(destinationLng)
          }
        }
      },
      travelMode: travelMode,
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'IMPERIAL'
    };

    // Make request to Google Routes API
    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues'
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      
      res.status(200).json({
        success: true,
        data: {
          duration: route.duration,
          distance: route.distanceMeters,
          polyline: route.polyline?.encodedPolyline,
          steps: route.legs?.[0]?.steps || []
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No route found between the specified locations'
      });
    }
  } catch (error) {
    console.error('Error calculating route:', error);
    
    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message: 'Google Maps API access denied. Please check your API key and permissions.'
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters for route calculation'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error calculating route',
      error: error.message
    });
  }
};

// Get multiple routes (for comparing different centers)
exports.calculateMultipleRoutes = async (req, res) => {
  try {
    const { originLat, originLng, destinations, travelMode = 'DRIVE' } = req.body;

    if (!originLat || !originLng || !destinations || !Array.isArray(destinations)) {
      return res.status(400).json({
        success: false,
        message: 'Origin coordinates and destinations array are required'
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    // Calculate routes to all destinations
    const routePromises = destinations.map(async (destination, index) => {
      try {
        const requestBody = {
          origin: {
            location: {
              latLng: {
                latitude: parseFloat(originLat),
                longitude: parseFloat(originLng)
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: parseFloat(destination.lat),
                longitude: parseFloat(destination.lng)
              }
            }
          },
          travelMode: travelMode,
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          languageCode: 'en-US',
          units: 'IMPERIAL'
        };

        const response = await axios.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            }
          }
        );

        if (response.data && response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          return {
            destinationId: destination.id,
            success: true,
            duration: route.duration,
            distance: route.distanceMeters,
            polyline: route.polyline?.encodedPolyline
          };
        } else {
          return {
            destinationId: destination.id,
            success: false,
            error: 'No route found'
          };
        }
      } catch (error) {
        return {
          destinationId: destination.id,
          success: false,
          error: error.message
        };
      }
    });

    const routes = await Promise.all(routePromises);

    res.status(200).json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error calculating multiple routes:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating routes',
      error: error.message
    });
  }
};

// Create a new donation center (admin only)
exports.createCenter = async (req, res) => {
  try {
    const centerData = req.body;
    
    // Ensure coordinates are in the correct format [longitude, latitude]
    if (centerData.location && centerData.location.coordinates) {
      centerData.location.type = 'Point';
    }

    const center = new DonationCenter(centerData);
    await center.save();

    res.status(201).json({
      success: true,
      data: center,
      message: 'Donation center created successfully'
    });
  } catch (error) {
    console.error('Error creating donation center:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating donation center',
      error: error.message
    });
  }
};

// Update donation center (admin only)
exports.updateCenter = async (req, res) => {
  try {
    const center = await DonationCenter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Donation center not found'
      });
    }

    res.status(200).json({
      success: true,
      data: center,
      message: 'Donation center updated successfully'
    });
  } catch (error) {
    console.error('Error updating donation center:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating donation center',
      error: error.message
    });
  }
};

// Delete donation center (admin only)
exports.deleteCenter = async (req, res) => {
  try {
    const center = await DonationCenter.findByIdAndDelete(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Donation center not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Donation center deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting donation center:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting donation center',
      error: error.message
    });
  }
};
