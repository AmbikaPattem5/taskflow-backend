import app from '../app';
import { connectDatabase } from '../config/db';
import mongoose from 'mongoose';
import { Server } from 'http';

const PORT = 5005;
const BASE_URL = `http://localhost:${PORT}/api`;

let server: Server;

const runTests = async () => {
  console.log('🚀 Starting API Verification Tests...\n');
  await connectDatabase();

  server = app.listen(PORT);
  console.log(`[Test Server] Listening on port ${PORT}`);

  try {
    let adminToken = '';
    let managerToken = '';
    let memberToken = '';

    // 1. Health check
    console.log('--- 1. Testing GET /api/health ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = (await healthRes.json()) as any;
    console.log('Status:', healthRes.status, 'Response:', healthData);
    if (healthRes.status !== 200 || !healthData.success) throw new Error('Health check failed');

    // 2. Auth Login (Admin)
    console.log('\n--- 2. Testing POST /api/auth/login (Admin) ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@taskflow.dev', password: 'Admin123!' }),
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    console.log('Status:', adminLoginRes.status, 'User:', adminLoginData.data?.user?.email);
    if (adminLoginRes.status !== 200 || !adminLoginData.data?.token) throw new Error('Admin login failed');
    adminToken = adminLoginData.data.token;

    // 3. Auth Login (Manager & Member)
    console.log('\n--- 3. Testing POST /api/auth/login (Manager & Member) ---');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@taskflow.dev', password: 'Manager123!' }),
    });
    const mgrData = (await mgrRes.json()) as any;
    managerToken = mgrData.data.token;

    const memRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@taskflow.dev', password: 'Member123!' }),
    });
    const memData = (await memRes.json()) as any;
    memberToken = memData.data.token;
    console.log('Tokens successfully generated for ADMIN, MANAGER, MEMBER');

    // 4. Auth Me
    console.log('\n--- 4. Testing GET /api/auth/me ---');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = (await meRes.json()) as any;
    console.log('Status:', meRes.status, 'User Name:', meData.data?.user?.name);
    if (meRes.status !== 200) throw new Error('Get me failed');

    // 5. GET /api/projects (with pagination and search)
    console.log('\n--- 5. Testing GET /api/projects ---');
    const projectsRes = await fetch(`${BASE_URL}/projects?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projectsData = (await projectsRes.json()) as any;
    console.log('Status:', projectsRes.status, 'Count:', projectsData.data?.length, 'Total:', projectsData.pagination?.total);
    if (projectsRes.status !== 200 || !projectsData.data?.length) throw new Error('Get projects failed');

    // 6. POST /api/projects
    console.log('\n--- 6. Testing POST /api/projects ---');
    const createProjRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Project via API',
        description: 'Temporary testing project for validation',
        status: 'ACTIVE',
      }),
    });
    const createProjData = (await createProjRes.json()) as any;
    console.log('Status:', createProjRes.status, 'Created ID:', createProjData.data?.id);
    if (createProjRes.status !== 201) throw new Error('Create project failed');
    const testProjectId = createProjData.data.id;

    // 7. GET /api/projects/:id
    console.log('\n--- 7. Testing GET /api/projects/:id ---');
    const projDetailRes = await fetch(`${BASE_URL}/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projDetailData = (await projDetailRes.json()) as any;
    console.log('Status:', projDetailRes.status, 'Project Name:', projDetailData.data?.name);
    if (projDetailRes.status !== 200) throw new Error('Get project detail failed');

    // 8. PATCH /api/projects/:id
    console.log('\n--- 8. Testing PATCH /api/projects/:id ---');
    const patchProjRes = await fetch(`${BASE_URL}/projects/${testProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ description: 'Updated test project description' }),
    });
    const patchProjData = (await patchProjRes.json()) as any;
    console.log('Status:', patchProjRes.status, 'Updated Desc:', patchProjData.data?.description);
    if (patchProjRes.status !== 200) throw new Error('Update project failed');

    // 9. Members API: GET & POST /api/projects/:projectId/members
    console.log('\n--- 9. Testing Project Members APIs ---');
    const addMemberRes = await fetch(`${BASE_URL}/projects/${testProjectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: 'member@taskflow.dev', role: 'MEMBER' }),
    });
    const addMemberData = (await addMemberRes.json()) as any;
    console.log('Status Add Member:', addMemberRes.status, 'Member Name:', addMemberData.data?.user?.name);
    if (addMemberRes.status !== 201) throw new Error('Add member failed');
    const addedMemberUserId = addMemberData.data.user.id;

    const listMembersRes = await fetch(`${BASE_URL}/projects/${testProjectId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listMembersData = (await listMembersRes.json()) as any;
    console.log('Status List Members:', listMembersRes.status, 'Count:', listMembersData.data?.length);
    if (listMembersRes.status !== 200 || listMembersData.data.length < 2) throw new Error('List members failed');

    // 10. PATCH Member Role
    console.log('\n--- 10. Testing PATCH /api/projects/:projectId/members/:userId ---');
    const patchMemberRes = await fetch(`${BASE_URL}/projects/${testProjectId}/members/${addedMemberUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'MANAGER' }),
    });
    const patchMemberData = (await patchMemberRes.json()) as any;
    console.log('Status Update Member Role:', patchMemberRes.status, 'New Role:', patchMemberData.data?.role);
    if (patchMemberRes.status !== 200) throw new Error('Update member role failed');

    // 11. Tasks API: POST & GET /api/projects/:projectId/tasks
    console.log('\n--- 11. Testing Tasks APIs ---');
    const createTaskRes = await fetch(`${BASE_URL}/projects/${testProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Initial Setup Task',
        description: 'Verify system setup',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: addedMemberUserId,
      }),
    });
    const createTaskData = (await createTaskRes.json()) as any;
    console.log('Status Create Task:', createTaskRes.status, 'Task Title:', createTaskData.data?.title);
    if (createTaskRes.status !== 201) throw new Error('Create task failed');
    const createdTaskId = createTaskData.data.id;

    const listTasksRes = await fetch(`${BASE_URL}/projects/${testProjectId}/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listTasksData = (await listTasksRes.json()) as any;
    console.log('Status List Tasks:', listTasksRes.status, 'Tasks count:', listTasksData.data?.length);
    if (listTasksRes.status !== 200 || listTasksData.data.length < 1) throw new Error('List tasks failed');

    // 12. GET /api/tasks/:id & PATCH /api/tasks/:id
    console.log('\n--- 12. Testing GET & PATCH /api/tasks/:id ---');
    const getTaskRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getTaskData = (await getTaskRes.json()) as any;
    console.log('Status Get Task:', getTaskRes.status, 'Status:', getTaskData.data?.status);
    if (getTaskRes.status !== 200) throw new Error('Get task failed');

    const patchTaskRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS', priority: 'URGENT' }),
    });
    const patchTaskData = (await patchTaskRes.json()) as any;
    console.log('Status Patch Task:', patchTaskRes.status, 'New Status:', patchTaskData.data?.status);
    if (patchTaskRes.status !== 200 || patchTaskData.data.status !== 'IN_PROGRESS') throw new Error('Patch task failed');

    // 13. Comments API: POST & GET & PATCH
    console.log('\n--- 13. Testing Comments APIs ---');
    const createCommentRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ content: 'Looks great! Starting work now.' }),
    });
    const createCommentData = (await createCommentRes.json()) as any;
    console.log('Status Create Comment:', createCommentRes.status, 'Content:', createCommentData.data?.content);
    if (createCommentRes.status !== 201) throw new Error('Create comment failed');
    const createdCommentId = createCommentData.data.id;

    const listCommentsRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listCommentsData = (await listCommentsRes.json()) as any;
    console.log('Status List Comments:', listCommentsRes.status, 'Count:', listCommentsData.data?.length);
    if (listCommentsRes.status !== 200 || listCommentsData.data.length < 1) throw new Error('List comments failed');

    const patchCommentRes = await fetch(`${BASE_URL}/comments/${createdCommentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ content: 'Updated comment content text.' }),
    });
    const patchCommentData = (await patchCommentRes.json()) as any;
    console.log('Status Patch Comment:', patchCommentRes.status, 'Updated:', patchCommentData.data?.content);
    if (patchCommentRes.status !== 200) throw new Error('Patch comment failed');

    // 14. Notifications API
    console.log('\n--- 14. Testing Notifications APIs ---');
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const notifsData = (await notifsRes.json()) as any;
    console.log('Status Get Notifications:', notifsRes.status, 'Count:', notifsData.data?.notifications?.length, 'Unread:', notifsData.data?.unreadCount);
    if (notifsRes.status !== 200) throw new Error('Get notifications failed');

    if (notifsData.data?.notifications?.length > 0) {
      const firstNotifId = notifsData.data.notifications[0].id;
      const readOneRes = await fetch(`${BASE_URL}/notifications/${firstNotifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      console.log('Status Mark One Read:', readOneRes.status);
    }

    const readAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const readAllData = (await readAllRes.json()) as any;
    console.log('Status Mark All Read:', readAllRes.status, 'Updated:', readAllData.data?.updatedCount);
    if (readAllRes.status !== 200) throw new Error('Mark all read failed');

    // 15. Dashboard API
    console.log('\n--- 15. Testing Dashboard API ---');
    const dashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData = (await dashRes.json()) as any;
    console.log('Status Get Dashboard:', dashRes.status);
    console.log('Overview:', dashData.data?.overview);
    console.log('Tasks by Status:', dashData.data?.tasksByStatus);
    if (dashRes.status !== 200 || !dashData.data?.overview) throw new Error('Get dashboard failed');

    // 16. Cleanup & Deletion tests (Comment, Task, Member, Project)
    console.log('\n--- 16. Testing Deletion APIs ---');
    const delCommentRes = await fetch(`${BASE_URL}/comments/${createdCommentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Status Delete Comment:', delCommentRes.status);
    if (delCommentRes.status !== 200) throw new Error('Delete comment failed');

    const delTaskRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Status Delete Task:', delTaskRes.status);
    if (delTaskRes.status !== 200) throw new Error('Delete task failed');

    const delMemberRes = await fetch(`${BASE_URL}/projects/${testProjectId}/members/${addedMemberUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Status Delete Member:', delMemberRes.status);
    if (delMemberRes.status !== 200) throw new Error('Delete member failed');

    const delProjRes = await fetch(`${BASE_URL}/projects/${testProjectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Status Delete Project:', delProjRes.status);
    if (delProjRes.status !== 200) throw new Error('Delete project failed');

    // 17. Auth Logout
    console.log('\n--- 17. Testing POST /api/auth/logout ---');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Status Logout:', logoutRes.status);
    if (logoutRes.status !== 200) throw new Error('Logout failed');

    console.log('\n=========================================');
    console.log('✅ ALL API TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=========================================\n');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
};

runTests();
