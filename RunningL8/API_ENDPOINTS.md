# Running Late - SpringBoot API Endpoints

This document outlines all the API endpoints needed for the Running Late app. The backend is implemented as a Spring Boot application.

## Base URL

```
http://localhost:8080/api
```

In production, replace with your actual API domain.

## Authentication

All API calls should include an authentication token in the header (implementation details would depend on your auth system).

```
Authorization: Bearer <token>
```

## Endpoints

### Users and Locations

#### Get Recent Destinations

Retrieves recent destinations for a specific user, sorted by frequency.

- **URL**: `/users/{userId}/recent-destinations`
- **Method**: `GET`
- **URL Parameters**: `userId=[string]` - The ID of the user
- **Response**:
  ```json
  [
    {
      "id": "string",
      "place": "string",
      "address": "string",
      "frequency": 10,
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    ...
  ]
  ```

#### Get Suggested Destinations

Returns suggested destinations based on user history, time of day, and other factors.

- **URL**: `/users/{userId}/suggested-destinations`
- **Method**: `GET`
- **URL Parameters**: `userId=[string]` - The ID of the user
- **Response**: Same format as recent destinations

#### Save Destination

Adds a location to user history or increments its frequency if it already exists.

- **URL**: `/users/{userId}/destinations`
- **Method**: `POST`
- **URL Parameters**: `userId=[string]` - The ID of the user
- **Request Body**:
  ```json
  {
    "place": "string",
    "address": "string",
    "latitude": 37.7749,
    "longitude": -122.4194
  }
  ```
- **Response**: The saved location with updated frequency

### Routing

#### Get Route

Returns information about a route between two points.

- **URL**: `/routes`
- **Method**: `GET`
- **Query Parameters**:
  - `startLat=[number]` - Starting latitude
  - `startLng=[number]` - Starting longitude
  - `endLat=[number]` - Ending latitude
  - `endLng=[number]` - Ending longitude
- **Response**:
  ```json
  {
    "distance": 5.2,
    "duration": 15,
    "startLocation": {
      "id": "string",
      "place": "string",
      "address": "string",
      "frequency": 0,
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "endLocation": {
      "id": "string",
      "place": "string",
      "address": "string",
      "frequency": 0,
      "latitude": 37.7949, 
      "longitude": -122.3994
    },
    "polyline": "encoded_polyline_string",
    "trafficCondition": "light|moderate|heavy"
  }
  ```

### Weather

#### Get Weather

Returns weather information for a specific location.

<!-- - **URL**: `/weather`
- **Method**: `GET`
- **Query Parameters**:
  - `lat=[number]` - Latitude
  - `lng=[number]` - Longitude
- **Response**:
  ```json
  {
    "temperature": 23,
    "condition": "Sunny",
    "icon": "partly-sunny",
    "impact": "Good conditions for your trip"
  }
  ``` --> 

### Location Search

#### Search Locations

Search for locations by query text.

- **URL**: `/locations/search`
- **Method**: `GET`
- **Query Parameters**:
  - `query=[string]` - Search text
- **Response**:
  ```json
  [
    {
      "id": "string",
      "place": "string",
      "address": "string",
      "frequency": 0,
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    ...
  ]
  ```

### ETA Calculations

#### Get Average ETA

Calculate the ETA based on average speed for the given distance.

- **URL**: `/eta/average`
- **Method**: `GET`
- **Query Parameters**:
  - `distance=[number]` - Distance in kilometers
- **Response**:
  ```json
  {
    "eta": 15,
    "speed": 20
  }
  ```

#### Calculate Required Speed

Calculate the required speed to reach a destination within a given time.

- **URL**: `/eta/required-speed`
- **Method**: `GET`
- **Query Parameters**:
  - `distance=[number]` - Distance in kilometers
  - `timeMinutes=[number]` - Time in minutes
- **Response**:
  ```json
  {
    "requiredSpeed": 30.5
  }
  ```

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses have the following format:

```json
{
  "status": 400,
  "message": "Invalid parameters",
  "details": "Distance must be greater than 0"
}
```

## Implementation Notes

1. For the backend implementation, you might use:
   - Spring Boot for the API framework
   - Spring Data JPA for database access
   - PostgreSQL or MongoDB for data storage
   - Redis for caching frequently accessed data

2. For route calculations:
   - Consider using Google Maps Directions API or OpenStreetMap
   - Cache common routes to reduce API calls
   - Implement traffic conditions based on time of day

3. For weather data:
   - OpenWeatherMap API or WeatherAPI are good options
   - Cache weather data for specific locations

4. For search functionality:
   - Consider using Elasticsearch for more powerful search capabilities
   - Implement autocomplete for better user experience 