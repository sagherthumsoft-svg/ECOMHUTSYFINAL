import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { taskTitle, description, assignedUsers, priority, deadline } = await request.json();
    
    if (!taskTitle || !taskTitle.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    if (!assignedUsers || assignedUsers.length === 0) {
      return NextResponse.json({ error: 'At least one user must be assigned' }, { status: 400 });
    }

    const batch = adminDb.batch();
    const taskIds: string[] = [];

    assignedUsers.forEach((uid: string) => {
      // Create a unique task doc for each user to match uid == assignedTo rule
      const taskRef = adminDb.collection('tasks').doc();
      batch.set(taskRef, {
        taskId: taskRef.id,
        taskTitle,
        description: description || '',
        assignedTo: uid,
        assignedBy: decodedToken.uid,
        status: 'pending',
        priority: priority || 'medium',
        deadline: deadline || null,
        createdAt: Date.now(),
      });
      taskIds.push(taskRef.id);

      // Write to notificationQueue — Cloud Functions will fan out to notifications.
      // (Firestore rules: allow create: if false on 'notifications', so use queue pattern)
      const queueRef = adminDb.collection('notificationQueue').doc();
      batch.set(queueRef, {
        id: queueRef.id,
        receiverIds: [uid],
        type: 'Task Assigned',
        message: `New task assigned: ${taskTitle}`,
        isRead: false,
        createdAt: Date.now(),
        link: '/dashboard/tasks',
        processed: false,
      });
    });

    await batch.commit();

    return NextResponse.json({ success: true, taskIds }, { status: 201 });
  } catch (error: any) {
    console.error('Create Task Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
