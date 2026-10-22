import app from '../app';
import { connectDatabase } from '../config/db';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Server } from 'http';

const PORT = 5007;
const BASE_URL = `http://localhost:${PORT}/api`;

let server: Server;

const runSystemMemberTest = async () => {
  console.log('🧪 Testing POST /api/members (Direct System Member Addition)...\n');
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

    // 2. Login as regular Member
    const memRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@taskflow.dev', password: 'Member123!' }),
    });
    const memData = (await memRes.json()) as any;
    const memToken = memData.data?.token;

    // Clean up test user if previously left
    const testEmail = `newmember_${Date.now()}@taskflow.dev`;

    // 3. Test POST /api/members (Admin creates member without projectId)
    console.log(`--- Testing POST /api/members with email: ${testEmail} ---`);
    const createRes = await fetch(`${BASE_URL}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: testEmail,
        name: 'Jordan Belfort',
        role: 'MANAGER',
      }),
    });
    const createData = (await createRes.json()) as any;
    console.log('Status:', createRes.status, 'Created Member:', createData.data?.name, 'Role:', createData.data?.role);
    if (createRes.status !== 201 || !createData.success || createData.data?.email !== testEmail) {
      throw new Error(`POST /api/members failed: ${JSON.stringify(createData)}`);
    }
    const createdUserId = createData.data.id;

    // 4. Test duplicate email -> 409 Conflict
    console.log('\n--- Testing duplicate email on /api/members (expect 409) ---');
    const dupRes = await fetch(`${BASE_URL}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: testEmail,
        name: 'Jordan Belfort Duplicate',
        role: 'MEMBER',
      }),
    });
    console.log('Status Duplicate:', dupRes.status);
    if (dupRes.status !== 409) {
      throw new Error('Expected 409 Conflict for duplicate email');
    }

    // 5. Test non-admin/manager member cannot create members -> 403 Forbidden
    console.log('\n--- Testing unauthorized creation by regular MEMBER (expect 403) ---');
    const unauthRes = await fetch(`${BASE_URL}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memToken}`,
      },
      body: JSON.stringify({
        email: `unauthorized_${Date.now()}@taskflow.dev`,
        name: 'Unauthorized User',
        role: 'MEMBER',
      }),
    });
    console.log('Status Unauthorized:', unauthRes.status);
    if (unauthRes.status !== 403) {
      throw new Error('Expected 403 Forbidden for regular member trying to create users');
    }

    // 6. Test retrieving the newly created user in GET /api/members
    console.log('\n--- Testing new member appears in GET /api/members ---');
    const listRes = await fetch(`${BASE_URL}/members?search=Jordan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = (await listRes.json()) as any;
    const found = listData.data?.some((m: any) => m.email === testEmail);
    console.log('Found in member list:', found);
    if (!found) {
      throw new Error('Newly created member did not appear in GET /api/members');
    }

    // Cleanup
    await User.findByIdAndDelete(createdUserId);
    console.log('Cleaned up test user successfully');

    console.log('\n======================================================');
    console.log('✅ POST /api/members TEST PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

runSystemMemberTest();
