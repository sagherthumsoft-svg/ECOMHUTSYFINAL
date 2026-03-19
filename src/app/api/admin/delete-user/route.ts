import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
  }

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

    const data = await request.json();
    const { uid } = data;

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    // Attempt to delete user in Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError: any) {
      console.warn(`User ${uid} not found in Auth or failed to delete:`, authError.message);
    }

    // Revoke sessions
    try {
      await adminAuth.revokeRefreshTokens(uid);
    } catch(e) {}

    // Delete user from Firestore
    await adminDb.collection('users').doc(uid).delete();

    // Clean up from groups — remove from memberIds array
    const groupsRef = adminDb.collection('groups');
    const groupsSnap = await groupsRef.where('memberIds', 'array-contains', uid).get();
    
    // Clean up from warehouses — remove from memberIds array
    const warehousesRef = adminDb.collection('warehouses');
    const warehousesSnap = await warehousesRef.where('memberIds', 'array-contains', uid).get();
    
    // Clean up from chats — remove from memberIds array
    const chatsRef = adminDb.collection('chats');
    const chatsSnap = await chatsRef.where('memberIds', 'array-contains', uid).get();

    const batch = adminDb.batch();

    groupsSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        memberIds: FieldValue.arrayRemove(uid)
      });
    });

    warehousesSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        memberIds: FieldValue.arrayRemove(uid)
      });
    });

    chatsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Notify the admin who performed the deletion
    const notifRef = adminDb.collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      receiverIds: [decodedToken.uid],
      type: 'User Deleted',
      message: `User with UID ${uid} has been successfully deleted along with their data.`,
      isRead: false,
      createdAt: Date.now(),
      link: '/dashboard'
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
