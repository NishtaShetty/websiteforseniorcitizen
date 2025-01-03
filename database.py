import sqlite3

def get_db_connection():
    conn = sqlite3.connect('granlink.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Drop existing tables to start fresh
    cursor.execute('DROP TABLE IF EXISTS medications')
    cursor.execute('DROP TABLE IF EXISTS appointments')
    cursor.execute('DROP TABLE IF EXISTS emergency_contacts')
    cursor.execute('DROP TABLE IF EXISTS transportation_requests')
    cursor.execute('DROP TABLE IF EXISTS users')
    
    # Create users table with created_at field
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create medications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            frequency TEXT NOT NULL,
            next_dose DATETIME NOT NULL,
            daily_doses INTEGER NOT NULL DEFAULT 1,
            doses_taken INTEGER NOT NULL DEFAULT 0,
            last_taken DATETIME,
            taken BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create appointments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            doctor TEXT NOT NULL,
            location TEXT NOT NULL,
            date DATETIME NOT NULL,
            notes TEXT,
            latitude REAL,
            longitude REAL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create emergency_contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            relationship TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create transportation_requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transportation_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pickup_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            pickup_time DATETIME NOT NULL,
            special_needs TEXT,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def add_special_needs_column():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE transportation_requests ADD COLUMN special_needs TEXT')
        conn.commit()
    except sqlite3.OperationalError:
        # Column might already exist
        pass
    finally:
        conn.close()

def add_taken_column():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE medications ADD COLUMN taken BOOLEAN DEFAULT 0')
        conn.commit()
    except sqlite3.OperationalError:
        # Column might already exist
        pass
    finally:
        conn.close()

def add_created_at_column():
    """Add created_at column to users table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            ALTER TABLE users 
            ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ''')
        conn.commit()
    except sqlite3.OperationalError:
        # Column might already exist
        pass
    finally:
        conn.close() 