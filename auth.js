// Authentication utilities for ImmunTracker

const auth = {
  currentUser: null,
  
  // Register a new parent
  async register(userData) {
    try {
      // Check if email already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }
      
      // Create user ID
      const userId = this.generateUserId();
      
      // Hash password (simple hash for demo - in production use proper hashing)
      const hashedPassword = this.hashPassword(userData.password);
      
      // Create user object
      const user = {
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address || '',
        password: hashedPassword,
        createdAt: Date.now(),
        children: []
      };
      
      // Save to Firebase
      await database.ref(`users/${userId}`).set(user);
      
      // Set current user (without password)
      const { password, ...userWithoutPassword } = user;
      this.currentUser = userWithoutPassword;
      this.saveUserSession(userWithoutPassword);
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  },
  
  // Login user
  async login(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Verify password
      const hashedPassword = this.hashPassword(password);
      if (user.password !== hashedPassword) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Set current user (without password)
      const { password: _, ...userWithoutPassword } = user;
      this.currentUser = userWithoutPassword;
      this.saveUserSession(userWithoutPassword);
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },
  
  // Logout user
  logout() {
    this.currentUser = null;
    localStorage.removeItem('immunTracker_user');
    window.location.href = 'login.html';
  },
  
  // Get current user
  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Try to load from session
    const savedUser = localStorage.getItem('immunTracker_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        return this.currentUser;
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('immunTracker_user');
      }
    }
    
    return null;
  },
  
  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },
  
  // Require authentication (redirect to login if not authenticated)
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  
  // Get user by email
  async getUserByEmail(email) {
    try {
      const snapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
      const users = snapshot.val();
      
      if (users) {
        const userId = Object.keys(users)[0];
        return users[userId];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },
  
  // Update user profile
  async updateProfile(updates) {
    try {
      if (!this.currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const userId = this.currentUser.id;
      await database.ref(`users/${userId}`).update({
        ...updates,
        updatedAt: Date.now()
      });
      
      // Update current user
      this.currentUser = { ...this.currentUser, ...updates };
      this.saveUserSession(this.currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  },
  
  // Save user session
  saveUserSession(user) {
    localStorage.setItem('immunTracker_user', JSON.stringify(user));
  },
  
  // Generate user ID
  generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  // Simple password hashing (for demo purposes)
  hashPassword(password) {
    // In production, use proper password hashing like bcrypt
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
};

// Child management operations for authenticated users
const childOperations = {
  // Add a child to the current user
  async addChild(childData) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const childId = this.generateChildId();
      const child = {
        id: childId,
        parentId: currentUser.id,
        ...childData,
        createdAt: Date.now()
      };
      
      // Save child to Firebase
      await database.ref(`children/${childId}`).set(child);
      
      // Update user's children list
      const userChildrenRef = database.ref(`users/${currentUser.id}/children`);
      const snapshot = await userChildrenRef.once('value');
      const currentChildren = snapshot.val() || [];
      currentChildren.push(childId);
      await userChildrenRef.set(currentChildren);
      
      return { success: true, id: childId, data: child };
    } catch (error) {
      console.error('Error adding child:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all children for current user
  async getAllChildren() {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const snapshot = await database.ref('children').orderByChild('parentId').equalTo(currentUser.id).once('value');
      const children = [];
      
      snapshot.forEach(childSnapshot => {
        children.push(childSnapshot.val());
      });
      
      return { success: true, data: children };
    } catch (error) {
      console.error('Error getting children:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get child by ID (only if belongs to current user)
  async getChildById(childId) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const snapshot = await database.ref(`children/${childId}`).once('value');
      const child = snapshot.val();
      
      if (!child) {
        return { success: false, error: 'Child not found' };
      }
      
      if (child.parentId !== currentUser.id) {
        return { success: false, error: 'Access denied' };
      }
      
      return { success: true, data: child };
    } catch (error) {
      console.error('Error getting child:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update child data
  async updateChild(childId, updates) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify child belongs to current user
      const childResult = await this.getChildById(childId);
      if (!childResult.success) {
        return childResult;
      }
      
      await database.ref(`children/${childId}`).update({
        ...updates,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating child:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Delete child
  async deleteChild(childId) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify child belongs to current user
      const childResult = await this.getChildById(childId);
      if (!childResult.success) {
        return childResult;
      }
      
      // Delete child
      await database.ref(`children/${childId}`).remove();
      
      // Remove from user's children list
      const userChildrenRef = database.ref(`users/${currentUser.id}/children`);
      const snapshot = await userChildrenRef.once('value');
      const currentChildren = snapshot.val() || [];
      const updatedChildren = currentChildren.filter(id => id !== childId);
      await userChildrenRef.set(updatedChildren);
      
      // Delete all vaccinations for this child
      await database.ref(`vaccinations/${childId}`).remove();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting child:', error);
      return { success: false, error: error.message };
    }
  },
  
  generateChildId() {
    return 'child_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

// Vaccination operations for authenticated users
const vaccinationOperations = {
  // Add vaccination record
  async addVaccination(childId, vaccinationData) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify child belongs to current user
      const childResult = await childOperations.getChildById(childId);
      if (!childResult.success) {
        return childResult;
      }
      
      const vaccinationId = this.generateVaccinationId();
      const vaccination = {
        id: vaccinationId,
        childId: childId,
        parentId: currentUser.id,
        ...vaccinationData,
        createdAt: Date.now()
      };
      
      await database.ref(`vaccinations/${childId}/${vaccinationId}`).set(vaccination);
      
      return { success: true, id: vaccinationId, data: vaccination };
    } catch (error) {
      console.error('Error adding vaccination:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get vaccinations for a child
  async getChildVaccinations(childId) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify child belongs to current user
      const childResult = await childOperations.getChildById(childId);
      if (!childResult.success) {
        return childResult;
      }
      
      const snapshot = await database.ref(`vaccinations/${childId}`).once('value');
      const vaccinations = [];
      
      snapshot.forEach(vaccinationSnapshot => {
        vaccinations.push(vaccinationSnapshot.val());
      });
      
      return { success: true, data: vaccinations };
    } catch (error) {
      console.error('Error getting vaccinations:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Update vaccination record
  async updateVaccination(childId, vaccinationId, updates) {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify child belongs to current user
      const childResult = await childOperations.getChildById(childId);
      if (!childResult.success) {
        return childResult;
      }
      
      await database.ref(`vaccinations/${childId}/${vaccinationId}`).update({
        ...updates,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating vaccination:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all vaccinations for current user's children
  async getAllVaccinations() {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const childrenResult = await childOperations.getAllChildren();
      if (!childrenResult.success) {
        return childrenResult;
      }
      
      const allVaccinations = [];
      
      for (const child of childrenResult.data) {
        const vaccinationsResult = await this.getChildVaccinations(child.id);
        if (vaccinationsResult.success) {
          allVaccinations.push(...vaccinationsResult.data);
        }
      }
      
      return { success: true, data: allVaccinations };
    } catch (error) {
      console.error('Error getting all vaccinations:', error);
      return { success: false, error: error.message };
    }
  },
  
  generateVaccinationId() {
    return 'vacc_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};