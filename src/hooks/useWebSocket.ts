import { useEffect, useRef, useState, useCallback } from 'react';

interface User {
  userId: string;
  userName: string;
  online: boolean;
}

interface LocationData {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'congestion';
  severity: 1 | 2 | 3;
  location: { latitude: number; longitude: number };
  description: string;
  timestamp: number;
}

export const useWebSocket = (userId: string, userName: string) => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [userLocations, setUserLocations] = useState<LocationData[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficIncident[]>([]);

  // Emergency state
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);

  // Shared routes
  const [sharedRoutes, setSharedRoutes] = useState<any[]>([]);

  const socketRef = useRef<any | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const SERVER_URL = __DEV__ ? 'http://localhost:3001' : 'https://your-production-server.com';

    // Dynamically import socket.io-client to avoid bundling issues
    const initSocket = async () => {
      setConnectionAttempted(true);

      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('WebSocket connection timeout - continuing without real-time features');
        setConnectionAttempted(true);
        setIsConnected(false);
      }, 8000); // 8 second timeout

      try {
        const { io } = await import('socket.io-client');
        clearTimeout(timeout);

        const newSocket = io(SERVER_URL, {
          transports: ['websocket', 'polling'],
          timeout: 5000, // Reduced timeout
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection events
        newSocket.on('connect', () => {
          console.log('🔗 Connected to real-time server');
          setIsConnected(true);

          // Join with user data
          newSocket.emit('join', { userId, userName });
        });

        newSocket.on('disconnect', () => {
          console.log('🔌 Disconnected from real-time server');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.warn('WebSocket connection error:', error);
          setIsConnected(false);
        });

        // User count updates
        newSocket.on('userCount', (count: number) => {
          console.log(`👥 ${count} users online`);
        });

        // Online users list
        newSocket.on('onlineUsers', (users: User[]) => {
          setOnlineUsers(users);
        });

        // Real-time location updates
        newSocket.on('userLocationUpdate', (location: LocationData) => {
          setUserLocations(prev => {
            const existing = prev.findIndex(loc => loc.userId === location.userId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = location;
              return updated;
            }
            return [...prev, location];
          });
        });

        // User disconnected
        newSocket.on('userDisconnected', (disconnectedUserId: string) => {
          setUserLocations(prev => prev.filter(loc => loc.userId !== disconnectedUserId));
        });

        // Traffic updates
        newSocket.on('trafficUpdate', (traffic: TrafficIncident[]) => {
          setTrafficData(traffic);
        });

        // Emergency alerts
        newSocket.on('emergencyAlert', (alert: any) => {
          setEmergencyAlerts(prev => [alert, ...prev]);
          // Could trigger local notification here
          console.log('🚨 Emergency alert received:', alert);
        });

        // Shared routes
        newSocket.on('routeShared', (routeData: any) => {
          setSharedRoutes(prev => [routeData, ...prev]);
        });

      } catch (error) {
        console.warn('Failed to initialize WebSocket:', error);
        setIsConnected(false);
        setConnectionAttempted(true);
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userId, userName]);

  // Send location update
  const sendLocationUpdate = useCallback((latitude: number, longitude: number) => {
    if (socket && isConnected) {
      socket.emit('locationUpdate', {
        userId,
        userName,
        latitude,
        longitude
      });
    }
  }, [socket, isConnected, userId, userName]);

  // Send search query (for collaborative features)
  const sendSearchQuery = useCallback((query: string) => {
    if (socket && isConnected) {
      socket.emit('searchQuery', {
        userId,
        userName,
        query
      });
    }
  }, [socket, isConnected, userId, userName]);

  // Share route
  const shareRoute = useCallback((route: any) => {
    if (socket && isConnected) {
      socket.emit('shareRoute', {
        userId,
        userName,
        route
      });
    }
  }, [socket, isConnected, userId, userName]);

  // Send emergency alert
  const sendEmergency = useCallback((location: { latitude: number; longitude: number }, type: string = 'general') => {
    if (socket && isConnected) {
      socket.emit('emergency', {
        userId,
        userName,
        location,
        type
      });
    }
  }, [socket, isConnected, userId, userName]);

  // Request traffic data
  const requestTrafficData = useCallback((bounds: { lat: number; lng: number; latDelta: number; lngDelta: number }) => {
    if (socket && isConnected) {
      socket.emit('requestTraffic', bounds);
    }
  }, [socket, isConnected]);

  return {
    // Connection state
    isConnected,
    connectionAttempted,
    socket,

    // Data
    onlineUsers,
    userLocations,
    trafficData,
    emergencyAlerts,
    sharedRoutes,

    // Actions
    sendLocationUpdate,
    sendSearchQuery,
    shareRoute,
    sendEmergency,
    requestTrafficData,
  };
};

export default useWebSocket;