import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface ProgrammeAssignmentsScreenProps {
  navigation: any;
}

const ProgrammeAssignmentsScreen: React.FC<ProgrammeAssignmentsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await db.getAllProgrammeAssignments();
      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Load programmes
      const { data: programmesData, error: programmesError } = await db.getAllProgrammes();
      if (programmesError) throw programmesError;
      setProgrammes(programmesData || []);

      // Load clients
      const { data: clientsData, error: clientsError } = await db.getAllClients();
      if (clientsError) throw clientsError;
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load programme assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAssignProgramme = async () => {
    if (!selectedClient || !selectedProgramme) {
      Alert.alert('Error', 'Please select both a client and a programme');
      return;
    }

    try {
      const { error } = await db.assignProgrammeToClient(selectedClient.id, selectedProgramme.id);
      if (error) throw error;

      Alert.alert('Success', `Programme "${selectedProgramme.name}" assigned to ${selectedClient.profiles.first_name} ${selectedClient.profiles.last_name}`);
      setShowAssignModal(false);
      setSelectedClient(null);
      setSelectedProgramme(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign programme');
    }
  };

  const handleUnassign = (assignment: any) => {
    Alert.alert(
      'Unassign Programme',
      `Remove "${assignment.programmes.name}" from ${assignment.client_profiles.profiles.first_name} ${assignment.client_profiles.profiles.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await db.unassignProgrammeFromClient(assignment.id);
              if (error) throw error;

              Alert.alert('Success', 'Programme unassigned');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unassign programme');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Programme Assignments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAssignModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
          <Text style={styles.addButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <View key={assignment.id} style={styles.assignmentCard}>
              <View style={styles.assignmentHeader}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {assignment.client_profiles.profiles.first_name} {assignment.client_profiles.profiles.last_name}
                  </Text>
                  <Text style={styles.clientEmail}>
                    {assignment.client_profiles.profiles.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unassignButton}
                  onPress={() => handleUnassign(assignment)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.programmeInfo}>
                <Ionicons name="fitness" size={20} color="#3b82f6" />
                <Text style={styles.programmeName}>{assignment.programmes.name}</Text>
              </View>

              {assignment.programmes.description && (
                <Text style={styles.programmeDescription}>
                  {assignment.programmes.description}
                </Text>
              )}

              <View style={styles.assignmentFooter}>
                <Text style={styles.assignedDate}>
                  Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No programme assignments</Text>
            <Text style={styles.emptyStateSubtext}>
              Assign workout programmes to clients to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Assign Programme Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Programme</Text>

            {/* Client Selection */}
            <Text style={styles.sectionLabel}>Select Client</Text>
            <ScrollView style={styles.selectionList} nestedScrollEnabled>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.selectionItem,
                    selectedClient?.id === client.id && styles.selectionItemActive
                  ]}
                  onPress={() => setSelectedClient(client)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={[
                      styles.selectionItemText,
                      selectedClient?.id === client.id && styles.selectionItemTextActive
                    ]}>
                      {client.profiles.first_name} {client.profiles.last_name}
                    </Text>
                    <Text style={styles.selectionItemSubtext}>
                      {client.profiles.email}
                    </Text>
                  </View>
                  {selectedClient?.id === client.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Programme Selection */}
            <Text style={styles.sectionLabel}>Select Programme</Text>
            <ScrollView style={styles.selectionList} nestedScrollEnabled>
              {programmes.map((programme) => (
                <TouchableOpacity
                  key={programme.id}
                  style={[
                    styles.selectionItem,
                    selectedProgramme?.id === programme.id && styles.selectionItemActive
                  ]}
                  onPress={() => setSelectedProgramme(programme)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={[
                      styles.selectionItemText,
                      selectedProgramme?.id === programme.id && styles.selectionItemTextActive
                    ]}>
                      {programme.name}
                    </Text>
                    {programme.description && (
                      <Text style={styles.selectionItemSubtext}>
                        {programme.description}
                      </Text>
                    )}
                    <Text style={styles.exerciseCount}>
                      {programme.programme_exercises?.length || 0} exercises
                    </Text>
                  </View>
                  {selectedProgramme?.id === programme.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedClient(null);
                  setSelectedProgramme(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  (!selectedClient || !selectedProgramme) && styles.assignButtonDisabled
                ]}
                onPress={handleAssignProgramme}
                disabled={!selectedClient || !selectedProgramme}
              >
                <Text style={styles.assignButtonText}>Assign Programme</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  backButtonContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  assignmentCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  unassignButton: {
    padding: 4,
  },
  programmeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  programmeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  programmeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  assignmentFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  assignedDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 8,
  },
  selectionList: {
    maxHeight: 150,
    marginBottom: 16,
  },
  selectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  selectionItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  selectionItemContent: {
    flex: 1,
  },
  selectionItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  selectionItemTextActive: {
    color: '#3b82f6',
  },
  selectionItemSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  exerciseCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  assignButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProgrammeAssignmentsScreen;
