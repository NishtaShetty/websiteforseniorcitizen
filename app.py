from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime, timedelta
import database

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Change this to a secure secret key

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        email = request.form['email']
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        if cursor.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone():
            flash('Username already exists!')
            return redirect(url_for('register'))
        
        hashed_password = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
                      (username, hashed_password, email))
        conn.commit()
        conn.close()
        
        flash('Registration successful! Please login.')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        user = cursor.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            return redirect(url_for('services'))
        
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/services')
def services():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = database.get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute('SELECT * FROM users WHERE id = ?', 
                         (session['user_id'],)).fetchone()
    conn.close()
    
    return render_template('services.html', user=user)

@app.route('/medication-reminder')
def medication_reminder():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = database.get_db_connection()
    cursor = conn.cursor()
    medications = cursor.execute('''
        SELECT id, name, dosage, frequency, next_dose, 
               daily_doses, doses_taken, last_taken
        FROM medications 
        WHERE user_id = ? 
        ORDER BY next_dose
    ''', (session['user_id'],)).fetchall()
    conn.close()
    
    return render_template('medication_reminder.html', medications=medications)

@app.route('/appointment-scheduling')
@login_required
def appointment_scheduling():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # Get all appointments for the user
    appointments = cursor.execute('''
        SELECT * FROM appointments 
        WHERE user_id = ? 
        ORDER BY date DESC
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    # Add current time for status comparison
    now = datetime.now()
    
    # Convert appointments to list of dicts and parse dates
    formatted_appointments = []
    for apt in appointments:
        apt_dict = dict(apt)
        try:
            # Try different date formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M', '%Y-%m-%d%H:%M']:
                try:
                    apt_dict['date'] = datetime.strptime(apt_dict['date'], fmt)
                    break
                except ValueError:
                    continue
            formatted_appointments.append(apt_dict)
        except ValueError:
            # If date can't be parsed, skip this appointment
            continue
    
    return render_template('appointment_scheduling.html', 
                         appointments=formatted_appointments,
                         now=now)

@app.route('/transportation')
def transportation():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('transportation.html')

@app.route('/emergency')
@login_required
def emergency():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # Get all emergency contacts for the user
    contacts = cursor.execute('''
        SELECT * FROM emergency_contacts 
        WHERE user_id = ?
        ORDER BY name ASC
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    return render_template('emergency.html', emergency_contacts=contacts)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('home'))

@app.route('/add_medication', methods=['POST'])
@login_required
def add_medication():
    try:
        name = request.form.get('name')
        dosage = request.form.get('dosage')
        frequency = request.form.get('frequency')
        next_dose = request.form.get('next_dose')
        
        # Set daily_doses based on frequency
        daily_doses = {
            'daily': 1,
            'twice daily': 2,
            'thrice daily': 3,
            'weekly': 1,
            'monthly': 1
        }.get(frequency, 1)
        
        if not all([name, dosage, frequency, next_dose]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO medications (
                user_id, name, dosage, frequency, next_dose, 
                daily_doses, doses_taken, last_taken
            )
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
        ''', (session['user_id'], name, dosage, frequency, 
              next_dose, daily_doses))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Medication added successfully'
        })
        
    except Exception as e:
        print(f"Error adding medication: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/add_appointment', methods=['POST'])
@login_required
def add_appointment():
    try:
        title = request.form.get('title')
        doctor = request.form.get('doctor')
        location = request.form.get('location')
        date = request.form.get('date')
        notes = request.form.get('notes')
        
        if not all([title, doctor, location, date]):
            return jsonify({
                'success': False,
                'message': 'All fields except notes are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO appointments (
                user_id, title, doctor, location, date, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (session['user_id'], title, doctor, location, date, notes))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Appointment scheduled successfully'
        })
        
    except Exception as e:
        print(f"Error adding appointment: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/request_transport', methods=['POST'])
def request_transport():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        pickup_location = request.form['pickup_location']
        destination = request.form['destination']
        pickup_time = request.form['pickup_time']
        special_needs = request.form.get('special_needs', '')
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO transportation_requests 
            (user_id, pickup_location, destination, pickup_time, special_needs)
            VALUES (?, ?, ?, ?, ?)
        ''', (session['user_id'], pickup_location, destination, pickup_time, special_needs))
        conn.commit()
        conn.close()
        
        flash('Transportation request submitted successfully!')
        return redirect(url_for('transportation'))

