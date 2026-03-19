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

    const { warehouseName, description, staff } = await request.json();

    if (!warehouseName || !warehouseName.trim()) {
      return NextResponse.json({ error: 'Warehouse name is required' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (!staff || staff.length === 0) {
      return NextResponse.json({ error: 'At least one staff member must be assigned' }, { status: 400 });
    }

    const creatorUid = decodedToken.uid;
    // Always include creator's uid in memberIds so they can read their own warehouse
    // (Security rule: allow read if request.auth.uid in resource.data.memberIds)
    const memberIds: string[] = Array.from(new Set([creatorUid, ...(staff || [])]));
    const serverTimestamp = FieldValue.serverTimestamp();

    // 1. Create document in 'warehouses' collection for Management
    const whDocRef = adminDb.collection('warehouses').doc();
    const warehouseId = whDocRef.id;

    await whDocRef.set({
      warehouseId,
      name: warehouseName,
      description: description,
      members: staff,  // Management field
      memberIds,       // Rules field
      createdBy: creatorUid,
      createdAt: serverTimestamp,
    });

    // 2. Dual-write to 'chats' collection for Messaging
    await adminDb.collection('chats').doc(warehouseId).set({
      chatId: warehouseId,
      name: warehouseName,
      type: 'warehouse',
      description: description,
      memberIds,
      createdBy: creatorUid,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });

    console.log("Warehouse created successfully in Firestore:", { warehouseId, warehouseName });

    // Write to notificationQueue — Cloud Functions will process and fan out.
    // (Security rules: allow create: if false on "notifications" collection,
    //  so we use "notificationQueue" which Cloud Functions consume.)
    // 3. Immediate sync for all members via clientNotifications
    if (memberIds.length > 0) {
      const batch = adminDb.batch();
      memberIds.forEach((uid: string) => {
        // Skip notifying creator for 'Warehouse Created' alert
        if (uid === creatorUid) return;

        const notifRef = adminDb.collection('clientNotifications').doc();
        batch.set(notifRef, {
          receiverIds: [uid],
          type: 'New Warehouse',
          message: `You were assigned to the new warehouse: ${warehouseName}`,
          isRead: false,
          createdAt: Date.now(),
          link: '/dashboard/warehouses',
          warehouseId: warehouseId,
        });

        // Also still write to notificationQueue if legacy processes depend on it
        const queueRef = adminDb.collection('notificationQueue').doc();
        batch.set(queueRef, {
          id: queueRef.id,
          receiverIds: [uid],
          type: 'Warehouse Created',
          message: `You were assigned to the new warehouse: ${warehouseName}`,
          isRead: false,
          createdAt: Date.now(),
          link: '/dashboard/warehouses',
          processed: false,
          warehouseId: warehouseId,
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true, warehouseId: warehouseId }, { status: 201 });
  } catch (error: any) {
    console.error('Create Warehouse API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
