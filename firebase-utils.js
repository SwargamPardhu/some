// Firebase Utilities for Children's Immunization Tracker

// Child data operations
const childOperations = {
  // Add a new child
  async addChild(childData) {
    try {
      const childRef = database.ref('children').push();
      const childId = childRef.key;
      const childWithId = { ...childData, id: childId, createdAt: Date.now() };
      await childRef.set(childWithId);
      return { success: true, id: childId, data: childWithId };
    } catch (error) {
      console.error('Error adding child:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all children
  async getAllChildren() {
    try {
      const snapshot = await database.ref('children').once('value');
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

  // Get child by ID
  async getChildById(childId) {
    try {
      const snapshot = await database.ref(`children/${childId}`).once('value');
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() };
      } else {
        return { success: false, error: 'Child not found' };
      }
    } catch (error) {
      console.error('Error getting child:', error);
      return { success: false, error: error.message };
    }
  },

  // Update child data
  async updateChild(childId, updates) {
    try {
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
      await database.ref(`children/${childId}`).remove();
      return { success: true };
    } catch (error) {
      console.error('Error deleting child:', error);
      return { success: false, error: error.message };
    }
  }
};

// Vaccination operations
const vaccinationOperations = {
  // Add vaccination record
  async addVaccination(childId, vaccinationData) {
    try {
      const vaccinationRef = database.ref(`vaccinations/${childId}`).push();
      const vaccinationId = vaccinationRef.key;
      const vaccinationWithId = { 
        ...vaccinationData, 
        id: vaccinationId, 
        childId: childId,
        createdAt: Date.now() 
      };
      await vaccinationRef.set(vaccinationWithId);
      return { success: true, id: vaccinationId, data: vaccinationWithId };
    } catch (error) {
      console.error('Error adding vaccination:', error);
      return { success: false, error: error.message };
    }
  },

  // Get vaccinations for a child
  async getChildVaccinations(childId) {
    try {
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

  // Get all vaccinations (for dashboard)
  async getAllVaccinations() {
    try {
      const snapshot = await database.ref('vaccinations').once('value');
      const allVaccinations = [];
      snapshot.forEach(childSnapshot => {
        childSnapshot.forEach(vaccinationSnapshot => {
          allVaccinations.push(vaccinationSnapshot.val());
        });
      });
      return { success: true, data: allVaccinations };
    } catch (error) {
      console.error('Error getting all vaccinations:', error);
      return { success: false, error: error.message };
    }
  }
};

// WHO Vaccination Schedule (simplified)
const vaccineSchedule = {
  vaccines: [
    {
      name: 'BCG',
      description: 'Bacillus Calmette-Guérin (Tuberculosis)',
      ageMonths: 0,
      ageText: 'At birth'
    },
    {
      name: 'Hepatitis B',
      description: 'Hepatitis B vaccine',
      ageMonths: 0,
      ageText: 'At birth'
    },
    {
      name: 'DPT1',
      description: 'Diphtheria, Pertussis, Tetanus (1st dose)',
      ageMonths: 2,
      ageText: '2 months'
    },
    {
      name: 'Polio1',
      description: 'Oral Polio Vaccine (1st dose)',
      ageMonths: 2,
      ageText: '2 months'
    },
    {
      name: 'DPT2',
      description: 'Diphtheria, Pertussis, Tetanus (2nd dose)',
      ageMonths: 4,
      ageText: '4 months'
    },
    {
      name: 'Polio2',
      description: 'Oral Polio Vaccine (2nd dose)',
      ageMonths: 4,
      ageText: '4 months'
    },
    {
      name: 'DPT3',
      description: 'Diphtheria, Pertussis, Tetanus (3rd dose)',
      ageMonths: 6,
      ageText: '6 months'
    },
    {
      name: 'Polio3',
      description: 'Oral Polio Vaccine (3rd dose)',
      ageMonths: 6,
      ageText: '6 months'
    },
    {
      name: 'Measles1',
      description: 'Measles vaccine (1st dose)',
      ageMonths: 9,
      ageText: '9 months'
    },
    {
      name: 'MMR',
      description: 'Measles, Mumps, Rubella',
      ageMonths: 12,
      ageText: '12 months'
    },
    {
      name: 'DPT Booster',
      description: 'DPT Booster dose',
      ageMonths: 18,
      ageText: '18 months'
    },
    {
      name: 'Measles2',
      description: 'Measles vaccine (2nd dose)',
      ageMonths: 24,
      ageText: '2 years'
    }
  ],

  // Generate schedule for a child based on birth date
  generateSchedule(birthDate) {
    const birth = new Date(birthDate);
    const schedule = this.vaccines.map(vaccine => {
      const dueDate = new Date(birth);
      dueDate.setMonth(dueDate.getMonth() + vaccine.ageMonths);
      
      const today = new Date();
      let status = 'upcoming';
      if (dueDate < today) {
        const daysPast = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        if (daysPast > 30) {
          status = 'overdue';
        } else {
          status = 'due';
        }
      }

      return {
        ...vaccine,
        dueDate: dueDate.toISOString().split('T')[0],
        status: status,
        administered: false
      };
    });

    return schedule;
  }
};

// Utility functions
const utils = {
  // Calculate age from birth date
  calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // If less than 1 year, return months
    if (age === 0) {
      let months = monthDiff;
      if (today.getDate() < birth.getDate()) {
        months--;
      }
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return `${age} year${age !== 1 ? 's' : ''}`;
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Get vaccination status color
  getStatusColor(status) {
    switch (status) {
      case 'completed':
        return 'success';
      case 'due':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'secondary';
    }
  },

  // Show loading state
  showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
  },

  // Show error message
  showError(element, message) {
    element.innerHTML = `
      <div class="card" style="border-color: var(--error-500); background: #fef2f2;">
        <div class="card-body text-center">
          <i class="fas fa-exclamation-triangle" style="color: var(--error-500); font-size: 2rem; margin-bottom: 1rem;"></i>
          <p style="color: var(--error-500); font-weight: 500;">${message}</p>
        </div>
      </div>
    `;
  },

  // Show success message
  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-500);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
      ">
        <i class="fas fa-check-circle"></i> ${message}
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

// Real-time listeners
const realtimeListeners = {
  // Listen to children changes
  onChildrenChange(callback) {
    return database.ref('children').on('value', snapshot => {
      const children = [];
      snapshot.forEach(childSnapshot => {
        children.push(childSnapshot.val());
      });
      callback(children);
    });
  },

  // Listen to vaccinations changes for a child
  onChildVaccinationsChange(childId, callback) {
    return database.ref(`vaccinations/${childId}`).on('value', snapshot => {
      const vaccinations = [];
      snapshot.forEach(vaccinationSnapshot => {
        vaccinations.push(vaccinationSnapshot.val());
      });
      callback(vaccinations);
    });
  },

  // Remove listener
  off(ref) {
    database.ref(ref).off();
  }
};