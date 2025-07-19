import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, Polyline, useJsApiLoader, MarkerF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  marginTop: '20px',
};

const center = { lat: 0, lng: 0 };
const speedLimit = 80;
const brakeThreshold = 20;

const GeolocationMap = () => {
  const [location, setLocation] = useState(null);
  const [path, setPath] = useState([]);
  const [mapCenter, setMapCenter] = useState(center);
  const [speedExceeded, setSpeedExceeded] = useState(false);

  const previousSpeed = useRef(null);
  const previousPosition = useRef(null);
  const previousTime = useRef(Date.now());

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyApR8julC440Ttr3iiKmU-oRbmBuElsD2w',
    libraries: ['geometry'],
  });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      setLocation({ error: 'Geolocation is not supported by this browser.' });
    }
  }, []);

  const notifyUser = (message) => {
    if (Notification.permission === 'granted') {
      new Notification(message);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(message);
        }
      });
    }
  };

  const successCallback = (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const rawSpeed = position.coords.speed ?? 0;
    const speed = parseFloat((rawSpeed * 3.6).toFixed(2)); // Convert to km/h

    setLocation({ lat, lng, speed });
    setMapCenter({ lat, lng });
    setPath((prev) => [...prev, { lat, lng }]);

    if (previousSpeed.current !== null && previousPosition.current) {
      const now = Date.now();
      const timeDiff = (now - previousTime.current) / 1000;

      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(previousPosition.current.lat, previousPosition.current.lng),
        new window.google.maps.LatLng(lat, lng)
      );

      const currentSpeed = (distance / timeDiff) * 3.6;
      const deceleration = (previousSpeed.current - currentSpeed) / timeDiff;

      if (deceleration > brakeThreshold) {
        notifyUser(`⚠ HARD BRAKING DETECTED! Deceleration: ${deceleration.toFixed(1)} km/h/s`);
      }

      previousSpeed.current = currentSpeed;
    } else {
      previousSpeed.current = speed;
    }

    previousPosition.current = { lat, lng };
    previousTime.current = Date.now();

    if (speed > speedLimit) {
      notifyUser(`⚠ Exceeding speed limit! Current: ${speed} km/h`);
      setSpeedExceeded(true);
    } else {
      setSpeedExceeded(false);
    }
  };

  const errorCallback = (error) => {
    setLocation({ error: error.message });
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '1rem' }}>
      <h1>Geolocation API Example (React)</h1>
      {location?.error ? (
        <p style={{ color: 'red' }}>Error: {location.error}</p>
      ) : location ? (
        <div
          style={{
            marginTop: '20px',
            color: speedExceeded ? 'red' : 'black',
          }}
        >
          Latitude: {location.lat}, Longitude: {location.lng}, Speed: {location.speed} km/h
        </div>
      ) : (
        <p>Waiting for location...</p>
      )}

      {isLoaded && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={15}
        >
          {location && <MarkerF position={{ lat: location.lat, lng: location.lng }} />}
          {path.length > 1 && (
            <Polyline
              path={path}
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
};

export default GeolocationMap;