@app.route('/add_emergency_contact', methods=['POST'])
@login_required
def add_emergency_contact():
    try:
        name = request.form.get('name')
        phone = request.form.get('phone')
        relationship = request.form.get('relationship')
        
        if not all([name, phone, relationship]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO emergency_contacts (user_id, name, phone, relationship)
            VALUES (?, ?, ?, ?)
        ''', (session['user_id'], name, phone, relationship))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Emergency contact added successfully'
        })
        
    except Exception as e:
        print(f"Error adding emergency contact: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/get_emergency_contact/<int:contact_id>')
@login_required
def get_emergency_contact(contact_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    contact = cursor.execute('''
        SELECT * FROM emergency_contacts 
        WHERE id = ? AND user_id = ?
    ''', (contact_id, session['user_id'])).fetchone()
    
    conn.close()
    
    if contact:
        return jsonify({
            'id': contact['id'],
            'name': contact['name'],
            'phone': contact['phone'],
            'relationship': contact['relationship']
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Contact not found'
        }), 404

@app.route('/update_emergency_contact', methods=['POST'])
@login_required
def update_emergency_contact():
    try:
        contact_id = request.form.get('contact_id')
        name = request.form.get('name')
        phone = request.form.get('phone')
        relationship = request.form.get('relationship')
        
        if not all([contact_id, name, phone, relationship]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE emergency_contacts 
            SET name = ?, phone = ?, relationship = ?
            WHERE id = ? AND user_id = ?
        ''', (name, phone, relationship, contact_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Emergency contact updated successfully'
        })
        
    except Exception as e:
        print(f"Error updating emergency contact: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/delete_emergency_contact/<int:contact_id>', methods=['POST'])
@login_required
def delete_emergency_contact(contact_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM emergency_contacts 
            WHERE id = ? AND user_id = ?
        ''', (contact_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Emergency contact deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting emergency contact: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/trigger_emergency', methods=['POST'])
@login_required
def trigger_emergency():
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Get user's emergency contacts
        contacts = cursor.execute('''
            SELECT name, phone FROM emergency_contacts 
            WHERE user_id = ?
        ''', (session['user_id'],)).fetchall()
        
        # Get user info
        user = cursor.execute('SELECT username FROM users WHERE id = ?', 
                            (session['user_id'],)).fetchone()
        
        conn.close()

        if not contacts:
            return jsonify({
                'success': False,
                'message': 'No emergency contacts found'
            })
        
        # In a real application, you would integrate with an SMS service
        # For now, we'll just simulate the alert
        location_text = f" at location ({latitude}, {longitude})" if latitude and longitude else ""
        message = f"EMERGENCY ALERT: {user['username']} needs immediate assistance{location_text}"
        
        # Simulate sending alerts to all contacts
        for contact in contacts:
            print(f"Would send to {contact['name']} at {contact['phone']}: {message}")
        
        return jsonify({
            'success': True,
            'message': f'Emergency alert sent to {len(contacts)} contacts'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/profile')
@login_required
def profile():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # Get user details
    user = cursor.execute('''
        SELECT username, email, 
               COALESCE(created_at, CURRENT_TIMESTAMP) as created_at 
        FROM users 
        WHERE id = ?
    ''', (session['user_id'],)).fetchone()
    
    # Get statistics
    stats = {
        'medications': cursor.execute('SELECT COUNT(*) FROM medications WHERE user_id = ?', 
                                    (session['user_id'],)).fetchone()[0],
        'appointments': cursor.execute('SELECT COUNT(*) FROM appointments WHERE user_id = ?', 
                                     (session['user_id'],)).fetchone()[0],
        'emergency_contacts': cursor.execute('SELECT COUNT(*) FROM emergency_contacts WHERE user_id = ?', 
                                           (session['user_id'],)).fetchone()[0]
    }
    
    conn.close()
    
    return render_template('profile.html', user=user, stats=stats)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not username or not email:
            return jsonify({
                'success': False,
                'message': 'Username and email are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Check if username is taken by another user
        existing_user = cursor.execute(
            'SELECT id FROM users WHERE username = ? AND id != ?', 
            (username, session['user_id'])
        ).fetchone()
        
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Username is already taken'
            })
        
        # Update user information
        if password:
            # If password is provided, update it too
            hashed_password = generate_password_hash(password)
            cursor.execute('''
                UPDATE users 
                SET username = ?, email = ?, password = ?
                WHERE id = ?
            ''', (username, email, hashed_password, session['user_id']))
        else:
            # Otherwise just update username and email
            cursor.execute('''
                UPDATE users 
                SET username = ?, email = ?
                WHERE id = ?
            ''', (username, email, session['user_id']))
        
        conn.commit()
        
        # Get updated user info
        user = cursor.execute(
            'SELECT username, email FROM users WHERE id = ?', 
            (session['user_id'],)
        ).fetchone()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'username': user['username'],
                'email': user['email']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/get_contact/<int:contact_id>')
@login_required
def get_contact(contact_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    contact = cursor.execute('''
        SELECT * FROM emergency_contacts 
        WHERE id = ? AND user_id = ?
    ''', (contact_id, session['user_id'])).fetchone()
    
    conn.close()
    
    if contact:
        return jsonify({
            'id': contact['id'],
            'name': contact['name'],
            'phone': contact['phone'],
            'relationship': contact['relationship']
        })
    
    return jsonify({'error': 'Contact not found'}), 404

@app.route('/delete_contact/<int:contact_id>', methods=['POST'])
@login_required
def delete_contact(contact_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Verify the contact belongs to the current user
        cursor.execute('''
            DELETE FROM emergency_contacts 
            WHERE id = ? AND user_id = ?
        ''', (contact_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Contact deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

def calculate_next_dose(frequency):
    now = datetime.now()
    
    frequency = frequency.lower()
    if 'daily' in frequency:
        # Extract number of times per day
        times_per_day = 1
        if 'twice' in frequency:
            times_per_day = 2
        elif 'thrice' in frequency:
            times_per_day = 3
            
        # Calculate time intervals
        day_start = now.replace(hour=8, minute=0, second=0, microsecond=0)
        interval = 24 // times_per_day
        
        # Find next dose time
        for hour in range(8, 24, interval):
            next_time = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            if next_time > now:
                return next_time
                
        # If all today's doses are past, set for tomorrow
        return day_start + timedelta(days=1)
    
    # Handle weekly medications
    elif 'weekly' in frequency:
        next_dose = now + timedelta(days=7)
        return next_dose.replace(hour=8, minute=0, second=0, microsecond=0)
    
    # Handle monthly medications
    elif 'monthly' in frequency:
        if now.month == 12:
            next_dose = now.replace(year=now.year + 1, month=1)
        else:
            next_dose = now.replace(month=now.month + 1)
        return next_dose.replace(hour=8, minute=0, second=0, microsecond=0)
    
    # Default to next day if frequency not recognized
    return (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)

@app.route('/mark_medication_taken/<int:med_id>', methods=['POST'])
@login_required
def mark_medication_taken(med_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Get current medication info
        med = cursor.execute('''
            SELECT daily_doses, doses_taken, frequency 
            FROM medications 
            WHERE id = ? AND user_id = ?
        ''', (med_id, session['user_id'])).fetchone()
        
        if not med:
            return jsonify({
                'success': False,
                'message': 'Medication not found'
            })
        
        # Check if all doses for today are already taken
        if med['doses_taken'] >= med['daily_doses']:
            return jsonify({
                'success': False,
                'message': 'All doses for today have been taken'
            })
        
        # Update doses taken and last taken time
        cursor.execute('''
            UPDATE medications 
            SET doses_taken = doses_taken + 1,
                last_taken = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (med_id, session['user_id']))
        
        conn.commit()
        
        # Get updated doses taken count
        updated_med = cursor.execute('''
            SELECT daily_doses, doses_taken 
            FROM medications 
            WHERE id = ?
        ''', (med_id,)).fetchone()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Dose taken successfully',
            'notification': {
                'type': 'success',
                'title': 'Medication Taken',
                'message': 'Your medication has been marked as taken.'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e),
            'notification': {
                'type': 'error',
                'title': 'Error',
                'message': 'Failed to mark medication as taken.'
            }
        })

