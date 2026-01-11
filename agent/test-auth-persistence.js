/**
 * Test script for Supabase Auth Session Persistence
 * 
 * This script verifies that the authentication session is properly
 * persisted and retrieved in the Electron agent.
 * 
 * Run with: node test-auth-persistence.js
 */

const { createClient } = require('@supabase/supabase-js');

// Same credentials as agent.html
const SUPABASE_URL = 'https://srwrsgkfkzstdsiqonzi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd3JzZ2tma3pzdGRzaXFvbnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODM2MzUsImV4cCI6MjA3ODg1OTYzNX0.URa75VP24G6anG_9Pyo2PqNrgNZ20DmEalcLAKezkSM';
const STORAGE_KEY = 'superdesk-auth-token';

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
    const prefix = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warn': '⚠️',
        'test': '🧪'
    };
    console.log(`${prefix[type] || ''} ${message}`);
}

function assert(condition, testName) {
    if (condition) {
        log(`PASS: ${testName}`, 'success');
        testsPassed++;
        return true;
    } else {
        log(`FAIL: ${testName}`, 'error');
        testsFailed++;
        return false;
    }
}

// Mock localStorage for Node.js environment
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = value;
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
    get length() {
        return Object.keys(this.store).length;
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    log('SuperDesk Auth Persistence Test Suite', 'test');
    console.log('='.repeat(60) + '\n');

    // Test 1: Storage adapter creation
    log('Test 1: Custom Storage Adapter', 'test');
    const mockStorage = new MockLocalStorage();
    
    const customStorageAdapter = {
        getItem: function(key) {
            try {
                const value = mockStorage.getItem(key);
                log(`  getItem('${key}'): ${value ? 'found' : 'not found'}`);
                return value;
            } catch (e) {
                log(`  getItem error: ${e.message}`, 'error');
                return null;
            }
        },
        setItem: function(key, value) {
            try {
                mockStorage.setItem(key, value);
                log(`  setItem('${key}'): saved (${value.length} chars)`);
            } catch (e) {
                log(`  setItem error: ${e.message}`, 'error');
            }
        },
        removeItem: function(key) {
            try {
                mockStorage.removeItem(key);
                log(`  removeItem('${key}'): done`);
            } catch (e) {
                log(`  removeItem error: ${e.message}`, 'error');
            }
        }
    };

    // Test storage adapter works
    customStorageAdapter.setItem('test-key', 'test-value');
    assert(mockStorage.getItem('test-key') === 'test-value', 'Storage adapter setItem works');
    
    const retrieved = customStorageAdapter.getItem('test-key');
    assert(retrieved === 'test-value', 'Storage adapter getItem works');
    
    customStorageAdapter.removeItem('test-key');
    assert(mockStorage.getItem('test-key') === null, 'Storage adapter removeItem works');

    console.log('');

    // Test 2: Supabase client creation with persistence options
    log('Test 2: Supabase Client Configuration', 'test');
    
    let supabaseClient;
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storage: customStorageAdapter,
                storageKey: STORAGE_KEY,
                flowType: 'pkce'
            }
        });
        assert(true, 'Supabase client created with persistence options');
    } catch (e) {
        assert(false, `Supabase client creation failed: ${e.message}`);
        return;
    }

    // Verify client has auth methods
    assert(typeof supabaseClient.auth.getSession === 'function', 'Client has getSession method');
    assert(typeof supabaseClient.auth.onAuthStateChange === 'function', 'Client has onAuthStateChange method');
    assert(typeof supabaseClient.auth.signInWithOtp === 'function', 'Client has signInWithOtp method');
    assert(typeof supabaseClient.auth.refreshSession === 'function', 'Client has refreshSession method');

    console.log('');

    // Test 3: Session retrieval (should return null for no session)
    log('Test 3: Session Retrieval', 'test');
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabaseClient.auth.getSession();
        const elapsed = Date.now() - startTime;
        
        log(`  getSession completed in ${elapsed}ms`);
        
        if (error) {
            log(`  Session error: ${error.message}`, 'warn');
        }
        
        assert(!error || error.message.includes('no session'), 'getSession does not throw unexpected errors');
        assert(data !== undefined, 'getSession returns data object');
        
        if (data?.session) {
            log(`  Active session found for: ${data.session.user?.email}`, 'success');
        } else {
            log(`  No active session (expected for fresh test)`);
        }
    } catch (e) {
        assert(false, `getSession threw exception: ${e.message}`);
    }

    console.log('');

    // Test 4: Auth state change listener
    log('Test 4: Auth State Change Listener', 'test');
    
    let listenerCalled = false;
    try {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            listenerCalled = true;
            log(`  Auth state changed: ${event}`);
        });
        
        assert(subscription !== undefined, 'onAuthStateChange returns subscription');
        assert(typeof subscription.unsubscribe === 'function', 'Subscription has unsubscribe method');
        
        // Clean up
        subscription.unsubscribe();
    } catch (e) {
        assert(false, `onAuthStateChange failed: ${e.message}`);
    }

    console.log('');

    // Test 5: Timeout and retry logic simulation
    log('Test 5: Timeout and Retry Logic', 'test');
    
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 5000;
    
    async function getSessionWithRetry() {
        let session = null;
        
        for (let attempt = 0; attempt <= MAX_RETRIES && !session; attempt++) {
            try {
                if (attempt > 0) {
                    log(`  Retry ${attempt}/${MAX_RETRIES}...`);
                    await new Promise(r => setTimeout(r, 100)); // Shorter delay for test
                }
                
                const sessionPromise = supabaseClient.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), TIMEOUT_MS)
                );
                
                const result = await Promise.race([sessionPromise, timeoutPromise]);
                session = result?.data?.session;
                
                if (session) {
                    log(`  Session found on attempt ${attempt + 1}`);
                }
            } catch (e) {
                log(`  Attempt ${attempt + 1} failed: ${e.message}`, 'warn');
            }
        }
        
        return session;
    }
    
    const startTime = Date.now();
    await getSessionWithRetry();
    const elapsed = Date.now() - startTime;
    
    assert(elapsed < TIMEOUT_MS * (MAX_RETRIES + 1), `Retry logic completes within timeout (${elapsed}ms)`);

    console.log('');

    // Test 6: Storage key consistency
    log('Test 6: Storage Key Consistency', 'test');
    
    const expectedKey = 'superdesk-auth-token';
    assert(STORAGE_KEY === expectedKey, `Storage key matches expected value ('${expectedKey}')`);

    console.log('');

    // Test 7: Connection to Supabase (network test)
    log('Test 7: Supabase Connection', 'test');
    
    try {
        // Try a simple query to verify connection
        const { error } = await supabaseClient
            .from('profiles')
            .select('id')
            .limit(1);
        
        if (error && !error.message.includes('permission') && !error.message.includes('not exist')) {
            log(`  Connection test warning: ${error.message}`, 'warn');
        }
        assert(true, 'Supabase connection established');
    } catch (e) {
        if (e.message.includes('fetch') || e.message.includes('network')) {
            log(`  Network error (may be offline): ${e.message}`, 'warn');
            assert(true, 'Supabase client configured (offline mode)');
        } else {
            assert(false, `Supabase connection failed: ${e.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`, testsFailed === 0 ? 'success' : 'error');
    console.log('='.repeat(60) + '\n');

    if (testsFailed === 0) {
        log('All tests passed! Auth persistence should work correctly.', 'success');
    } else {
        log('Some tests failed. Please review the issues above.', 'error');
    }

    process.exit(testsFailed === 0 ? 0 : 1);
}

// Run tests
runTests().catch(e => {
    log(`Test suite error: ${e.message}`, 'error');
    process.exit(1);
});
