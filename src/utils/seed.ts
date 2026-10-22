import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/user.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/projectMember.model';
import { Task } from '../models/task.model';
import { Comment } from '../models/comment.model';
import { Notification } from '../models/notification.model';
import { Activity } from '../models/activity.model';

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected successfully.');

    console.log('[Seed] Clearing existing data in TaskFlow database...');
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      ProjectMember.deleteMany({}),
      Task.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
      Activity.deleteMany({}),
    ]);
    console.log('[Seed] Collections cleared.');

    // 1. Create Users
    console.log('[Seed] Creating demo users...');
    const adminUser = await User.create({
      name: 'Sarah Connor',
      email: 'admin@taskflow.dev',
      password: 'Admin123!',
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    });

    const managerUser = await User.create({
      name: 'Michael Scott',
      email: 'manager@taskflow.dev',
      password: 'Manager123!',
      role: 'MANAGER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
    });

    const memberUser = await User.create({
      name: 'Jim Halpert',
      email: 'member@taskflow.dev',
      password: 'Member123!',
      role: 'MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jim',
    });

    const alexUser = await User.create({
      name: 'Pam Beesly',
      email: 'alex@taskflow.dev',
      password: 'Alex123!',
      role: 'MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pam',
    });

    // 2. Create Projects
    console.log('[Seed] Creating sample projects...');
    const project1 = await Project.create({
      name: 'TaskFlow Web Platform',
      description: 'Modern project and team management web application with Kanban boards and activity tracking.',
      status: 'ACTIVE',
      ownerId: adminUser._id,
    });

    const project2 = await Project.create({
      name: 'Mobile App (React Native)',
      description: 'Cross-platform companion mobile app for iOS and Android with offline sync support.',
      status: 'ACTIVE',
      ownerId: managerUser._id,
    });

    const project3 = await Project.create({
      name: 'DevOps & Cloud Infrastructure',
      description: 'Automated CI/CD workflows, Docker containerization, and AWS cloud deployment setup.',
      status: 'COMPLETED',
      ownerId: adminUser._id,
    });

    // 3. Create Project Members
    console.log('[Seed] Adding project members...');
    await ProjectMember.create([
      // Project 1 members
      { projectId: project1._id, userId: adminUser._id, role: 'ADMIN' },
      { projectId: project1._id, userId: managerUser._id, role: 'MANAGER' },
      { projectId: project1._id, userId: memberUser._id, role: 'MEMBER' },
      { projectId: project1._id, userId: alexUser._id, role: 'MEMBER' },
      // Project 2 members
      { projectId: project2._id, userId: managerUser._id, role: 'ADMIN' },
      { projectId: project2._id, userId: memberUser._id, role: 'MEMBER' },
      { projectId: project2._id, userId: alexUser._id, role: 'MEMBER' },
      // Project 3 members
      { projectId: project3._id, userId: adminUser._id, role: 'ADMIN' },
      { projectId: project3._id, userId: managerUser._id, role: 'MANAGER' },
    ]);

    // 4. Create Tasks
    console.log('[Seed] Creating sample tasks...');
    const now = new Date();
    const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const task1 = await Task.create({
      projectId: project1._id,
      title: 'Design Kanban Board UI in React',
      description: 'Create responsive drag-and-drop Kanban columns for TODO, IN_PROGRESS, IN_REVIEW, and DONE states.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: memberUser._id,
      creatorId: managerUser._id,
      dueDate: addDays(3),
    });

    const task2 = await Task.create({
      projectId: project1._id,
      title: 'Integrate JWT Authentication with Axios',
      description: 'Set up auth interceptor to attach Bearer token to all outgoing API requests and handle 401 redirects.',
      status: 'DONE',
      priority: 'URGENT',
      assigneeId: memberUser._id,
      creatorId: adminUser._id,
      dueDate: addDays(-1),
    });

    const task3 = await Task.create({
      projectId: project1._id,
      title: 'Build Notification Bell & Dropdown',
      description: 'Display real-time unread count badge and allow users to mark notifications as read individually or all at once.',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: alexUser._id,
      creatorId: managerUser._id,
      dueDate: addDays(5),
    });

    const task4 = await Task.create({
      projectId: project1._id,
      title: 'Conduct Code Review for Project APIs',
      description: 'Review role-based permissions and MongoDB query indexes to ensure optimal response times.',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      assigneeId: managerUser._id,
      creatorId: adminUser._id,
      dueDate: addDays(2),
    });

    const task5 = await Task.create({
      projectId: project2._id,
      title: 'Setup React Native Navigation',
      description: 'Configure bottom tab navigation and stack routers for dashboard, tasks, and settings.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigneeId: memberUser._id,
      creatorId: managerUser._id,
      dueDate: addDays(7),
    });

    const task6 = await Task.create({
      projectId: project2._id,
      title: 'Implement Push Notifications',
      description: 'Connect Firebase Cloud Messaging (FCM) for task assignment alerts.',
      status: 'TODO',
      priority: 'LOW',
      assigneeId: null,
      creatorId: managerUser._id,
      dueDate: addDays(14),
    });

    // 5. Create Comments
    console.log('[Seed] Creating comments...');
    await Comment.create([
      {
        taskId: task1._id,
        authorId: managerUser._id,
        content: 'Please make sure column widths look good on both 13-inch laptops and larger monitors.',
      },
      {
        taskId: task1._id,
        authorId: memberUser._id,
        content: 'Got it! I am using CSS Grid with auto-fit columns. Progress is looking great.',
      },
      {
        taskId: task2._id,
        authorId: adminUser._id,
        content: 'Token expiration handling has been tested thoroughly with automated suites.',
      },
      {
        taskId: task4._id,
        authorId: managerUser._id,
        content: 'Checked the indexes, queries are resolving in under 15ms.',
      },
    ]);

    // 6. Create Activities
    console.log('[Seed] Creating activity logs...');
    await Activity.create([
      {
        projectId: project1._id,
        taskId: null,
        userId: adminUser._id,
        action: 'PROJECT_CREATED',
        metadata: { projectName: project1.name },
        createdAt: addDays(-5),
      },
      {
        projectId: project1._id,
        taskId: task2._id,
        userId: adminUser._id,
        action: 'TASK_CREATED',
        metadata: { taskTitle: task2.title },
        createdAt: addDays(-4),
      },
      {
        projectId: project1._id,
        taskId: task1._id,
        userId: managerUser._id,
        action: 'TASK_CREATED',
        metadata: { taskTitle: task1.title },
        createdAt: addDays(-3),
      },
      {
        projectId: project1._id,
        taskId: task1._id,
        userId: memberUser._id,
        action: 'TASK_STATUS_CHANGED',
        metadata: { taskTitle: task1.title, oldStatus: 'TODO', newStatus: 'IN_PROGRESS' },
        createdAt: addDays(-1),
      },
      {
        projectId: project1._id,
        taskId: task2._id,
        userId: memberUser._id,
        action: 'TASK_STATUS_CHANGED',
        metadata: { taskTitle: task2.title, oldStatus: 'IN_REVIEW', newStatus: 'DONE' },
        createdAt: addDays(0),
      },
    ]);

    // 7. Create Notifications
    console.log('[Seed] Creating demo notifications...');
    await Notification.create([
      {
        userId: memberUser._id,
        type: 'TASK_ASSIGNED',
        message: 'You were assigned to task "Design Kanban Board UI in React" in project "TaskFlow Web Platform".',
        isRead: false,
        createdAt: addDays(-2),
      },
      {
        userId: memberUser._id,
        type: 'PROJECT_INVITATION',
        message: 'You were added to the project "TaskFlow Web Platform" as a MEMBER.',
        isRead: true,
        createdAt: addDays(-5),
      },
      {
        userId: alexUser._id,
        type: 'TASK_ASSIGNED',
        message: 'You were assigned to task "Build Notification Bell & Dropdown" in project "TaskFlow Web Platform".',
        isRead: false,
        createdAt: addDays(-1),
      },
      {
        userId: managerUser._id,
        type: 'COMMENT_ADDED',
        message: 'Jim Halpert commented on "Design Kanban Board UI in React".',
        isRead: false,
        createdAt: addDays(0),
      },
    ]);

    console.log('====================================================');
    console.log('🎉 TaskFlow Database Seed Completed Successfully!');
    console.log('====================================================');
    console.log('Demo Credentials for Testing:');
    console.log('----------------------------------------------------');
    console.log('1. ADMIN Role:');
    console.log('   Email:    admin@taskflow.dev');
    console.log('   Password: Admin123!');
    console.log('');
    console.log('2. MANAGER Role:');
    console.log('   Email:    manager@taskflow.dev');
    console.log('   Password: Manager123!');
    console.log('');
    console.log('3. MEMBER Role:');
    console.log('   Email:    member@taskflow.dev');
    console.log('   Password: Member123!');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
