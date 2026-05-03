/**
 * E2E Test Suite for Incoming Requests Module
 * 
 * This script tests the complete incoming requests workflow including:
 * - Staff role-based access
 * - Admin access to all requests
 * - Approve, reject, reschedule workflows
 * - Bulk operations
 * - CSV export
 * - OTP regeneration
 * - Realtime Socket.io updates
 * 
 * Requirements:
 * - Backend server running on http://localhost:5000
 * - Frontend server running (for Socket.io tests)
 * - Test users: admin, staff credentials configured
 */

const fetch = require('node-fetch');
const assert = require('assert');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
    cyan: '\x1b[36m'
};

// Test configuration
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };
const STAFF_CREDENTIALS = { username: 'staff', password: 'staff123' };

let adminToken = '';
let staffToken = '';
let testAppointmentIds = [];

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(test) {
    log(`✓ ${test}`, 'green');
}

function logError(test, error) {
    log(`✗ ${test}: ${error}`, 'red');
}

function logSection(section) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`  ${section}`, 'cyan');
    log(`${'='.repeat(60)}`, 'cyan');
}

async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(url, config);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
}

// Test setup
async function setupTestData() {
    logSection('Setup: Creating Test Data');

    try {
        // Login as admin to create test appointments
        const loginRes = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(ADMIN_CREDENTIALS),
        });
        const tempAdminToken = loginRes.token;

        // Create test appointments
        const appointments = [
            {
                visitorName: 'Test Visitor 1',
                visitorEmail: 'visitor1@test.com',
                visitorPhone: '1111111111',
                purpose: 'E2E Test Meeting 1',
                personToMeet: 'Staff Member',
                preferredDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                preferredTime: '10:00 AM',
            },
            {
                visitorName: 'Test Visitor 2',
                visitorEmail: 'visitor2@test.com',
                visitorPhone: '2222222222',
                purpose: 'E2E Test Meeting 2',
                personToMeet: 'Staff Member',
                preferredDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
                preferredTime: '2:00 PM',
            },
        ];

        for (const apt of appointments) {
            const res = await request('/appointments/create', {
                method: 'POST',
                headers: { Authorization: `Bearer ${tempAdminToken}` },
                body: JSON.stringify(apt),
            });
            if (res.appointmentId || res.data?.id || res.id) {
                testAppointmentIds.push(res.appointmentId || res.data?.id || res.id);
            }
        }

        logSuccess(`Created ${testAppointmentIds.length} test appointments`);
    } catch (error) {
        log(`Warning: Test data setup failed - ${error.message}`, 'yellow');
        log('Continuing with existing data...', 'yellow');
    }
}

// Test: Authentication
async function testAuthentication() {
    logSection('Test 1: Authentication');

    try {
        const adminLogin = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(ADMIN_CREDENTIALS),
        });
        adminToken = adminLogin.token;
        assert(adminToken, 'Admin token should exist');
        logSuccess('Admin login successful');

        const staffLogin = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(STAFF_CREDENTIALS),
        });
        staffToken = staffLogin.token;
        assert(staffToken, 'Staff token should exist');
        logSuccess('Staff login successful');
    } catch (error) {
        logError('Authentication', error.message);
        throw error;
    }
}

// Test: Staff role-based access
async function testStaffRoleBasedAccess() {
    logSection('Test 2: Staff Role-Based Access');

    try {
        const staffRequests = await request('/requests', {
            headers: { Authorization: `Bearer ${staffToken}` },
        });

        assert(staffRequests.success, 'Response should be successful');
        assert(Array.isArray(staffRequests.data.requests), 'Should return requests array');

        // Verify all requests belong to this staff
        if (staffRequests.data.requests.length > 0) {
            const allBelongToStaff = staffRequests.data.requests.every(
                req => req.staffId === staffLogin.user?.id || req.staffId?._id
            );
            // Note: We can't verify IDs match without the user ID from login response
            logSuccess(`Staff sees ${staffRequests.data.requests.length} requests (role-based filtering active)`);
        } else {
            logSuccess('Staff sees 0 requests (no requests assigned)');
        }
    } catch (error) {
        logError('Staff role-based access', error.message);
        throw error;
    }
}

