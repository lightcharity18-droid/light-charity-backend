const DonationCenter = require('../models/donationCenter.model');
const axios = require('axios');

// Google Places API (New) endpoints
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

    let response;

    if (query) {
      // Text search using Places API (New)
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const requestBody = {
        textQuery: query,
        maxResultCount: 20,
        languageCode: 'en'
      };

      // Add location bias if location is provided
      if (location && req.query.locationBias === 'true') {
        const [lat, lng] = location.split(',').map(parseFloat);
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: parseFloat(radius) * 1000 || 50000 // Convert km to meters, default 50km
          }
        };
      }

      response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location.latitude,places.location.longitude,places.types,places.rating,places.userRatingCount,places.businessStatus,places.id'
        }
      });

      // Transform response to match legacy format
      const transformedResults = response.data.places?.map(place => {
        // Extract place ID - new API returns "places/ChIJxyz", we need just "ChIJxyz"
        let placeId = place.id;
        if (placeId && placeId.startsWith('places/')) {
          placeId = placeId.substring(7); // Remove "places/" prefix
        }

        return {
          place_id: placeId,
          name: place.displayName?.text || '',
          formatted_address: place.formattedAddress,
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0
            }
          },
          types: place.types || [],
          rating: place.rating || 0,
          user_ratings_total: place.userRatingCount || 0,
          business_status: place.businessStatus || 'OPERATIONAL'
        };
      }) || [];

      res.json({
        results: transformedResults,
        status: 'OK'
      });
    } else {
      // Nearby search using Places API (New)
      const url = 'https://places.googleapis.com/v1/places:searchNearby';

      // Build request body for nearby search
      const requestBody = {
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(location.split(',')[0]),
              longitude: parseFloat(location.split(',')[1])
            },
            radius: parseFloat(radius) // Already in meters from frontend
          }
        },
        maxResultCount: 20,
        languageCode: 'en'
      };

      // Add includedTypes if a valid type is provided
      // Note: The new API has specific type requirements, stick to known types
      // Note: searchNearby does NOT support keyword/text filtering (unlike the old API)
      if (type && type !== 'undefined') {
        // Map common types to valid Place Types for the new API
        const validTypes = {
          'hospital': 'hospital',
          'health': 'hospital', // Map health to hospital
          'pharmacy': 'pharmacy',
          'doctor': 'doctor'
        };
        const mappedType = validTypes[type] || 'hospital';
        requestBody.includedTypes = [mappedType];
      } else {
        // If no type specified, default to hospital
        requestBody.includedTypes = ['hospital'];
      }

      console.log('Nearby search request:', JSON.stringify(requestBody, null, 2));

      response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location.latitude,places.location.longitude,places.types,places.rating,places.userRatingCount,places.businessStatus,places.id'
        }
      });

      // Transform response to match legacy format
      const transformedResults = response.data.places?.map(place => {
        // Extract place ID - new API returns "places/ChIJxyz", we need just "ChIJxyz"
        let placeId = place.id;
        if (placeId && placeId.startsWith('places/')) {
          placeId = placeId.substring(7); // Remove "places/" prefix
        }

        return {
          place_id: placeId,
          name: place.displayName?.text || '',
          formatted_address: place.formattedAddress,
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0
            }
          },
          types: place.types || [],
          rating: place.rating || 0,
          user_ratings_total: place.userRatingCount || 0,
          business_status: place.businessStatus || 'OPERATIONAL'
        };
      }) || [];

      res.json({
        results: transformedResults,
        status: 'OK'
      });
    }
  } catch (error) {
    console.error('Error searching places:', error.response?.data || error.message);

    // Return more specific error information
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;

    res.status(statusCode).json({
      success: false,
      message: 'Error searching places',
      error: errorMessage,
      details: error.response?.data
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

    if (!place_id) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required'
      });
    }

    // Use Places API (New) for place details
    // Remove "places/" prefix if present - API expects just the place ID
    let cleanPlaceId = place_id;
    if (place_id.startsWith('places/')) {
      cleanPlaceId = place_id.substring(7);
    }

    const url = `https://places.googleapis.com/v1/places/${cleanPlaceId}`;

    console.log(`Fetching place details for: ${place_id} -> ${url}`);

    const response = await axios.get(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,rating,userRatingCount,businessStatus,internationalPhoneNumber,websiteUri,regularOpeningHours'
      }
    });

    // Transform response to match legacy format
    const place = response.data;

    // Extract clean place ID
    let returnPlaceId = place.id;
    if (returnPlaceId && returnPlaceId.startsWith('places/')) {
      returnPlaceId = returnPlaceId.substring(7);
    }

    const transformedResult = {
      place_id: returnPlaceId,
      name: place.displayName?.text || '',
      formatted_address: place.formattedAddress,
      formatted_phone_number: place.internationalPhoneNumber || place.formattedPhoneNumber,
      website: place.websiteUri,
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        }
      },
      types: place.types || [],
      rating: place.rating || 0,
      user_ratings_total: place.userRatingCount || 0,
      business_status: place.businessStatus || 'OPERATIONAL',
      opening_hours: place.regularOpeningHours ? {
        open_now: true, // This would need more complex logic to determine
        weekday_text: place.regularOpeningHours.weekdayDescriptions || []
      } : null
    };

    res.json({
      result: transformedResult,
      status: 'OK'
    });
  } catch (error) {
    console.error('Error getting place details:', {
      placeId: req.query.place_id,
      status: error.response?.status,
      error: error.response?.data || error.message
    });

    // Check if it's a 400 error (likely invalid place ID or API issue)
    if (error.response?.status === 400) {
      console.warn(`Invalid place ID or API error for place: ${req.query.place_id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid place ID or API error',
        error: error.response?.data?.error?.message || error.message,
        details: error.response?.data
      });
    }

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      message: 'Error getting place details',
      error: error.response?.data?.error?.message || error.message,
      details: error.response?.data
    });
  }
};

// Places API (New) autocomplete endpoint
exports.autocompletePlaces = async (req, res) => {
  try {
    const { input, types, language = 'en', type } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    if (!input || input.length < 2) {
      return res.json({
        success: true,
        predictions: []
      });
    }

    // Use the new Places API (New) autocomplete endpoint
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    // Map types correctly for Places API (New)
    let includedPrimaryTypes = [];
    if (types) {
      if (types.includes('(cities)')) {
        // Include more comprehensive city types to support global cities including Indian cities
        includedPrimaryTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'sublocality'];
      } else if (types.includes('country')) {
        includedPrimaryTypes = ['country'];
      } else {
        includedPrimaryTypes = ['establishment'];
      }
    }

    const requestBody = {
      input,
      ...(includedPrimaryTypes.length > 0 && { includedPrimaryTypes }),
      languageCode: language
      // Removed regionCode to support global locations including India
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
      }
    });

    // Transform the response to match the legacy format for compatibility
    const predictions = response.data.suggestions?.map((suggestion) => ({
      place_id: suggestion.placePrediction?.placeId || `manual_${Date.now()}_${Math.random()}`,
      description: suggestion.placePrediction?.text?.text || suggestion.placePrediction?.text || input,
      structured_formatting: {
        main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || 
                   suggestion.placePrediction?.text?.text || 
                   input,
        secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || ''
      }
    })) || [];

    res.json({
      success: true,
      predictions
    });

  } catch (error) {
    console.error('Error in autocomplete API:', error);
    
    // Fallback to a simple prediction format if the new API fails
    const { input, type } = req.body;
    const simplePredictions = [{
      place_id: `manual_${Date.now()}`,
      description: input,
      structured_formatting: {
        main_text: input,
        secondary_text: type === 'city' ? 'City' : 'Country'
      }
    }];
    
    res.json({
      success: true,
      predictions: simplePredictions
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
