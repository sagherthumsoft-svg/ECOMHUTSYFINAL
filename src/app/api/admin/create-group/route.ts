import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

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

    const { groupName, description, members } = await request.json();

    if (!groupName || !groupName.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'At least one member must be selected' }, { status: 400 });
    }

    const creatorUid = decodedToken.uid;

    // Always include the creator's uid in memberIds so they can read their own group
    // (Security rule: allow read if request.auth.uid in resource.data.memberIds)
    const memberIds: string[] = Array.from(new Set([creatorUid, ...members]));
    const serverTimestamp = FieldValue.serverTimestamp();

    // 1. Create document in 'groups' collection for Management
    const groupDocRef = adminDb.collection('groups').doc();
    const groupId = groupDocRef.id;

    await groupDocRef.set({
      groupId,
      name: groupName,
      description: description,
      members: members, // Original array for management
      memberIds,       // Auth array for rules
      createdBy: creatorUid,
      createdAt: serverTimestamp,
    });

    // 2. Dual-write to 'chats' collection for Messaging
    await adminDb.collection('chats').doc(groupId).set({
      chatId: groupId,
      name: groupName,
      type: 'group',
      description: description,
      memberIds,
      createdBy: creatorUid,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });

    console.log("Group created successfully in Firestore:", { groupId, groupName });

    // 3. Immediate sync for all members via clientNotifications
    if (memberIds.length > 0) {
      const batch = adminDb.batch();
      memberIds.forEach((uid: string) => {
        // Skip notifying creator for 'Group Created' alert
        if (uid === creatorUid) return;

        const notifRef = adminDb.collection('clientNotifications').doc();
        batch.set(notifRef, {
          receiverIds: [uid],
          type: 'New Group',
          message: `You were added to the new group: ${groupName}`,
          isRead: false,
          createdAt: Date.now(),
          link: '/dashboard/groups',
          groupId: groupId,
        });

        // Also still write to notificationQueue if legacy processes depend on it
        const queueRef = adminDb.collection('notificationQueue').doc();
        batch.set(queueRef, {
          id: queueRef.id,
          receiverIds: [uid],
          type: 'Group Created',
          message: `You were added to the new group: ${groupName}`,
          isRead: false,
          createdAt: Date.now(),
          link: '/dashboard/groups',
          processed: false,
          groupId: groupId,
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true, groupId: groupId }, { status: 201 });
  } catch (error: any) {
    console.error('Create Group API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
