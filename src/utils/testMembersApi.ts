import app from '../app';
import { connectDatabase } from '../config/db';
import mongoose from 'mongoose';
import { Server } from 'http';

const PORT = 5006;
const BASE_URL = `http://localhost:${PORT}/api`;

let server: Server;

const runMemberTests = async () => {
  console.log('🧪 Starting PRD Member API Verification Tests...\n');
  await connectDatabase();

  server = app.listen(PORT);
  console.log(`[Test Server] Listening on port ${PORT}`);

  try {
    // 1. Authenticate users
    console.log('--- 1. Authenticating test users ---');
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@taskflow.dev', password: 'Admin123!' }),
    });
    const adminData = (await adminRes.json()) as any;
    const adminToken = adminData.data?.token;
    const adminUser = adminData.data?.user;

    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@taskflow.dev', password: 'Manager123!' }),
    });
    const mgrData = (await mgrRes.json()) as any;
    const mgrToken = mgrData.data?.token;
    const mgrUser = mgrData.data?.user;

    const memRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@taskflow.dev', password: 'Member123!' }),
    });
    const memData = (await memRes.json()) as any;
    const memToken = memData.data?.token;
    const memUser = memData.data?.user;

    const alexRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@taskflow.dev', password: 'Alex123!' }),
    });
    const alexData = (await alexRes.json()) as any;
    const alexToken = alexData.data?.token;
    const alexUser = alexData.data?.user;

    if (!adminToken || !mgrToken || !memToken || !alexToken) {
      throw new Error('Failed to obtain authentication tokens');
    }
    console.log('✅ Tokens obtained for all roles');

    // 2. Feature A: GET /api/members (List Team Members)
    console.log('\n--- 2. Testing Feature A: GET /api/members (List Team Members) ---');
    const membersRes = await fetch(`${BASE_URL}/members?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const membersData = (await membersRes.json()) as any;
    console.log('Admin listing members status:', membersRes.status, 'Total:', membersData.pagination?.total);
    if (membersRes.status !== 200 || !membersData.success || !Array.isArray(membersData.data)) {
      throw new Error('GET /api/members failed for admin');
    }

    // Verify expected fields and NO sensitive fields
    const sampleMember = membersData.data[0];
    console.log('Sample member returned:', {
      id: sampleMember.id,
      name: sampleMember.name,
      email: sampleMember.email,
      role: sampleMember.role,
      joinedAt: sampleMember.joinedAt,
    });
    if (!sampleMember.id || !sampleMember.name || !sampleMember.email || !sampleMember.role) {
      throw new Error('Member response missing required fields');
    }
    if (sampleMember.password || sampleMember.passwordResetToken || sampleMember.__v) {
      throw new Error('Sensitive authentication fields leaked in member response!');
    }

    // Test Search filter
    console.log('\nTesting search parameter on /api/members...');
    const searchRes = await fetch(`${BASE_URL}/members?search=Sarah`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = (await searchRes.json()) as any;
    console.log('Search "Sarah" count:', searchData.data?.length);
    if (searchRes.status !== 200 || !searchData.data.some((m: any) => m.name.includes('Sarah'))) {
      throw new Error('Search filter failed');
    }

    // Test Role filter
    console.log('\nTesting role filter on /api/members...');
    const roleRes = await fetch(`${BASE_URL}/members?role=ADMIN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roleData = (await roleRes.json()) as any;
    console.log('Role "ADMIN" count:', roleData.data?.length);
    if (roleRes.status !== 200 || roleData.data.some((m: any) => m.role !== 'ADMIN')) {
      throw new Error('Role filter failed');
    }

    // Test Pagination
    console.log('\nTesting pagination on /api/members...');
    const pageRes = await fetch(`${BASE_URL}/members?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pageData = (await pageRes.json()) as any;
    console.log('Pagination limit 2 count:', pageData.data?.length, 'Pagination meta:', pageData.pagination);
    if (pageRes.status !== 200 || pageData.data.length > 2 || pageData.pagination.limit !== 2) {
      throw new Error('Pagination failed');
    }

    // 3. Feature B: GET /api/members/:userId (View Member Profile)
    console.log('\n--- 3. Testing Feature B: GET /api/members/:userId (View Member Profile) ---');
    const profileRes = await fetch(`${BASE_URL}/members/${adminUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const profileData = (await profileRes.json()) as any;
    console.log('Profile retrieval status:', profileRes.status, 'Profile Name:', profileData.data?.name);
    if (profileRes.status !== 200 || !profileData.success || profileData.data.id !== adminUser.id) {
      throw new Error('Profile retrieval failed');
    }
    if (profileData.data.password || profileData.data.passwordResetToken) {
      throw new Error('Sensitive fields leaked in member profile!');
    }

    // Non-existent member -> 404
    console.log('\nTesting 404 for non-existent member profile...');
    const nonExistentRes = await fetch(`${BASE_URL}/members/000000000000000000000000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Non-existent member status:', nonExistentRes.status);
    if (nonExistentRes.status !== 404) {
      throw new Error('Expected 404 for non-existent member profile');
    }

    // Unauthenticated access -> 401
    console.log('\nTesting 401 for unauthenticated profile request...');
    const unauthRes = await fetch(`${BASE_URL}/members/${adminUser.id}`);
    console.log('Unauthenticated status:', unauthRes.status);
    if (unauthRes.status !== 401) {
      throw new Error('Expected 401 for unauthenticated request');
    }

    // 4. Feature C, D, E: Project membership setup for role testing & last-admin protection
    console.log('\n--- 4. Testing Project Setup for Member Roles & Safeguards ---');
    // Create dedicated test project by Admin
    const createProjRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Role Safeguards Test Project',
        description: 'Testing last administrator and role updates',
        status: 'ACTIVE',
      }),
    });
    const testProj = ((await createProjRes.json()) as any).data;
    const testProjId = testProj.id;
    console.log('Created project ID:', testProjId);

    // Add managerUser as MANAGER
    const addMgrRes = await fetch(`${BASE_URL}/projects/${testProjId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: mgrUser.id, role: 'MANAGER' }),
    });
    console.log('Add manager status:', addMgrRes.status);
    if (addMgrRes.status !== 201) throw new Error('Add manager failed');

    // Add memberUser as MEMBER
    const addMemRes = await fetch(`${BASE_URL}/projects/${testProjId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: memUser.id, role: 'MEMBER' }),
    });
    console.log('Add member status:', addMemRes.status);
    if (addMemRes.status !== 201) throw new Error('Add member failed');

    // Test Duplicate Member -> 409 Conflict
    console.log('\nTesting duplicate member add (expect 409 Conflict)...');
    const dupRes = await fetch(`${BASE_URL}/projects/${testProjId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: memUser.id, role: 'MEMBER' }),
    });
    console.log('Duplicate member status:', dupRes.status);
    if (dupRes.status !== 409) throw new Error('Expected 409 for duplicate member');

    // 5. Feature C: Change Member Role & Authorization
    console.log('\n--- 5. Testing Feature C: Change Member Role ---');
    // Admin promotes memberUser from MEMBER to MANAGER
    const promoteRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${memUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'MANAGER' }),
    });
    const promoteData = (await promoteRes.json()) as any;
    console.log('Promote member to MANAGER status:', promoteRes.status, 'New role:', promoteData.data?.role);
    if (promoteRes.status !== 200 || promoteData.data.role !== 'MANAGER' || promoteData.data.member?.role !== 'MANAGER') {
      throw new Error('Promote member failed');
    }

    // Invalid role validation -> 400 Bad Request
    console.log('\nTesting invalid role validation (expect 400)...');
    const invalidRoleRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${memUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'SUPER_HERO' }),
    });
    console.log('Invalid role status:', invalidRoleRes.status);
    if (invalidRoleRes.status !== 400) throw new Error('Expected 400 for invalid role');

    // Unauthorized user (MEMBER) attempts to change role -> 403 Forbidden
    console.log('\nTesting unauthorized role change by standard MEMBER (expect 403)...');
    const unauthRoleRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${mgrUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    console.log('Unauthorized role update status:', unauthRoleRes.status);
    if (unauthRoleRes.status !== 403) throw new Error('Expected 403 for unauthorized role change');

    // 6. Safeguards: Last Administrator Protection
    console.log('\n--- 6. Testing Last Administrator Protection ---');
    // adminUser is currently the ONLY ADMIN in testProj.
    // Attempting to demote adminUser to MEMBER should be rejected with 400!
    console.log('Attempting to demote the ONLY admin of project to MEMBER (expect 400)...');
    const demoteLastAdminRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${adminUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'MEMBER' }),
    });
    const demoteLastAdminData = (await demoteLastAdminRes.json()) as any;
    console.log('Demote last admin status:', demoteLastAdminRes.status, 'Message:', demoteLastAdminData.message);
    if (demoteLastAdminRes.status !== 400) {
      throw new Error('Expected 400 when attempting to demote last administrator');
    }

    // Attempting to remove the ONLY admin from the project -> 400
    console.log('\nAttempting to remove the project owner/admin (expect 400)...');
    const removeOwnerRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${adminUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const removeOwnerData = (await removeOwnerRes.json()) as any;
    console.log('Remove owner status:', removeOwnerRes.status, 'Message:', removeOwnerData.message);
    if (removeOwnerRes.status !== 400) {
      throw new Error('Expected 400 when attempting to remove project owner/admin');
    }

    // Add another ADMIN to the project
    console.log('\nAdding second admin to project...');
    const addSecondAdminRes = await fetch(`${BASE_URL}/projects/${testProjId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: alexUser.id, role: 'ADMIN' }),
    });
    console.log('Add second admin status:', addSecondAdminRes.status);
    if (addSecondAdminRes.status !== 201) throw new Error('Add second admin failed');

    // Now that there are 2 admins, alexUser can be demoted to MANAGER
    console.log('Demoting second admin (now 2 admins exist, expect 200)...');
    const demoteSecondAdminRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${alexUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'MANAGER' }),
    });
    console.log('Demote second admin status:', demoteSecondAdminRes.status);
    if (demoteSecondAdminRes.status !== 200) throw new Error('Demote second admin should have succeeded');

    // Remove alexUser
    const removeAlexRes = await fetch(`${BASE_URL}/projects/${testProjId}/members/${alexUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Remove member status:', removeAlexRes.status);
    if (removeAlexRes.status !== 200) throw new Error('Remove member should have succeeded');

    // Cleanup test project
    console.log('\nCleaning up test project...');
    const delProjRes = await fetch(`${BASE_URL}/projects/${testProjId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Cleanup project status:', delProjRes.status);

    console.log('\n======================================================');
    console.log('🎉 ALL PRD TEAM MEMBER API TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

runMemberTests();
