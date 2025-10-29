import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Users,
  MessageSquare,
  Library,
  TrendingUp,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Send,
  Star,
  AlertCircle,
  Search,
  X
} from 'lucide-react';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0ENNhrABPVqFGWRupcJtH5G49rRbqcfo",
  authDomain: "iddsi-app.firebaseapp.com",
  projectId: "iddsi-app",
  storageBucket: "iddsi-app.appspot.com",
  messagingSenderId: "844640842201",
  appId: "1:844640842201:web:903d21c590150b6d5be9c8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UPDATED: Function to send notification to app users with proper format
const sendNotificationToApp = async (changeType, foodData, oldFoodData = null) => {
  try {
    console.log('Sending notification:', { changeType, foodData, oldFoodData });
    
    // Get all users to send notifications
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Sending notifications to ${users.length} users`);
    
    // Create notification for each user
    const notificationPromises = users.map(async (user) => {
      // Generate formal message based on change type
      let message;
      switch (changeType.toLowerCase()) {
        case 'added':
          message = foodData.iddsi_level 
            ? `${foodData.name} was added to Level ${foodData.iddsi_level}`
            : `${foodData.name} was added`;
          break;
        case 'deleted':
          message = `${foodData.name} was deleted`;
          break;
        case 'updated':
          if (oldFoodData && oldFoodData.iddsi_level && foodData.iddsi_level && 
              oldFoodData.iddsi_level !== foodData.iddsi_level) {
            message = `${foodData.name}'s level was changed from Level ${oldFoodData.iddsi_level} to Level ${foodData.iddsi_level}`;
          } else {
            message = `${foodData.name} was updated`;
          }
          break;
        default:
          message = `${foodData.name} was modified`;
      }

      const notificationData = {
        userId: user.id,
        changeType: changeType,
        foodName: foodData.name,
        message: message,
        iddsiLevel: foodData.iddsi_level || null,
        oldLevel: oldFoodData?.iddsi_level || null,
        category: foodData.category || null,
        description: foodData.description || null,
        preparation: foodData.preparation || null,
        texture: foodData.texture || null,
        timestamp: serverTimestamp(),
        read: false,
        foodId: foodData.id || null,
      };

      return addDoc(collection(db, 'notifications'), notificationData);
    });

    await Promise.all(notificationPromises);
    console.log(`Successfully sent ${users.length} notifications`);
    return true;
  } catch (error) {
    console.error('Error sending notifications:', error);
    console.error('Error details:', error.message);
    return false;
  }
};

// Hardcoded credentials for speech therapists
const AUTHORIZED_CREDENTIALS = {
  username: 'SpeechTherapist',
  password: 'Baraspeech@2025!'
};

function SpeechTherapistDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFoods: 0,
    totalQuestions: 0,
    unansweredQuestions: 0,
  });

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Food management state
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    iddsi_level: '4',
    category: 'food',
    preparation: '',
    texture: '',
    tips: '',
  });

  // Comments modal state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedFoodComments, setSelectedFoodComments] = useState(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  // Check if user is logged in from localStorage
  useEffect(() => {
    const loggedIn = localStorage.getItem('therapistLoggedIn');
    if (loggedIn === 'true') {
      setUser({ username: 'SpeechTherapist' });
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchFoods(),
        fetchQuestions(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Fetch users with better error handling
  const fetchUsers = async () => {
    try {
      console.log('Fetching users from Firestore...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log('Users snapshot size:', usersSnapshot.size);
      
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('User data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });
      
      console.log('Total users fetched:', usersData.length);
      setUsers(usersData);
      setStats(prev => ({ ...prev, totalUsers: usersData.length }));
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        console.error('Permission denied reading users collection');
        alert('Cannot read users: Permission denied. Check Firebase rules.');
      }
    }
  };

  // Fetch foods
  const fetchFoods = async () => {
    try {
      const foodsSnapshot = await getDocs(collection(db, 'foods'));
      const foodsData = foodsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFoods(foodsData);
      setStats(prev => ({ ...prev, totalFoods: foodsData.length }));
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  };

  // Fetch reported issues (read-only for monitoring)
  const fetchQuestions = async () => {
    try {
      const questionsSnapshot = await getDocs(collection(db, 'reported_issues'));
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by most recent first
      questionsData.sort((a, b) => {
        const dateA = a.timestamp || a.reportedAt || a.createdAt;
        const dateB = b.timestamp || b.reportedAt || b.createdAt;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.toMillis() - dateA.toMillis();
      });
      setQuestions(questionsData);
      setStats(prev => ({ 
        ...prev, 
        totalQuestions: questionsData.length,
        unansweredQuestions: 0
      }));
    } catch (error) {
      console.error('Error fetching reported issues:', error);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Check credentials
    if (username === AUTHORIZED_CREDENTIALS.username && password === AUTHORIZED_CREDENTIALS.password) {
      setUser({ username: AUTHORIZED_CREDENTIALS.username });
      localStorage.setItem('therapistLoggedIn', 'true');
      fetchDashboardData();
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('therapistLoggedIn');
  };

  // UPDATED: Add food with proper notification format
  const handleAddFood = async () => {
    try {
      const newFood = {
        name: foodForm.name,
        description: foodForm.description || '',
        iddsi_level: foodForm.iddsi_level,
        category: foodForm.category,
        preparation: foodForm.preparation || '',
        texture: foodForm.texture || '',
        tips: foodForm.tips || '',
        average_rating: 0,
        comments: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      console.log('Adding food:', newFood);
      const docRef = await addDoc(collection(db, 'foods'), newFood);
      
      // Send notification with proper format
      const foodDataWithId = { ...newFood, id: docRef.id };
      await sendNotificationToApp('added', foodDataWithId);
      
      alert('Food added successfully and notifications sent to all app users!');
      setShowFoodModal(false);
      resetFoodForm();
      fetchFoods();
    } catch (error) {
      console.error('Error adding food:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check Firebase security rules.\n\nYou need to update your Firestore rules to allow writes.');
      } else {
        alert('Error adding food: ' + error.message);
      }
    }
  };

  // UPDATED: Update food with proper notification format including oldLevel
  const handleUpdateFood = async () => {
    try {
      if (!editingFood || !editingFood.id) {
        alert('Error: No food selected for editing');
        return;
      }
      
      // Store old food data for comparison
      const oldFoodData = {
        name: editingFood.name,
        iddsi_level: editingFood.iddsi_level,
        category: editingFood.category,
        description: editingFood.description,
        preparation: editingFood.preparation,
        texture: editingFood.texture,
      };

      const foodData = {
        name: foodForm.name,
        description: foodForm.description || '',
        iddsi_level: foodForm.iddsi_level,
        category: foodForm.category,
        preparation: foodForm.preparation || '',
        texture: foodForm.texture || '',
        tips: foodForm.tips || '',
        updated_at: serverTimestamp(),
      };

      console.log('Updating food ID:', editingFood.id);
      console.log('Old data:', oldFoodData);
      console.log('New data:', foodData);

      const foodRef = doc(db, 'foods', editingFood.id);
      await updateDoc(foodRef, foodData);
      
      // Send notification with both old and new data
      const foodDataWithId = { ...foodData, id: editingFood.id };
      await sendNotificationToApp('updated', foodDataWithId, oldFoodData);
      
      alert('Food updated successfully and notifications sent to all app users!');
      setShowFoodModal(false);
      setEditingFood(null);
      resetFoodForm();
      fetchFoods();
    } catch (error) {
      console.error('Error updating food:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check Firebase security rules.\n\nYou need to update your Firestore rules to allow updates.');
      } else if (error.code === 'not-found') {
        alert('Food not found. It may have been deleted.');
      } else {
        alert('Error updating food: ' + error.message);
      }
    }
  };

  // UPDATED: Delete food with proper notification format
  const handleDeleteFood = async (food) => {
    if (window.confirm(`Are you sure you want to delete "${food.name}"?`)) {
      try {
        console.log('Deleting food ID:', food.id);
        
        // Send notification before deleting
        await sendNotificationToApp('deleted', food);
        
        // Then delete the food
        await deleteDoc(doc(db, 'foods', food.id));
        
        alert('Food deleted successfully and notifications sent to all app users!');
        fetchFoods();
      } catch (error) {
        console.error('Error deleting food:', error);
        console.error('Error code:', error.code);
        
        if (error.code === 'permission-denied') {
          alert('Permission denied. Please check Firebase security rules.\n\nYou need to update your Firestore rules to allow deletes.');
        } else {
          alert('Error deleting food: ' + error.message);
        }
      }
    }
  };

  // Open comments modal
  const openCommentsModal = (food) => {
    setSelectedFoodComments(food);
    setShowCommentsModal(true);
  };

  // Open edit modal
  const openEditModal = (food) => {
    setEditingFood(food);
    setFoodForm({
      name: food.name || '',
      description: food.description || '',
      iddsi_level: food.iddsi_level || '4',
      category: food.category || 'food',
      preparation: food.preparation || '',
      texture: food.texture || '',
      tips: food.tips || '',
    });
    setShowFoodModal(true);
  };

  // Reset food form
  const resetFoodForm = () => {
    setFoodForm({
      name: '',
      description: '',
      iddsi_level: '4',
      category: 'food',
      preparation: '',
      texture: '',
      tips: '',
    });
  };

  // Filter foods
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         food.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || food.category === filterCategory;
    const matchesLevel = filterLevel === 'all' || food.iddsi_level === filterLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  // Get low-rated foods
  const lowRatedFoods = foods.filter(food => food.average_rating < 3).sort((a, b) => a.average_rating - b.average_rating);

  // USER STATISTICS FOR CHARTS (NOT FOOD!)
  const usersByLevel = users.reduce((acc, user) => {
    const level = user.foodLevel || user.fluidLevel || 'Unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const userLevelData = Object.keys(usersByLevel).map(level => ({
    level: `Level ${level}`,
    count: usersByLevel[level]
  }));

  const usersByCategory = users.reduce((acc, user) => {
    const category = user.selectedCategory || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const userCategoryData = Object.keys(usersByCategory).map(category => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: usersByCategory[category]
  }));

  const COLORS = ['#44157F', '#7A60D6', '#9B7BD4', '#B99CD9', '#D6BDDE'];

  // Login screen
  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <img 
              src="/assets/dysphagia_care2.png" 
              alt="Dysphagia Care Logo" 
              style={styles.loginLogo}
            />
            <h1 style={styles.loginTitle}>Speech Therapist Dashboard</h1>
            <p style={styles.loginSubtitle}>Dysphagia Care Management System</p>
          </div>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.formInput}
                placeholder="Enter username"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.formInput}
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && (
              <div style={styles.loginError}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" style={styles.loginButton}>
              Sign In
            </button>

            <p style={styles.authNote}>
              Only authorized speech therapists can access this dashboard
            </p>
          </form>

          <div style={styles.loginFooter}>
            <p style={styles.footerText}>
              © 2025 Dysphagia Care | Chris Hani Baragwanath Hospital
            </p>
            <p style={styles.footerSubtext}>
              Speech Therapy Department
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div style={styles.dashboard}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <img src="/assets/dysphagia_care2.png" alt="Dysphagia Care" style={styles.sidebarLogo} />
          <h2 style={styles.sidebarTitle}>Dashboard</h2>
        </div>

        <nav style={styles.nav}>
          <button
            style={{...styles.navItem, ...(activeTab === 'overview' && styles.navItemActive)}}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={20} />
            <span>Overview</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === 'foods' && styles.navItemActive)}}
            onClick={() => setActiveTab('foods')}
          >
            <Library size={20} />
            <span>Food Library</span>
          </button>

          <button
            style={{...styles.navItem, ...(activeTab === 'questions' && styles.navItemActive)}}
            onClick={() => setActiveTab('questions')}
          >
            <MessageSquare size={20} />
            <span>Report Issue</span>
          </button>
        </nav>

        {/* SIDEBAR FOOTER WITH SPEECH LOGO */}
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <img src="/assets/speech.logo.png" alt="Therapist" style={styles.userAvatar} />
            <div>
              <p style={styles.userName}>Speech Therapist</p>
              <p style={styles.userRole}>Administrator</p>
            </div>
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'foods' && 'Food Library Management'}
              {activeTab === 'questions' && 'Reported Issues'}
            </h1>
            <p style={styles.pageSubtitle}>
              {activeTab === 'overview' && 'Monitor app usage and manage content'}
              {activeTab === 'foods' && 'Manage IDDSI-compliant food database'}
              {activeTab === 'questions' && 'View and respond to user issues'}
            </p>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.content}>
            {/* Stats Cards */}
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, backgroundColor: '#44157F20'}}>
                  <Users size={24} color="#44157F" />
                </div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalUsers}</h3>
                  <p style={styles.statLabel}>Total Users</p>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, backgroundColor: '#7A60D620'}}>
                  <Library size={24} color="#7A60D6" />
                </div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalFoods}</h3>
                  <p style={styles.statLabel}>Food Items</p>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, backgroundColor: '#9B7BD420'}}>
                  <MessageSquare size={24} color="#9B7BD4" />
                </div>
                <div style={styles.statContent}>
                  <h3 style={styles.statValue}>{stats.totalQuestions}</h3>
                  <p style={styles.statLabel}>Total Issues</p>
                </div>
              </div>
            </div>

            {/* Charts - USERS NOT FOODS! */}
            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Users by IDDSI Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userLevelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#44157F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Users by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Low-rated foods alert */}
            {lowRatedFoods.length > 0 && (
              <div style={styles.alertCard}>
                <div style={styles.alertHeader}>
                  <AlertCircle size={24} color="#FF6B6B" />
                  <h3 style={styles.alertTitle}>Low-Rated Foods Requiring Attention</h3>
                </div>
                <div style={styles.alertContent}>
                  {lowRatedFoods.slice(0, 5).map(food => (
                    <div key={food.id} style={styles.alertItem}>
                      <div>
                        <p style={styles.alertFoodName}>{food.name}</p>
                        <p style={styles.alertFoodLevel}>Level {food.iddsi_level} - {food.category}</p>
                      </div>
                      <div style={styles.ratingBadge}>
                        <Star size={16} color="#FFD700" fill="#FFD700" />
                        <span>{food.average_rating ? food.average_rating.toFixed(1) : '0.0'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Foods Tab */}
        {activeTab === 'foods' && (
          <div style={styles.content}>
            <div style={styles.foodsHeader}>
              <div style={styles.searchAndFilters}>
                <div style={styles.searchBox}>
                  <Search size={20} color="#999" />
                  <input
                    type="text"
                    placeholder="Search foods..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Categories</option>
                  <option value="food">Food</option>
                  <option value="drink">Drink</option>
                </select>

                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Levels</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(level => (
                    <option key={level} value={level.toString()}>Level {level}</option>
                  ))}
                </select>
              </div>

              <button
                style={styles.addButton}
                onClick={() => {
                  setEditingFood(null);
                  resetFoodForm();
                  setShowFoodModal(true);
                }}
              >
                <Plus size={20} />
                <span>Add Food</span>
              </button>
            </div>

            <div style={styles.tableContainer}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Level</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Comments</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFoods.map((food) => (
                      <tr key={food.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div>
                            <span style={styles.foodName}>{food.name}</span>
                            {/* Star Rating Display */}
                            <div style={styles.ratingDisplay}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  color="#FFD700"
                                  fill={star <= (food.average_rating || 0) ? "#FFD700" : "none"}
                                  style={{ marginRight: '2px' }}
                                />
                              ))}
                              <span style={styles.ratingText}>
                                {food.average_rating ? food.average_rating.toFixed(1) : '0.0'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.levelBadge}>Level {food.iddsi_level}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>{food.category}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.description}>
                            {food.description || 'No description'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {/* Clickable Comments Count */}
                          <button
                            style={{
                              ...styles.commentCount,
                              cursor: food.comments && food.comments.length > 0 ? 'pointer' : 'default',
                              opacity: food.comments && food.comments.length > 0 ? 1 : 0.5,
                            }}
                            onClick={() => {
                              if (food.comments && food.comments.length > 0) {
                                openCommentsModal(food);
                              }
                            }}
                            disabled={!food.comments || food.comments.length === 0}
                          >
                            <MessageSquare size={14} style={{ marginRight: '4px' }} />
                            {food.comments?.length || 0} comments
                          </button>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button
                              style={styles.editButton}
                              onClick={() => openEditModal(food)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteFood(food)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Report Issues Tab - Read-only monitoring */}
        {activeTab === 'questions' && (
          <div style={styles.content}>
            <div style={styles.infoBox}>
              <AlertCircle size={20} color="#667eea" />
              <p style={styles.infoText}>
                These are user-reported issues for monitoring and future app improvements. No responses needed.
              </p>
            </div>
            <div style={styles.questionsContainer}>
              {questions.length === 0 ? (
                <div style={styles.emptyState}>
                  <MessageSquare size={48} color="#ccc" />
                  <p>No issues reported yet</p>
                </div>
              ) : (
                questions.map(question => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      {showCommentsModal && selectedFoodComments && (
        <CommentsModal
          food={selectedFoodComments}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedFoodComments(null);
          }}
        />
      )}

      {/* Food Modal */}
      {showFoodModal && (
        <FoodModal
          isEdit={!!editingFood}
          foodForm={foodForm}
          setFoodForm={setFoodForm}
          onClose={() => {
            setShowFoodModal(false);
            setEditingFood(null);
            resetFoodForm();
          }}
          onSave={editingFood ? handleUpdateFood : handleAddFood}
        />
      )}
    </div>
  );
}

// Issue Card Component (Read-only - for monitoring)
function QuestionCard({ question }) {
  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return 'Recently';
    } catch (error) {
      return 'Recently';
    }
  };

  return (
    <div style={styles.questionCard}>
      <div style={styles.questionHeader}>
        <div>
          <p style={styles.questionUser}>
            From: {question.userName || 'Anonymous User'}
          </p>
          <p style={styles.questionEmail}>
            Email: {question.userEmail || 'No email'}
          </p>
          <p style={styles.questionDate}>
            Reported: {formatDate(question.timestamp || question.reportedAt || question.createdAt)}
          </p>
        </div>
        <span style={styles.issueBadge}>For Review</span>
      </div>

      <div style={styles.questionBody}>
        {/* Issue Title/Topic */}
        <h4 style={styles.questionText}>
          {question.title || question.question || 'No title'}
        </h4>
        
        {/* Issue Description */}
        {question.description && (
          <div style={styles.issueDescription}>
            <p style={styles.descriptionLabel}>Description:</p>
            <p style={styles.descriptionText}>{question.description}</p>
          </div>
        )}

        {/* Additional Details */}
        {question.issueType && (
          <div style={styles.issueMetadata}>
            <span style={styles.metadataLabel}>Type:</span>
            <span style={styles.metadataValue}>{question.issueType}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Comments Modal Component
function CommentsModal({ food, onClose }) {
  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const comments = food.comments || [];
  const averageRating = food.average_rating || 0;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.commentsModalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Comments for {food.name}</h2>
            <div style={styles.modalSubtitle}>
              <Star size={16} color="#FFD700" fill="#FFD700" style={{ marginRight: '5px' }} />
              <span style={styles.avgRatingText}>
                {averageRating.toFixed(1)} average rating
              </span>
              <span style={styles.commentCountText}>
                • {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </div>
          </div>
          <button style={styles.modalCloseButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.commentsModalBody}>
          {comments.length === 0 ? (
            <div style={styles.noComments}>
              <MessageSquare size={48} color="#ccc" />
              <p style={styles.noCommentsText}>No comments yet</p>
            </div>
          ) : (
            <div style={styles.commentsList}>
              {comments.map((comment, index) => (
                <div key={index} style={styles.commentCard}>
                  <div style={styles.commentHeader}>
                    <div style={styles.commentUserInfo}>
                      <span style={styles.commentUserName}>
                        {comment.userName || 'Anonymous User'}
                      </span>
                      <span style={styles.commentDate}>
                        {formatDate(comment.timestamp || comment.createdAt)}
                      </span>
                    </div>
                    <div style={styles.commentRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          color="#FFD700"
                          fill={star <= (comment.rating || 0) ? "#FFD700" : "none"}
                        />
                      ))}
                      <span style={styles.commentRatingText}>
                        {comment.rating || 0}
                      </span>
                    </div>
                  </div>
                  <div style={styles.commentBody}>
                    <p style={styles.commentText}>
                      {comment.comment || comment.text || 'No comment text'}
                    </p>
                  </div>
                  {comment.userEmail && (
                    <div style={styles.commentFooter}>
                      <span style={styles.commentEmail}>{comment.userEmail}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.commentsModalFooter}>
          <button style={styles.closeCommentsButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Food Modal Component
function FoodModal({ isEdit, foodForm, setFoodForm, onClose, onSave }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{isEdit ? 'Edit Food' : 'Add New Food'}</h2>
          <button style={styles.modalCloseButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Food Name *</label>
              <input
                type="text"
                value={foodForm.name}
                onChange={(e) => setFoodForm({...foodForm, name: e.target.value})}
                style={styles.formInput}
                placeholder="e.g., Purity (Vegetable and beef)"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>IDDSI Level *</label>
              <select
                value={foodForm.iddsi_level}
                onChange={(e) => setFoodForm({...foodForm, iddsi_level: e.target.value})}
                style={styles.formInput}
                required
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map(level => (
                  <option key={level} value={level.toString()}>Level {level}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Category *</label>
              <select
                value={foodForm.category}
                onChange={(e) => setFoodForm({...foodForm, category: e.target.value})}
                style={styles.formInput}
                required
              >
                <option value="food">Food</option>
                <option value="drink">Drink</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Texture</label>
              <input
                type="text"
                value={foodForm.texture}
                onChange={(e) => setFoodForm({...foodForm, texture: e.target.value})}
                style={styles.formInput}
                placeholder="e.g., Smooth, Pureed"
              />
            </div>

            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                value={foodForm.description}
                onChange={(e) => setFoodForm({...foodForm, description: e.target.value})}
                style={{...styles.formInput, minHeight: '80px'}}
                placeholder="Brief description of the food item"
              />
            </div>

            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.formLabel}>Preparation Instructions</label>
              <textarea
                value={foodForm.preparation}
                onChange={(e) => setFoodForm({...foodForm, preparation: e.target.value})}
                style={{...styles.formInput, minHeight: '100px'}}
                placeholder="How to prepare this food for the appropriate IDDSI level"
              />
            </div>

            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.formLabel}>Tips & Notes</label>
              <textarea
                value={foodForm.tips}
                onChange={(e) => setFoodForm({...foodForm, tips: e.target.value})}
                style={{...styles.formInput, minHeight: '80px'}}
                placeholder="Additional tips or important notes"
              />
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.cancelModalButton} onClick={onClose}>
              Cancel
            </button>
            <button style={styles.saveButton} onClick={onSave}>
              {isEdit ? 'Update Food' : 'Add Food'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles - YOUR ORIGINAL STYLES
const styles = {
  // Login Container
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  loginCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  loginLogo: {
    width: '200px',
    height: '200px',
    margin: '0 auto 20px',
    display: 'block',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px',
  },
  loginSubtitle: {
    fontSize: '16px',
    color: '#718096',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  formInput: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  loginError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '10px',
    color: '#c53030',
    fontSize: '14px',
  },
  loginButton: {
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  authNote: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#718096',
    marginTop: '10px',
  },
  loginFooter: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '5px',
  },
  footerSubtext: {
    fontSize: '12px',
    color: '#a0aec0',
  },

  // Dashboard
  dashboard: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f7fafc',
  },

  // Sidebar
  sidebar: {
    width: '280px',
    background: 'linear-gradient(180deg, #44157F 0%, #7A60D6 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    overflowY: 'auto',
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '30px 20px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarLogo: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'block',
    objectFit: 'cover',
    border: '4px solid rgba(255,255,255,0.2)',
  },
  sidebarTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },

  // Navigation
  nav: {
    flex: 1,
    padding: '20px 0',
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px 30px',
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'left',
    borderLeft: '4px solid transparent',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    borderLeft: '4px solid white',
  },
  badge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    background: '#FF6B6B',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
  },

  // Sidebar Footer WITH SPEECH LOGO
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    marginBottom: '15px',
  },
  userAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    objectFit: 'cover',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  userRole: {
    fontSize: '12px',
    opacity: 0.8,
    margin: 0,
  },
  logoutButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },

  // Main Content
  mainContent: {
    flex: 1,
    marginLeft: '280px',
    padding: '30px',
    overflowY: 'auto',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '30px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#718096',
  },

  // Content
  content: {
    animation: 'fadeIn 0.5s',
  },

  // Info box for Report Issues
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: '#f0f4ff',
    border: '1px solid #c7d7fe',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  infoText: {
    margin: 0,
    fontSize: '14px',
    color: '#4c5773',
    lineHeight: '1.5',
  },

  // Stats Container
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2d3748',
    margin: '0 0 5px 0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },

  // Charts
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  chartCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
  },

  // Alert Card
  alertCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  alertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
  },
  alertTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  alertContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#fff5f5',
    borderRadius: '10px',
    border: '1px solid #fed7d7',
  },
  alertFoodName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 5px 0',
  },
  alertFoodLevel: {
    fontSize: '13px',
    color: '#718096',
    margin: 0,
  },
  ratingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    background: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },

  // Foods Header
  foodsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  searchAndFilters: {
    display: 'flex',
    gap: '15px',
    flex: 1,
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    flex: '1 1 300px',
    minWidth: '250px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #44157F 0%, #7A60D6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    whiteSpace: 'nowrap',
  },

  // Table
  tableContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    background: '#f7fafc',
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#4a5568',
  },
  foodName: {
    fontWeight: '600',
    color: '#2d3748',
    display: 'block',
    marginBottom: '5px',
  },
  ratingDisplay: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
  },
  ratingText: {
    fontSize: '13px',
    color: '#718096',
    marginLeft: '6px',
    fontWeight: '600',
  },
  levelBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    background: '#44157F',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    background: '#e6fffa',
    color: '#047857',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    display: 'block',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  commentCount: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    background: '#fffaf0',
    color: '#c05621',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    padding: '8px 12px',
    background: '#ebf8ff',
    border: 'none',
    borderRadius: '8px',
    color: '#3182ce',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  deleteButton: {
    padding: '8px 12px',
    background: '#fff5f5',
    border: 'none',
    borderRadius: '8px',
    color: '#e53e3e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },

  // Questions
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  emptyState: {
    background: 'white',
    borderRadius: '16px',
    padding: '60px',
    textAlign: 'center',
    color: '#a0aec0',
  },
  questionCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '15px',
  },
  questionUser: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '5px',
  },
  questionEmail: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '5px',
  },
  questionDate: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  issueBadge: {
    padding: '6px 16px',
    background: '#f0f4ff',
    color: '#667eea',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  questionBody: {
    marginBottom: '20px',
  },
  questionText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '15px',
    lineHeight: '1.6',
  },
  issueDescription: {
    background: '#f7fafc',
    borderRadius: '12px',
    padding: '15px',
    marginTop: '15px',
  },
  descriptionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
  },
  descriptionText: {
    fontSize: '14px',
    color: '#2d3748',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  issueMetadata: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '8px 12px',
    background: '#fffaf0',
    borderRadius: '8px',
  },
  metadataLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#744210',
  },
  metadataValue: {
    fontSize: '12px',
    color: '#975a16',
    textTransform: 'capitalize',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  
  // Comments Modal Specific
  commentsModalContent: {
    background: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  commentsModalBody: {
    padding: '0 25px',
    flex: 1,
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 180px)',
  },
  commentsModalFooter: {
    padding: '20px 25px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalSubtitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#718096',
    marginTop: '8px',
  },
  avgRatingText: {
    fontWeight: '600',
    color: '#2d3748',
  },
  commentCountText: {
    marginLeft: '8px',
  },
  
  // Comments List
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: '20px',
  },
  noComments: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#a0aec0',
  },
  noCommentsText: {
    marginTop: '16px',
    fontSize: '16px',
  },
  
  // Comment Card
  commentCard: {
    background: '#f7fafc',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  commentUserInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  commentUserName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
  },
  commentDate: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  commentRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  commentRatingText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748',
    marginLeft: '4px',
  },
  commentBody: {
    marginBottom: '8px',
  },
  commentText: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  commentFooter: {
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  commentEmail: {
    fontSize: '12px',
    color: '#718096',
  },
  closeCommentsButton: {
    padding: '12px 24px',
    background: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748',
  },
  modalCloseButton: {
    background: 'transparent',
    border: 'none',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  modalBody: {
    padding: '25px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelModalButton: {
    padding: '12px 24px',
    background: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #44157F 0%, #7A60D6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default SpeechTherapistDashboard;