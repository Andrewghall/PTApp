import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface MessagingScreenProps {
  navigation: any;
}

const MessagingScreen: React.FC<MessagingScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        loadData(); // Reload messages when new ones arrive
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);

        // If admin, load all clients AND other admins for messaging
        if (profile.role === 'admin' || profile.role === 'pt_admin' || profile.role === 'software_admin') {
          const { data: clients } = await supabase
            .from('client_profiles')
            .select(`
              id,
              first_name,
              last_name,
              profiles!inner (id, email, role)
            `)
            .order('first_name');

          if (clients) {
            const clientList = clients.map((c: any) => ({
              id: c.profiles.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.profiles.email,
              role: 'client'
            }));

            // If software_admin, also load PT admin
            if (profile.role === 'software_admin') {
              const { data: ptAdmin } = await supabase
                .from('profiles')
                .select('id, email, role')
                .eq('role', 'pt_admin')
                .single();

              if (ptAdmin) {
                const { data: ptProfile } = await supabase
                  .from('client_profiles')
                  .select('first_name, last_name')
                  .eq('user_id', ptAdmin.id)
                  .single();

                clientList.push({
                  id: ptAdmin.id,
                  first_name: ptProfile?.first_name || 'PT',
                  last_name: ptProfile?.last_name || 'Admin',
                  email: ptAdmin.email,
                  role: 'pt_admin'
                });
              }
            }

            setAllClients(clientList);
          }
        }
      }

      // If client, get the admin user (andrew@stratgen.co.uk for now)
      if (profile?.role === 'client') {
        console.log('Client detected - fetching admin user...');
        console.log('Current user ID:', session.user.id);
        console.log('Current user email:', session.user.email);

        const { data: admin, error: adminError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('role', 'admin')
          .limit(1)
          .single();

        console.log('Admin query result:', { admin, adminError });
        console.log('Admin data:', admin);
        console.log('Admin error details:', adminError?.message, adminError?.details, adminError?.hint);

        if (admin) {
          // Use email-based name for now
          const adminName = admin.email?.split('@')[0] || 'PT';
          const displayName = adminName.charAt(0).toUpperCase() + adminName.slice(1);

          const adminUserObj = {
            ...admin,
            first_name: displayName,
            last_name: '',
          };

          setAdminUser(adminUserObj);
          console.log('Admin user SET successfully:', adminUserObj);
        } else {
          console.error('No admin user found in database!');
          console.error('Error was:', adminError);
        }

        // Also load all other clients for client-to-client messaging
        const { data: allClientsData } = await supabase
          .from('client_profiles')
          .select(`
            id,
            first_name,
            last_name,
            profiles!inner (id, email, role)
          `)
          .neq('user_id', session.user.id) // Exclude self
          .order('first_name');

        if (allClientsData) {
          setAllClients(allClientsData.map((c: any) => ({
            id: c.profiles.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.profiles.email,
            role: 'client'
          })));
        }
      }

      // Get all messages for this user
      const { data: allMessages, error: messagesError } = await db.getMessages(session.user.id);

      console.log('=== MESSAGES LOADED ===');
      console.log('Messages error:', messagesError);
      console.log('Messages count:', allMessages?.length);
      console.log('First message:', allMessages?.[0]);

      if (allMessages) {
        setMessages(allMessages);

        // Group messages into conversations
        const conversationMap = new Map();

        // For each message, we need to get the full user profile with names
        for (const msg of allMessages) {
          const otherUserId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;
          const otherUserProfile = msg.sender_id === session.user.id ? msg.recipient : msg.sender;

          if (!otherUserProfile) {
            console.error('Missing user profile in message:', msg);
            continue;
          }

          // Get the actual name from client_profiles if this is a client
          let otherUser = {
            id: otherUserId,
            email: otherUserProfile.email,
            role: otherUserProfile.role,
            first_name: '',
            last_name: '',
            profile_image_url: null
          };

          if (otherUserProfile.role === 'client') {
            // Fetch client profile to get name and profile image
            const { data: clientProfile } = await supabase
              .from('client_profiles')
              .select('first_name, last_name, profile_image_url')
              .eq('user_id', otherUserId)
              .single();

            if (clientProfile) {
              otherUser.first_name = clientProfile.first_name;
              otherUser.last_name = clientProfile.last_name;
              otherUser.profile_image_url = clientProfile.profile_image_url;
            }
          } else {
            // Admin - use email
            const name = otherUserProfile.email?.split('@')[0] || 'Admin';
            otherUser.first_name = name.charAt(0).toUpperCase() + name.slice(1);
            otherUser.last_name = '';
          }

          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, {
              user: otherUser,
              userId: otherUserId,
              lastMessage: msg,
              unreadCount: 0,
            });
          } else {
            const existing = conversationMap.get(otherUserId);
            if (new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
              existing.lastMessage = msg;
            }
          }

          // Count unread messages
          if (msg.recipient_id === session.user.id && !msg.read) {
            const conv = conversationMap.get(otherUserId);
            conv.unreadCount += 1;
          }
        }

        // Convert to array and sort: Admin always first, then by latest message
        const convArray = Array.from(conversationMap.values()).sort((a, b) => {
          // Admin always at top
          if (a.user.role === 'admin' || a.user.role === 'pt_admin') return -1;
          if (b.user.role === 'admin' || b.user.role === 'pt_admin') return 1;

          // Then sort by latest message time
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

        console.log('=== CONVERSATIONS ===');
        console.log('Total conversations:', convArray.length);
        console.log('Conversations:', convArray);

        setConversations(convArray);

        // Calculate total unread count
        const totalUnread = convArray.reduce((sum, conv) => sum + conv.unreadCount, 0);
        setTotalUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    console.log('=== START NEW CONVERSATION ===');
    console.log('userRole:', userRole);
    console.log('adminUser:', adminUser);
    console.log('allClients:', allClients);
    console.log('Will show in list:', userRole === 'client' && adminUser ? [adminUser, ...allClients] : allClients);

    // Everyone can now select who to message
    setShowClientSelector(true);
  };

  const startConversationWithClient = (client: any) => {
    setSelectedConversation({
      user: client,
      userId: client.id,
      lastMessage: null,
      unreadCount: 0,
    });
    setShowClientSelector(false);
    setShowChatModal(true);
  };

  const openConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setShowChatModal(true);

    // Mark unread messages as read
    const unreadMessages = messages.filter(
      (msg: any) => msg.sender_id === conversation.userId && msg.recipient_id === userId && !msg.read
    );

    for (const msg of unreadMessages) {
      await db.markMessageAsRead(msg.id);
    }

    // Reload to update unread count
    loadData();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !selectedConversation) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update - add message to local state immediately (like WhatsApp)
    const optimisticMessage = {
      id: tempId,
      sender_id: userId,
      recipient_id: selectedConversation.userId,
      content: messageContent,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    setSending(true);
    try {
      const { data, error } = await db.sendMessage(userId, selectedConversation.userId, messageContent);

      if (error) {
        console.error('Send message error:', error);
        alert(`Failed to send message: ${error.message || 'Unknown error'}`);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(messageContent); // Restore the message text
      } else {
        console.log('Message sent successfully:', data);
        // Reload to get the real message with proper ID from server
        loadData();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error.message || 'Unknown error'}`);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageContent); // Restore the message text
    } finally {
      setSending(false);
    }
  };

  const getConversationMessages = () => {
    if (!selectedConversation || !userId) {
      console.log('getConversationMessages: Missing data', { selectedConversation, userId });
      return [];
    }

    const filtered = messages
      .filter((msg: any) =>
        (msg.sender_id === userId && msg.recipient_id === selectedConversation.userId) ||
        (msg.sender_id === selectedConversation.userId && msg.recipient_id === userId)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    console.log('=== CONVERSATION MESSAGES ===');
    console.log('Total messages in state:', messages.length);
    console.log('Filtered messages for conversation:', filtered.length);
    console.log('userId:', userId);
    console.log('selectedConversation.userId:', selectedConversation.userId);
    console.log('First 3 messages:', messages.slice(0, 3));
    console.log('Filtered messages:', filtered);

    return filtered;
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
      <View style={styles.contentWrapper}>
        {/* Hero Banner */}
        <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

        {/* Navigation Bar */}
        <View style={styles.navigationBar}>
          <HamburgerButton onPress={() => setMenuVisible(true)} />
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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {userRole === 'admin' ? 'Client communications' : 'Chat with your PT'}
            </Text>
          </View>
          <TouchableOpacity onPress={startNewConversation} style={styles.newMessageButton}>
            <Text style={styles.newMessageButtonText}>New Message</Text>
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>
              {userRole === 'admin'
                ? 'Messages from clients will appear here'
                : 'Start a conversation with your PT'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => openConversation(item)}
            >
              <View style={styles.avatarContainer}>
                {item.user.profile_image_url ? (
                  <Image
                    source={{ uri: item.user.profile_image_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarCircle, item.user.role === 'admin' && styles.avatarCircleAdmin]}>
                    <Text style={styles.avatarText}>
                      {item.user.first_name?.[0]?.toUpperCase() || 'U'}
                      {item.user.last_name?.[0]?.toUpperCase() || ''}
                    </Text>
                  </View>
                )}
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.conversationName}>
                      {item.user.first_name && item.user.last_name
                        ? `${item.user.first_name} ${item.user.last_name}`
                        : item.user.first_name || item.user.email || 'Unknown User'}
                    </Text>
                    {item.user.email && (
                      <Text style={styles.conversationEmail}>
                        {item.user.email}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.conversationTime}>
                    {format(new Date(item.lastMessage.created_at), 'MMM d, h:mm a')}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.conversationPreview,
                    item.unreadCount > 0 && styles.conversationPreviewUnread
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage.sender_id === userId ? 'You: ' : ''}
                  {item.lastMessage.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
        )}
      </View>

      {/* Client Selector Modal (Admin Only) */}
      <Modal
        visible={showClientSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clientSelectorContainer}>
            <View style={styles.clientSelectorHeader}>
              <Text style={styles.clientSelectorTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 28, color: '#6b7280', fontWeight: 'bold' }}>×</Text>
                ) : (
                  <Ionicons name="close" size={28} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                userRole === 'client' && adminUser
                  ? [adminUser, ...allClients] // PT admin first for clients
                  : userRole === 'client' && !adminUser
                  ? allClients // Show other clients even if no admin found
                  : allClients
              }
              ListEmptyComponent={() => (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
                    {userRole === 'client' && !adminUser
                      ? 'No admin user found. Please contact support.'
                      : 'No users available to message'}
                  </Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientSelectorItem}
                  onPress={() => startConversationWithClient(item)}
                >
                  <View style={[
                    styles.clientSelectorAvatar,
                    item.role === 'pt_admin' && styles.clientSelectorAvatarPT
                  ]}>
                    <Text style={styles.avatarText}>
                      {item.first_name?.[0]?.toUpperCase() || 'U'}
                      {item.last_name?.[0]?.toUpperCase() || ''}
                    </Text>
                  </View>
                  <View style={styles.clientSelectorInfo}>
                    <Text style={styles.clientSelectorName}>
                      {item.first_name} {item.last_name}
                      {item.role === 'pt_admin' && ' (PT)'}
                    </Text>
                    <Text style={styles.clientSelectorEmail}>{item.email}</Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 20, color: '#9ca3af' }}>›</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.clientSelectorList}
            />
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <SafeAreaView style={styles.chatContainer}>
          {/* Hero Banner */}
          <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

          {/* Navigation Bar - Back Button Only */}
          <View style={styles.navigationBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowChatModal(false);
                setSelectedConversation(null);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
              <Text style={styles.backButtonText}>Back to Messages</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Header */}
          <View style={styles.chatHeader}>
            {selectedConversation && (
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderName}>
                  {selectedConversation.user.first_name} {selectedConversation.user.last_name}
                </Text>
                <Text style={styles.chatHeaderRole}>
                  {selectedConversation.user.role === 'admin' ? 'Personal Trainer' : 'Client'}
                </Text>
              </View>
            )}
          </View>

          {/* Messages */}
          <FlatList
            data={getConversationMessages()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleOther
                  ]}
                >
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                    {format(new Date(item.created_at), 'h:mm a')}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesContent}
            inverted={false}
          />

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={async () => {
          await auth.signOut();
          navigation.navigate('Login');
        }}
        userRole={userRole}
        unreadCount={totalUnreadCount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentWrapper: {
    flex: 1,
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
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  newMessageButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newMessageButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarCircleAdmin: {
    backgroundColor: '#10b981',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conversationEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#6b7280',
  },
  conversationPreviewUnread: {
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chatHeaderInfo: {
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chatHeaderRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 4,
  },
  messageTextMe: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  messageTimeMe: {
    color: '#dbeafe',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientSelectorContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  clientSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clientSelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  clientSelectorList: {
    padding: 8,
  },
  clientSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  clientSelectorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientSelectorAvatarPT: {
    backgroundColor: '#10b981',
  },
  clientSelectorInfo: {
    flex: 1,
  },
  clientSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  clientSelectorEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default MessagingScreen;
