import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Image, Alert, Modal, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { auth, db } from './src/lib/supabase';

// Import the logo banner image
const logoBanner = require('./logo banner.png');

// Login Screen with real Supabase auth
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) { setErrorMsg('Please enter email and password'); return; }
    if (isSignUp && (!firstName || !lastName)) { setErrorMsg('Please enter your name'); return; }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await auth.signUp(email, password, firstName, lastName);
      setLoading(false);
      if (error) { setErrorMsg(error.message); return; }
      setSuccessMsg('Account created! Check your email to confirm, then sign in.');
      setIsSignUp(false);
    } else {
      const { error } = await auth.signIn(email, password);
      setLoading(false);
      if (error) { setErrorMsg(error.message); return; }
      onLogin();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Elevate Gym</Text>
          </View>
          <Image 
            source={logoBanner}
            style={styles.heroBanner as any}
            resizeMode="cover"
          />
          <Text style={styles.subtitle}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
          
          {errorMsg && (
            <View style={{backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 12}}>
              <Text style={{color: '#dc2626', fontSize: 13, textAlign: 'center'}}>{errorMsg}</Text>
            </View>
          )}
          {successMsg && (
            <View style={{backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 12}}>
              <Text style={{color: '#16a34a', fontSize: 13, textAlign: 'center'}}>{successMsg}</Text>
            </View>
          )}

          {isSignUp && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />
              </View>
            </>
          )}
          
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
            <View style={{position: 'relative'}}>
              <TextInput
                style={[styles.input, {paddingRight: 48}]}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignUp ? 'Choose a password (min 6 chars)' : 'Enter your password'}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center'}}
              >
                <Text style={{fontSize: 20}}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buyButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }} style={{marginTop: 12, alignItems: 'center'}}>
            <Text style={{color: '#3b82f6', fontSize: 14}}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Booking Screen with Modern Calendar — real Supabase slots
const BookingScreen = ({ bookedSessions, onBookSession }: { bookedSessions: any[], onBookSession: (slotId: string) => Promise<void> }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [dbSlots, setDbSlots] = useState<any[]>([]);

  // Load slots from Supabase for the current month
  useEffect(() => {
    const loadSlots = async () => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { data } = await db.getSlots(startDate, endDate);
      if (data) setDbSlots(data);
    };
    loadSlots();
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

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
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(i); }
    return days;
  };
  
  // Find DB slot for a given day + time
  const findDbSlot = (day: number, slotTime: string) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    return dbSlots.find(s => {
      const start = new Date(s.start_time);
      const h = start.getHours();
      const m = start.getMinutes().toString().padStart(2, '0');
      const end = new Date(s.end_time);
      const h2 = end.getHours();
      const m2 = end.getMinutes().toString().padStart(2, '0');
      const slotStr = `${h}:${m}-${h2}:${m2}`;
      return start.getFullYear() === year && start.getMonth() === month && start.getDate() === day && slotStr === slotTime;
    });
  };

  // Check booked sessions for slot availability
  const getBookingsForDate = (day: number) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const dateToCheck = new Date(year, month, day);
    return bookedSessions
      .filter((s: any) => s.date.getFullYear() === dateToCheck.getFullYear() && s.date.getMonth() === dateToCheck.getMonth() && s.date.getDate() === dateToCheck.getDate())
      .map((s: any) => s.time.replace(' - ', '-').replace(/ /g, ''));
  };
  
  const isSlotAvailable = (day: number, slot: string) => {
    const bookings = getBookingsForDate(day);
    if (bookings.includes(slot)) return false;
    // Also check DB slot capacity
    const dbSlot = findDbSlot(day, slot);
    if (!dbSlot) return false; // No slot in DB = not available
    return dbSlot.booked_count < dbSlot.capacity;
  };
  
  const handleBooking = () => {
    if (selectedSlot) {
      setShowConfirmation(true);
    }
  };
  
  const confirmBooking = async () => {
    if (selectedSlotId) {
      setBookingLoading(true);
      await onBookSession(selectedSlotId);
      setBookingLoading(false);
    }
    setShowConfirmation(false);
    setBookingSuccess(true);
    setSelectedSlot(null);
    setSelectedSlotId(null);
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
                  onPress={() => {
                    if (available) {
                      setSelectedSlot(slot.time);
                      const dbSlot = findDbSlot(currentDay, slot.time);
                      setSelectedSlotId(dbSlot?.id || null);
                    }
                  }}
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

// Sessions Management Screen — real Supabase data
const SessionsScreen = ({ onWorkout, onBuyCredits, clientProfileId, creditBalance, bookedSessions }: { 
  onWorkout: (date: Date) => void, 
  onBuyCredits: () => void,
  clientProfileId: string | null,
  creditBalance: number,
  bookedSessions: any[]
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [pastBookings, setPastBookings] = useState<any[]>([]);

  // Load past (completed/cancelled) bookings from Supabase
  useEffect(() => {
    const loadPast = async () => {
      if (!clientProfileId) return;
      const { data } = await db.getClientBookings(clientProfileId);
      if (data) {
        const past = data
          .filter((b: any) => b.status === 'completed' || (b.status === 'booked' && new Date(b.slots.start_time) < new Date()))
          .map((b: any) => {
            const start = new Date(b.slots.start_time);
            const end = new Date(b.slots.end_time);
            const h = start.getHours();
            return {
              id: b.id,
              date: start,
              time: `${h}:${start.getMinutes().toString().padStart(2,'0')}-${end.getHours()}:${end.getMinutes().toString().padStart(2,'0')}`,
              label: h < 10 ? 'Morning Session' : 'Late Morning',
              icon: h < 10 ? '🌅' : '☀️',
              status: 'completed',
              creditStatus: 'ok',
              creditsUsed: 1,
              trainer: 'Pedro',
              location: b.slots.location || 'Elevate Gym',
            };
          });
        setPastBookings(past);
      }
    };
    loadPast();
  }, [clientProfileId]);

  // Map bookedSessions (upcoming) to session format
  const now = new Date();
  const upcomingSessions = bookedSessions
    .filter((s: any) => s.date > now)
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
    .map((s: any) => ({
      ...s,
      status: 'confirmed',
      creditStatus: creditBalance > 2 ? 'ok' : creditBalance > 0 ? 'warning' : 'critical',
      creditsUsed: 1,
      trainer: 'Pedro',
      location: 'Elevate Gym',
    }));

  const pastSessions = pastBookings;
  
  const currentSessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions;
  const availableCredits = creditBalance;
  
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
          <TouchableOpacity style={styles.buyCreditsButton} onPress={onBuyCredits}>
            <Text style={styles.buyCreditsText}>Buy More</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.creditsStats}>
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
            <Text style={styles.creditLabel}>Credits Available</Text>
          </View>
          <View style={styles.creditStat}>
            <Text style={styles.creditNumber}>{upcomingSessions.length}</Text>
            <Text style={styles.creditLabel}>Upcoming</Text>
          </View>
          <View style={styles.creditStat}>
            <Text style={styles.creditNumber}>{pastSessions.length}</Text>
            <Text style={styles.creditLabel}>Completed</Text>
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

// Credits Purchase Screen — real Supabase data
const CreditsScreen = ({ clientProfileId, onRefresh }: { clientProfileId: string | null, onRefresh: () => Promise<void> }) => {
  const [loading, setLoading] = useState(false);
  const [showMBWayModal, setShowMBWayModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);

  // Load credit packs from Supabase
  useEffect(() => {
    const loadPacks = async () => {
      const { data } = await db.getCreditPacks();
      if (data && data.length > 0) {
        setCreditPacks(data.map((p: any) => ({
          id: p.id,
          credits: p.credits,
          price: p.price / 100, // DB stores in cents
          bonus: p.bonus_credits || 0,
          description: p.name,
        })));
      } else {
        // Fallback if DB has no packs
        setCreditPacks([
          { id: 'fallback-1', credits: 4, price: 100, bonus: 0, description: '4 Sessions' },
          { id: 'fallback-2', credits: 8, price: 200, bonus: 0, description: '8 Sessions' },
          { id: 'fallback-3', credits: 12, price: 300, bonus: 1, description: '12 Sessions + 1 FREE' },
          { id: 'fallback-4', credits: 20, price: 500, bonus: 2, description: '20 Sessions + 2 FREE' },
        ]);
      }
    };
    loadPacks();
  }, []);

  const handlePurchase = (pack: any) => {
    setSelectedPack(pack);
    setShowMBWayModal(true);
  };

  const processMBWayPayment = async () => {
    if (!phoneNumber || !selectedPack || !clientProfileId) return;
    
    setLoading(true);
    // Record payment
    await db.createPayment(clientProfileId, selectedPack.id, selectedPack.price * 100, 'mbway');
    // Add credits to balance
    const totalCredits = selectedPack.credits + selectedPack.bonus;
    await db.addCredits(clientProfileId, totalCredits, `Purchased ${selectedPack.description}`);
    // Refresh parent data
    await onRefresh();
    
    setLoading(false);
    setShowMBWayModal(false);
    setPhoneNumber('');
    const purchasedPack = selectedPack;
    setSelectedPack(null);
    setPaymentSuccess(`MB Way payment of €${purchasedPack.price} completed! ${totalCredits} credits added to your account.`);
    setTimeout(() => setPaymentSuccess(null), 5000);
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
        <View key={pack.id} style={[styles.creditPack, pack.bonus > 0 && {borderWidth: 2, borderColor: '#10b981'}]}>
          {pack.bonus > 0 && (
            <View style={{backgroundColor: '#10b981', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, position: 'absolute', top: -12, right: 16, zIndex: 1}}>
              <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>+{pack.bonus} FREE SESSION{pack.bonus > 1 ? 'S' : ''}!</Text>
            </View>
          )}
          <View style={styles.packInfo}>
            <Text style={styles.packCredits}>{pack.credits + pack.bonus} Sessions</Text>
            <Text style={styles.packDescription}>{pack.description}</Text>
            {pack.bonus > 0 && (
              <Text style={{fontSize: 12, color: '#10b981', fontWeight: '700', marginTop: 4}}>
                Save €{pack.bonus * 25}! ({pack.bonus} free session{pack.bonus > 1 ? 's' : ''} worth €{pack.bonus * 25})
              </Text>
            )}
          </View>
          <View style={styles.packPricing}>
            <Text style={styles.packPrice}>€{pack.price}</Text>
            {pack.bonus > 0 && (
              <Text style={{fontSize: 10, color: '#6b7280', textDecorationLine: 'line-through'}}>€{(pack.credits + pack.bonus) * 25}</Text>
            )}
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
      </ScrollView>

      {/* Success Banner */}
      {paymentSuccess && (
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#10b981', padding: 16, zIndex: 100}}>
          <Text style={{color: '#fff', fontWeight: 'bold', textAlign: 'center'}}>{paymentSuccess}</Text>
        </View>
      )}

      {/* MB Way Payment Modal */}
      <Modal visible={showMBWayModal && !!selectedPack} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MB Way Payment</Text>
              <TouchableOpacity onPress={() => setShowMBWayModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.paymentAmount}>€{selectedPack?.price}</Text>
              <Text style={styles.paymentDescription}>{selectedPack?.description}</Text>
              
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
                1. Enter your MB Way phone number{'\n'}
                2. Tap "Pay with MB Way"{'\n'}
                3. Confirm payment in your MB Way app{'\n'}
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
      </Modal>
    </View>
  );
};

const WorkoutScreen = ({ selectedDate = new Date(), userGender = 'male', clientProfileId }: { selectedDate?: Date, userGender?: string, clientProfileId?: string | null }) => {
  const [selectedWeek, setSelectedWeek] = useState(selectedDate || new Date());
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  const [dbExercises, setDbExercises] = useState<any[]>([]);
  const [dbPreviousWorkouts, setDbPreviousWorkouts] = useState<any[]>([]);

  // Load exercises and previous workouts from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data: exData } = await db.getExercises();
      if (exData && exData.length > 0) setDbExercises(exData);

      if (clientProfileId) {
        const { data: wkData } = await db.getClientWorkouts(clientProfileId);
        if (wkData) setDbPreviousWorkouts(wkData);
      }
    };
    loadData();
  }, [clientProfileId]);

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
  
  // Use DB exercises if available, fallback to hardcoded
  const fallbackExercises = [
    { id: 'fb-1', name: 'Bench Press', category: 'Chest', imageKey: 'BenchPress' },
    { id: 'fb-2', name: 'Squats', category: 'Legs', imageKey: 'Squats' },
    { id: 'fb-3', name: 'Box Squats', category: 'Legs', imageKey: 'BoxSquat' },
    { id: 'fb-4', name: 'Deadlift', category: 'Back', imageKey: 'DeadLift' },
    { id: 'fb-5', name: 'Overhead Press', category: 'Shoulders', imageKey: 'OverheadPress' },
  ];
  const exercises = dbExercises.length > 0
    ? dbExercises.map((e: any) => ({
        id: e.id,
        name: e.name,
        category: e.muscle_group || e.category || 'General',
        imageKey: e.name.replace(/\s+/g, ''),
      }))
    : fallbackExercises;

  // Map DB workouts to display format, fallback to hardcoded
  const previousWorkouts = dbPreviousWorkouts.length > 0
    ? dbPreviousWorkouts.map((w: any) => {
        const d = new Date(w.date || w.created_at);
        const weekEnd = new Date(d); weekEnd.setDate(d.getDate() + 6);
        return {
          week: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          exercises: (w.workout_exercises || []).map((we: any) => ({
            id: we.id,
            name: we.exercises?.name || 'Exercise',
            sets: we.sets ? `${we.sets}x${we.reps || '?'}` : '3x10',
            weight: we.weight ? `${we.weight}kg` : '-',
            type: we.type || 'normal',
            notes: we.notes || '',
          })),
        };
      })
    : [
        { week: 'Jan 29 - Feb 4', exercises: [
          { id: 1, name: 'Bench Press', sets: '5x5', weight: '80kg', type: 'normal', notes: 'Felt strong' },
          { id: 2, name: 'Squat', sets: '5x5', weight: '100kg', type: 'normal', notes: 'Good depth' },
          { id: 3, name: 'Deadlift', sets: '1x1', weight: '140kg', type: 'max', notes: 'PR!' },
        ]},
        { week: 'Jan 22 - Jan 28', exercises: [
          { id: 4, name: 'Bench Press', sets: '3x8', weight: '70kg', type: 'light', notes: 'Recovery week' },
          { id: 5, name: 'Squat', sets: '3x8', weight: '85kg', type: 'light', notes: 'Focus on form' },
          { id: 6, name: 'Overhead Press', sets: '5x5', weight: '50kg', type: 'normal', notes: 'Steady progress' },
        ]},
      ];
  
  const [currentWeekWorkout, setCurrentWeekWorkout] = useState<any[]>([]);

  const [newExercise, setNewExercise] = useState({
    sets: '',
    weight: '',
    notes: '',
    type: 'normal' // normal, light, heavy, max
  });

  const addExerciseToWorkout = (exercise: {id: any, name: string, category: string}) => {
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
              {week.exercises.map((exercise: any) => (
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

// Dashboard Screen — real data
const DashboardScreen = ({ onBuyCredits, onBookSession, onViewSessions, onLogout, onWorkout, onProfile, onAnalytics, onCancelSession, creditBalance, bookedSessions, userName }: { 
  onBuyCredits: () => void, 
  onBookSession: () => void,
  onViewSessions: () => void,
  onLogout: () => void,
  onWorkout: () => void,
  onProfile: () => void,
  onAnalytics: () => void,
  onCancelSession: () => void,
  creditBalance: number,
  bookedSessions: any[],
  userName: string
}) => {
  // Find next upcoming session
  const now = new Date();
  const upcomingSorted = bookedSessions
    .filter((s: any) => s.date > now)
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
  const nextSession = upcomingSorted.length > 0 ? upcomingSorted[0] : null;

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
        <Text style={styles.pageTitle}>Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}</Text>
        <Text style={styles.pageSubtitle}>Let's get stronger today 💪</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{creditBalance}</Text>
          <Text style={styles.statLabel}>Credits Remaining</Text>
        </View>
        <View style={styles.nextSessionStatCard}>
          <Text style={styles.nextSessionStatLabel}>Next Session</Text>
          {nextSession ? (
            <>
              <Text style={styles.nextSessionStatDate}>{nextSession.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              <Text style={styles.nextSessionStatTime}>{nextSession.time}</Text>
            </>
          ) : (
            <Text style={styles.nextSessionStatDate}>None booked</Text>
          )}
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
          <TouchableOpacity style={styles.actionCard} onPress={onAnalytics}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, {borderColor: '#ef4444', borderWidth: 1}]} onPress={onCancelSession}>
            <Text style={styles.actionIcon}>❌</Text>
            <Text style={styles.actionText}>Cancel Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Cancel Session Screen
type BookedSession = { id: string, date: Date, time: string, label: string, icon: string, slotId: string, bookingId: string };
const CancelSessionScreen = ({ sessions, onCancelSessions }: { sessions: BookedSession[], onCancelSessions: (ids: string[]) => void }) => {
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const today = new Date();

  const getDaysUntil = (date: Date) => {
    const diff = date.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isWithin2Days = (date: Date) => getDaysUntil(date) <= 2;

  const toggleSession = (id: string) => {
    setSelectedSessions(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectedSessionsData = sessions.filter(s => selectedSessions.includes(s.id));
  const chargedSessions = selectedSessionsData.filter(s => isWithin2Days(s.date));
  const freeCancellations = selectedSessionsData.filter(s => !isWithin2Days(s.date));

  const handleCancel = () => {
    onCancelSessions(selectedSessions);
    setShowConfirmModal(false);
    setCancelSuccess(`${selectedSessionsData.length} session${selectedSessionsData.length > 1 ? 's' : ''} cancelled successfully.${chargedSessions.length > 0 ? ` ${chargedSessions.length} session${chargedSessions.length > 1 ? 's were' : ' was'} within 48 hours and will be charged.` : ''}`);
    setSelectedSessions([]);
    setTimeout(() => setCancelSuccess(null), 5000);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.sessionsContainer}>
      <Image source={logoBanner} style={styles.dashboardHeroBanner} resizeMode="cover" />

      <ScrollView>
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>Cancel Sessions</Text>
          <Text style={styles.pageSubtitle}>Select sessions you want to cancel</Text>
        </View>

        {sessions.length === 0 && (
          <View style={{alignItems: 'center', padding: 40, margin: 16}}>
            <Text style={{fontSize: 48, marginBottom: 12}}>✅</Text>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8}}>No Booked Sessions</Text>
            <Text style={{fontSize: 14, color: '#6b7280', textAlign: 'center'}}>You don't have any upcoming sessions to cancel.</Text>
          </View>
        )}

        {sessions.length > 0 && (
          <View style={{backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, margin: 16, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: '#f59e0b'}}>
            <Text style={{fontSize: 13, fontWeight: 'bold', color: '#92400e', marginBottom: 4}}>Cancellation Policy</Text>
            <Text style={{fontSize: 12, color: '#92400e', lineHeight: 18}}>
              Sessions cancelled more than 48 hours in advance are free.{'\n'}
              Sessions within 48 hours will still be charged (1 credit).
            </Text>
          </View>
        )}

        {/* Session List */}
        {sessions.map((session) => {
          const daysUntil = getDaysUntil(session.date);
          const within2 = isWithin2Days(session.date);
          const isSelected = selectedSessions.includes(session.id);

          return (
            <TouchableOpacity
              key={session.id}
              onPress={() => toggleSession(session.id)}
              style={{
                backgroundColor: isSelected ? (within2 ? '#fef2f2' : '#f0fdf4') : '#fff',
                borderRadius: 12, padding: 14, margin: 16, marginBottom: 0,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? (within2 ? '#ef4444' : '#10b981') : '#e5e7eb',
                flexDirection: 'row', alignItems: 'center',
              }}
            >
              {/* Checkbox */}
              <View style={{
                width: 24, height: 24, borderRadius: 6, marginRight: 12,
                borderWidth: 2, borderColor: isSelected ? (within2 ? '#ef4444' : '#10b981') : '#d1d5db',
                backgroundColor: isSelected ? (within2 ? '#ef4444' : '#10b981') : 'transparent',
                justifyContent: 'center', alignItems: 'center',
              }}>
                {isSelected && <Text style={{color: '#fff', fontSize: 14, fontWeight: 'bold'}}>✓</Text>}
              </View>

              {/* Session Info */}
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                  <Text style={{fontSize: 16}}>{session.icon} </Text>
                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1f2937'}}>{session.label}</Text>
                </View>
                <Text style={{fontSize: 13, color: '#6b7280'}}>{formatDate(session.date)} • {session.time}</Text>
                <Text style={{fontSize: 12, color: within2 ? '#ef4444' : '#10b981', fontWeight: '600', marginTop: 2}}>
                  {daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                  {within2 ? ' - Will be charged' : ' - Free cancellation'}
                </Text>
              </View>

              {/* Charge indicator */}
              {within2 && (
                <View style={{backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8}}>
                  <Text style={{fontSize: 10, fontWeight: 'bold', color: '#ef4444'}}>CHARGED</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Success Banner */}
      {cancelSuccess && (
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#10b981', padding: 16, zIndex: 100}}>
          <Text style={{color: '#fff', fontWeight: 'bold', textAlign: 'center'}}>{cancelSuccess}</Text>
        </View>
      )}

      {/* Bottom Cancel Button */}
      {selectedSessions.length > 0 && (
        <View style={{position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', shadowColor: '#000', shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.1, shadowRadius: 4}}>
          <Text style={{fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 8}}>
            {selectedSessions.length} session{selectedSessions.length > 1 ? 's' : ''} selected
            {chargedSessions.length > 0 && (
              ` • ${chargedSessions.length} will be charged`
            )}
          </Text>
          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={{backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center'}}
          >
            <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>
              Cancel {selectedSessions.length} Session{selectedSessions.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Cancellation</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={{fontSize: 14, color: '#374151', marginBottom: 12}}>
                You are about to cancel {selectedSessionsData.length} session{selectedSessionsData.length > 1 ? 's' : ''}:
              </Text>

              {freeCancellations.length > 0 && (
                <View style={{marginBottom: 12}}>
                  <Text style={{fontSize: 13, fontWeight: '600', color: '#10b981', marginBottom: 4}}>Free cancellations:</Text>
                  {freeCancellations.map(s => (
                    <Text key={s.id} style={{fontSize: 13, color: '#374151', marginLeft: 8}}>• {formatDate(s.date)} - {s.label}</Text>
                  ))}
                </View>
              )}

              {chargedSessions.length > 0 && (
                <View style={{backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 12}}>
                  <Text style={{fontSize: 13, fontWeight: 'bold', color: '#ef4444', marginBottom: 4}}>
                    ⚠️ These sessions are within 48 hours and you WILL be charged:
                  </Text>
                  {chargedSessions.map(s => (
                    <Text key={s.id} style={{fontSize: 13, color: '#991b1b', marginLeft: 8}}>• {formatDate(s.date)} - {s.label} (1 credit)</Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.modalButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{backgroundColor: '#ef4444'}, styles.modalButton]}
                onPress={handleCancel}
              >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 15}}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Analytics Screen — loads real workout data from Supabase
const AnalyticsScreen = ({ clientProfileId }: { clientProfileId?: string | null }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '3M' | '6M' | 'ALL'>('3M');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [dbWeeklyData, setDbWeeklyData] = useState<any[]>([]);

  // Load workout data from Supabase
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!clientProfileId) return;
      const { data } = await db.getClientWorkouts(clientProfileId);
      if (data && data.length > 0) {
        const mapped = data.map((w: any) => {
          const d = new Date(w.date || w.created_at);
          const exerciseMap: Record<string, number> = {};
          (w.workout_exercises || []).forEach((we: any) => {
            const name = we.exercises?.name || 'Unknown';
            exerciseMap[name] = we.weight || 0;
          });
          return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), month: d.getMonth() + 1, exercises: exerciseMap };
        });
        setDbWeeklyData(mapped);
      }
    };
    loadAnalytics();
  }, [clientProfileId]);

  // Use DB data if available, fallback to hardcoded
  const allWeeklyData = dbWeeklyData.length > 0 ? dbWeeklyData : [
    { date: 'Aug 4', month: 8, exercises: { 'Bench Press': 55, 'Squat': 60, 'Deadlift': 80, 'Overhead Press': 30, 'Box Squat': 50 }},
    { date: 'Aug 11', month: 8, exercises: { 'Bench Press': 57.5, 'Squat': 62.5, 'Deadlift': 85, 'Overhead Press': 30, 'Box Squat': 52.5 }},
    { date: 'Aug 18', month: 8, exercises: { 'Bench Press': 55, 'Squat': 65, 'Deadlift': 82.5, 'Overhead Press': 32.5, 'Box Squat': 50 }},
    { date: 'Aug 25', month: 8, exercises: { 'Bench Press': 60, 'Squat': 65, 'Deadlift': 90, 'Overhead Press': 32.5, 'Box Squat': 55 }},
    { date: 'Sep 1', month: 9, exercises: { 'Bench Press': 60, 'Squat': 67.5, 'Deadlift': 90, 'Overhead Press': 35, 'Box Squat': 55 }},
    { date: 'Sep 8', month: 9, exercises: { 'Bench Press': 62.5, 'Squat': 70, 'Deadlift': 95, 'Overhead Press': 35, 'Box Squat': 57.5 }},
    { date: 'Sep 15', month: 9, exercises: { 'Bench Press': 60, 'Squat': 72.5, 'Deadlift': 92.5, 'Overhead Press': 37.5, 'Box Squat': 60 }},
    { date: 'Sep 22', month: 9, exercises: { 'Bench Press': 65, 'Squat': 72.5, 'Deadlift': 100, 'Overhead Press': 37.5, 'Box Squat': 60 }},
    { date: 'Sep 29', month: 9, exercises: { 'Bench Press': 65, 'Squat': 75, 'Deadlift': 100, 'Overhead Press': 40, 'Box Squat': 62.5 }},
    { date: 'Oct 6', month: 10, exercises: { 'Bench Press': 67.5, 'Squat': 77.5, 'Deadlift': 105, 'Overhead Press': 40, 'Box Squat': 65 }},
    { date: 'Oct 13', month: 10, exercises: { 'Bench Press': 65, 'Squat': 75, 'Deadlift': 100, 'Overhead Press': 37.5, 'Box Squat': 62.5 }},
    { date: 'Oct 20', month: 10, exercises: { 'Bench Press': 67.5, 'Squat': 80, 'Deadlift': 107.5, 'Overhead Press': 40, 'Box Squat': 67.5 }},
    { date: 'Oct 27', month: 10, exercises: { 'Bench Press': 70, 'Squat': 80, 'Deadlift': 110, 'Overhead Press': 42.5, 'Box Squat': 67.5 }},
    { date: 'Nov 3', month: 11, exercises: { 'Bench Press': 70, 'Squat': 82.5, 'Deadlift': 110, 'Overhead Press': 42.5, 'Box Squat': 70 }},
    { date: 'Nov 10', month: 11, exercises: { 'Bench Press': 72.5, 'Squat': 85, 'Deadlift': 115, 'Overhead Press': 45, 'Box Squat': 72.5 }},
    { date: 'Nov 17', month: 11, exercises: { 'Bench Press': 72.5, 'Squat': 87.5, 'Deadlift': 112.5, 'Overhead Press': 45, 'Box Squat': 72.5 }},
    { date: 'Nov 24', month: 11, exercises: { 'Bench Press': 75, 'Squat': 87.5, 'Deadlift': 120, 'Overhead Press': 47.5, 'Box Squat': 75 }},
    { date: 'Dec 1', month: 12, exercises: { 'Bench Press': 72.5, 'Squat': 85, 'Deadlift': 115, 'Overhead Press': 45, 'Box Squat': 72.5 }},
    { date: 'Dec 8', month: 12, exercises: { 'Bench Press': 75, 'Squat': 87.5, 'Deadlift': 120, 'Overhead Press': 47.5, 'Box Squat': 75 }},
    { date: 'Dec 15', month: 12, exercises: { 'Bench Press': 75, 'Squat': 90, 'Deadlift': 122.5, 'Overhead Press': 47.5, 'Box Squat': 77.5 }},
    { date: 'Dec 22', month: 12, exercises: { 'Bench Press': 65, 'Squat': 80, 'Deadlift': 100, 'Overhead Press': 40, 'Box Squat': 70 }},
    { date: 'Dec 29', month: 12, exercises: { 'Bench Press': 67.5, 'Squat': 82.5, 'Deadlift': 105, 'Overhead Press': 42.5, 'Box Squat': 72.5 }},
    { date: 'Jan 5', month: 1, exercises: { 'Bench Press': 72.5, 'Squat': 87.5, 'Deadlift': 115, 'Overhead Press': 45, 'Box Squat': 75 }},
    { date: 'Jan 12', month: 1, exercises: { 'Bench Press': 75, 'Squat': 90, 'Deadlift': 120, 'Overhead Press': 47.5, 'Box Squat': 77.5 }},
    { date: 'Jan 19', month: 1, exercises: { 'Bench Press': 77.5, 'Squat': 92.5, 'Deadlift': 125, 'Overhead Press': 50, 'Box Squat': 80 }},
    { date: 'Jan 26', month: 1, exercises: { 'Bench Press': 77.5, 'Squat': 95, 'Deadlift': 127.5, 'Overhead Press': 50, 'Box Squat': 82.5 }},
    { date: 'Feb 2', month: 2, exercises: { 'Bench Press': 80, 'Squat': 100, 'Deadlift': 140, 'Overhead Press': 52.5, 'Box Squat': 85 }},
    { date: 'Feb 9', month: 2, exercises: { 'Bench Press': 82.5, 'Squat': 105, 'Deadlift': 130, 'Overhead Press': 55, 'Box Squat': 90 }},
  ];

  const exerciseNames = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Box Squat'];
  const exerciseColors: Record<string, string> = {
    'Bench Press': '#3b82f6',
    'Squat': '#10b981',
    'Deadlift': '#ef4444',
    'Overhead Press': '#f59e0b',
    'Box Squat': '#8b5cf6',
  };

  // Filter data by period
  const getFilteredData = () => {
    const total = allWeeklyData.length;
    switch (selectedPeriod) {
      case '1M': return allWeeklyData.slice(Math.max(0, total - 4));
      case '3M': return allWeeklyData.slice(Math.max(0, total - 13));
      case '6M': return allWeeklyData.slice(Math.max(0, total - 26));
      case 'ALL': return allWeeklyData;
    }
  };

  const filteredData = getFilteredData();

  // Get weights for an exercise from filtered data
  const getWeights = (name: string) => filteredData.map(w => w.exercises[name as keyof typeof w.exercises] || 0);

  // Calculate stats
  const getExerciseStats = (name: string) => {
    const weights = getWeights(name);
    const current = weights[weights.length - 1];
    const first = weights[0];
    const max = Math.max(...weights);
    const change = current - first;
    const changePercent = first > 0 ? ((change / first) * 100).toFixed(1) : '0';
    return { current, first, max, change, changePercent };
  };

  // Exercises to show on graph
  const visibleExercises = selectedExercise ? [selectedExercise] : exerciseNames;

  // Chart dimensions
  const chartWidth = 340;
  const chartHeight = 220;
  const paddingLeft = 42;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 35;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Find global min/max for visible exercises
  const allVisibleWeights = visibleExercises.flatMap(name => getWeights(name));
  const globalMin = Math.floor(Math.min(...allVisibleWeights) / 10) * 10;
  const globalMax = Math.ceil(Math.max(...allVisibleWeights) / 10) * 10;
  const range = globalMax - globalMin || 1;

  const numPoints = filteredData.length;
  const xStep = numPoints > 1 ? graphWidth / (numPoints - 1) : graphWidth;

  // Y-axis labels (5 evenly spaced)
  const yLabelCount = 5;
  const yLabels = Array.from({ length: yLabelCount }, (_, i) => globalMin + (range * i) / (yLabelCount - 1));

  // X-axis labels (show ~5-7 labels max)
  const xLabelStep = Math.max(1, Math.floor(numPoints / 6));
  const xLabels = filteredData.filter((_, i) => i % xLabelStep === 0 || i === numPoints - 1).map((d, i, arr) => ({
    label: d.date,
    index: filteredData.indexOf(d),
  }));

  return (
    <View style={styles.workoutContainer}>
      <Image source={logoBanner} style={styles.dashboardHeroBanner} resizeMode="cover" />
      
      <ScrollView>
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>Lifting Analytics</Text>
          <Text style={styles.pageSubtitle}>Track your strength progress</Text>
        </View>

        {/* Period Selector */}
        <View style={{flexDirection: 'row', justifyContent: 'center', margin: 16, marginBottom: 0, gap: 8}}>
          {(['1M', '3M', '6M', 'ALL'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedPeriod === period ? '#1f2937' : '#f3f4f6',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: selectedPeriod === period ? '#fff' : '#6b7280',
              }}>{period === 'ALL' ? 'All Time' : period}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Line Graph */}
        <View style={{backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3}}>
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 2}}>
            {selectedExercise || 'All Exercises'} - Weight (kg)
          </Text>
          <Text style={{fontSize: 11, color: '#9ca3af', marginBottom: 12}}>
            {filteredData[0]?.date} - {filteredData[filteredData.length - 1]?.date} ({filteredData.length} weeks)
          </Text>

          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            {yLabels.map((val, i) => {
              const y = paddingTop + graphHeight - ((val - globalMin) / range) * graphHeight;
              return (
                <React.Fragment key={`grid-${i}`}>
                  <Line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                  <SvgText x={paddingLeft - 5} y={y + 4} fontSize={9} fill="#9ca3af" textAnchor="end">
                    {Math.round(val)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* X-axis labels */}
            {xLabels.map(({ label, index }) => {
              const x = paddingLeft + index * xStep;
              return (
                <SvgText key={`x-${index}`} x={x} y={chartHeight - 5} fontSize={8} fill="#9ca3af" textAnchor="middle">
                  {label}
                </SvgText>
              );
            })}

            {/* Lines for each visible exercise */}
            {visibleExercises.map((exerciseName) => {
              const weights = getWeights(exerciseName);
              const color = exerciseColors[exerciseName];

              const points = weights.map((w, i) => ({
                x: paddingLeft + i * xStep,
                y: paddingTop + graphHeight - ((w - globalMin) / range) * graphHeight,
              }));

              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              return (
                <React.Fragment key={exerciseName}>
                  <Path d={pathD} stroke={color} strokeWidth={selectedExercise ? 3 : 2} fill="none" />
                  {/* Show dots only if few data points or single exercise */}
                  {(numPoints <= 13 || selectedExercise) && points.map((p, i) => (
                    <Circle key={`d-${exerciseName}-${i}`} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={color} />
                  ))}
                  {/* Always show last dot */}
                  {numPoints > 13 && !selectedExercise && (
                    <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5} fill={color} />
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Legend - tap to filter */}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8}}>
            <TouchableOpacity
              onPress={() => setSelectedExercise(null)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
                backgroundColor: !selectedExercise ? '#1f2937' : '#f9fafb',
              }}
            >
              <Text style={{fontSize: 11, fontWeight: '600', color: !selectedExercise ? '#fff' : '#6b7280'}}>All</Text>
            </TouchableOpacity>
            {exerciseNames.map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => setSelectedExercise(selectedExercise === name ? null : name)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
                  backgroundColor: selectedExercise === name ? exerciseColors[name] + '20' : '#f9fafb',
                  borderWidth: selectedExercise === name ? 1.5 : 0,
                  borderColor: exerciseColors[name],
                }}
              >
                <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: exerciseColors[name], marginRight: 4}} />
                <Text style={{fontSize: 11, color: '#374151'}}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise Cards with Sparklines */}
        <View style={{margin: 16, marginTop: 0}}>
          <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12}}>Exercise Breakdown</Text>
          
          {exerciseNames.map((exerciseName) => {
            const stats = getExerciseStats(exerciseName);
            const weights = getWeights(exerciseName);
            const color = exerciseColors[exerciseName];
            const maxW = Math.max(...weights);
            const minW = Math.min(...weights);
            const sparkW = 120;
            const sparkH = 40;
            const sparkRange = maxW - minW || 1;
            const sparkXStep = weights.length > 1 ? sparkW / (weights.length - 1) : sparkW;

            const sparkPoints = weights.map((w, i) => ({
              x: i * sparkXStep,
              y: sparkH - 4 - ((w - minW) / sparkRange) * (sparkH - 8),
            }));
            const sparkPath = sparkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

            return (
              <TouchableOpacity
                key={exerciseName}
                onPress={() => setSelectedExercise(selectedExercise === exerciseName ? null : exerciseName)}
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
                  shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
                  borderLeftWidth: 4, borderLeftColor: color,
                }}
              >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={{flex: 1}}>
                    <Text style={{fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2}}>{exerciseName}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 8}}>
                      <Text style={{fontSize: 22, fontWeight: 'bold', color: '#1f2937'}}>{stats.current} kg</Text>
                      <Text style={{fontSize: 12, fontWeight: '600', color: stats.change >= 0 ? '#10b981' : '#ef4444'}}>
                        {stats.change >= 0 ? '+' : ''}{stats.change} kg ({stats.changePercent}%)
                      </Text>
                    </View>
                    <Text style={{fontSize: 11, color: '#9ca3af', marginTop: 2}}>PR: {stats.max} kg</Text>
                  </View>
                  <Svg width={sparkW} height={sparkH}>
                    <Path d={sparkPath} stroke={color} strokeWidth={2} fill="none" />
                    <Circle cx={sparkPoints[sparkPoints.length - 1].x} cy={sparkPoints[sparkPoints.length - 1].y} r={3} fill={color} />
                  </Svg>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// Main App Component — real Supabase data
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'login' | 'dashboard' | 'credits' | 'booking' | 'sessions' | 'workout' | 'profile' | 'analytics' | 'cancelSession'>('loading');
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<Date | null>(null);

  // Auth + profile state
  const [userId, setUserId] = useState<string | null>(null);
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);

  // Load all user data from Supabase
  const loadUserData = useCallback(async (uid: string) => {
    const { data: profile } = await db.getClientProfile(uid);
    if (profile) {
      setClientProfile(profile);
      setClientProfileId(profile.id);
      const { data: bal } = await db.getCreditBalance(profile.id);
      setCreditBalance(bal?.balance ?? 0);
      const { data: bookings } = await db.getClientBookings(profile.id, 'booked');
      if (bookings) {
        const mapped = bookings.map((b: any) => {
          const start = new Date(b.slots.start_time);
          const end = new Date(b.slots.end_time);
          const timeStr = `${start.getHours()}:${start.getMinutes().toString().padStart(2,'0')} - ${end.getHours()}:${end.getMinutes().toString().padStart(2,'0')}`;
          const h = start.getHours();
          return { id: b.id, date: start, time: timeStr, label: h < 10 ? 'Morning Session' : 'Late Morning', icon: h < 10 ? '🌅' : '☀️', slotId: b.slots.id, bookingId: b.id };
        });
        setBookedSessions(mapped);
      }
    }
  }, []);

  // Auth listener — auto-login if session exists
  useEffect(() => {
    const init = async () => {
      const { session } = await auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await loadUserData(session.user.id);
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('login');
      }
    };
    init();
    const { data: listener } = auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        setUserId(session.user.id);
        await loadUserData(session.user.id);
      } else {
        setUserId(null); setClientProfileId(null); setClientProfile(null);
        setCreditBalance(0); setBookedSessions([]);
        setCurrentScreen('login');
      }
    });
    return () => { listener?.subscription?.unsubscribe(); };
  }, [loadUserData]);

  const refreshData = async () => { if (userId) await loadUserData(userId); };

  // Cancel sessions via Supabase
  const cancelSessionsHandler = async (ids: any[]) => {
    for (const id of ids) {
      const session = bookedSessions.find((s: any) => s.id === id);
      if (session) {
        await db.cancelBooking(session.bookingId, session.slotId);
        const hoursUntil = (session.date.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil > 48 && clientProfileId) {
          await db.refundCredit(clientProfileId, `Refund: cancelled ${session.label}`);
        }
      }
    }
    await refreshData();
  };

  // Book a session via Supabase
  const addBookedSession = async (slotId: string) => {
    if (!clientProfileId) return;
    if (creditBalance <= 0) return;
    const { error: creditErr } = await db.deductCredit(clientProfileId, 'Session booking');
    if (creditErr) return;
    await db.createBooking(slotId, clientProfileId);
    await refreshData();
  };

  // User profile object for screens
  const userProfile = clientProfile ? {
    name: `${clientProfile.first_name} ${clientProfile.last_name}`,
    email: clientProfile.email || '',
    gender: 'male',
    dateOfBirth: new Date(1990, 5, 15),
    membershipStartDate: new Date(clientProfile.created_at),
    sessionsAttended: 0,
    profileImage: null,
  } : { name: 'Loading...', email: '', gender: 'male', dateOfBirth: new Date(), membershipStartDate: new Date(), sessionsAttended: 0, profileImage: null };

  // Loading screen
  if (currentScreen === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc'}}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{marginTop: 16, color: '#6b7280', fontSize: 16}}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'login') {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={async () => {
          const { session } = await auth.getSession();
          if (session?.user) {
            setUserId(session.user.id);
            await loadUserData(session.user.id);
          }
          setCurrentScreen('dashboard');
        }} />
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
          <CreditsScreen clientProfileId={clientProfileId} onRefresh={refreshData} />
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
          <BookingScreen bookedSessions={bookedSessions} onBookSession={addBookedSession} />
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
            onBuyCredits={() => setCurrentScreen('credits')}
            onWorkout={(date) => {
              setSelectedWorkoutDate(date);
              setCurrentScreen('workout');
            }}
            clientProfileId={clientProfileId}
            creditBalance={creditBalance}
            bookedSessions={bookedSessions}
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
          <WorkoutScreen selectedDate={selectedWorkoutDate || undefined} userGender={userProfile?.gender || 'male'} clientProfileId={clientProfileId} />
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

  if (currentScreen === 'analytics') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>Analytics</Text>
            <View style={styles.placeholder} />
          </View>
          <AnalyticsScreen clientProfileId={clientProfileId} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === 'cancelSession') {
    return (
      <SafeAreaProvider>
        <View style={styles.appContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>Cancel Session</Text>
            <View style={styles.placeholder} />
          </View>
          <CancelSessionScreen sessions={bookedSessions} onCancelSessions={cancelSessionsHandler} />
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
          onAnalytics={() => setCurrentScreen('analytics')}
          onCancelSession={() => setCurrentScreen('cancelSession')}
          onLogout={async () => { await auth.signOut(); setCurrentScreen('login'); }}
          creditBalance={creditBalance}
          bookedSessions={bookedSessions}
          userName={userProfile.name}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    minHeight: '100vh',
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