@app.route('/cancel_ride/<int:ride_id>', methods=['POST'])
@login_required
def cancel_ride(ride_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE transportation_requests 
            SET status = 'cancelled' 
            WHERE id = ? AND user_id = ?
        ''', (ride_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ride cancelled successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/get_medication/<int:med_id>')
@login_required
def get_medication(med_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    medication = cursor.execute('''
        SELECT id, name, dosage, frequency, next_dose, daily_doses 
        FROM medications 
        WHERE id = ? AND user_id = ?
    ''', (med_id, session['user_id'])).fetchone()
    
    conn.close()
    
    if medication:
        return jsonify({
            'id': medication['id'],
            'name': medication['name'],
            'dosage': medication['dosage'],
            'frequency': medication['frequency'],
            'next_dose': medication['next_dose'],
            'daily_doses': medication['daily_doses']
        })
    
    return jsonify({'error': 'Medication not found'}), 404

@app.route('/update_medication', methods=['POST'])
@login_required
def update_medication():
    try:
        med_id = request.form.get('id')
        name = request.form.get('name')
        dosage = request.form.get('dosage')
        frequency = request.form.get('frequency')
        next_dose = request.form.get('next_dose')
        
        # Set daily_doses based on frequency
        daily_doses = {
            'daily': 1,
            'twice daily': 2,
            'thrice daily': 3,
            'weekly': 1,
            'monthly': 1
        }.get(frequency, 1)
        
        if not all([med_id, name, dosage, frequency, next_dose]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            })
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE medications 
            SET name = ?, dosage = ?, frequency = ?, next_dose = ?, 
                daily_doses = ?, doses_taken = 0
            WHERE id = ? AND user_id = ?
        ''', (name, dosage, frequency, next_dose, daily_doses, 
              med_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Medication updated successfully'
        })
        
    except Exception as e:
        print(f"Error updating medication: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/delete_medication/<int:med_id>', methods=['POST'])
@login_required
def delete_medication(med_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM medications 
            WHERE id = ? AND user_id = ?
        ''', (med_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Medication deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/check_medications')
@login_required
def check_medications():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # Get medications due in the next hour
    now = datetime.now()
    hour_from_now = now + timedelta(hours=1)
    
    medications = cursor.execute('''
        SELECT id, name, dosage, next_dose 
        FROM medications 
        WHERE user_id = ? 
        AND next_dose BETWEEN ? AND ?
        AND taken = 0
    ''', (session['user_id'], now.strftime('%Y-%m-%d %H:%M:%S'), 
          hour_from_now.strftime('%Y-%m-%d %H:%M:%S'))).fetchall()
    
    conn.close()
    
    return jsonify([{
        'id': med['id'],
        'name': med['name'],
        'dosage': med['dosage'],
        'next_dose': med['next_dose'],
        'should_take': True
    } for med in medications])

@app.route('/reset_daily_medications')
@login_required
def reset_daily_medications():
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Get current time
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Reset doses_taken for medications that are due today
        cursor.execute('''
            UPDATE medications 
            SET doses_taken = 0 
            WHERE user_id = ? 
            AND next_dose <= ? 
            AND next_dose >= ?
        ''', (session['user_id'], now, today_start))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Medications reset successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/get_appointment/<int:appointment_id>')
@login_required
def get_appointment(appointment_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    appointment = cursor.execute('''
        SELECT * FROM appointments 
        WHERE id = ? AND user_id = ?
    ''', (appointment_id, session['user_id'])).fetchone()
    
    conn.close()
    
    if appointment:
        return jsonify({
            'id': appointment['id'],
            'title': appointment['title'],
            'doctor': appointment['doctor'],
            'location': appointment['location'],
            'date': appointment['date'],
            'notes': appointment['notes']
        })
    
    return jsonify({'error': 'Appointment not found'}), 404

@app.route('/update_appointment', methods=['POST'])
@login_required
def update_appointment():
    try:
        appointment_id = request.form.get('appointment_id')
        title = request.form.get('title')
        doctor = request.form.get('doctor')
        location = request.form.get('location')
        date = request.form.get('date')
        notes = request.form.get('notes')
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE appointments 
            SET title = ?, doctor = ?, location = ?, date = ?, notes = ?
            WHERE id = ? AND user_id = ?
        ''', (title, doctor, location, date, notes, appointment_id, session['user_id']))
        
        conn.commit()
        
        # Fetch the updated appointment
        appointment = cursor.execute('''
            SELECT id, title, doctor, location, date, notes 
            FROM appointments 
            WHERE id = ?
        ''', (appointment_id,)).fetchone()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Appointment updated successfully',
            'appointment': {
                'id': appointment['id'],
                'title': appointment['title'],
                'doctor': appointment['doctor'],
                'location': appointment['location'],
                'date': appointment['date'],
                'notes': appointment['notes']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/delete_appointment/<int:appointment_id>', methods=['POST'])
@login_required
def delete_appointment(appointment_id):
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM appointments 
            WHERE id = ? AND user_id = ?
        ''', (appointment_id, session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Appointment deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/get_appointments_json')
@login_required
def get_appointments_json():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    appointments = cursor.execute('''
        SELECT id, title, date, location, doctor 
        FROM appointments 
        WHERE user_id = ?
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    # Format appointments for FullCalendar
    events = []
    for apt in appointments:
        events.append({
            'id': apt['id'],
            'title': apt['title'],
            'start': apt['date'],
            'description': f"Doctor: {apt['doctor']}\nLocation: {apt['location']}",
            'backgroundColor': '#4CAF50' if datetime.strptime(apt['date'], '%Y-%m-%d %H:%M:%S') > datetime.now() else '#999'
        })
    
    return jsonify(events)

@app.route('/notify', methods=['POST'])
@login_required
def send_notification():
    try:
        message = request.form.get('message')
        notification_type = request.form.get('type', 'info')
        
        # Here you could also implement push notifications
        # or store notifications in the database
        
        return jsonify({
            'success': True,
            'message': 'Notification sent successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/add_transportation', methods=['POST'])
@login_required
def add_transportation():
    try:
        pickup_location = request.form.get('pickup_location')
        destination = request.form.get('destination')
        pickup_time = request.form.get('pickup_time')
        special_needs = request.form.get('special_needs')
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO transportation_requests 
            (user_id, pickup_location, destination, pickup_time, special_needs, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session['user_id'], pickup_location, destination, pickup_time, 
              special_needs, 'pending'))
        
        ride_id = cursor.lastrowid
        
        # Fetch the newly created ride
        ride = cursor.execute('''
            SELECT * FROM transportation_requests WHERE id = ?
        ''', (ride_id,)).fetchone()
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Transportation request submitted successfully',
            'ride': {
                'id': ride['id'],
                'pickup_location': ride['pickup_location'],
                'destination': ride['destination'],
                'pickup_time': ride['pickup_time'],
                'special_needs': ride['special_needs'],
                'status': ride['status']
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

if __name__ == '__main__':
    database.init_db()
    app.run(debug=True) 