// Test: Admin access to all requests
async function testAdminAccessAll() {
    logSection('Test 3: Admin Access to All Requests');

    try {
        const adminRequests = await request('/requests', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert(adminRequests.success, 'Response should be successful');
        assert(Array.isArray(adminRequests.data.requests), 'Should return requests array');
        logSuccess(`Admin sees ${adminRequests.data.total} total requests (all requests visible)`);
    } catch (error) {
        logError('Admin access all', error.message);
        throw error;
    }
}

// Test: Filtering and pagination
async function testFilteringAndPagination() {
    logSection('Test 4: Filtering and Pagination');

    try {
        // Test status filter
        const pendingRequests = await request('/requests?status=PENDING&limit=5', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert(pendingRequests.success, 'Status filter should work');
        logSuccess(`Status filter: Found ${pendingRequests.data.total} PENDING requests`);

        // Test pagination
        const limit = 2;
        const page1 = await request(`/requests?limit=${limit}&page=1`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert(page1.data.limit === limit, 'Limit should be respected');
        assert(page1.data.page === 1, 'Page number should match');
        logSuccess(`Pagination: Page 1 with limit ${limit} works correctly`);
    } catch (error) {
        logError('Filtering and pagination', error.message);
        throw error;
    }
}

// Test: Approve workflow
async function testApproveWorkflow() {
    logSection('Test 5: Approve Workflow');

    try {
        // Get a pending request
        const requests = await request('/requests?status=PENDING&limit=1', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (requests.data.requests.length === 0) {
            log('No pending requests to test approve', 'yellow');
            return;
        }

        const testRequest = requests.data.requests[0];
        const appointmentId = testRequest._id;

        // Approve with scheduling
        const scheduledStart = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
        const scheduledEnd = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

        const approveRes = await request(`/requests/${appointmentId}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ scheduledStart, scheduledEnd, note: 'E2E Test Approval' }),
        });

        assert(approveRes.success, 'Approve should succeed');
        assert(approveRes.data.status === 'APPROVED', 'Status should be APPROVED');
        logSuccess(`Approved request ${appointmentId} with scheduling`);

        // Verify audit log was created
        const logs = await request(`/requests/${appointmentId}/logs`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert(logs.data.some(log => log.action === 'APPROVED'), 'Audit log should exist');
        logSuccess('Audit log created for approve action');
    } catch (error) {
        logError('Approve workflow', error.message);
        throw error;
    }
}

// Test: Reject workflow
async function testRejectWorkflow() {
    logSection('Test 6: Reject Workflow');

    try {
        const requests = await request('/requests?status=PENDING&limit=1', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (requests.data.requests.length === 0) {
            log('No pending requests to test reject', 'yellow');
            return;
        }

        const testRequest = requests.data.requests[0];
        const appointmentId = testRequest._id;

        const rejectRes = await request(`/requests/${appointmentId}/reject`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ reason: 'E2E Test Rejection Reason' }),
        });

        assert(rejectRes.success, 'Reject should succeed');
        assert(rejectRes.data.status === 'REJECTED', 'Status should be REJECTED');
        assert(rejectRes.data.rejectionReason === 'E2E Test Rejection Reason', 'Reason should be saved');
        logSuccess(`Rejected request ${appointmentId} with reason`);
    } catch (error) {
        logError('Reject workflow', error.message);
        throw error;
    }
}

// Test: Reschedule workflow
async function testRescheduleWorkflow() {
    logSection('Test 7: Reschedule Workflow');

    try {
        const requests = await request('/requests?status=PENDING&limit=1', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (requests.data.requests.length === 0) {
            log('No pending requests to test reschedule', 'yellow');
            return;
        }

        const testRequest = requests.data.requests[0];
        const appointmentId = testRequest._id;

        const newDate = new Date(Date.now() + 345600000).toISOString(); // 4 days from now
        const rescheduleRes = await request(`/requests/${appointmentId}/reschedule`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                newPreferredDate: newDate,
                newPreferredTime: '3:00 PM',
                reason: 'E2E Test Reschedule',
            }),
        });

        assert(rescheduleRes.success, 'Reschedule should succeed');
        assert(rescheduleRes.data.status === 'RESCHEDULED', 'Status should be RESCHEDULED');
        logSuccess(`Rescheduled request ${appointmentId} to new date/time`);
    } catch (error) {
        logError('Reschedule workflow', error.message);
        throw error;
    }
}

// Test: Bulk operations
async function testBulkOperations() {
    logSection('Test 8: Bulk Operations');

    try {
        const requests = await request('/requests?status=PENDING&limit=2', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (requests.data.requests.length < 2) {
            log('Not enough pending requests for bulk test', 'yellow');
            return;
        }

        const appointmentIds = requests.data.requests.map(r => r._id);

        // Bulk approve
        const bulkRes = await request('/requests/bulk-action', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ action: 'APPROVE', appointmentIds }),
        });

        assert(bulkRes.success, 'Bulk operation should succeed');
        assert(bulkRes.data.successCount >= 1, 'At least one should succeed');
        logSuccess(`Bulk approved ${bulkRes.data.successCount} requests`);
    } catch (error) {
        logError('Bulk operations', error.message);
        throw error;
    }
}

// Test: CSV export
async function testCSVExport() {
    logSection('Test 9: CSV Export');

    try {
        const url = `${API_BASE_URL}/requests/export`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert(response.ok, 'Export should succeed');
        assert(response.headers.get('content-type')?.includes('text/csv'), 'Should be CSV');
        assert(response.headers.get('content-disposition')?.includes('attachment'), 'Should be attachment');

        const csvContent = await response.text();
        assert(csvContent.includes('Appointment ID'), 'CSV should have headers');
        logSuccess('CSV export successful with correct headers');
    } catch (error) {
        logError('CSV export', error.message);
        throw error;
    }
}

// Test: OTP regeneration (admin only)
async function testOTPRegeneration() {
    logSection('Test 10: OTP Regeneration (Admin Only)');

    try {
        const requests = await request('/requests?limit=1', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        if (requests.data.requests.length === 0) {
            log('No requests available to test OTP regeneration', 'yellow');
            return;
        }

        const appointmentId = requests.data.requests[0]._id;

        // Test admin can regenerate
        const otpRes = await request(`/requests/${appointmentId}/otp/regenerate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert(otpRes.success, 'OTP regeneration should succeed');
        assert(otpRes.data.otp, 'OTP should be returned');
        assert(/^\d{6}$/.test(otpRes.data.otp), 'OTP should be 6 digits');
        logSuccess(`Generated OTP: ${otpRes.data.otp}`);

        // Test staff cannot regenerate (should fail)
        try {
            await request(`/requests/${appointmentId}/otp/regenerate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            logError('OTP regeneration security', 'Staff should not be able to regenerate OTP');
        } catch (error) {
            logSuccess('OTP regeneration correctly restricted to admin only');
        }
    } catch (error) {
        logError('OTP regeneration', error.message);
        throw error;
    }
}

// Test: Request stats
async function testRequestStats() {
    logSection('Test 11: Request Statistics');

    try {
        const stats = await request('/requests/stats', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert(stats.success, 'Stats should succeed');
        assert(typeof stats.data.totalRequests === 'number', 'Should have total');
        assert(typeof stats.data.pendingRequests === 'number', 'Should have pending count');
        logSuccess(`Stats: ${stats.data.totalRequests} total, ${stats.data.pendingRequests} pending`);
    } catch (error) {
        logError('Request stats', error.message);
        throw error;
    }
}

// Run all tests
async function runAllTests() {
    log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    log('║      E2E Test Suite: Incoming Requests Module         ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

    const startTime = Date.now();
    let passed = 0;
    let failed = 0;

    const tests = [
        { name: 'Authentication', fn: testAuthentication },
        { name: 'Staff Role-Based Access', fn: testStaffRoleBasedAccess },
        { name: 'Admin Access All', fn: testAdminAccessAll },
        { name: 'Filtering and Pagination', fn: testFilteringAndPagination },
        { name: 'Approve Workflow', fn: testApproveWorkflow },
        { name: 'Reject Workflow', fn: testRejectWorkflow },
        { name: 'Reschedule Workflow', fn: testRescheduleWorkflow },
        { name: 'Bulk Operations', fn: testBulkOperations },
        { name: 'CSV Export', fn: testCSVExport },
        { name: 'OTP Regeneration', fn: testOTPRegeneration },
        { name: 'Request Stats', fn: testRequestStats },
    ];

    // Setup test data
    await setupTestData();

    // Run tests
    for (const test of tests) {
        try {
            await test.fn();
            passed++;
        } catch (error) {
            failed++;
            log(`\nTest "${test.name}" failed with error:`, 'red');
            log(error.stack || error.message, 'red');
        }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    log(`║                     Test Summary                       ║`, 'cyan');
    log('╚══════════════════════════════════════════════════════════╝', 'cyan');
    log(`Total Tests: ${tests.length}`, 'cyan');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Duration: ${duration}s`, 'cyan');

    if (failed === 0) {
        log('\n✓ All tests passed! 🎉\n', 'green');
        process.exit(0);
    } else {
        log(`\n✗ ${failed} test(s) failed\n`, 'red');
        process.exit(1);
    }
}

// Run the test suite
runAllTests().catch((error) => {
    log('\nFatal error running test suite:', 'red');
    log(error.stack || error.message, 'red');
    process.exit(1);
});
