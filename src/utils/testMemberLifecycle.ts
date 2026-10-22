import app from '../app';
import { connectDatabase } from '../config/db';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Server } from 'http';

const PORT = 5008;
const BASE_URL = `http://localhost:${PORT}/api`;

let server: Server;

const runLifecycleTests = async () => {
  console.log('🧪 Starting Full Member Lifecycle API Tests (Add, Update, Status, Delete)...\n');
  await connectDatabase();

  server = app.listen(PORT);
  console.log(`[Test Server] Listening on port ${PORT}`);

  try {
    // 1. Login as Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@taskflow.dev', password: 'Admin123!' }),
    });
    const adminData = (await adminRes.json()) as any;
    const adminToken = adminData.data?.token;

    const testEmail = `lifecycle_test_${Date.now()}@taskflow.dev`;

    // 2. ADD: POST /api/members
    console.log('\n--- 1. Testing ADD: POST /api/members ---');
    const addRes = await fetch(`${BASE_URL}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: testEmail,
        name: 'Rachel Green',
        role: 'MEMBER',
      }),
    });
    const addData = (await addRes.json()) as any;
    console.log('Add Status:', addRes.status, 'Member Name:', addData.data?.name, 'Status:', addData.data?.status);
    if (addRes.status !== 201 || !addData.data?.id || addData.data?.status !== 'ACTIVE') {
      throw new Error('Failed to add member directly to system');
    }
    const memberId = addData.data.id;

    // 3. UPDATE: PATCH /api/members/:userId (Name & Role)
    console.log('\n--- 2. Testing UPDATE: PATCH /api/members/:userId ---');
    const updateRes = await fetch(`${BASE_URL}/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Rachel Geller-Green',
        role: 'MANAGER',
      }),
    });
    const updateData = (await updateRes.json()) as any;
    console.log('Update Status:', updateRes.status, 'Updated Name:', updateData.data?.name, 'Role:', updateData.data?.role);
    if (updateRes.status !== 200 || updateData.data?.role !== 'MANAGER' || updateData.data?.name !== 'Rachel Geller-Green') {
      throw new Error('Failed to update member name and role');
    }

    // 4. ACTIVE / INACTIVE: PATCH /api/members/:userId/status
    console.log('\n--- 3. Testing INACTIVE: PATCH /api/members/:userId/status ---');
    const inactiveRes = await fetch(`${BASE_URL}/members/${memberId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const inactiveData = (await inactiveRes.json()) as any;
    console.log('Inactive Status:', inactiveRes.status, 'New Member Status:', inactiveData.data?.status);
    if (inactiveRes.status !== 200 || inactiveData.data?.status !== 'INACTIVE') {
      throw new Error('Failed to deactivate member');
    }

    // Toggle back to ACTIVE
    console.log('\n--- 4. Testing REACTIVE: PATCH /api/members/:userId/status ---');
    const activeRes = await fetch(`${BASE_URL}/members/${memberId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    const activeData = (await activeRes.json()) as any;
    console.log('Reactivate Status:', activeRes.status, 'Member Status:', activeData.data?.status);
    if (activeRes.status !== 200 || activeData.data?.status !== 'ACTIVE') {
      throw new Error('Failed to reactivate member');
    }

    // 5. SAFEGUARD: Deactivating sole admin must fail
    console.log('\n--- 5. Testing Safeguard: Deactivating sole admin (expect 400) ---');
    const adminProfile = await User.findOne({ email: 'admin@taskflow.dev' });
    const deactAdminRes = await fetch(`${BASE_URL}/members/${adminProfile!.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const deactAdminData = (await deactAdminRes.json()) as any;
    console.log('Deactivate Admin Status:', deactAdminRes.status, 'Message:', deactAdminData.message);
    if (deactAdminRes.status !== 400) {
      throw new Error('Expected 400 error when attempting to deactivate last active admin');
    }

    // 6. DELETE: DELETE /api/members/:userId
    console.log('\n--- 6. Testing DELETE: DELETE /api/members/:userId ---');
    const delRes = await fetch(`${BASE_URL}/members/${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delData = (await delRes.json()) as any;
    console.log('Delete Status:', delRes.status, 'Message:', delData.message);
    if (delRes.status !== 200 || !delData.success) {
      throw new Error('Failed to delete member');
    }

    // Verify member no longer exists (404)
    const checkRes = await fetch(`${BASE_URL}/members/${memberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Check Deleted Member Status (expect 404):', checkRes.status);
    if (checkRes.status !== 404) {
      throw new Error('Deleted member was still returned by GET /api/members/:userId');
    }

    console.log('\n=================================================================');
    console.log('🎉 ALL MEMBER LIFECYCLE APIS (ADD, UPDATE, STATUS, DELETE) PASSED!');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

runLifecycleTests();
