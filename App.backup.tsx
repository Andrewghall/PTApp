import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Image, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// Import the logo banner image
const logoBanner = require('./logo banner.png');

// Simple Login Screen
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = () => {
    if (!email || !password) {
      return;
    }
    
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Elevate Gym</Text>
        </View>
        <Image 
          source={logoBanner}
          style={styles.heroBanner}
          resizeMode="cover"
        />
        <Text style={styles.subtitle}>Welcome back</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Booking Screen with Modern Calendar
const BookingScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Generate time slots for Monday to Friday
  const timeSlots = [
    { time: '7:30-9:30', label: 'Morning Session', icon: '🌅' },
    { time: '9:30-11:30', label: 'Late Morning', icon: '☀️' }
  ];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  
  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  // Simulate some bookings (in real app, this would come from database)
  const getBookingsForDate = (day: number) => {
    const bookings = [];
    if (day % 3 === 0) bookings.push('7:30-9:30');
    if (day % 4 === 0) bookings.push('9:30-11:30');
    if (day % 5 === 0) bookings.push('7:30-9:30', '9:30-11:30');
    return bookings;
  };
  
  const isSlotAvailable = (day: number, slot: string) => {
    const bookings = getBookingsForDate(day);
    return !bookings.includes(slot);
  };
  
  const handleBooking = () => {
    if (selectedSlot) {
      setShowConfirmation(true);
    }
  };
  
  const confirmBooking = () => {
    setShowConfirmation(false);
    setBookingSuccess(true);
    setSelectedSlot(null);
    // Hide success message after 3 seconds
    setTimeout(() => setBookingSuccess(false), 3000);
  };
  
  const calendarDays = generateCalendarDays();
  const currentDay = selectedDate.getDate();
  const currentBookings = currentDay ? getBookingsForDate(currentDay) : [];
  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           selectedDate.getMonth() === today.getMonth() && 
           selectedDate.getFullYear() === today.getFullYear();
  };
  
  return (
    <View style={styles.bookingContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />
      
      {/* Header */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>Book Your Session</Text>
        <Text style={styles.pageSubtitle}>Select a date and time slot</Text>
      </View>
      
      {/* Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity 
          style={styles.monthNavButton}
          onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
        >
          <Text style={styles.monthNavText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity 
          style={styles.monthNavButton}
          onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
        >
          <Text style={styles.monthNavText}>→</Text>
        </TouchableOpacity>
      </View>
      
      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {/* Week day headers */}
        <View style={styles.weekHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={day} style={[
              styles.weekDayText,
              (index === 0 || index === 6) && styles.weekendHeaderText
            ]}>{day}</Text>
          ))}
        </View>
        
        {/* Calendar days */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.emptyDay} />;
            }
            
            const isSelected = day === currentDay;
            const isWeekend = index % 7 === 0 || index % 7 === 6;
            const bookings = getBookingsForDate(day);
            const hasBookings = bookings.length > 0;
            const today = isToday(day);
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.calendarDay,
                  isSelected && styles.selectedDay,
                  isWeekend && styles.weekendDay,
                  hasBookings && !isSelected && styles.hasBookingsDay,
                  today && !isSelected && styles.todayDay
                ]}
                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  isWeekend && styles.weekendDayText,
                  today && !isSelected && styles.todayDayText
                ]}>
                  {day}
                </Text>
                {hasBookings && !isSelected && (
                  <View style={styles.bookingIndicator}>
                    <Text style={styles.bookingIndicatorText}>{bookings.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* Time Slots */}
      <View style={styles.timeSlotsSection}>
        <Text style={styles.timeSlotsTitle}>
          Available Sessions - {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
        
        {weekDays.includes(selectedDate.toLocaleDateString('en-US', { weekday: 'short' })) ? (
          <View style={styles.slotsContainer}>
            {timeSlots.map(slot => {
              const available = isSlotAvailable(currentDay, slot.time);
              const isSelected = selectedSlot === slot.time;
              
              return (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.timeSlotCard,
                    !available && styles.unavailableSlot,
                    isSelected && styles.selectedSlot
                  ]}
                  onPress={() => available && setSelectedSlot(slot.time)}
                  disabled={!available}
                >
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotIcon}>{slot.icon}</Text>
                    <View style={styles.slotInfo}>
                      <Text style={[
                        styles.slotTime,
                        !available && styles.unavailableSlotText,
                        isSelected && styles.selectedSlotText
                      ]}>
                        {slot.time}
                      </Text>
                      <Text style={styles.slotLabel}>{slot.label}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.slotStatus,
                    available ? styles.availableStatus : styles.bookedStatus,
                    isSelected && styles.selectedStatus
                  ]}>
                    <Text style={[
                      styles.slotStatusText,
                      !available && styles.unavailableSlotText,
                      isSelected && styles.selectedSlotText
                    ]}>
                      {available ? 'Available' : 'Booked'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.noSlotsContainer}>
            <Text style={styles.noSlotsIcon}>🏖️</Text>
            <Text style={styles.noSlotsText}>Weekend sessions not available</Text>
            <Text style={styles.noSlotsSubtext}>Sessions are available Monday - Friday</Text>
          </View>
        )}
      </View>
      
      {/* Current Day Bookings */}
      {currentBookings.length > 0 && (
        <View style={styles.currentBookingsSection}>
          <Text style={styles.currentBookingsTitle}>Today's Schedule</Text>
          {currentBookings.map(booking => {
            const slot = timeSlots.find(s => s.time === booking);
            return (
              <View key={booking} style={styles.currentBookingItem}>
                <Text style={styles.currentBookingIcon}>{slot?.icon}</Text>
                <View style={styles.currentBookingInfo}>
                  <Text style={styles.currentBookingTime}>{booking}</Text>
                  <Text style={styles.currentBookingLabel}>{slot?.label}</Text>
                </View>
                <View style={styles.bookedBadge}>
                  <Text style={styles.bookedBadgeText}>Booked</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      
      {/* Book Button */}
      {selectedSlot && (
        <View style={styles.bookButtonContainer}>
          <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
            <Text style={styles.bookButtonText}>Confirm Booking</Text>
            <Text style={styles.bookButtonSubtext}>
              {selectedDate.toLocaleDateString()} • {selectedSlot}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Success Message */}
      {bookingSuccess && (
        <View style={styles.successMessage}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>Session booked successfully!</Text>
        </View>
      )}
      
      {/* Custom Confirmation Modal */}
      {showConfirmation && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>📅</Text>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalQuestion}>
                Are you sure you want to book this session?
              </Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetail}>
                  📅 {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.modalDetail}>
                  ⏰ {selectedSlot}
                </Text>
                <Text style={styles.modalDetail}>
                  💳 1 credit will be deducted
                </Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={confirmBooking}
              >
                <Text style={styles.confirmButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Sessions Management Screen
const SessionsScreen = ({ onWorkout }: { onWorkout: (date: Date) => void }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  // Mock data for booked sessions
  const upcomingSessions = [
    {
      id: 1,
      date: new Date(2026, 1, 15), // Feb 15, 2026
      time: '7:30-9:30',
      label: 'Morning Session',
      icon: '🌅',
      status: 'confirmed',
      creditStatus: 'ok', // ok, warning, critical
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Gym A'
    },
    {
      id: 2,
      date: new Date(2026, 1, 17), // Feb 17, 2026
      time: '9:30-11:30',
      label: 'Late Morning',
      icon: '☀️',
      status: 'confirmed',
      creditStatus: 'warning',
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Gym B'
    },
    {
      id: 3,
      date: new Date(2026, 1, 20), // Feb 20, 2026
      time: '7:30-9:30',
      label: 'Morning Session',
      icon: '🌅',
      status: 'pending',
      creditStatus: 'critical',
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Gym A'
    }
  ];
  
  const pastSessions = [
    {
      id: 4,
      date: new Date(2026, 1, 8), // Feb 8, 2026
      time: '7:30-9:30',
      label: 'Morning Session',
      icon: '🌅',
      status: 'completed',
      creditStatus: 'ok',
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Gym A',
      rating: 5
    },
    {
      id: 5,
      date: new Date(2026, 1, 6), // Feb 6, 2026
      time: '9:30-11:30',
      label: 'Late Morning',
      icon: '☀️',
      status: 'completed',
      creditStatus: 'ok',
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Gym B',
      rating: 4
    }
  ];
  
  const currentSessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions;
  const totalCredits = 8;
  const usedCredits = upcomingSessions.length + pastSessions.length;
  const availableCredits = totalCredits - usedCredits;
  
  const getCreditStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#64748b';
    }
  };
  
  const getCreditStatusText = (status: string) => {
    switch (status) {
      case 'ok': return 'Credits OK';
      case 'warning': return 'Low Credits';
      case 'critical': return 'Buy Credits';
      default: return 'Unknown';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'completed': return '#64748b';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };
  
  const formatSessionDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <View style={styles.sessionsContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />
      
      {/* Header */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>My Sessions</Text>
        <Text style={styles.pageSubtitle}>Manage your training sessions</Text>
      </View>
      
      {/* Credits Overview Card */}
      <View style={styles.creditsOverviewCard}>
        <View style={styles.creditsHeader}>
          <Text style={styles.creditsTitle}>Credits Overview</Text>
          <TouchableOpacity style={styles.buyCreditsButton}>
            <Text style={styles.buyCreditsText}>Buy More</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.creditsStats}>
          <View style={styles.creditStat}>
            <Text style={styles.creditNumber}>{totalCredits}</Text>
            <Text style={styles.creditLabel}>Total Credits</Text>
          </View>
          <View style={styles.creditStat}>
            <Text style={styles.creditNumber}>{usedCredits}</Text>
            <Text style={styles.creditLabel}>Used</Text>
          </View>
          <View style={[
            styles.creditStat,
            availableCredits <= 2 && styles.warningStat,
            availableCredits <= 0 && styles.criticalStat
          ]}>
            <Text style={[
              styles.creditNumber,
              availableCredits <= 2 && styles.warningText,
              availableCredits <= 0 && styles.criticalText
            ]}>
              {availableCredits}
            </Text>
            <Text style={styles.creditLabel}>Available</Text>
          </View>
        </View>
        {availableCredits <= 2 && (
          <View style={[
            styles.creditsWarning,
            availableCredits <= 0 && styles.creditsCritical
          ]}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={[
              styles.warningText,
              availableCredits <= 0 && styles.criticalWarningText
            ]}>
              {availableCredits <= 0 ? 'No credits remaining! Buy more to continue booking.' : 'Low credits! Consider buying more.'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && styles.activeTab
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'upcoming' && styles.activeTabText
          ]}>
            Upcoming ({upcomingSessions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && styles.activeTab
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'past' && styles.activeTabText
          ]}>
            Past ({pastSessions.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Sessions List */}
      <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
        {currentSessions.map(session => (
          <TouchableOpacity 
            key={session.id} 
            style={styles.sessionCard}
            onPress={() => onWorkout(session.date)}
          >
            <View style={styles.sessionHeader}>
              <View style={styles.sessionDateTime}>
                <Text style={styles.sessionIcon}>{session.icon}</Text>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
                  <Text style={styles.sessionTime}>{session.time}</Text>
                </View>
              </View>
              <View style={styles.sessionStatusContainer}>
                <View style={[
                  styles.sessionStatus,
                  { backgroundColor: getStatusColor(session.status) }
                ]}>
                  <Text style={styles.sessionStatusText}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.sessionDetails}>
              <Text style={styles.sessionLabel}>{session.label}</Text>
              <Text style={styles.sessionTrainer}>Trainer: {session.trainer}</Text>
              <Text style={styles.sessionLocation}>📍 {session.location}</Text>
            </View>
            
            <View style={styles.sessionFooter}>
              <View style={styles.creditStatusContainer}>
                <View style={[
                  styles.creditStatusIndicator,
                  { backgroundColor: getCreditStatusColor(session.creditStatus) }
                ]}>
                  <Text style={styles.creditStatusIndicatorText}>
                    {session.creditStatus === 'ok' ? '✓' : session.creditStatus === 'warning' ? '!' : '×'}
                  </Text>
                </View>
                <Text style={[
                  styles.creditStatusText,
                  { color: getCreditStatusColor(session.creditStatus) }
                ]}>
                  {getCreditStatusText(session.creditStatus)}
                </Text>
              </View>
              
              {session.status === 'completed' && (session as any).rating && (
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>⭐ {(session as any).rating}/5</Text>
                </View>
              )}
              
              {session.status === 'confirmed' && (
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Credits Purchase Screen
const CreditsScreen = () => {
  const [loading, setLoading] = useState(false);
  const [showMBWayModal, setShowMBWayModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<typeof creditPacks[0] | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const creditPacks = [
    { id: 1, credits: 4, price: 100, description: '4 Sessions - Minimum package' },
    { id: 2, credits: 8, price: 200, description: '8 Sessions - Popular choice' },
    { id: 3, credits: 12, price: 300, description: '12 Sessions - Best value' },
    { id: 4, credits: 20, price: 500, description: '20 Sessions - Premium package' },
  ];

  const handlePurchase = (pack: typeof creditPacks[0]) => {
    setSelectedPack(pack);
    setShowMBWayModal(true);
  };

  const processMBWayPayment = () => {
    if (!phoneNumber || !selectedPack) return;
    
    setLoading(true);
    // Simulate MB Way payment processing
    setTimeout(() => {
      setLoading(false);
      setShowMBWayModal(false);
      setPhoneNumber('');
      setSelectedPack(null);
      Alert.alert('Success', `MB Way payment of €${selectedPack.price} completed! ${selectedPack.credits} credits added to your account.`);
    }, 3000);
  };

  return (
    <View style={styles.creditsContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />
      
      <ScrollView>
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>Choose Your Credit Package</Text>
          <Text style={styles.pageSubtitle}>Credits are used for PT sessions</Text>
        </View>

      {creditPacks.map((pack) => (
        <View key={pack.id} style={styles.creditPack}>
          <View style={styles.packInfo}>
            <Text style={styles.packCredits}>{pack.credits} Credits</Text>
            <Text style={styles.packDescription}>{pack.description}</Text>
          </View>
          <View style={styles.packPricing}>
            <Text style={styles.packPrice}>€{pack.price}</Text>
            <TouchableOpacity 
              style={[styles.buyButton, loading && styles.buyButtonDisabled]}
              onPress={() => handlePurchase(pack)}
              disabled={loading}
            >
              <Text style={styles.buyButtonText}>
                {loading ? 'Processing...' : 'Buy Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentTitle}>Payment Information</Text>
        <Text style={styles.paymentText}>
          Secure payment via Stripe. Credits are added to your account immediately after purchase.
        </Text>
        <Text style={styles.paymentText}>
          💰 1 Credit = €25 (1 PT Session) • Minimum 4 sessions required
        </Text>
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentMethod}>💳 Visa</Text>
          <Text style={styles.paymentMethod}>💳 Mastercard</Text>
          <Text style={styles.paymentMethod}>💳 MB Way</Text>
        </View>
      </View>

      {/* MB Way Payment Modal */}
      {showMBWayModal && selectedPack && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MB Way Payment</Text>
              <TouchableOpacity onPress={() => setShowMBWayModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.paymentAmount}>€{selectedPack.price}</Text>
              <Text style={styles.paymentDescription}>{selectedPack.description}</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>MB Way Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="912 345 678"
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
              
              <Text style={styles.mbWayInstructions}>
                1. Enter your MB Way phone number
                2. Tap "Pay with MB Way"
                3. Confirm payment in your MB Way app
                4. Credits will be added automatically
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, styles.modalButton]}
                onPress={() => setShowMBWayModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mbWayButton, styles.modalButton]}
                onPress={processMBWayPayment}
                disabled={loading || !phoneNumber}
              >
                <Text style={styles.mbWayButtonText}>
                  {loading ? 'Processing...' : 'Pay with MB Way'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const WorkoutScreen = ({ selectedDate = new Date(), userGender = 'male' }: { selectedDate?: Date, userGender?: string }) => {
  const [selectedWeek, setSelectedWeek] = useState(selectedDate || new Date());
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  
  // Static imports for images - this works in React Native
  const maleImages = {
    BenchPress: require('./MaleBenchPress.png'),
    Squats: require('./MaleSquats.png'),
    DeadLift: require('./Maledeadlift.png'),
    OverheadPress: require('./MaleOverheadPress.png'),
    BoxSquat: require('./MaleBoxSquat.png'),
  };
  
  const femaleImages = {
    BenchPress: require('./FemaleBenchPress.png'),
    Squats: require('./FemaleSquats.png'),
    DeadLift: require('./FemaleDeadLift.png'),
    OverheadPress: require('./FemaleOverheadPress.png'),
    BoxSquat: require('./FemaleBoxSquat.png'),
  };
  
  // Simple function to get image source with fallback
  const getExerciseImage = (imageKey: string) => {
    try {
      if (userGender === 'male' && maleImages[imageKey as keyof typeof maleImages]) {
        return maleImages[imageKey as keyof typeof maleImages];
      } else if (userGender === 'female' && femaleImages[imageKey as keyof typeof femaleImages]) {
        return femaleImages[imageKey as keyof typeof femaleImages];
      }
    } catch (error) {
      // Fall through to placeholder
    }
    
    // Fallback to colored placeholder
    const colors = {
      male: ['#3b82f6', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#14b8a6', '#0ea5e9', '#059669'],
      female: ['#ec4899', '#f59e0b', '#8b5cf6', '#84cc16', '#6366f1', '#a855f7', '#d946ef', '#dc2626']
    };
    const colorIndex = Math.abs(imageKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 8;
    const color = userGender === 'male' ? colors.male[colorIndex] : colors.female[colorIndex];
    const initials = imageKey.split('-').map(word => word[0].toUpperCase()).join('').substring(0, 2);
    
    return { uri: `https://via.placeholder.com/50x50/${color}/ffffff?text=${initials}` };
  };
  
  const exercises = [
    { 
      id: 1, 
      name: 'Bench Press', 
      category: 'Chest', 
      imageKey: 'BenchPress'
    },
    { 
      id: 2, 
      name: 'Squats', 
      category: 'Legs', 
      imageKey: 'Squats'
    },
    { 
      id: 3, 
      name: 'Box Squats', 
      category: 'Legs', 
      imageKey: 'BoxSquat'
    },
    { 
      id: 4, 
      name: 'Deadlift', 
      category: 'Back', 
      imageKey: 'DeadLift'
    },
    { 
      id: 5, 
      name: 'Overhead Press', 
      category: 'Shoulders', 
      imageKey: 'OverheadPress'
    },
  ];
  
  const previousWorkouts = [
    {
      week: 'Jan 29 - Feb 4',
      exercises: [
        { id: 1, name: 'Bench Press', sets: '5x5', weight: '80kg', type: 'normal', notes: 'Felt strong' },
        { id: 2, name: 'Squat', sets: '5x5', weight: '100kg', type: 'normal', notes: 'Good depth' },
        { id: 3, name: 'Deadlift', sets: '1x1', weight: '140kg', type: 'max', notes: 'PR!' },
      ]
    },
    {
      week: 'Jan 22 - Jan 28',
      exercises: [
        { id: 4, name: 'Bench Press', sets: '3x8', weight: '70kg', type: 'light', notes: 'Recovery week' },
        { id: 5, name: 'Squat', sets: '3x8', weight: '85kg', type: 'light', notes: 'Focus on form' },
        { id: 6, name: 'Overhead Press', sets: '5x5', weight: '50kg', type: 'normal', notes: 'Steady progress' },
      ]
    },
  ];
  
  const [currentWeekWorkout, setCurrentWeekWorkout] = useState<any[]>([]);

  const [newExercise, setNewExercise] = useState({
    sets: '',
    weight: '',
    notes: '',
    type: 'normal' // normal, light, heavy, max
  });

  const addExerciseToWorkout = (exercise: {id: number, name: string, category: string}) => {
    const workoutExercise = {
      id: Date.now(),
      name: exercise.name,
      sets: newExercise.sets || '3x10',
      weight: newExercise.weight || '60kg',
      type: newExercise.type || 'normal',
      notes: newExercise.notes
    };
    setCurrentWeekWorkout([...currentWeekWorkout, workoutExercise]);
    setShowAddExercise(false);
    setNewExercise({ sets: '', weight: '', notes: '', type: 'normal' });
  };

  const updateExercise = (exerciseId: number, updates: Partial<{id: number, name: string, sets: string, weight: string, type: string, notes: string}>) => {
    setCurrentWeekWorkout(currentWeekWorkout.map(ex => 
      ex.id === exerciseId ? { ...ex, ...updates } : ex
    ));
    setEditingExercise(null);
    setShowExerciseDetails(false);
  };

  const deleteExercise = (exerciseId: number) => {
    setCurrentWeekWorkout(currentWeekWorkout.filter(ex => ex.id !== exerciseId));
  };

  return (
    <View style={styles.workoutContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />
      
      {/* Header */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>Workout Tracker</Text>
        <Text style={styles.pageSubtitle}>Track your training progress</Text>
      </View>
      
      <ScrollView>
        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <TouchableOpacity style={styles.weekNavButton}>
            <Text style={styles.weekNavText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.weekTitle}>Workout for {selectedWeek.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          <TouchableOpacity style={styles.weekNavButton}>
            <Text style={styles.weekNavText}>→</Text>
          </TouchableOpacity>
        </View>
        
        {/* Current Week Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddExercise(true)}
            >
              <Text style={styles.addButtonText}>+ Add Exercise</Text>
            </TouchableOpacity>
          </View>
          
          {currentWeekWorkout.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameRow}>
                  <Image 
                    source={getExerciseImage(exercises.find(ex => ex.name === exercise.name)?.imageKey || 'Bench Press')}
                    style={styles.exerciseImage}
                  />
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <View style={styles.exerciseActions}>
                  <View style={[styles.typeBadge, { backgroundColor: exercise.type === 'light' ? '#fef3c7' : exercise.type === 'heavy' ? '#fee2e2' : exercise.type === 'max' ? '#dbeafe' : '#f0f9ff' }]}>
                    <Text style={styles.typeBadgeText}>{exercise.type.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => {
                      setEditingExercise(exercise);
                      setShowExerciseDetails(true);
                    }}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteExercise(exercise.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.exerciseDetails}>
                <Text style={styles.exerciseSets}>{exercise.sets}</Text>
                <Text style={styles.exerciseWeight}>{exercise.weight}</Text>
              </View>
              {exercise.notes && (
                <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
              )}
            </View>
          ))}
          
          {currentWeekWorkout.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Add Exercise" to get started</Text>
            </View>
          )}
        </View>
        
        {/* Previous Weeks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Weeks</Text>
          {previousWorkouts.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekCard}>
              <Text style={styles.weekDate}>{week.week}</Text>
              {week.exercises.map((exercise) => (
                <View key={exercise.id} style={styles.previousExercise}>
                  <Text style={styles.previousExerciseName}>{exercise.name}</Text>
                  <Text style={styles.previousExerciseDetails}>{exercise.sets} • {exercise.weight}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Add Exercise Modal */}
      {showAddExercise && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.exerciseForm}>
              <Text style={styles.formLabel}>Sets x Reps</Text>
              <TextInput
                style={styles.formInput}
                value={newExercise.sets}
                onChangeText={(text) => setNewExercise({...newExercise, sets: text})}
                placeholder="e.g., 5x5 or 3x10"
              />
              
              <Text style={styles.formLabel}>Weight</Text>
              <TextInput
                style={styles.formInput}
                value={newExercise.weight}
                onChangeText={(text) => setNewExercise({...newExercise, weight: text})}
                placeholder="e.g., 80kg or bodyweight"
              />
              
              <Text style={styles.formLabel}>Workout Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity 
                  style={[styles.typeButton, newExercise.type === 'normal' && styles.activeTypeButton]}
                  onPress={() => setNewExercise({...newExercise, type: 'normal'})}
                >
                  <Text style={[styles.typeButtonText, newExercise.type === 'normal' && styles.activeTypeButtonText]}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, newExercise.type === 'light' && styles.activeTypeButton]}
                  onPress={() => setNewExercise({...newExercise, type: 'light'})}
                >
                  <Text style={[styles.typeButtonText, newExercise.type === 'light' && styles.activeTypeButtonText]}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, newExercise.type === 'heavy' && styles.activeTypeButton]}
                  onPress={() => setNewExercise({...newExercise, type: 'heavy'})}
                >
                  <Text style={[styles.typeButtonText, newExercise.type === 'heavy' && styles.activeTypeButtonText]}>Heavy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, newExercise.type === 'max' && styles.activeTypeButton]}
                  onPress={() => setNewExercise({...newExercise, type: 'max'})}
                >
                  <Text style={[styles.typeButtonText, newExercise.type === 'max' && styles.activeTypeButtonText]}>Max</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={newExercise.notes}
                onChangeText={(text) => setNewExercise({...newExercise, notes: text})}
                placeholder="How did it feel? Any observations?"
                multiline
              />
            </View>
            
            <ScrollView style={styles.exerciseList}>
              {exercises.map((exercise) => (
                <TouchableOpacity 
                  key={exercise.id}
                  style={styles.exerciseOption}
                  onPress={() => addExerciseToWorkout(exercise)}
                >
                  <View style={styles.exerciseOptionRow}>
                    <Image 
                      source={getExerciseImage(exercise.imageKey)}
                      style={styles.exerciseOptionImage}
                    />
                    <View>
                      <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                      <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      
      {/* Edit Exercise Modal */}
      {showExerciseDetails && editingExercise && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editingExercise.name}</Text>
              <TouchableOpacity onPress={() => setShowExerciseDetails(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.exerciseForm}>
              <Text style={styles.formLabel}>Sets x Reps</Text>
              <TextInput
                style={styles.formInput}
                value={editingExercise.sets}
                onChangeText={(text) => setEditingExercise({...editingExercise, sets: text})}
                placeholder="e.g., 5x5 or 3x10"
              />
              
              <Text style={styles.formLabel}>Weight</Text>
              <TextInput
                style={styles.formInput}
                value={editingExercise.weight}
                onChangeText={(text) => setEditingExercise({...editingExercise, weight: text})}
                placeholder="e.g., 80kg or bodyweight"
              />
              
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={editingExercise.notes}
                onChangeText={(text) => setEditingExercise({...editingExercise, notes: text})}
                placeholder="How did it feel? Any observations?"
                multiline
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowExerciseDetails(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={() => updateExercise(editingExercise.id, editingExercise)}
              >
                <Text style={styles.saveModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Profile Screen
const ProfileScreen = ({ userProfile, onBack }: { 
  userProfile: any, 
  onBack: () => void 
}) => {
  const [profileImage, setProfileImage] = useState(userProfile.profileImage || null);
  
  const handleImageUpload = async () => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a photo.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      // In a real app, you would upload this to your server/cloud storage
      // For now, we'll just store the local URI
    }
  };

  return (
    <View style={styles.profileContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />
      
      {/* Header */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>My Profile</Text>
        <Text style={styles.pageSubtitle}>Manage your account details</Text>
      </View>
      
      <ScrollView>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity onPress={handleImageUpload} style={styles.profilePictureContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicture}>
                <Text style={styles.profilePictureText}>
                  {userProfile.gender === 'male' ? '👨‍💪' : '👩‍💪'}
                </Text>
              </View>
            )}
            <View style={styles.uploadOverlay}>
              <Text style={styles.uploadIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{userProfile.name}</Text>
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
          <TouchableOpacity onPress={handleImageUpload} style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
        
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>
              {userProfile.gender === 'male' ? 'Male' : 'Female'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>
              {userProfile.dateOfBirth.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>
              {Math.floor((new Date().getTime() - userProfile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
            </Text>
          </View>
        </View>
        
        {/* Membership Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {userProfile.membershipStartDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sessions Attended</Text>
            <Text style={styles.infoValue}>{userProfile.sessionsAttended}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Membership Length</Text>
            <Text style={styles.infoValue}>
              {Math.floor((new Date().getTime() - userProfile.membershipStartDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
            </Text>
          </View>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userProfile.sessionsAttended}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.floor((new Date().getTime() - userProfile.membershipStartDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000))}
            </Text>
            <Text style={styles.statLabel}>Months Active</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Simple Dashboard Screen
const DashboardScreen = ({ onBuyCredits, onBookSession, onViewSessions, onLogout, onWorkout, onProfile }: { 
  onBuyCredits: () => void, 
  onBookSession: () => void,
  onViewSessions: () => void,
  onLogout: () => void,
  onWorkout: () => void,
  onProfile: () => void
}) => {
  return (
    <View style={styles.dashboardContainer}>
      {/* Hero Banner */}
      <Image 
        source={logoBanner}
        style={styles.dashboardHeroBanner}
        resizeMode="cover"
      />

      {/* Welcome Section */}
      <View style={styles.pageTitleSection}>
        <Text style={styles.pageTitle}>Welcome to Elevate Gym</Text>
        <Text style={styles.pageSubtitle}>Let's get stronger today 💪</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Sessions Remaining</Text>
        </View>
        <View style={styles.nextSessionStatCard}>
          <Text style={styles.nextSessionStatLabel}>Next Session</Text>
          <Text style={styles.nextSessionStatDate}>Feb 18</Text>
          <Text style={styles.nextSessionStatTime}>7:30-9:30 AM</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={onBookSession}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Book Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={onViewSessions}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>My Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={onWorkout}>
            <Text style={styles.actionIcon}>💪</Text>
            <Text style={styles.actionText}>Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={onProfile}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard' | 'credits' | 'booking' | 'sessions' | 'workout' | 'profile'>('login');
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<Date | null>(null);
  
  // User profile data
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john@elevategym.com',
    gender: 'male', // male or female
    dateOfBirth: new Date(1990, 5, 15), // June 15, 1990
    membershipStartDate: new Date(2023, 0, 1), // January 1, 2023
    sessionsAttended: 24,
    profileImage: null // URL to uploaded profile image
  });

  if (currentScreen === 'login') {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={() => setCurrentScreen('dashboard')} />
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'credits') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>Buy Credits</Text>
            <View style={styles.placeholder} />
          </View>
          <CreditsScreen />
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'booking') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>Book Session</Text>
            <View style={styles.placeholder} />
          </View>
          <BookingScreen />
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'sessions') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>My Sessions</Text>
            <View style={styles.placeholder} />
          </View>
          <SessionsScreen 
            onWorkout={(date) => {
              setSelectedWorkoutDate(date);
              setCurrentScreen('workout');
            }}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'workout') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>Workout Tracker</Text>
            <View style={styles.placeholder} />
          </View>
          <WorkoutScreen selectedDate={selectedWorkoutDate || undefined} userGender={userProfile?.gender || 'male'} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'profile') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>My Profile</Text>
            <View style={styles.placeholder} />
          </View>
          <ProfileScreen userProfile={userProfile} onBack={() => setCurrentScreen('dashboard')} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.appContainer}>
        <DashboardScreen 
          onBuyCredits={() => setCurrentScreen('credits')} 
          onBookSession={() => setCurrentScreen('booking')}
          onViewSessions={() => setCurrentScreen('sessions')}
          onWorkout={() => setCurrentScreen('workout')}
          onProfile={() => setCurrentScreen('profile')}
          onLogout={() => setCurrentScreen('login')}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  sessionsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: 80,
    marginBottom: 16,
    alignSelf: 'center',
  },
  fullWidthLogo: {
    width: '100%',
    height: 120,
    marginBottom: 20,
  },
  heroBanner: {
    width: '100%',
    height: 150,
    marginBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerLogo: {
    width: 180,
    height: 60,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  topBarLogo: {
    width: 200,
    height: 60,
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#6F6F6E',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  dashboardHeroBanner: {
    width: '100%',
    height: 120,
    marginBottom: 20,
  },
  pageTitleSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  nameHeader: {
    backgroundColor: '#6F6F6E',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  personName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dashboardHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardLogo: {
    width: 160,
    height: 50,
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 1,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userName: {
    fontSize: 18,
    color: '#64748b',
  },
  logoutButton: {
    backgroundColor: '#6F6F6E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6F6F6E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  nextSessionStatCard: {
    flex: 1,
    backgroundColor: '#6F6F6E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextSessionStatDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  nextSessionStatTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  nextSessionStatLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  actionsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '48%',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  nextSessionCard: {
    backgroundColor: '#6F6F6E',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextSessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sessionInfo: {
    marginLeft: 4,
  },
  sessionTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sessionDetails: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 1,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topBar: {
    backgroundColor: '#6F6F6E',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
  },
  welcomeHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  bottomNav: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Credits Screen Styles
  creditsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  creditPack: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packInfo: {
    flex: 1,
  },
  packCredits: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  packDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  packPricing: {
    alignItems: 'center',
  },
  packPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6F6F6E',
    marginBottom: 8,
  },
  paymentInfo: {
    margin: 15,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 15,
    lineHeight: 20,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#64748b',
  },
  backText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 50,
  },
  // Modern Booking Screen Styles
  bookingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  bookingHeader: {
    backgroundColor: '#6F6F6E',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  bookingSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginHorizontal: 15,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthNavText: {
    fontSize: 16,
    color: '#6F6F6E',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#ffffff',
  },
  weekendHeaderText: {
    color: '#94a3b8',
    backgroundColor: '#ffffff',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
  },
  emptyDay: {
    width: '14.28%',
    height: 36,
    backgroundColor: '#ffffff',
  },
  calendarDay: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginVertical: 2,
    position: 'relative',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedDay: {
    backgroundColor: '#6F6F6E',
    borderColor: '#6F6F6E',
    shadowColor: '#6F6F6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  weekendDay: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  todayDay: {
    backgroundColor: '#eff6ff',
    borderColor: '#6F6F6E',
    borderWidth: 2,
  },
  hasBookingsDay: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  dayText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  weekendDayText: {
    color: '#94a3b8',
    backgroundColor: 'transparent',
  },
  todayDayText: {
    color: '#6F6F6E',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },
  bookingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bookingIndicatorText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  timeSlotsSection: {
    margin: 15,
  },
  timeSlotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  slotsContainer: {
    gap: 8,
  },
  timeSlotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#22c55e',
    marginVertical: 4,
  },
  unavailableSlot: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    opacity: 0.8,
  },
  selectedSlot: {
    backgroundColor: '#6F6F6E',
    borderColor: '#6F6F6E',
    shadowColor: '#6F6F6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slotIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  slotLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  slotStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#22c55e',
  },
  availableStatus: {
    backgroundColor: '#22c55e',
  },
  bookedStatus: {
    backgroundColor: '#ef4444',
  },
  selectedStatus: {
    backgroundColor: '#ffffff',
  },
  slotStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  unavailableSlotText: {
    color: '#ffffff',
  },
  selectedSlotText: {
    color: '#ffffff',
  },
  noSlotsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSlotsIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noSlotsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 5,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  currentBookingsSection: {
    margin: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentBookingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  currentBookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currentBookingIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  currentBookingInfo: {
    flex: 1,
  },
  currentBookingTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  currentBookingLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  bookedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  bookButtonContainer: {
    margin: 15,
    marginBottom: 30,
  },
  bookButton: {
    backgroundColor: '#6F6F6E',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6F6F6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookButtonSubtext: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  confirmationModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 0,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalContent: {
    padding: 20,
  },
  modalQuestion: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 15,
  },
  modalDetail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#6F6F6E',
    borderBottomRightRadius: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Success Message Styles
  successMessage: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  successIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Buy button styles
  buyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  // MB Way Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 24,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  mbWayInstructions: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  mbWayButton: {
    backgroundColor: '#00b0ff',
  },
  mbWayButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  creditsOverviewCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  creditsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  creditsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  buyCreditsButton: {
    backgroundColor: '#6F6F6E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyCreditsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  creditsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  creditStat: {
    alignItems: 'center',
    flex: 1,
  },
  creditNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  creditLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  warningStat: {
    // Applied dynamically
  },
  criticalStat: {
    // Applied dynamically
  },
  warningText: {
    color: '#f59e0b',
  },
  criticalText: {
    color: '#ef4444',
  },
  creditsWarning: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsCritical: {
    backgroundColor: '#fee2e2',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  criticalWarningText: {
    color: '#991b1b',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6F6F6E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ffffff',
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 14,
    color: '#64748b',
  },
  sessionStatusContainer: {
    alignItems: 'flex-end',
  },
  sessionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionDetails: {
    marginBottom: 12,
  },
  sessionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionTrainer: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  sessionLocation: {
    fontSize: 14,
    color: '#64748b',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditStatusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  creditStatusIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  creditStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#64748b',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  // Workout Screen Styles
  workoutContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6F6F6E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  workoutTypeSelector: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeTypeButton: {
    backgroundColor: '#6F6F6E',
    borderColor: '#6F6F6E',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  activeTypeButtonText: {
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6F6F6E',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseSets: {
    fontSize: 14,
    color: '#64748b',
  },
  exerciseWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F6F6E',
  },
  weekCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  weekDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  previousExercise: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  previousExerciseName: {
    fontSize: 14,
    color: '#374151',
  },
  previousExerciseDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    fontSize: 20,
    color: '#64748b',
  },
  exerciseList: {
    maxHeight: 300,
  },
  exerciseOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exerciseOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  // Form and Edit Styles
  exerciseForm: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  formInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6F6F6E',
  },
  editButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6F6F6E',
  },
  deleteButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  exerciseNotes: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  saveModalButton: {
    backgroundColor: '#6F6F6E',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profilePictureSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6F6F6E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6F6F6E',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  uploadIcon: {
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  profilePictureText: {
    fontSize: 32,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    margin: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6F6F6E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  // Exercise Image Styles
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  exerciseOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
});
