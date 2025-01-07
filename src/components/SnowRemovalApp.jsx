import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Check,
  PlayCircle,
  History,
  Home,
  Navigation,
} from 'lucide-react';

const SnowRemovalApp = () => {
  const [customerDatabase, setCustomerDatabase] = useState(() => {
    const saved = localStorage.getItem('snowRemovalCustomerDatabase');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeRound, setActiveRound] = useState(() => {
    const saved = localStorage.getItem('snowRemovalActiveRound');
    return saved ? JSON.parse(saved) : null;
  });

  const [completedRounds, setCompletedRounds] = useState(() => {
    const saved = localStorage.getItem('snowRemovalCompletedRounds');
    return saved ? JSON.parse(saved) : [];
  });

  const [showHistory, setShowHistory] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Mobile-optimerade stilar
  const touchableButton = 'min-h-[44px] active:opacity-70';
  const safeArea = 'pb-[env(safe-area-inset-bottom)]';

  useEffect(() => {
    localStorage.setItem(
      'snowRemovalCustomerDatabase',
      JSON.stringify(customerDatabase)
    );
  }, [customerDatabase]);

  useEffect(() => {
    localStorage.setItem(
      'snowRemovalActiveRound',
      JSON.stringify(activeRound)
    );
  }, [activeRound]);

  useEffect(() => {
    localStorage.setItem(
      'snowRemovalCompletedRounds',
      JSON.stringify(completedRounds)
    );
  }, [completedRounds]);

  useEffect(() => {
    if (activeRound && currentPosition) {
      setActiveRound((prev) => ({
        ...prev,
        routeLog: [...(prev.routeLog || []), currentPosition],
      }));
    }
  }, [currentPosition]);

  // Förhindra pull-to-refresh
  useEffect(() => {
    document.body.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  const addCustomer = () => {
    if (newCustomer && newAddress) {
      setCustomerDatabase((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: newCustomer,
          address: newAddress,
          visitHistory: [],
        },
      ]);
      setNewCustomer('');
      setNewAddress('');
    }
  };

  const removeCustomer = (customerId) => {
    setCustomerDatabase((prev) =>
      prev.filter((customer) => customer.id !== customerId)
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS stöds inte i din webbläsare');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        });
        setGpsError(null);
      },
      (error) => {
        setGpsError(`GPS-fel: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const startNewRound = () => {
    const newRound = {
      id: Date.now(),
      startTime: new Date().toLocaleString('sv-SE'),
      customers: customerDatabase.map((customer) => ({
        ...customer,
        completed: false,
        gpsLog: [],
      })),
      routeLog: [],
    };
    setActiveRound(newRound);
    startTracking();
  };

  const toggleComplete = (customerId) => {
    if (!activeRound) return;

    setActiveRound((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) => {
        if (customer.id === customerId) {
          const completed = !customer.completed;
          return {
            ...customer,
            completed,
            gpsLog:
              completed && currentPosition
                ? [...(customer.gpsLog || []), currentPosition]
                : customer.gpsLog,
          };
        }
        return customer;
      }),
    }));
  };

  const endRound = () => {
    stopTracking();
    const completedCustomers = activeRound.customers.filter(
      (c) => c.completed
    );

    const completedRound = {
      ...activeRound,
      endTime: new Date().toLocaleString('sv-SE'),
      completedCustomers,
    };

    setCompletedRounds((prev) => [completedRound, ...prev]);

    const updatedDatabase = customerDatabase.map((dbCustomer) => {
      const roundCustomer = activeRound.customers.find(
        (c) => c.id === dbCustomer.id
      );
      if (roundCustomer && roundCustomer.completed) {
        return {
          ...dbCustomer,
          visitHistory: [
            ...dbCustomer.visitHistory,
            {
              date: new Date().toLocaleString('sv-SE'),
              roundId: activeRound.id,
              gpsPosition:
                roundCustomer.gpsLog[
                  roundCustomer.gpsLog.length - 1
                ],
            },
          ],
        };
      }
      return dbCustomer;
    });

    setCustomerDatabase(updatedDatabase);
    setActiveRound(null);
  };

  const renderHistoryView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Rundhistorik</h3>
        <Button
          onClick={() => setShowHistory(false)}
          size="lg"
          className={touchableButton}
        >
          <Home className="mr-2 h-5 w-5" />
          Tillbaka
        </Button>
      </div>
      {completedRounds.map((round) => (
        <Card key={round.id} className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">
                Runda{' '}
                {new Date(round.startTime).toLocaleDateString(
                  'sv-SE'
                )}
              </h4>
              <span className="text-sm text-gray-500">
                {round.completedCustomers.length} kunder
              </span>
            </div>
            <div className="text-sm text-gray-500">
              <div>Start: {round.startTime}</div>
              <div>Slut: {round.endTime}</div>
            </div>
            <div className="space-y-2 mt-2">
              {round.completedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="text-sm bg-green-50 p-2 rounded"
                >
                  <div className="font-medium">
                    {customer.name}
                  </div>
                  <div className="text-gray-500">
                    {customer.address}
                  </div>
                  {customer.gpsLog &&
                    customer.gpsLog.length > 0 && (
                      <div className="text-xs text-gray-400 flex items-center mt-1">
                        <Navigation className="h-3 w-3 mr-1" />
                        {customer.gpsLog[0].lat.toFixed(6)}, {customer.gpsLog[0].lng.toFixed(6)}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div
      className={`max-w-md mx-auto p-4 space-y-4 min-h-screen ${safeArea}`}
    >
      <Card className="shadow-lg">
        <CardHeader className="sticky top-0 bg-white z-10">
          <CardTitle className="flex justify-between items-center">
            Snöröjningsapp
            {!activeRound && !showHistory && (
              <Button
                variant="outline"
                size="lg"
                className={touchableButton}
                onClick={() => setShowHistory(true)}
              >
                <History className="mr-2 h-5 w-5" />
                Historik
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRound && (
            <div
              className={`mb-4 p-3 rounded-lg text-base ${
                isTracking
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              <div className="flex items-center">
                <Navigation className="h-5 w-5 mr-2" />
                {isTracking ? 'GPS aktiv' : 'GPS inaktiv'}
              </div>
              {currentPosition && (
                <div className="text-sm mt-1">
                  Position: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                </div>
              )}
              {gpsError && (
                <div className="text-red-500 text-sm mt-1">
                  {gpsError}
                </div>
              )}
            </div>
          )}

          {showHistory ? (
            renderHistoryView()
          ) : !activeRound ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Kundnamn"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full h-12 text-lg"
                />
                <Input
                  type="text"
                  placeholder="Adress"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full h-12 text-lg"
                />
                <Button
                  onClick={addCustomer}
                  className={`w-full h-12 text-lg ${touchableButton}`}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Lägg till kund
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-lg">
                  Kunddatabas
                </h3>
                {customerDatabase.map((customer) => (
                  <Card key={customer.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-medium text-lg">
                          {customer.name}
                        </h4>
                        <div className="flex items-center text-base text-gray-500">
                          <MapPin className="mr-2 h-5 w-5" />
                          {customer.address}
                        </div>
                        {customer.visitHistory.length > 0 && (
                          <div className="flex items-center text-base text-gray-500">
                            <Calendar className="mr-2 h-5 w-5" />
                            Senaste besök:{' '}
                            {
                              customer.visitHistory[
                                customer.visitHistory.length -
                                  1
                              ].date
                            }
                          </div>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="lg"
                        className={touchableButton}
                        onClick={() =>
                          removeCustomer(customer.id)
                        }
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {customerDatabase.length > 0 && (
                <Button
                  onClick={startNewRound}
                  className={`w-full h-12 text-lg ${touchableButton}`}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Starta ny runda
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">
                  Aktiv runda - {activeRound.startTime}
                </h3>
                <Button
                  onClick={endRound}
                  className={touchableButton}
                  size="lg"
                >
                  Avsluta runda
                </Button>
              </div>

              <div className="space-y-3">
                {activeRound.customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`p-4 ${
                      customer.completed
                        ? 'bg-green-50'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="font-medium text-lg">
                          {customer.name}
                        </h4>
                        <div className="flex items-center text-base text-gray-500">
                          <MapPin className="mr-2 h-5 w-5" />
                          {customer.address}
                        </div>
                      </div>
                      <Button
                        variant={
                          customer.completed
                            ? 'default'
                            : 'outline'
                        }
                        size="lg"
                        className={touchableButton}
                        onClick={() =>
                          toggleComplete(customer.id)
                        }
                      >
                        {customer.completed ? (
                          <>
                            <Check className="mr-2 h-5 w-5" />
                            Klar
                          </>
                        ) : (
                          'Markera som klar'
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SnowRemovalApp;
