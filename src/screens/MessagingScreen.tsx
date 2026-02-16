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

        // If admin, load all clients for starting new conversations
        if (profile.role === 'admin') {
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
            setAllClients(clients.map((c: any) => ({
              id: c.profiles.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.profiles.email,
              role: 'client'
            })));
          }
        }
      }

      // If client, get the admin user for starting new conversations
      if (profile?.role === 'client') {
        const { data: admin } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (admin) {
          // Set admin user with friendly display name
          setAdminUser({
            ...admin,
            first_name: 'Your',
            last_name: 'PT',
          });
        }
      }

      // Get all messages for this user
      const { data: allMessages } = await db.getMessages(session.user.id);

      if (allMessages) {
        setMessages(allMessages);

        // Group messages into conversations
        const conversationMap = new Map();

        allMessages.forEach((msg: any) => {
          const otherUser = msg.sender_id === session.user.id ? msg.recipient : msg.sender;
          const otherUserId = msg.sender_id === session.user.id ? msg.recipient_id : msg.sender_id;

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
        });

        // Convert to array and sort by latest message
        const convArray = Array.from(conversationMap.values()).sort((a, b) => {
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

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

    if (userRole === 'client') {
      console.log('User is CLIENT - opening chat with PT');
      if (!adminUser) {
        console.log('ERROR: No admin user found!');
        return;
      }
      // Create a conversation object for the admin/PT
      setSelectedConversation({
        user: adminUser,
        userId: adminUser.id,
        lastMessage: null,
        unreadCount: 0,
      });
      setShowChatModal(true);
    } else {
      console.log('User is ADMIN - showing client selector');
      // Admin - show client selector
      setShowClientSelector(true);
    }
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

    setSending(true);
    try {
      await db.sendMessage(userId, selectedConversation.userId, newMessage.trim());
      setNewMessage('');
      loadData(); // Reload messages
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getConversationMessages = () => {
    if (!selectedConversation || !userId) return [];

    return messages
      .filter((msg: any) =>
        (msg.sender_id === userId && msg.recipient_id === selectedConversation.userId) ||
        (msg.sender_id === selectedConversation.userId && msg.recipient_id === userId)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
          {userRole === 'admin' ? (
            <TouchableOpacity onPress={startNewConversation} style={styles.newMessageButton}>
              <Ionicons name="create-outline" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startNewConversation} style={styles.messagePTButton}>
              <Ionicons name="chatbubble" size={18} color="white" />
              <Text style={styles.messagePTButtonText}>
                Message {adminUser?.first_name || 'PT'}
              </Text>
            </TouchableOpacity>
          )}
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
                <Ionicons
                  name={item.user.role === 'admin' ? 'person-circle' : 'person-circle-outline'}
                  size={48}
                  color="#3b82f6"
                />
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName}>
                    {item.user.first_name} {item.user.last_name}
                  </Text>
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
              <Text style={styles.clientSelectorTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allClients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientSelectorItem}
                  onPress={() => startConversationWithClient(item)}
                >
                  <View style={styles.clientSelectorAvatar}>
                    <Ionicons name="person" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.clientSelectorInfo}>
                    <Text style={styles.clientSelectorName}>
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.clientSelectorEmail}>{item.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowChatModal(false);
                setSelectedConversation(null);
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
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
            <View style={{ width: 24 }} />
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
                <Ionicons name="send" size={20} color="white" />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messagePTButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messagePTButtonText: {
    color: 'white',
    fontSize: 16,
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
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
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
